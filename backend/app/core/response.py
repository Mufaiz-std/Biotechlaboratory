from typing import Any

from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Any = None
    errors: list[str] | None = None


def success_response(
    message: str = "Success",
    data: Any = None,
    status_code: int = 200,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=ApiResponse(success=True, message=message, data=data, errors=None).model_dump(mode="json"),
    )


def error_response(
    message: str,
    errors: list[str] | None = None,
    status_code: int = 400,
    data: Any = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=ApiResponse(success=False, message=message, data=data, errors=errors).model_dump(mode="json"),
    )
