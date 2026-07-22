from datetime import time

from pydantic import BaseModel, Field, field_validator


class TimeSlotCreate(BaseModel):
    start_time: time
    end_time: time
    capacity: int = Field(gt=0)
    is_enabled: bool = True

    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, end_time: time, info):
        start = info.data.get("start_time")
        if start and end_time <= start:
            raise ValueError("End time must be after start time")
        return end_time


class TimeSlotUpdate(BaseModel):
    start_time: time | None = None
    end_time: time | None = None
    capacity: int | None = Field(default=None, gt=0)
    is_enabled: bool | None = None


class TimeSlotResponse(BaseModel):
    id: int
    start_time: time
    end_time: time
    capacity: int
    is_enabled: bool

    model_config = {"from_attributes": True}
