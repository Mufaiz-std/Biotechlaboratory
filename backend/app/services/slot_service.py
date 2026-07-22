from sqlalchemy.orm import Session

from app.models.time_slot import TimeSlot
from app.schemas.slot import TimeSlotCreate, TimeSlotUpdate
from app.services.helpers import slots_overlap


class SlotError(Exception):
    pass


def list_slots(db: Session, enabled_only: bool = False) -> list[TimeSlot]:
    q = db.query(TimeSlot).order_by(TimeSlot.start_time.asc())
    if enabled_only:
        q = q.filter(TimeSlot.is_enabled.is_(True))
    return q.all()


def _check_overlap(db: Session, start, end, exclude_id: int | None = None) -> None:
    slots = db.query(TimeSlot).all()
    for slot in slots:
        if exclude_id and slot.id == exclude_id:
            continue
        if slots_overlap(start, end, slot.start_time, slot.end_time):
            raise SlotError("This slot overlaps with an existing slot")


def create_slot(db: Session, payload: TimeSlotCreate) -> TimeSlot:
    _check_overlap(db, payload.start_time, payload.end_time)
    slot = TimeSlot(**payload.model_dump())
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


def update_slot(db: Session, slot_id: int, payload: TimeSlotUpdate) -> TimeSlot:
    slot = db.query(TimeSlot).filter(TimeSlot.id == slot_id).first()
    if not slot:
        raise SlotError("Slot not found")
    data = payload.model_dump(exclude_unset=True)
    start = data.get("start_time", slot.start_time)
    end = data.get("end_time", slot.end_time)
    if "start_time" in data or "end_time" in data:
        _check_overlap(db, start, end, exclude_id=slot_id)
    for field, value in data.items():
        setattr(slot, field, value)
    db.commit()
    db.refresh(slot)
    return slot


def get_slot(db: Session, slot_id: int) -> TimeSlot | None:
    return db.query(TimeSlot).filter(TimeSlot.id == slot_id).first()
