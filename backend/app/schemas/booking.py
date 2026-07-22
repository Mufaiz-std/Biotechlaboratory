from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

from app.models.enums import BookingStatus, Sex


class BookingTestInput(BaseModel):
    test_id: int


class BookingCreateRequest(BaseModel):
    patient_name: str = Field(min_length=1, max_length=200)
    age: int = Field(ge=1, le=150)
    sex: Sex
    phone: str = Field(min_length=10, max_length=20)
    address: str = Field(min_length=1)
    house_no: str | None = None
    landmark: str | None = None
    floor: str | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    preferred_date: date
    slot_id: int
    package_id: int | None = None
    test_ids: list[int] = Field(default_factory=list)
    prescription_image_url: str | None = None
    patient_note: str | None = None
    idempotency_key: str | None = None

    @field_validator("test_ids")
    @classmethod
    def validate_selection(cls, test_ids, info):
        prescription = info.data.get("prescription_image_url")
        package_id = info.data.get("package_id")
        if not test_ids and not prescription and not package_id:
            raise ValueError("At least one test, package, or prescription is required")
        return test_ids


class BookingTestResponse(BaseModel):
    id: int
    test_id: int
    test_name_at_booking: str
    price_at_booking: Decimal

    model_config = {"from_attributes": True}


class TimelineResponse(BaseModel):
    id: int
    action: str
    description: str | None
    performed_by: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class BookingListItem(BaseModel):
    id: int
    booking_number: str
    patient_name: str
    phone: str
    status: BookingStatus
    preferred_date: date
    slot_start: time | None = None
    slot_end: time | None = None
    tests_summary: str
    package_name: str | None
    area: str
    assigned_technician_name: str | None = None

    model_config = {"from_attributes": True}


class BookingDetailResponse(BaseModel):
    id: int
    booking_number: str
    patient_name: str
    age: int
    sex: Sex
    phone: str
    address: str
    house_no: str | None
    landmark: str | None
    floor: str | None
    latitude: Decimal | None
    longitude: Decimal | None
    preferred_date: date
    slot_id: int
    slot_start: time | None = None
    slot_end: time | None = None
    package_name: str | None
    package_price: Decimal | None
    prescription_image_url: str | None
    patient_note: str | None
    status: BookingStatus
    assigned_technician_id: int | None
    assigned_technician_name: str | None
    assigned_technician_phone: str | None
    assigned_at: datetime | None
    tests: list[BookingTestResponse]
    timeline: list[TimelineResponse]
    total_price: Decimal

    model_config = {"from_attributes": True}


class BookingCreateResponse(BaseModel):
    booking_id: int
    booking_number: str
    whatsapp_url: str
    whatsapp_message: str | None = None


class BookingSummaryResponse(BaseModel):
    pending: int
    today: int
    accepted: int
    completed: int


class BookingActionResponse(BaseModel):
    booking: BookingDetailResponse
    whatsapp_url: str | None = None
    whatsapp_message: str | None = None
    lab_whatsapp_number: str | None = None


class TimeExtendRequest(BaseModel):
    proposed_slot_id: int
    proposed_date: date | None = None
