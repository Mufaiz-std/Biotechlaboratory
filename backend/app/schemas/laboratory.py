from decimal import Decimal

from pydantic import BaseModel, Field


class LaboratorySettingResponse(BaseModel):
    id: int
    lab_name: str
    logo_url: str | None
    phone: str | None
    whatsapp_number: str | None
    email: str | None
    address: str | None
    google_maps_link: str | None

    model_config = {"from_attributes": True}


class LaboratorySettingUpdate(BaseModel):
    lab_name: str = Field(min_length=1, max_length=200)
    logo_url: str | None = None
    phone: str | None = None
    whatsapp_number: str | None = None
    email: str | None = None
    address: str | None = None
    google_maps_link: str | None = None
