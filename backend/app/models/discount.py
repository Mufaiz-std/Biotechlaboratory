from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import DiscountType


class Discount(Base):
    __tablename__ = "discounts"
    __table_args__ = (
        CheckConstraint(
            "(test_id IS NOT NULL AND package_id IS NULL) OR "
            "(test_id IS NULL AND package_id IS NOT NULL)",
            name="ck_discount_exactly_one_target",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    test_id: Mapped[int | None] = mapped_column(ForeignKey("tests.id"), nullable=True)
    package_id: Mapped[int | None] = mapped_column(
        ForeignKey("health_packages.id"), nullable=True
    )
    discount_type: Mapped[DiscountType] = mapped_column(
        Enum(DiscountType, native_enum=False, length=50), nullable=False
    )
    discount_value: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    test = relationship("Test", back_populates="discounts")
    package = relationship("HealthPackage", back_populates="discounts")
