from sqlalchemy.orm import Session

from app.models.health_package import HealthPackage
from app.models.package_test import PackageTest
from app.models.test import Test
from app.schemas.package import PackageCreate, PackageUpdate


class PackageError(Exception):
    pass


def _attach_tests(db: Session, package: HealthPackage) -> HealthPackage:
    rows = (
        db.query(Test)
        .join(PackageTest, PackageTest.test_id == Test.id)
        .filter(PackageTest.package_id == package.id)
        .all()
    )
    package.tests_data = [{"id": t.id, "name": t.name, "price": t.price} for t in rows]
    return package


def list_packages(db: Session, enabled_only: bool = False, search: str | None = None) -> list:
    q = db.query(HealthPackage).order_by(
        HealthPackage.display_order.asc(), HealthPackage.name.asc()
    )
    if enabled_only:
        q = q.filter(HealthPackage.is_enabled.is_(True))
    if search:
        q = q.filter(HealthPackage.name.ilike(f"%{search.strip()}%"))
    packages = q.all()
    return [_attach_tests(db, p) for p in packages]


def create_package(db: Session, payload: PackageCreate) -> HealthPackage:
    if db.query(HealthPackage).filter(HealthPackage.name == payload.name).first():
        raise PackageError("Package name already exists")
    data = payload.model_dump()
    test_ids = data.pop("test_ids")
    pkg = HealthPackage(**data)
    db.add(pkg)
    db.flush()
    for tid in test_ids:
        if not db.query(Test).filter(Test.id == tid).first():
            raise PackageError(f"Test {tid} not found")
        db.add(PackageTest(package_id=pkg.id, test_id=tid))
    db.commit()
    db.refresh(pkg)
    return _attach_tests(db, pkg)


def update_package(db: Session, package_id: int, payload: PackageUpdate) -> HealthPackage:
    pkg = db.query(HealthPackage).filter(HealthPackage.id == package_id).first()
    if not pkg:
        raise PackageError("Package not found")
    data = payload.model_dump(exclude_unset=True)
    test_ids = data.pop("test_ids", None)
    if "name" in data and data["name"] != pkg.name:
        if db.query(HealthPackage).filter(HealthPackage.name == data["name"]).first():
            raise PackageError("Package name already exists")
    for field, value in data.items():
        setattr(pkg, field, value)
    if test_ids is not None:
        db.query(PackageTest).filter(PackageTest.package_id == package_id).delete()
        for tid in test_ids:
            if not db.query(Test).filter(Test.id == tid).first():
                raise PackageError(f"Test {tid} not found")
            db.add(PackageTest(package_id=package_id, test_id=tid))
    db.commit()
    db.refresh(pkg)
    return _attach_tests(db, pkg)


def get_package(db: Session, package_id: int):
    pkg = db.query(HealthPackage).filter(HealthPackage.id == package_id).first()
    if pkg:
        return _attach_tests(db, pkg)
    return None
