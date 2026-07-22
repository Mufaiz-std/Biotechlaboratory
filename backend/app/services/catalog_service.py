from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.test import Test
from app.schemas.test import CategoryCreate, CategoryUpdate, TestCreate, TestUpdate


class CatalogError(Exception):
    pass


def list_categories(db: Session, enabled_only: bool = False) -> list[Category]:
    q = db.query(Category).order_by(Category.display_order.asc(), Category.name.asc())
    if enabled_only:
        q = q.filter(Category.is_enabled.is_(True))
    return q.all()


def create_category(db: Session, payload: CategoryCreate) -> Category:
    if db.query(Category).filter(Category.name == payload.name).first():
        raise CatalogError("Category name already exists")
    cat = Category(**payload.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def update_category(db: Session, category_id: int, payload: CategoryUpdate) -> Category:
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise CatalogError("Category not found")
    if payload.name and payload.name != cat.name:
        if db.query(Category).filter(Category.name == payload.name).first():
            raise CatalogError("Category name already exists")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)
    db.commit()
    db.refresh(cat)
    return cat


def delete_category(db: Session, category_id: int) -> None:
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise CatalogError("Category not found")
    if db.query(Test).filter(Test.category_id == category_id).count() > 0:
        raise CatalogError("Cannot delete category that contains tests")
    db.delete(cat)
    db.commit()


def list_tests(db: Session, enabled_only: bool = False, search: str | None = None) -> list[Test]:
    q = db.query(Test).order_by(Test.display_order.asc(), Test.name.asc())
    if enabled_only:
        q = q.filter(Test.is_enabled.is_(True))
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(Test.name.ilike(term))
    return q.all()


def create_test(db: Session, payload: TestCreate) -> Test:
    if not db.query(Category).filter(Category.id == payload.category_id).first():
        raise CatalogError("Category not found")
    if db.query(Test).filter(Test.name == payload.name).first():
        raise CatalogError("Test name already exists")
    test = Test(**payload.model_dump())
    db.add(test)
    db.commit()
    db.refresh(test)
    return test


def update_test(db: Session, test_id: int, payload: TestUpdate) -> Test:
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise CatalogError("Test not found")
    if payload.name and payload.name != test.name:
        if db.query(Test).filter(Test.name == payload.name).first():
            raise CatalogError("Test name already exists")
    if payload.category_id:
        if not db.query(Category).filter(Category.id == payload.category_id).first():
            raise CatalogError("Category not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(test, field, value)
    db.commit()
    db.refresh(test)
    return test


def get_test(db: Session, test_id: int) -> Test | None:
    return db.query(Test).filter(Test.id == test_id).first()


def delete_test(db: Session, test_id: int) -> None:
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise CatalogError("Test not found")
    db.delete(test)
    db.commit()
