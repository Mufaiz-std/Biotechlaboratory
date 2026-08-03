from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.response import error_response, success_response
from app.models.category import Category
from app.models.enums import BookingStatus, WhatsAppTemplateType
from app.models.user import User
from app.schemas.booking import BookingActionResponse, TimeExtendRequest
from app.schemas.laboratory import LaboratorySettingResponse, LaboratorySettingUpdate
from app.schemas.package import PackageCreate, PackageResponse, PackageUpdate
from app.schemas.slot import TimeSlotCreate, TimeSlotResponse, TimeSlotUpdate
from app.schemas.test import CategoryCreate, CategoryResponse, CategoryUpdate, TestCreate, TestResponse, TestUpdate
from app.schemas.whatsapp import WhatsAppTemplateResponse, WhatsAppTemplateUpdate
from app.services.booking_service import (
    AlreadyAcceptedError,
    BookingError,
    accept_booking,
    complete_booking,
    get_booking_detail,
    get_summary,
    inquiry_booking,
    list_bookings,
    reject_booking,
    time_extend_booking,
    undo_accept,
)
from app.services.catalog_service import (
    CatalogError,
    create_category,
    create_test,
    delete_category,
    delete_test,
    list_categories,
    list_tests,
    update_category,
    update_test,
)
from app.services.laboratory_service import get_laboratory, update_laboratory
from app.services.package_service import PackageError, create_package, list_packages, update_package
from app.services.slot_service import SlotError, create_slot, list_slots, update_slot
from app.services.whatsapp_template_service import list_templates, update_template
from app.models.push_subscription import PushSubscription

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_user)])

@router.post("/push/subscribe")
def admin_subscribe_push(subscription: dict, db: Session = Depends(get_db)):
    endpoint = subscription.get("endpoint")
    # Update if already exists (same browser), otherwise insert
    existing = db.query(PushSubscription).filter(PushSubscription.endpoint == endpoint).first()
    if existing:
        existing.auth = subscription["keys"]["auth"]
        existing.p256dh = subscription["keys"]["p256dh"]
    else:
        sub = PushSubscription(
            endpoint=endpoint,
            auth=subscription["keys"]["auth"],
            p256dh=subscription["keys"]["p256dh"],
        )
        db.add(sub)
    db.commit()
    return success_response("Push subscription saved")


