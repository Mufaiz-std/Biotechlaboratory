from fastapi import APIRouter

from app.core.response import success_response

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    return success_response(message="Service is healthy", data={"status": "ok"})
