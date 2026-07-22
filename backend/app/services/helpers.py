from datetime import datetime, time
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.models.booking_test import BookingTest
from app.models.booking_timeline import BookingTimeline
from app.models.enums import BookingStatus
from app.models.health_package import HealthPackage
from app.models.laboratory_setting import LaboratorySetting
from app.models.package_test import PackageTest
from app.models.test import Test
from app.models.time_slot import TimeSlot
from app.models.user import User


def generate_booking_number(db: Session) -> str:
    today = datetime.now().strftime("%Y%m%d")
    prefix = f"LAB-{today}-"
    last = (
        db.query(Booking)
        .filter(Booking.booking_number.like(f"{prefix}%"))
        .order_by(Booking.id.desc())
        .first()
    )
    seq = 1
    if last:
        try:
            seq = int(last.booking_number.split("-")[-1]) + 1
        except ValueError:
            seq = 1
    return f"{prefix}{seq:04d}"


def add_timeline(
    db: Session,
    booking_id: int,
    action: str,
    description: str | None = None,
    performed_by: str | None = None,
) -> None:
    db.add(
        BookingTimeline(
            booking_id=booking_id,
            action=action,
            description=description,
            performed_by=performed_by,
        )
    )


def slots_overlap(start1: time, end1: time, start2: time, end2: time) -> bool:
    return start1 < end2 and start2 < end1


def count_slot_bookings(db: Session, slot_id: int, preferred_date) -> int:
    return (
        db.query(func.count(Booking.id))
        .filter(
            Booking.slot_id == slot_id,
            Booking.preferred_date == preferred_date,
            Booking.status.notin_(
                [BookingStatus.REJECTED, BookingStatus.CANCELLED]
            ),
        )
        .scalar()
        or 0
    )


def get_effective_test_price(db: Session, test: Test, on_date=None) -> Decimal:
    return test.price


def build_booking_detail(db: Session, booking: Booking) -> dict:
    slot = db.query(TimeSlot).filter(TimeSlot.id == booking.slot_id).first()
    technician = None
    if booking.assigned_technician_id:
        technician = (
            db.query(User).filter(User.id == booking.assigned_technician_id).first()
        )
    tests = (
        db.query(BookingTest).filter(BookingTest.booking_id == booking.id).all()
    )
    timeline = (
        db.query(BookingTimeline)
        .filter(BookingTimeline.booking_id == booking.id)
        .order_by(BookingTimeline.created_at.asc())
        .all()
    )
    total = sum(t.price_at_booking for t in tests)
    if booking.package_price_at_booking:
        total += booking.package_price_at_booking
    return {
        "id": booking.id,
        "booking_number": booking.booking_number,
        "patient_name": booking.patient_name,
        "age": booking.age,
        "sex": booking.sex.value if hasattr(booking.sex, "value") else booking.sex,
        "phone": booking.phone,
        "address": booking.address,
        "house_no": booking.house_no,
        "landmark": booking.landmark,
        "floor": booking.floor,
        "latitude": booking.latitude,
        "longitude": booking.longitude,
        "preferred_date": booking.preferred_date.isoformat(),
        "slot_id": booking.slot_id,
        "slot_start": slot.start_time.isoformat() if slot else None,
        "slot_end": slot.end_time.isoformat() if slot else None,
        "package_name": booking.package_name_at_booking,
        "package_price": float(booking.package_price_at_booking)
        if booking.package_price_at_booking is not None
        else None,
        "prescription_image_url": booking.prescription_image_url,
        "patient_note": booking.patient_note,
        "status": booking.status.value if hasattr(booking.status, "value") else booking.status,
        "assigned_technician_id": booking.assigned_technician_id,
        "assigned_technician_name": technician.name if technician else None,
        "assigned_technician_phone": technician.phone if technician else None,
        "assigned_at": booking.assigned_at.isoformat() if booking.assigned_at else None,
        "tests": [
            {
                "id": t.id,
                "test_id": t.test_id,
                "test_name_at_booking": t.test_name_at_booking,
                "price_at_booking": float(t.price_at_booking),
            }
            for t in tests
        ],
        "timeline": [
            {
                "id": ev.id,
                "action": ev.action,
                "description": ev.description,
                "performed_by": ev.performed_by,
                "created_at": ev.created_at.isoformat(),
            }
            for ev in timeline
        ],
        "total_price": float(total),
    }


def get_lab_settings(db: Session) -> LaboratorySetting:
    settings = db.query(LaboratorySetting).first()
    if not settings:
        settings = LaboratorySetting(lab_name="Laboratory")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def resolve_package_tests(db: Session, package_id: int) -> list[Test]:
    rows = (
        db.query(Test)
        .join(PackageTest, PackageTest.test_id == Test.id)
        .filter(PackageTest.package_id == package_id, Test.is_enabled.is_(True))
        .all()
    )
    return rows
