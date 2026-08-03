from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from app.core.database import Base

class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    endpoint = Column(String(2048), unique=True, nullable=False)
    p256dh = Column(String(512), nullable=False)
    auth = Column(String(512), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
