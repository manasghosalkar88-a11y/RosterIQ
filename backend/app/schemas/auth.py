from typing import Optional
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[UserRole] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# Forward reference will be resolved when imported with UserOut
from app.schemas.user import UserOut
Token.model_rebuild()
