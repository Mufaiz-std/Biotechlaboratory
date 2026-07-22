from sqlalchemy.orm import Session

from app.models.laboratory_setting import LaboratorySetting
from app.schemas.laboratory import LaboratorySettingUpdate
from app.services.helpers import get_lab_settings


def get_laboratory(db: Session) -> LaboratorySetting:
    return get_lab_settings(db)


def update_laboratory(db: Session, payload: LaboratorySettingUpdate) -> LaboratorySetting:
    settings = get_lab_settings(db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return settings
