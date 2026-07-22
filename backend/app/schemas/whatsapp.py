from pydantic import BaseModel, Field


class WhatsAppTemplateUpdate(BaseModel):
    content: str = Field(min_length=1)


class WhatsAppTemplateResponse(BaseModel):
    id: int
    template_type: str
    content: str

    model_config = {"from_attributes": True}
