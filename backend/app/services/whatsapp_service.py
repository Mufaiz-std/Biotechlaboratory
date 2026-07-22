from urllib.parse import quote

from app.core.deps import normalize_phone
from app.models.enums import WhatsAppTemplateType
from app.models.whatsapp_template import WhatsAppTemplate
from app.services.helpers import get_lab_settings

DEFAULT_TEMPLATES = {
    WhatsAppTemplateType.ACCEPT: (
        "Hello {PATIENT_NAME}, your booking {BOOKING_ID} has been accepted. "
        "Technician: {TECHNICIAN_NAME}. Expected arrival: {TIME}."
    ),
    WhatsAppTemplateType.REJECT: (
        "Hello {PATIENT_NAME}, we regret to inform you that booking {BOOKING_ID} "
        "could not be confirmed at this time. Please contact us for assistance."
    ),
    WhatsAppTemplateType.INQUIRY: (
        "Hello {PATIENT_NAME}, we noticed you started booking {BOOKING_ID} but may "
        "not have completed WhatsApp confirmation. Do you still need home collection? "
        "Reply Y or N."
    ),
    WhatsAppTemplateType.TIME_ADJUSTMENT: (
        "Hello {PATIENT_NAME}, regarding booking {BOOKING_ID}, we would like to "
        "propose a new time slot: {DATE} {TIME}. Please confirm if this works for you."
    ),
    WhatsAppTemplateType.PATIENT_SUBMISSION: (
        "Hello,\n\nI have requested a Home Collection.\n\n"
        "Booking ID: {BOOKING_ID}\n\nName: {PATIENT_NAME}\n\n"
        "Preferred Date: {DATE}\n\nPreferred Slot: {TIME}\n\n"
        "Please confirm my booking.\n\nThank you."
    ),
}


def get_template(db, template_type: WhatsAppTemplateType) -> str:
    row = (
        db.query(WhatsAppTemplate)
        .filter(WhatsAppTemplate.template_type == template_type)
        .first()
    )
    if row:
        return row.content
    return DEFAULT_TEMPLATES[template_type]


def render_template(template: str, variables: dict[str, str]) -> str:
    result = template
    for key, value in variables.items():
        result = result.replace(f"{{{key}}}", value)
    return result


def build_wa_me_url(db, phone: str, message: str) -> str:
    lab = get_lab_settings(db)
    target = normalize_phone(phone)
    encoded = quote(message, safe="")
    return f"https://wa.me/{target}?text={encoded}"


def build_patient_submission_url(
    db,
    patient_phone: str,
    booking_number: str,
    patient_name: str,
    date_str: str,
    time_str: str,
) -> tuple[str, str]:
    lab = get_lab_settings(db)
    lab_phone = normalize_phone(lab.whatsapp_number or lab.phone or patient_phone)
    template = get_template(db, WhatsAppTemplateType.PATIENT_SUBMISSION)
    message = render_template(
        template,
        {
            "BOOKING_ID": booking_number,
            "PATIENT_NAME": patient_name,
            "DATE": date_str,
            "TIME": time_str,
        },
    )
    return build_wa_me_url(db, lab_phone, message), message


def build_admin_action_url(
    db,
    patient_phone: str,
    template_type: WhatsAppTemplateType,
    variables: dict[str, str],
) -> tuple[str, str, str | None]:
    lab = get_lab_settings(db)
    template = get_template(db, template_type)
    message = render_template(template, variables)
    url = build_wa_me_url(db, patient_phone, message)
    lab_number = lab.whatsapp_number or lab.phone
    return url, message, lab_number
