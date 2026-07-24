import io
from datetime import date, datetime, timezone

import cloudinary
import cloudinary.uploader
from fastapi import UploadFile
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import normalize_phone
from app.models.booking import Booking
from app.models.booking_test import BookingTest
from app.models.enums import BookingStatus, WhatsAppTemplateType
from app.models.health_package import HealthPackage
from app.models.test import Test
from app.models.time_slot import TimeSlot
from app.models.user import User
from app.schemas.auth import ProfileUpdateRequest
from app.schemas.booking import BookingCreateRequest, TimeExtendRequest
from app.services.helpers import (
    add_timeline,
    build_booking_detail,
    count_slot_bookings,
    generate_booking_number,
)
from app.services.whatsapp_service import build_admin_action_url, build_patient_submission_url

settings = get_settings()

_idempotency_cache: dict[str, int] = {}


class BookingError(Exception):
    pass


class AlreadyAcceptedError(BookingError):
    pass


def update_profile(db: Session, user: User, payload: ProfileUpdateRequest) -> User:
    user.name = payload.name
    user.phone = payload.phone
    db.commit()
    db.refresh(user)
    return user


def _format_slot_time(slot: TimeSlot) -> str:
    return f"{slot.start_time.strftime('%I:%M %p')} - {slot.end_time.strftime('%I:%M %p')}"


def create_booking(db: Session, payload: BookingCreateRequest) -> dict:
    if payload.idempotency_key and payload.idempotency_key in _idempotency_cache:
        booking_id = _idempotency_cache[payload.idempotency_key]
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if booking:
            slot = db.query(TimeSlot).filter(TimeSlot.id == booking.slot_id).first()
            btests = db.query(BookingTest).filter(BookingTest.booking_id == booking.id).all()
            tests_summary_str = ""
            if booking.package_name_at_booking:
                tests_summary_str = booking.package_name_at_booking
            elif btests:
                tests_summary_str = ", ".join(t.test_name_at_booking for t in btests)
            elif booking.prescription_image_url:
                tests_summary_str = "Prescription Uploaded"
                
            url, message = build_patient_submission_url(
                db,
                booking.phone,
                booking.booking_number,
                booking.patient_name,
                booking.preferred_date.strftime("%d %b %Y"),
                _format_slot_time(slot) if slot else "",
                tests_summary_str,
            )
            return {
                "booking_id": booking.id,
                "booking_number": booking.booking_number,
                "whatsapp_url": url,
                "whatsapp_message": message,
            }

    if payload.preferred_date < date.today():
        raise BookingError("Past dates are not allowed")

    slot = (
        db.query(TimeSlot)
        .filter(TimeSlot.id == payload.slot_id, TimeSlot.is_enabled.is_(True))
        .first()
    )
    if not slot:
        raise BookingError("Selected time slot is not available")

    booked = count_slot_bookings(db, slot.id, payload.preferred_date)
    if booked >= slot.capacity:
        raise BookingError("Selected time slot is fully booked")

    booking_number = generate_booking_number(db)
    package_name = None
    package_price = None

    if payload.package_id:
        pkg = (
            db.query(HealthPackage)
            .filter(
                HealthPackage.id == payload.package_id,
                HealthPackage.is_enabled.is_(True),
            )
            .first()
        )
        if not pkg:
            raise BookingError("Selected package is not available")
        package_name = pkg.name
        package_price = pkg.price

    booking = Booking(
        booking_number=booking_number,
        patient_name=payload.patient_name,
        age=payload.age,
        sex=payload.sex,
        phone=normalize_phone(payload.phone),
        address=payload.address,
        house_no=payload.house_no,
        landmark=payload.landmark,
        floor=payload.floor,
        latitude=payload.latitude,
        longitude=payload.longitude,
        preferred_date=payload.preferred_date,
        slot_id=payload.slot_id,
        package_id=payload.package_id,
        package_name_at_booking=package_name,
        package_price_at_booking=package_price,
        prescription_image_url=payload.prescription_image_url,
        patient_note=payload.patient_note,
        status=BookingStatus.PENDING,
    )
    db.add(booking)
    db.flush()

    if payload.test_ids:
        tests = (
            db.query(Test)
            .filter(Test.id.in_(payload.test_ids), Test.is_enabled.is_(True))
            .all()
        )
        if len(tests) != len(set(payload.test_ids)):
            raise BookingError("One or more selected tests are not available")
        for test in tests:
            db.add(
                BookingTest(
                    booking_id=booking.id,
                    test_id=test.id,
                    test_name_at_booking=test.name,
                    price_at_booking=test.price,
                )
            )

    add_timeline(
        db,
        booking.id,
        "Booking Created",
        f"Booking {booking_number} submitted by patient",
        performed_by="Patient",
    )
    db.commit()
    db.refresh(booking)

    if payload.idempotency_key:
        _idempotency_cache[payload.idempotency_key] = booking.id

    tests_summary_str = ""
    if package_name:
        tests_summary_str = package_name
    elif payload.test_ids:
        tests_summary_str = ", ".join(t.name for t in tests)
    elif payload.prescription_image_url:
        tests_summary_str = "Prescription Uploaded"

    url, message = build_patient_submission_url(
        db,
        booking.phone,
        booking.booking_number,
        booking.patient_name,
        booking.preferred_date.strftime("%d %b %Y"),
        _format_slot_time(slot),
        tests_summary_str,
    )
    return {
        "booking_id": booking.id,
        "booking_number": booking.booking_number,
        "whatsapp_url": url,
        "whatsapp_message": message,
    }


