import json
import logging

from pywebpush import WebPushException, webpush
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.push_subscription import PushSubscription

logger = logging.getLogger(__name__)


def send_push_to_admins(db: Session, *, title: str, body: str, url: str = "/admin/bookings") -> int:
    """Send a web push to every stored admin subscription. Returns count sent."""
    settings = get_settings()
    if not settings.vapid_private_key:
        logger.warning("VAPID_PRIVATE_KEY not configured — skipping push notifications")
        return 0

    subs = db.query(PushSubscription).all()
    if not subs:
        logger.warning("No push subscriptions in DB — admin must log in and enable push on their device first")
        return 0

    logger.info("Sending push to %d subscription(s): title=%r", len(subs), title)
    payload = json.dumps({"title": title, "body": body, "url": url})
    sent = 0

    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={"sub": settings.vapid_contact_email},
                ttl=86400,
            )
            sent += 1
            logger.info("Push sent successfully to subscription #%d", sub.id)
        except WebPushException as ex:
            logger.warning("WebPush failed for subscription #%d (%s...): %s", sub.id, sub.endpoint[:50], ex)
            if ex.response is not None:
                logger.warning("  HTTP %d: %s", ex.response.status_code, ex.response.text[:200])
            if ex.response is not None and ex.response.status_code == 410:
                logger.info("  Subscription expired (410) — removing from DB")
                db.delete(sub)
                db.commit()

    logger.info("Push complete: %d/%d sent successfully", sent, len(subs))
    return sent
