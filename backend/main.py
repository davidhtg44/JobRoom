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
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
from jose import JWTError, jwt
from models import get_db, JobApplication, User, ApplicationStatus, VerificationCode, PasswordResetCode

# Load environment variables from .env file
load_dotenv()

# Security settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Gmail SMTP settings
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "")
USE_EMAIL_SERVICE = bool(SMTP_USER and SMTP_PASS)

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


def send_verification_email(email: str, code: str):
    """Send verification code via Gmail SMTP"""
    if not USE_EMAIL_SERVICE:
        # Development mode: log to console
        print(f"📧 [DEV MODE] Verification code for {email}: {code}")
        print(f"   Configure SMTP in .env to send real emails")
        return True
    
    try:
        # Create email message
        msg = MIMEMultipart('alternative')
        msg['From'] = FROM_EMAIL or SMTP_USER
        msg['To'] = email
        msg['Subject'] = 'JobRoom - Your Verification Code'
        
        # Plain text version
        text = f"""
        JobRoom Verification Code
        
        Your verification code is: {code}
        
        This code will expire in 15 minutes.
        
        If you didn't request this code, please ignore this email.
        
        ---
        JobRoom - Track your job applications with style
        """
        
        # HTML version
        html = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }}
                .header {{ background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); 
                          padding: 30px; text-align: center; }}
                .header h1 {{ color: white; margin: 0; }}
                .header p {{ color: rgba(255,255,255,0.8); }}
                .content {{ padding: 30px; background: #f8fafc; }}
                .code {{ background: #1a1a2e; color: white; font-size: 32px; 
                        font-weight: bold; padding: 20px; border-radius: 8px; 
                        text-align: center; letter-spacing: 8px; margin: 20px 0; }}
                .footer {{ padding: 20px; text-align: center; color: #64748b; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>JobRoom</h1>
                <p>Your Verification Code</p>
            </div>
            <div class="content">
                <p>Hello,</p>
                <p>Thank you for registering with JobRoom. Your verification code is:</p>
                <div class="code">{code}</div>
                <p>This code will expire in <strong>15 minutes</strong>.</p>
                <p>If you didn't request this code, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>&copy; {datetime.now().year} JobRoom. All rights reserved.</p>
                <p>Track your job applications with style.</p>
            </div>
        </body>
        </html>
        """
        
        # Attach both versions
        msg.attach(MIMEText(text, 'plain'))
        msg.attach(MIMEText(html, 'html'))
        
        # Send via Gmail SMTP
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()
        
        print(f"📧 Email sent to {email}")
        return True
        
    except Exception as e:
        print(f"❌ Error sending email: {str(e)}")
        # Fallback to console
        print(f"📧 [FALLBACK] Verification code for {email}: {code}")
        return True


def send_password_reset_email(email: str, code: str):
    """Send password reset code via email"""
    if not USE_EMAIL_SERVICE:
        print(f"📧 [DEV MODE] Password reset code for {email}: {code}")
        return True
    
    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = FROM_EMAIL or SMTP_USER
        msg['To'] = email
        msg['Subject'] = 'JobRoom - Password Reset Code'
        
        text = f"""JobRoom Password Reset\n\nYour reset code: {code}\n\nExpires in 15 minutes.\n\nIf you didn't request this, ignore this email."""
        
        html = f"""
        <html><body style="font-family:Arial;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:30px;text-align:center;">
            <h1 style="color:white;margin:0;">JobRoom</h1>
            <p style="color:rgba(255,255,255,0.8);">Password Reset</p>
        </div>
        <div style="padding:30px;background:#f8fafc;">
            <p>Hello,</p>
            <p>Your password reset code is:</p>
            <div style="background:#dc2626;color:white;font-size:32px;font-weight:bold;
                padding:20px;border-radius:8px;text-align:center;letter-spacing:8px;margin:20px 0;">
                {code}
            </div>
            <p>Expires in <strong>15 minutes</strong>.</p>
            <p style="color:#64748b;font-size:0.9rem;">Didn't request this? Ignore this email.</p>
        </div>
        <div style="padding:20px;text-align:center;color:#64748b;font-size:12px;">
            <p>JobRoom - jobroom.info@gmail.com</p>
        </div>
        </body></html>
        """
        
        msg.attach(MIMEText(text, 'plain'))
        msg.attach(MIMEText(html, 'html'))
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()
        
        print(f"📧 Reset email sent to {email}")
        return True
    except Exception as e:
        print(f"❌ Reset email error: {e}")
        return True


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


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetVerify(BaseModel):
    email: str
    code: str
    new_password: str


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
    
    # Send verification email
    send_verification_email(user_data.email, code)
    
    return {
        "message": "Verification code sent to email",
        "email": user_data.email
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

    # Send verification email
    send_verification_email(email, code)

    return {
        "message": "Verification code resent to email"
    }


# Password Reset Endpoints
@app.post("/api/auth/password-reset/request")
def request_password_reset(data: PasswordResetRequest, db: Session = Depends(get_db)):
    """Request password reset code"""
    user = db.query(User).filter(User.email == data.email).first()
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If the email exists, a reset code has been sent"}
    
    # Generate reset code
    code = generate_verification_code()
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    # Invalidate old reset codes
    db.query(PasswordResetCode).filter(
        PasswordResetCode.email == data.email,
        PasswordResetCode.is_used == False
    ).delete()
    
    reset_code = PasswordResetCode(
        user_id=user.id,
        email=data.email,
        code=code,
        expires_at=expires_at
    )
    db.add(reset_code)
    db.commit()
    
    # Send reset email
    send_password_reset_email(data.email, code)
    
    return {"message": "If the email exists, a reset code has been sent"}


@app.post("/api/auth/password-reset/verify")
def verify_password_reset(data: PasswordResetVerify, db: Session = Depends(get_db)):
    """Verify reset code and set new password"""
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid request")
    
    # Find valid reset code
    reset_code = db.query(PasswordResetCode).filter(
        PasswordResetCode.email == data.email,
        PasswordResetCode.code == data.code,
        PasswordResetCode.is_used == False
    ).first()
    
    if not reset_code:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    
    if reset_code.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Code expired")
    
    # Update password
    user.password_hash = get_password_hash(data.new_password)
    
    # Mark code as used
    reset_code.is_used = True
    db.commit()
    
    return {"message": "Password reset successfully"}


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
