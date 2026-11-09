from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User, UserRole
from app.schemas.auth import Token, LoginRequest
from app.schemas.user import UserOut, UserCreate
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/login", response_model=Token, summary="User Login (JSON)")
def login_json(credentials: LoginRequest, db: Session = Depends(get_db)):
    """Authenticates a user via JSON body and returns a signed JWT access token."""
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Please contact operations admin.",
        )

    access_token = create_access_token(subject=user.id, role=user.role.value)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }


@router.post("/token", summary="OAuth2 Token Login (Form-data for Swagger Docs)")
def login_form(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2 form-data compliant login endpoint for Swagger UI testing."""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(subject=user.id, role=user.role.value)
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserOut, summary="Get Current Authenticated User")
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile and linked employee information."""
    return current_user


@router.post("/seed-users", summary="Seed Default System Users for Demo/Testing")
def seed_default_users(db: Session = Depends(get_db)):
    """
    Seeds canonical user accounts for all 4 roles to allow instant role-switching during evaluation:
    - Super Admin: admin@datastraw.io (Pass: Admin@123)
    - Operations Manager: ops@datastraw.io (Pass: Ops@123)
    - Pod Lead: lead@datastraw.io (Pass: Lead@123)
    - Employee: emp@datastraw.io (Pass: Emp@123)
    """
    canonical_users = [
        {
            "email": "admin@datastraw.io",
            "full_name": "Aarav Mehta (Super Admin)",
            "password": "Admin@123",
            "role": UserRole.SUPER_ADMIN,
        },
        {
            "email": "ops@datastraw.io",
            "full_name": "Rohan Gupta (Operations Manager)",
            "password": "Ops@123",
            "role": UserRole.OPS_MANAGER,
        },
        {
            "email": "lead@datastraw.io",
            "full_name": "Sneha Sen (Pod Lead - Pod Alpha)",
            "password": "Lead@123",
            "role": UserRole.POD_LEAD,
        },
        {
            "email": "emp@datastraw.io",
            "full_name": "Vikram Patel (Operations Specialist)",
            "password": "Emp@123",
            "role": UserRole.EMPLOYEE,
        },
    ]

    created_accounts = []
    for u in canonical_users:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if not existing:
            new_user = User(
                email=u["email"],
                full_name=u["full_name"],
                hashed_password=get_password_hash(u["password"]),
                role=u["role"],
                is_active=True,
            )
            db.add(new_user)
            db.commit()
            created_accounts.append({"email": u["email"], "role": u["role"].value, "status": "Created"})
        else:
            created_accounts.append({"email": u["email"], "role": existing.role.value, "status": "Existing"})

    return {
        "message": "Demo users ready for testing",
        "accounts": created_accounts,
    }
