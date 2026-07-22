from datetime import date

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import error_response, success_response
from app.models.category import Category
from app.schemas.booking import BookingCreateRequest
from app.services.booking_service import BookingError, create_booking, get_available_slots, upload_prescription
from app.services.catalog_service import list_categories, list_tests
from app.services.laboratory_service import get_laboratory
from app.services.package_service import list_packages
from app.services.slot_service import list_slots

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/laboratory")
def public_laboratory(db: Session = Depends(get_db)):
    lab = get_laboratory(db)
    return success_response("Laboratory info fetched", {
        "lab_name": lab.lab_name,
        "logo_url": lab.logo_url,
        "phone": lab.phone,
        "whatsapp_number": lab.whatsapp_number,
        "email": lab.email,
        "address": lab.address,
        "google_maps_link": lab.google_maps_link,
    })


@router.get("/categories")
def public_categories(db: Session = Depends(get_db)):
    cats = list_categories(db, enabled_only=True)
    return success_response("Categories fetched", [
        {"id": c.id, "name": c.name, "display_order": c.display_order} for c in cats
    ])


@router.get("/tests")
def public_tests(search: str | None = None, db: Session = Depends(get_db)):
    tests = list_tests(db, enabled_only=True, search=search)
    return success_response("Tests fetched", [
        {
            "id": t.id,
            "category_id": t.category_id,
            "name": t.name,
            "price": float(t.price),
            "patient_instruction": t.patient_instruction,
            "display_order": t.display_order,
        }
        for t in tests
    ])


@router.get("/packages")
def public_packages(search: str | None = None, db: Session = Depends(get_db)):
    packages = list_packages(db, enabled_only=True, search=search)
    return success_response("Packages fetched", [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "price": float(p.price),
            "tests": p.tests_data,
        }
        for p in packages
    ])


@router.get("/slots")
def public_slots(db: Session = Depends(get_db)):
    slots = list_slots(db, enabled_only=True)
    return success_response("Slots fetched", [
        {
            "id": s.id,
            "start_time": s.start_time.isoformat(),
            "end_time": s.end_time.isoformat(),
        }
        for s in slots
    ])


@router.get("/slots/available")
def available_slots(preferred_date: date, db: Session = Depends(get_db)):
    slots = get_available_slots(db, preferred_date)
    return success_response("Available slots fetched", [
        {
            "id": s["id"],
            "start_time": s["start_time"].isoformat(),
            "end_time": s["end_time"].isoformat(),
            "remaining": s["remaining"],
        }
        for s in slots
    ])


@router.post("/bookings")
def submit_booking(payload: BookingCreateRequest, db: Session = Depends(get_db)):
    try:
        result = create_booking(db, payload)
        return success_response("Booking created", result, status_code=201)
    except BookingError as exc:
        return error_response(str(exc))


@router.post("/upload/prescription")
async def upload_prescription_file(file: UploadFile = File(...)):
    try:
        url = upload_prescription(file)
        return success_response("File uploaded", {"url": url})
    except BookingError as exc:
        return error_response(str(exc))
