from decimal import Decimal

from pydantic import BaseModel, Field


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    display_order: int = 0
    is_enabled: bool = True


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    display_order: int | None = None
    is_enabled: bool | None = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    display_order: int
    is_enabled: bool

    model_config = {"from_attributes": True}


class TestCreate(BaseModel):
    category_id: int
    name: str = Field(min_length=1, max_length=200)
    price: Decimal = Field(gt=0)
    patient_instruction: str | None = None
    display_order: int = 0
    is_enabled: bool = True


class TestUpdate(BaseModel):
    category_id: int | None = None
    name: str | None = Field(default=None, min_length=1, max_length=200)
    price: Decimal | None = Field(default=None, gt=0)
    patient_instruction: str | None = None
    display_order: int | None = None
    is_enabled: bool | None = None


class TestResponse(BaseModel):
    id: int
    category_id: int
    name: str
    price: Decimal
    patient_instruction: str | None
    display_order: int
    is_enabled: bool
    category_name: str | None = None

    model_config = {"from_attributes": True}
