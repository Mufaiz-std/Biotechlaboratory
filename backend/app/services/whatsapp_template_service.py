from sqlalchemy.orm import Session

from app.models.enums import WhatsAppTemplateType
from app.models.whatsapp_template import WhatsAppTemplate
from app.schemas.whatsapp import WhatsAppTemplateUpdate
from app.services.whatsapp_service import DEFAULT_TEMPLATES


def list_templates(db: Session) -> list[WhatsAppTemplate]:
    existing = {
        t.template_type: t
        for t in db.query(WhatsAppTemplate).all()
    }
    result = []
    for template_type in WhatsAppTemplateType:
        if template_type in existing:
            result.append(existing[template_type])
        else:
            row = WhatsAppTemplate(
                template_type=template_type,
                content=DEFAULT_TEMPLATES[template_type],
            )
            db.add(row)
            result.append(row)
    db.commit()
    for row in result:
        db.refresh(row)
    return result


def update_template(
    db: Session, template_type: WhatsAppTemplateType, payload: WhatsAppTemplateUpdate
) -> WhatsAppTemplate:
    row = (
        db.query(WhatsAppTemplate)
        .filter(WhatsAppTemplate.template_type == template_type)
        .first()
    )
    if not row:
        row = WhatsAppTemplate(
            template_type=template_type,
            content=payload.content,
        )
        db.add(row)
    else:
        row.content = payload.content
    db.commit()
    db.refresh(row)
    return row
