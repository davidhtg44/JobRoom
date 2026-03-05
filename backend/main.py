from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
import bcrypt
import random
import string
from jose import JWTError, jwt
from models import get_db, JobApplication, User, ApplicationStatus, VerificationCode

# Security settings
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

app = FastAPI(title="JobRoom - Job Application Tracker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()


def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def generate_verification_code():
    return ''.join(random.choices(string.digits, k=6))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# Pydantic models
class UserRegister(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None


class UserRegisterVerify(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    verification_code: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    password: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    is_verified: bool = False
    date_created: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class VerificationRequest(BaseModel):
    email: str
    code: str


# Job Application Pydantic models
class JobApplicationCreate(BaseModel):
    company_name: str
    position_title: str
    job_url: Optional[str] = None
    status: str = ApplicationStatus.WANTED.value
    location: Optional[str] = None
    salary_range: Optional[str] = None
    notes: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    date_applied: Optional[datetime] = None


class JobApplicationUpdate(BaseModel):
    company_name: Optional[str] = None
    position_title: Optional[str] = None
    job_url: Optional[str] = None
    status: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    notes: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    date_applied: Optional[datetime] = None


class JobApplicationResponse(JobApplicationCreate):
    id: int
    user_id: int
    date_created: datetime
    date_updated: datetime

    class Config:
        from_attributes = True


# Auth endpoints
@app.post("/api/auth/register", response_model=dict)
def register_init(user_data: UserRegister, db: Session = Depends(get_db)):
    """Start registration - send verification code"""
    # Check if user exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate and store verification code
    code = generate_verification_code()
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    # Remove any existing unused codes for this email
    db.query(VerificationCode).filter(
        VerificationCode.email == user_data.email,
        VerificationCode.is_used == False
    ).delete()
    
    # Create verification code (user_id will be set after verification)
    verification = VerificationCode(
        email=user_data.email,
        code=code,
        expires_at=expires_at,
        is_used=False
    )
    db.add(verification)
    db.commit()
    
    # In production, send email here. For now, return code for testing.
    print(f"📧 Verification code for {user_data.email}: {code}")
    
    return {
        "message": "Verification code sent to email",
        "email": user_data.email,
        # Remove in production:
        "debug_code": code
    }


@app.post("/api/auth/register/verify", response_model=TokenResponse)
def register_verify(data: UserRegisterVerify, db: Session = Depends(get_db)):
    """Complete registration with verification code"""
    # Find verification code
    verification = db.query(VerificationCode).filter(
        VerificationCode.email == data.email,
        VerificationCode.code == data.verification_code,
        VerificationCode.is_used == False
    ).first()
    
    if not verification:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")
    
    if verification.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Verification code expired")
    
    # Check if user exists
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(data.password)
    new_user = User(
        email=data.email,
        password_hash=hashed_password,
        full_name=data.full_name,
        is_verified=True
    )
    db.add(new_user)
    
    # Mark code as used
    verification.is_used = True
    verification.user_id = new_user.id
    
    db.commit()
    db.refresh(new_user)
    
    # Create token
    access_token = create_access_token(data={"sub": new_user.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }


@app.post("/api/auth/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": user.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@app.get("/api/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@app.put("/api/auth/me", response_model=UserResponse)
def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    update_data = user_update.model_dump(exclude_unset=True)
    
    if "password" in update_data and update_data["password"]:
        current_user.password_hash = get_password_hash(update_data["password"])
        del update_data["password"]
    
    for key, value in update_data.items():
        setattr(current_user, key, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user


@app.post("/api/auth/resend-code")
def resend_code(email: str, db: Session = Depends(get_db)):
    """Resend verification code"""
    user = db.query(User).filter(User.email == email).first()
    if user and user.is_verified:
        raise HTTPException(status_code=400, detail="Email already verified")
    
    # Generate new code
    code = generate_verification_code()
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    # Invalidate old codes
    db.query(VerificationCode).filter(
        VerificationCode.email == email,
        VerificationCode.is_used == False
    ).delete()
    
    verification = VerificationCode(
        email=email,
        code=code,
        expires_at=expires_at,
        user_id=user.id if user else 0
    )
    db.add(verification)
    db.commit()
    
    print(f"📧 New verification code for {email}: {code}")
    
    return {
        "message": "Verification code resent",
        "debug_code": code
    }


# Application endpoints
@app.get("/api/applications", response_model=List[JobApplicationResponse])
def get_applications(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    applications = db.query(JobApplication).filter(
        JobApplication.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    return applications


@app.get("/api/applications/{app_id}", response_model=JobApplicationResponse)
def get_application(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    application = db.query(JobApplication).filter(
        JobApplication.id == app_id,
        JobApplication.user_id == current_user.id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return application


@app.post("/api/applications", response_model=JobApplicationResponse)
def create_application(
    application: JobApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_application = JobApplication(
        **application.model_dump(),
        user_id=current_user.id
    )
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    return db_application


@app.put("/api/applications/{app_id}", response_model=JobApplicationResponse)
def update_application(
    app_id: int,
    application: JobApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_application = db.query(JobApplication).filter(
        JobApplication.id == app_id,
        JobApplication.user_id == current_user.id
    ).first()
    if not db_application:
        raise HTTPException(status_code=404, detail="Application not found")

    update_data = application.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_application, key, value)

    db.commit()
    db.refresh(db_application)
    return db_application


@app.delete("/api/applications/{app_id}")
def delete_application(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_application = db.query(JobApplication).filter(
        JobApplication.id == app_id,
        JobApplication.user_id == current_user.id
    ).first()
    if not db_application:
        raise HTTPException(status_code=404, detail="Application not found")
    db.delete(db_application)
    db.commit()
    return {"message": "Application deleted"}


@app.get("/api/statuses")
def get_statuses():
    return {"statuses": [status.value for status in ApplicationStatus]}
