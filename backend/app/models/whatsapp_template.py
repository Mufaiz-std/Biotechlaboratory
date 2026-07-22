from datetime import datetime

from sqlalchemy import DateTime, Enum, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import WhatsAppTemplateType


class WhatsAppTemplate(Base):
    """Required by ADMIN_SETTINGS.md; omitted from DATABASE_SCHEMA.md."""

    __tablename__ = "whatsapp_templates"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    template_type: Mapped[WhatsAppTemplateType] = mapped_column(
        Enum(WhatsAppTemplateType, native_enum=False, length=50),
        unique=True,
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