def get_available_slots(db: Session, preferred_date: date) -> list[dict]:
    if preferred_date < date.today():
        return []
    slots = (
        db.query(TimeSlot)
        .filter(TimeSlot.is_enabled.is_(True))
        .order_by(TimeSlot.start_time.asc())
        .all()
    )
    result = []
    for slot in slots:
        booked = count_slot_bookings(db, slot.id, preferred_date)
        if booked < slot.capacity:
            result.append(
                {
                    "id": slot.id,
                    "start_time": slot.start_time,
                    "end_time": slot.end_time,
                    "capacity": slot.capacity,
                    "remaining": slot.capacity - booked,
                }
            )
    return result


def _fuzzy_match(query: str, *values: str) -> bool:
    q = query.lower().strip()
    if not q:
        return True
    combined = " ".join(v.lower() for v in values if v)
    return q in combined or any(q in (v or "").lower() for v in values)


def list_bookings(
    db: Session,
    search: str | None = None,
    status: BookingStatus | None = None,
    date_filter: str | None = None,
    technician_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    test_id: int | None = None,
    package_id: int | None = None,
    area: str | None = None,
    has_prescription: bool | None = None,
) -> list[dict]:
    q = db.query(Booking).order_by(Booking.created_at.desc())
    if status:
        q = q.filter(Booking.status == status)
    if technician_id:
        q = q.filter(Booking.assigned_technician_id == technician_id)
    if date_from:
        q = q.filter(Booking.preferred_date >= date_from)
    if date_to:
        q = q.filter(Booking.preferred_date <= date_to)
    if package_id:
        q = q.filter(Booking.package_id == package_id)
    if area:
        q = q.filter(Booking.address.ilike(f"%{area}%"))
    if has_prescription is True:
        q = q.filter(Booking.prescription_image_url.isnot(None))
    elif has_prescription is False:
        q = q.filter(Booking.prescription_image_url.is_(None))
    if date_filter == "today":
        q = q.filter(Booking.preferred_date == date.today())
    elif date_filter == "tomorrow":
        from datetime import timedelta

        q = q.filter(Booking.preferred_date == date.today() + timedelta(days=1))

    bookings = q.all()
    items = []
    for b in bookings:
        slot = db.query(TimeSlot).filter(TimeSlot.id == b.slot_id).first()
        tests = db.query(BookingTest).filter(BookingTest.booking_id == b.id).all()
        test_names = ", ".join(t.test_name_at_booking for t in tests)
        tech_name = None
        if b.assigned_technician_id:
            tech = db.query(User).filter(User.id == b.assigned_technician_id).first()
            tech_name = tech.name if tech else None
        summary = test_names or b.package_name_at_booking or "Prescription only"
        item = {
            "id": b.id,
            "booking_number": b.booking_number,
            "patient_name": b.patient_name,
            "phone": b.phone,
            "status": b.status,
            "preferred_date": b.preferred_date,
            "slot_start": slot.start_time if slot else None,
            "slot_end": slot.end_time if slot else None,
            "tests_summary": summary,
            "package_name": b.package_name_at_booking,
            "area": b.address.split(",")[0] if b.address else "",
            "assigned_technician_name": tech_name,
            "test_names": test_names,
        }
        if test_id:
            if not any(t.test_id == test_id for t in tests):
                continue
        if search and not _fuzzy_match(
            search,
            b.booking_number,
            b.patient_name,
            b.phone,
            test_names,
            b.package_name_at_booking or "",
            item["area"],
        ):
            continue
        items.append(item)
    return items


