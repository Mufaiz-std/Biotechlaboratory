from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import BookingStatus, Sex


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    booking_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    patient_name: Mapped[str] = mapped_column(String(200), nullable=False)
    age: Mapped[int] = mapped_column(nullable=False)
    sex: Mapped[Sex] = mapped_column(Enum(Sex, native_enum=False, length=20), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    house_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    landmark: Mapped[str | None] = mapped_column(String(200), nullable=True)
    floor: Mapped[str | None] = mapped_column(String(50), nullable=True)
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 7), nullable=True)
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 7), nullable=True)
    preferred_date: Mapped[date] = mapped_column(Date, nullable=False)
    slot_id: Mapped[int] = mapped_column(ForeignKey("time_slots.id"), nullable=False)
    package_id: Mapped[int | None] = mapped_column(
        ForeignKey("health_packages.id"), nullable=True
    )
    package_name_at_booking: Mapped[str | None] = mapped_column(String(200), nullable=True)
    package_price_at_booking: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    prescription_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    patient_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus, native_enum=False, length=50),
        default=BookingStatus.PENDING,
        nullable=False,
    )
    assigned_technician_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    slot = relationship("TimeSlot", back_populates="bookings")
    package = relationship("HealthPackage", back_populates="bookings")
    assigned_technician = relationship("User", foreign_keys=[assigned_technician_id])
    booking_tests = relationship("BookingTest", back_populates="booking")
    timeline = relationship("BookingTimeline", back_populates="booking")
