"""Seed minimal catalog data for local development and QA."""

import sys
from datetime import time
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal
from app.models.category import Category
from app.models.health_package import HealthPackage
from app.models.laboratory_setting import LaboratorySetting
from app.models.package_test import PackageTest
from app.models.test import Test
from app.models.time_slot import TimeSlot
from app.services.helpers import get_lab_settings


def seed() -> None:
    db = SessionLocal()
    try:
        lab = get_lab_settings(db)
        lab.lab_name = lab.lab_name or "Demo Laboratory"
        lab.phone = lab.phone or "919876543210"
        lab.whatsapp_number = lab.whatsapp_number or "919876543210"
        lab.address = lab.address or "123 Health Street, Demo City"

        if not db.query(TimeSlot).count():
            db.add_all(
                [
                    TimeSlot(start_time=time(8, 0), end_time=time(10, 0), capacity=5),
                    TimeSlot(start_time=time(10, 0), end_time=time(12, 0), capacity=5),
                    TimeSlot(start_time=time(14, 0), end_time=time(16, 0), capacity=5),
                ]
            )

        cat = db.query(Category).filter(Category.name == "General").first()
        if not cat:
            cat = Category(name="General", display_order=1)
            db.add(cat)
            db.flush()

        if not db.query(Test).filter(Test.name == "Complete Blood Count").first():
            db.add(
                Test(
                    category_id=cat.id,
                    name="Complete Blood Count",
                    price=Decimal("450.00"),
                    patient_instruction="No special preparation required.",
                )
            )
        if not db.query(Test).filter(Test.name == "Fasting Blood Sugar").first():
            db.add(
                Test(
                    category_id=cat.id,
                    name="Fasting Blood Sugar",
                    price=Decimal("120.00"),
                    patient_instruction="Fast for 8-10 hours before sample collection.",
                )
            )

        if not db.query(HealthPackage).filter(HealthPackage.name == "Basic Health Check").first():
            tests = db.query(Test).limit(2).all()
            pkg = HealthPackage(
                name="Basic Health Check",
                description="Essential screening tests",
                price=Decimal("499.00"),
            )
            db.add(pkg)
            db.flush()
            for t in tests:
                db.add(PackageTest(package_id=pkg.id, test_id=t.id))

        db.commit()
        print("Demo catalog seeded (lab, slots, tests, package).")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
