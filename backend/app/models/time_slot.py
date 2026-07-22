from datetime import datetime, time

from sqlalchemy import Boolean, CheckConstraint, DateTime, Integer, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TimeSlot(Base):
    __tablename__ = "time_slots"
    __table_args__ = (CheckConstraint("capacity > 0", name="ck_time_slot_capacity"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    bookings = relationship("Booking", back_populates="slot")
