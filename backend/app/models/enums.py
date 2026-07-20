import enum


class BookingStatus(str, enum.Enum):
    PENDING = "Pending"
    INQUIRY_SENT = "Inquiry Sent"
    TIME_ADJUSTMENT_REQUESTED = "Time Adjustment Requested"
    ACCEPTED = "Accepted"
    REJECTED = "Rejected"
    CANCELLED = "Cancelled"
    COMPLETED = "Completed"


class Sex(str, enum.Enum):
    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Other"


class DiscountType(str, enum.Enum):
    PERCENTAGE = "Percentage"
    FIXED_AMOUNT = "Fixed Amount"


class WhatsAppTemplateType(str, enum.Enum):
    ACCEPT = "accept"
    REJECT = "reject"
    INQUIRY = "inquiry"
    TIME_ADJUSTMENT = "time_adjustment"
    PATIENT_SUBMISSION = "patient_submission"
