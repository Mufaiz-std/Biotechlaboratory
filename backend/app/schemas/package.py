from decimal import Decimal

from pydantic import BaseModel, Field


class PackageCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    price: Decimal = Field(gt=0)
    display_order: int = 0
    is_enabled: bool = True
    test_ids: list[int] = Field(default_factory=list)


class PackageUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    price: Decimal | None = Field(default=None, gt=0)
    display_order: int | None = None
    is_enabled: bool | None = None
    test_ids: list[int] | None = None


class PackageTestResponse(BaseModel):
    id: int
    name: str
    price: Decimal


class PackageResponse(BaseModel):
    id: int
    name: str
    description: str | None
    price: Decimal
    display_order: int
    is_enabled: bool
    tests: list[PackageTestResponse] = []

    model_config = {"from_attributes": True}