def get_summary(db: Session) -> dict:
    today = date.today()
    pending = db.query(Booking).filter(Booking.status == BookingStatus.PENDING).count()
    today_count = db.query(Booking).filter(Booking.preferred_date == today).count()
    accepted = db.query(Booking).filter(Booking.status == BookingStatus.ACCEPTED).count()
    completed = db.query(Booking).filter(Booking.status == BookingStatus.COMPLETED).count()
    return {
        "pending": pending,
        "today": today_count,
        "accepted": accepted,
        "completed": completed,
    }


def get_booking_detail(db: Session, booking_id: int) -> dict:
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise BookingError("Booking not found")
    return build_booking_detail(db, booking)


def accept_booking(db: Session, booking_id: int, technician: User) -> dict:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    result = db.execute(
        update(Booking)
        .where(
            Booking.id == booking_id,
            Booking.status == BookingStatus.PENDING,
            Booking.assigned_technician_id.is_(None),
        )
        .values(
            status=BookingStatus.ACCEPTED,
            assigned_technician_id=technician.id,
            assigned_at=now,
        )
    )
    if result.rowcount == 0:
        db.rollback()
        raise AlreadyAcceptedError("Booking has already been accepted or is not pending")
    db.commit()
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    add_timeline(
        db,
        booking_id,
        "Accepted",
        f"Booking accepted by {technician.name}",
        performed_by=technician.name,
    )
    db.commit()
    detail = build_booking_detail(db, booking)
    slot = db.query(TimeSlot).filter(TimeSlot.id == booking.slot_id).first()
    url, message, lab_phone = build_admin_action_url(
        db,
        booking.phone,
        WhatsAppTemplateType.ACCEPT,
        {
            "PATIENT_NAME": booking.patient_name,
            "BOOKING_ID": booking.booking_number,
            "TECHNICIAN_NAME": technician.name,
            "TIME": _format_slot_time(slot) if slot else "",
            "DATE": booking.preferred_date.strftime("%d %b %Y"),
        },
    )
    return {"booking": detail, "whatsapp_url": url, "whatsapp_message": message, "lab_whatsapp_number": lab_phone}


def undo_accept(db: Session, booking_id: int, technician: User) -> dict:
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise BookingError("Booking not found")
    if booking.status != BookingStatus.ACCEPTED:
        raise BookingError("Only accepted bookings can be undone")
    if booking.assigned_technician_id != technician.id:
        raise BookingError("Only the assigned technician can undo acceptance")
    booking.status = BookingStatus.PENDING
    booking.assigned_technician_id = None
    booking.assigned_at = None
    add_timeline(
        db,
        booking_id,
        "Undo Accept",
        f"Acceptance undone by {technician.name}",
        performed_by=technician.name,
    )
    db.commit()
    db.refresh(booking)
    return {"booking": build_booking_detail(db, booking), "whatsapp_url": None}


def reject_booking(db: Session, booking_id: int, technician: User) -> dict:
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise BookingError("Booking not found")
    if booking.status not in (BookingStatus.PENDING, BookingStatus.INQUIRY_SENT, BookingStatus.TIME_ADJUSTMENT_REQUESTED):
        raise BookingError("Booking cannot be rejected in current status")
    booking.status = BookingStatus.REJECTED
    add_timeline(db, booking_id, "Rejected", "Booking rejected", performed_by=technician.name)
    db.commit()
    db.refresh(booking)
    url, message, lab_phone = build_admin_action_url(
        db,
        booking.phone,
        WhatsAppTemplateType.REJECT,
        {
            "PATIENT_NAME": booking.patient_name,
            "BOOKING_ID": booking.booking_number,
        },
    )
    return {
        "booking": build_booking_detail(db, booking),
        "whatsapp_url": url,
        "whatsapp_message": message,
        "lab_whatsapp_number": lab_phone,
    }


