import os, json, sys
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY")
VAPID_PUBLIC_KEY  = os.getenv("VAPID_PUBLIC_KEY")

print("=" * 60)
print("VAPID KEY CHECK")
print("=" * 60)
print(f"Private key : {(VAPID_PRIVATE_KEY[:20] + '...') if VAPID_PRIVATE_KEY else 'MISSING!'}")
print(f"Public key  : {(VAPID_PUBLIC_KEY[:20] + '...') if VAPID_PUBLIC_KEY else 'MISSING!'}")
print(f"Private key length: {len(VAPID_PRIVATE_KEY) if VAPID_PRIVATE_KEY else 0}")
print()

if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
    print("ERROR: VAPID keys are missing.")
    sys.exit(1)

if len(VAPID_PRIVATE_KEY) > 100:
    print("ERROR: Private key is too long - it looks like a base64-encoded PEM, not a raw key.")
    sys.exit(1)

print("Key format looks OK (correct length).")
print()

from sqlalchemy import create_engine, text
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    rows = conn.execute(text("SELECT id, endpoint, p256dh, auth FROM push_subscriptions")).fetchall()

print(f"Found {len(rows)} subscription(s) in database.")
print()

if not rows:
    print("No subscriptions - log in to admin portal first to save a subscription.")
    sys.exit(0)

from pywebpush import webpush, WebPushException

payload = json.dumps({
    "title": "Test Notification",
    "body": "If you see this, push is working!",
    "url": "/admin/bookings"
})

for row in rows:
    sub_id, endpoint, p256dh, auth = row
    print(f"Sending to #{sub_id}: {endpoint[:70]}...")
    try:
        webpush(
            subscription_info={"endpoint": endpoint, "keys": {"p256dh": p256dh, "auth": auth}},
            data=payload,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": "mailto:admin@example.com"},
            ttl=86400
        )
        print("  SUCCESS - notification sent!")
    except WebPushException as ex:
        print(f"  FAILED - {ex}")
        if ex.response is not None:
            print(f"  HTTP {ex.response.status_code}: {ex.response.text[:300]}")
    except Exception as ex:
        print(f"  ERROR - {ex}")

print()
print("Done.")
