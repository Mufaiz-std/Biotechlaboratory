from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PackageTest(Base):
    __tablename__ = "package_tests"
    __table_args__ = (UniqueConstraint("package_id", "test_id", name="uq_package_test"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    package_id: Mapped[int] = mapped_column(ForeignKey("health_packages.id"), nullable=False)
    test_id: Mapped[int] = mapped_column(ForeignKey("tests.id"), nullable=False)

    package = relationship("HealthPackage", back_populates="package_tests")
    test = relationship("Test", back_populates="package_tests")