def inquiry_booking(db: Session, booking_id: int, technician: User) -> dict:
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise BookingError("Booking not found")
    booking.status = BookingStatus.INQUIRY_SENT
    add_timeline(db, booking_id, "Inquiry Sent", "Inquiry message sent", performed_by=technician.name)
    db.commit()
    db.refresh(booking)
    url, message, lab_phone = build_admin_action_url(
        db,
        booking.phone,
        WhatsAppTemplateType.INQUIRY,
        {
            "PATIENT_NAME": booking.patient_name,
            "BOOKING_ID": booking.booking_number,
        },
    )
    return {
        "booking": build_booking_detail(db, booking),
        "whatsapp_url": url,
        "whatsapp_message": message,
        "lab_whatsapp_number": lab_phone,
    }


def time_extend_booking(
    db: Session, booking_id: int, technician: User, payload: TimeExtendRequest
) -> dict:
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise BookingError("Booking not found")
    slot = db.query(TimeSlot).filter(TimeSlot.id == payload.proposed_slot_id).first()
    if not slot:
        raise BookingError("Proposed slot not found")
    proposed_date = payload.proposed_date or booking.preferred_date
    booking.status = BookingStatus.TIME_ADJUSTMENT_REQUESTED
    add_timeline(
        db,
        booking_id,
        "Time Adjustment Requested",
        f"Proposed new slot: {proposed_date} {_format_slot_time(slot)}",
        performed_by=technician.name,
    )
    db.commit()
    db.refresh(booking)
    url, message, lab_phone = build_admin_action_url(
        db,
        booking.phone,
        WhatsAppTemplateType.TIME_ADJUSTMENT,
        {
            "PATIENT_NAME": booking.patient_name,
            "BOOKING_ID": booking.booking_number,
            "DATE": proposed_date.strftime("%d %b %Y"),
            "TIME": _format_slot_time(slot),
        },
    )
    return {
        "booking": build_booking_detail(db, booking),
        "whatsapp_url": url,
        "whatsapp_message": message,
        "lab_whatsapp_number": lab_phone,
    }


def complete_booking(db: Session, booking_id: int, technician: User) -> dict:
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise BookingError("Booking not found")
    if booking.status != BookingStatus.ACCEPTED:
        raise BookingError("Only accepted bookings can be completed")
    booking.status = BookingStatus.COMPLETED
    add_timeline(
        db, booking_id, "Completed", "Booking marked as completed", performed_by=technician.name
    )
    db.commit()
    db.refresh(booking)
    return {"booking": build_booking_detail(db, booking), "whatsapp_url": None}


def upload_prescription(file: UploadFile) -> str:
    allowed = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
    if file.content_type not in allowed:
        raise BookingError("Invalid file type. Allowed: JPG, PNG, WEBP, PDF")
    content = file.file.read()
    if len(content) > 10 * 1024 * 1024:
        raise BookingError("File too large. Maximum size is 10MB")
    if settings.cloudinary_cloud_name:
        cloudinary.config(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            api_secret=settings.cloudinary_api_secret,
        )
        result = cloudinary.uploader.upload(
            io.BytesIO(content),
            folder="lab_booking/prescriptions",
            resource_type="auto",
        )
        return result["secure_url"]
    from pathlib import Path
    import uuid

    upload_root = Path(__file__).resolve().parents[2] / "uploads" / "prescriptions"
    upload_root.mkdir(parents=True, exist_ok=True)
    ext = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "application/pdf": ".pdf",
    }.get(file.content_type, ".bin")
    filename = f"{uuid.uuid4().hex}{ext}"
    path = upload_root / filename
    path.write_bytes(content)
    return f"/uploads/prescriptions/{filename}"