@router.get("/push/subscriptions")
def admin_list_push_subscriptions(db: Session = Depends(get_db)):
    subs = db.query(PushSubscription).order_by(PushSubscription.created_at.desc()).all()
    return success_response("Subscriptions fetched", [
        {
            "id": s.id,
            "endpoint_prefix": s.endpoint[:60] + "...",
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in subs
    ])


@router.post("/push/test")
def admin_test_push(db: Session = Depends(get_db)):
    from app.services.push_service import send_push_to_admins
    sent = send_push_to_admins(
        db,
        title="Test Notification",
        body="If you see this, push is working! ✅",
        url="/admin/bookings",
    )
    return success_response(f"Test push sent to {sent} device(s)")


def _category_response(cat: Category) -> dict:
    return CategoryResponse.model_validate(cat).model_dump(mode="json")


def _test_response(test, category_name: str | None = None) -> dict:
    data = TestResponse.model_validate(test).model_dump(mode="json")
    if category_name:
        data["category_name"] = category_name
    return data


def _slot_response(slot) -> dict:
    return TimeSlotResponse.model_validate(slot).model_dump(mode="json")


def _package_response(pkg) -> dict:
    return PackageResponse.model_validate(
        {
            "id": pkg.id,
            "name": pkg.name,
            "description": pkg.description,
            "price": pkg.price,
            "display_order": pkg.display_order,
            "is_enabled": pkg.is_enabled,
            "tests": pkg.tests_data if hasattr(pkg, "tests_data") else [],
        }
    ).model_dump(mode="json")


@router.get("/laboratory")
def admin_laboratory(db: Session = Depends(get_db)):
    lab = get_laboratory(db)
    return success_response(
        "Laboratory settings fetched",
        LaboratorySettingResponse.model_validate(lab).model_dump(mode="json"),
    )


@router.put("/laboratory")
def admin_update_laboratory(payload: LaboratorySettingUpdate, db: Session = Depends(get_db)):
    lab = update_laboratory(db, payload)
    return success_response(
        "Laboratory settings updated",
        LaboratorySettingResponse.model_validate(lab).model_dump(mode="json"),
    )


@router.get("/slots")
def admin_slots(db: Session = Depends(get_db)):
    slots = list_slots(db)
    return success_response("Slots fetched", [_slot_response(s) for s in slots])


@router.post("/slots")
def admin_create_slot(payload: TimeSlotCreate, db: Session = Depends(get_db)):
    try:
        slot = create_slot(db, payload)
        return success_response("Slot created", _slot_response(slot), status_code=201)
    except SlotError as exc:
        return error_response(str(exc))


@router.put("/slots/{slot_id}")
def admin_update_slot(slot_id: int, payload: TimeSlotUpdate, db: Session = Depends(get_db)):
    try:
        slot = update_slot(db, slot_id, payload)
        return success_response("Slot updated", _slot_response(slot))
    except SlotError as exc:
        return error_response(str(exc))


@router.get("/categories")
def admin_categories(db: Session = Depends(get_db)):
    cats = list_categories(db)
    return success_response("Categories fetched", [_category_response(c) for c in cats])


@router.post("/categories")
def admin_create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    try:
        cat = create_category(db, payload)
        return success_response("Category created", _category_response(cat), status_code=201)
    except CatalogError as exc:
        return error_response(str(exc))


@router.put("/categories/{category_id}")
def admin_update_category(
    category_id: int, payload: CategoryUpdate, db: Session = Depends(get_db)
):
    try:
        cat = update_category(db, category_id, payload)
        return success_response("Category updated", _category_response(cat))
    except CatalogError as exc:
        return error_response(str(exc))


@router.delete("/categories/{category_id}")
def admin_delete_category(category_id: int, db: Session = Depends(get_db)):
    try:
        delete_category(db, category_id)
        return success_response("Category deleted")
    except CatalogError as exc:
        return error_response(str(exc))


@router.get("/tests")
def admin_tests(search: str | None = None, db: Session = Depends(get_db)):
    tests = list_tests(db, search=search)
    cat_map = {c.id: c.name for c in list_categories(db)}
    return success_response(
        "Tests fetched",
        [_test_response(t, cat_map.get(t.category_id)) for t in tests],
    )


@router.post("/tests")
def admin_create_test(payload: TestCreate, db: Session = Depends(get_db)):
    try:
        test = create_test(db, payload)
        cat = db.query(Category).filter(Category.id == test.category_id).first()
        return success_response(
            "Test created",
            _test_response(test, cat.name if cat else None),
            status_code=201,
        )
    except CatalogError as exc:
        return error_response(str(exc))


@router.put("/tests/{test_id}")
def admin_update_test(test_id: int, payload: TestUpdate, db: Session = Depends(get_db)):
    try:
        test = update_test(db, test_id, payload)
        cat = db.query(Category).filter(Category.id == test.category_id).first()
        return success_response(
            "Test updated", _test_response(test, cat.name if cat else None)
        )
    except CatalogError as exc:
        return error_response(str(exc))


@router.delete("/tests/{test_id}")
def admin_delete_test(test_id: int, db: Session = Depends(get_db)):
    try:
        delete_test(db, test_id)
        return success_response("Test deleted")
    except CatalogError as exc:
        return error_response(str(exc))


@router.get("/packages")
def admin_packages(search: str | None = None, db: Session = Depends(get_db)):
    packages = list_packages(db, search=search)
    return success_response("Packages fetched", [_package_response(p) for p in packages])


@router.post("/packages")
def admin_create_package(payload: PackageCreate, db: Session = Depends(get_db)):
    try:
        pkg = create_package(db, payload)
        return success_response("Package created", _package_response(pkg), status_code=201)
    except PackageError as exc:
        return error_response(str(exc))


@router.put("/packages/{package_id}")
def admin_update_package(
    package_id: int, payload: PackageUpdate, db: Session = Depends(get_db)
):
    try:
        pkg = update_package(db, package_id, payload)
        return success_response("Package updated", _package_response(pkg))
    except PackageError as exc:
        return error_response(str(exc))


@router.get("/whatsapp-templates")
def admin_whatsapp_templates(db: Session = Depends(get_db)):
    templates = list_templates(db)
    return success_response(
        "Templates fetched",
        [WhatsAppTemplateResponse.model_validate(t).model_dump(mode="json") for t in templates],
    )


@router.put("/whatsapp-templates/{template_type}")
def admin_update_whatsapp_template(
    template_type: WhatsAppTemplateType,
    payload: WhatsAppTemplateUpdate,
    db: Session = Depends(get_db),
):
    row = update_template(db, template_type, payload)
    return success_response(
        "Template updated",
        WhatsAppTemplateResponse.model_validate(row).model_dump(mode="json"),
    )


@router.get("/technicians")
def admin_technicians(db: Session = Depends(get_db)):
    users = db.query(User).filter(User.is_active.is_(True)).order_by(User.name).all()
    return success_response(
        "Technicians fetched",
        [{"id": u.id, "name": u.name, "phone": u.phone} for u in users],
    )


@router.get("/bookings/summary")
def admin_booking_summary(db: Session = Depends(get_db)):
    return success_response("Summary fetched", get_summary(db))


@router.get("/bookings")
def admin_bookings(
    search: str | None = None,
    status: BookingStatus | None = None,
    date_filter: str | None = None,
    technician_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    test_id: int | None = None,
    package_id: int | None = None,
    area: str | None = None,
    has_prescription: bool | None = Query(default=None),
    db: Session = Depends(get_db),
):
    items = list_bookings(
        db,
        search=search,
        status=status,
        date_filter=date_filter,
        technician_id=technician_id,
        date_from=date_from,
        date_to=date_to,
        test_id=test_id,
        package_id=package_id,
        area=area,
        has_prescription=has_prescription,
    )
    return success_response("Bookings fetched", items)


@router.get("/bookings/{booking_id}")
def admin_booking_detail(booking_id: int, db: Session = Depends(get_db)):
    try:
        detail = get_booking_detail(db, booking_id)
        return success_response("Booking fetched", detail)
    except BookingError as exc:
        return error_response(str(exc), status_code=404)


@router.post("/bookings/{booking_id}/accept")
def admin_accept_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = accept_booking(db, booking_id, current_user)
        return success_response("Booking accepted", result)
    except AlreadyAcceptedError as exc:
        return error_response(str(exc), status_code=409)
    except BookingError as exc:
        return error_response(str(exc))


@router.post("/bookings/{booking_id}/undo-accept")
def admin_undo_accept(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = undo_accept(db, booking_id, current_user)
        return success_response("Acceptance undone", result)
    except BookingError as exc:
        return error_response(str(exc))


@router.post("/bookings/{booking_id}/reject")
def admin_reject_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = reject_booking(db, booking_id, current_user)
        return success_response("Booking rejected", result)
    except BookingError as exc:
        return error_response(str(exc))


@router.post("/bookings/{booking_id}/inquiry")
def admin_inquiry_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = inquiry_booking(db, booking_id, current_user)
        return success_response("Inquiry sent", result)
    except BookingError as exc:
        return error_response(str(exc))


@router.post("/bookings/{booking_id}/time-extend")
def admin_time_extend(
    booking_id: int,
    payload: TimeExtendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = time_extend_booking(db, booking_id, current_user, payload)
        return success_response("Time adjustment requested", result)
    except BookingError as exc:
        return error_response(str(exc))


@router.post("/bookings/{booking_id}/complete")
def admin_complete_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = complete_booking(db, booking_id, current_user)
        return success_response("Booking completed", result)
    except BookingError as exc:
        return error_response(str(exc))
