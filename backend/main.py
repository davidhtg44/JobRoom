from fastapi import FastAPI, Depends, HTTPException, status, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse
from fastapi.exception_handlers import http_exception_handler as fastapi_http_exception_handler
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from time import time
import bcrypt
import uvicorn
import random
import string
import os
import smtplib
import logging
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
from jose import JWTError, jwt
from models import get_db, JobApplication, User, ApplicationStatus, VerificationCode, PasswordResetCode, Base, engine
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Load environment variables from .env file
load_dotenv()

# ---------------------------------------------------------------------------
# Structured JSON logging
# ---------------------------------------------------------------------------
class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_record: Dict[str, object] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
        }
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_record)


logger = logging.getLogger("jobroom")
logger.setLevel(logging.INFO)
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(JSONFormatter())
    logger.addHandler(_handler)


# ---------------------------------------------------------------------------
# Security settings
# ---------------------------------------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
REFRESH_SECRET_KEY = os.getenv("REFRESH_SECRET_KEY", SECRET_KEY)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 5
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Refresh token cookie settings (defense in depth: token also returned in body
# so existing clients keep working; the cookie is HttpOnly/Secure/SameSite=None)
REFRESH_COOKIE_NAME = "jobroom_refresh"
REFRESH_COOKIE_MAX_AGE = REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
REFRESH_COOKIE_PATH = "/api/auth"

# Gmail SMTP settings
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "")
USE_EMAIL_SERVICE = bool(SMTP_USER and SMTP_PASS)

# --- CORS: restrict to explicit origins (no wildcard) ---
DEFAULT_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000,https://jobroom.fly.dev,https://frontend-psi-ecru.vercel.app"
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", DEFAULT_ORIGINS).split(",")
    if origin.strip()
]

# --- Rate limiting settings ---
RATE_LIMIT_WINDOW = 60        # seconds
RATE_LIMIT_MAX = 10           # max requests per window per key
_rate_limit_store: Dict[str, List[float]] = defaultdict(list)

# --- Request body size limit ---
MAX_BODY_SIZE = 1 * 1024 * 1024  # 1 MB

# --- Password policy ---
MIN_PASSWORD_LENGTH = 8

# In-memory refresh token store (should be replaced with DB/Redis in production)
_refresh_tokens: Dict[str, Dict[str, object]] = {}

app = FastAPI(
    title="JobRoom - Job Application Tracker",
    description="Secure job application tracking API with authentication, email verification, and CRUD for applications.",
    version="1.0.0",
    openapi_tags=[
        {"name": "auth", "description": "Authentication, registration, verification, and password reset."},
        {"name": "applications", "description": "Job application CRUD operations."},
        {"name": "health", "description": "Health check endpoint."},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# ---------------------------------------------------------------------------
# Standardized error responses
# ---------------------------------------------------------------------------
class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None
    timestamp: str = datetime.now(timezone.utc).isoformat()


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler_custom(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "error_code": f"HTTP_{exc.status_code}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error",
            "errors": exc.errors(),
            "error_code": "VALIDATION_ERROR",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.middleware("http")
async def security_and_logging_middleware(request: Request, call_next):
    # Limit request body size
    if request.method in ("POST", "PUT", "PATCH"):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_BODY_SIZE:
            return JSONResponse(status_code=413, content={"detail": "Request body too large"})

    start_time = time()
    response = await call_next(request)
    process_time = (time() - start_time) * 1000

    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    # Structured access log
    logger.info(
        "request_completed",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "process_time_ms": round(process_time, 2),
            "client_host": request.client.host if request.client else "unknown",
        },
    )

    return response


security = HTTPBearer()


@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)


@app.get("/api/health", tags=["health"])
def health_check():
    """Health check endpoint used by Docker/Fly.io"""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


def is_rate_limited(key: str, max_requests: int = RATE_LIMIT_MAX, window: int = RATE_LIMIT_WINDOW) -> bool:
    """Simple in-memory rate limiter. Returns True if the request should be blocked."""
    now = time()
    timestamps = _rate_limit_store[key]
    # Drop expired entries
    while timestamps and timestamps[0] < now - window:
        timestamps.pop(0)
    if len(timestamps) >= max_requests:
        return True
    timestamps.append(now)
    return False


def rate_limit_key(request: Request, action: str) -> str:
    client_host = request.client.host if request.client else "unknown"
    return f"{action}:{client_host}"


def validate_password(password: str) -> List[str]:
    """Return a list of password policy violations (empty list = valid)."""
    errors: List[str] = []
    if len(password) < MIN_PASSWORD_LENGTH:
        errors.append(f"Password must be at least {MIN_PASSWORD_LENGTH} characters long")
    if not any(c.isupper() for c in password):
        errors.append("Password must contain at least one uppercase letter")
    if not any(c.islower() for c in password):
        errors.append("Password must contain at least one lowercase letter")
    if not any(c.isdigit() for c in password):
        errors.append("Password must contain at least one number")
    return errors


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def set_refresh_cookie(response: Response, token: str) -> None:
    """Store the refresh token in an HttpOnly, Secure, SameSite=None cookie."""
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        max_age=REFRESH_COOKIE_MAX_AGE,
        httponly=True,
        secure=True,
        samesite="none",
        path=REFRESH_COOKIE_PATH,
    )


def clear_refresh_cookie(response: Response) -> None:
    """Remove the refresh token cookie on logout."""
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
        secure=True,
        samesite="none",
    )


def send_verification_email(email: str, code: str) -> bool:
    """Send verification code via Gmail SMTP"""
    if not USE_EMAIL_SERVICE:
        # Development mode: log to console
        logger.info("dev_mode_verification_code", extra={"email": email, "code": code})
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

        logger.info("verification_email_sent", extra={"email": email})
        return True

    except Exception as e:
        logger.error("verification_email_error", extra={"email": email, "error": str(e)})
        # Fallback to console
        logger.info("dev_mode_verification_code_fallback", extra={"email": email, "code": code})
        return True


def send_password_reset_email(email: str, code: str) -> bool:
    """Send password reset code via email"""
    if not USE_EMAIL_SERVICE:
        logger.info("dev_mode_password_reset_code", extra={"email": email, "code": code})
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

        logger.info("password_reset_email_sent", extra={"email": email})
        return True
    except Exception as e:
        logger.error("password_reset_email_error", extra={"email": email, "error": str(e)})
        return True


def generate_verification_code() -> str:
    return ''.join(random.choices(string.digits, k=6))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire, "type": "refresh"})
    token = jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)
    # Store in memory (replace with DB/Redis in production)
    _refresh_tokens[token] = {
        "email": data.get("sub"),
        "expires_at": expire,
    }
    return token


def decode_refresh_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            return None
        if token not in _refresh_tokens:
            return None
        expires_at = payload.get("exp")
        if expires_at is None or expires_at < time():
            return None
        return payload
    except JWTError:
        return None


def revoke_refresh_token(token: str) -> None:
    _refresh_tokens.pop(token, None)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserRegisterVerify(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    verification_code: str


class UserLogin(BaseModel):
    email: EmailStr
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
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class VerificationRequest(BaseModel):
    email: EmailStr
    code: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetVerify(BaseModel):
    email: EmailStr
    code: str
    new_password: str


# Job Application Pydantic models
class JobApplicationResponse(BaseModel):
    id: int
    user_id: int
    company_name: str
    position_title: str
    job_url: Optional[str] = None
    status: str
    location: Optional[str] = None
    salary_range: Optional[str] = None
    notes: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    date_applied: Optional[datetime] = None
    date_created: datetime
    date_updated: Optional[datetime] = None

    class Config:
        from_attributes = True


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


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@app.post("/api/auth/register", response_model=dict, tags=["auth"])
def register_init(request: Request, user_data: UserRegister, db: Session = Depends(get_db)):
    """Start registration - send verification code"""
    # Rate limit
    if is_rate_limited(rate_limit_key(request, "register")):
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")

    # Password policy
    password_errors = validate_password(user_data.password)
    if password_errors:
        raise HTTPException(status_code=400, detail=" ".join(password_errors))

    # Normalize email
    email = user_data.email.lower().strip()

    # Check if user exists (generic response to prevent account enumeration)
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        return {
            "message": "If the email is not yet registered, a verification code has been sent",
            "email": email
        }

    # Generate and store verification code
    code = generate_verification_code()
    expires_at = datetime.utcnow() + timedelta(minutes=15)

    # Remove any existing unused codes for this email
    db.query(VerificationCode).filter(
        VerificationCode.email == email,
        VerificationCode.is_used == False
    ).delete()

    # Create verification code (user_id will be set after verification)
    verification = VerificationCode(
        email=email,
        code=code,
        expires_at=expires_at,
        is_used=False
    )
    db.add(verification)
    db.commit()

    # Send verification email
    send_verification_email(email, code)

    return {
        "message": "If the email is not yet registered, a verification code has been sent",
        "email": email
    }


@app.post("/api/auth/register/verify", response_model=TokenResponse, tags=["auth"])
def register_verify(request: Request, data: UserRegisterVerify, response: Response, db: Session = Depends(get_db)):
    """Complete registration with verification code"""
    # Rate limit
    if is_rate_limited(rate_limit_key(request, "register_verify")):
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")

    # Password policy
    password_errors = validate_password(data.password)
    if password_errors:
        raise HTTPException(status_code=400, detail=" ".join(password_errors))

    email = data.email.lower().strip()

    # Find verification code
    verification = db.query(VerificationCode).filter(
        VerificationCode.email == email,
        VerificationCode.code == data.verification_code,
        VerificationCode.is_used == False
    ).first()

    if not verification:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    if verification.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Verification code expired")

    # Check if user exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    hashed_password = get_password_hash(data.password)
    new_user = User(
        email=email,
        password_hash=hashed_password,
        full_name=data.full_name,
        is_verified=True
    )
    db.add(new_user)
    db.flush()  # Assign new_user.id before linking it to the verification code

    # Mark code as used
    verification.is_used = True
    verification.user_id = new_user.id

    db.commit()
    db.refresh(new_user)

    # Create tokens
    access_token = create_access_token(data={"sub": new_user.email})
    refresh_token = create_refresh_token(data={"sub": new_user.email})

    # Also store refresh token in a secure cookie
    set_refresh_cookie(response, refresh_token)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": new_user
    }


@app.post("/api/auth/login", response_model=TokenResponse, tags=["auth"])
def login(request: Request, credentials: UserLogin, response: Response, db: Session = Depends(get_db)):
    # Rate limit
    if is_rate_limited(rate_limit_key(request, "login")):
        raise HTTPException(status_code=429, detail="Too many login attempts. Please try again later.")

    email = credentials.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_verified:
        raise HTTPException(status_code=400, detail="Email not verified. Check your inbox to complete registration.")

    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(data={"sub": user.email})

    # Also store refresh token in a secure cookie
    set_refresh_cookie(response, refresh_token)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }


@app.post("/api/auth/refresh", response_model=dict, tags=["auth"])
def refresh_token(request: Request, data: RefreshTokenRequest, response: Response):
    """Issue a new access token using a valid refresh token"""
    # Rate limit
    if is_rate_limited(rate_limit_key(request, "refresh")):
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")

    payload = decode_refresh_token(data.refresh_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    email = payload.get("sub")
    # Revoke old refresh token (rotation)
    revoke_refresh_token(data.refresh_token)
    new_access_token = create_access_token(data={"sub": email})
    new_refresh_token = create_refresh_token(data={"sub": email})

    # Rotate the secure cookie as well
    set_refresh_cookie(response, new_refresh_token)

    return {"access_token": new_access_token, "refresh_token": new_refresh_token, "token_type": "bearer"}


@app.post("/api/auth/logout", response_model=dict, tags=["auth"])
def logout(data: RefreshTokenRequest, response: Response):
    """Revoke refresh token"""
    revoke_refresh_token(data.refresh_token)
    clear_refresh_cookie(response)
    return {"message": "Logged out successfully"}


@app.get("/api/auth/me", response_model=UserResponse, tags=["auth"])
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@app.put("/api/auth/me", response_model=UserResponse, tags=["auth"])
def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    update_data = user_update.model_dump(exclude_unset=True)

    if "password" in update_data and update_data["password"]:
        password_errors = validate_password(update_data["password"])
        if password_errors:
            raise HTTPException(status_code=400, detail=" ".join(password_errors))
        current_user.password_hash = get_password_hash(update_data["password"])
        del update_data["password"]

    for key, value in update_data.items():
        setattr(current_user, key, value)

    db.commit()
    db.refresh(current_user)
    return current_user


@app.post("/api/auth/resend-code", tags=["auth"])
def resend_code(request: Request, email: str, db: Session = Depends(get_db)):
    """Resend verification code (generic response to prevent email enumeration)"""
    # Rate limit
    if is_rate_limited(rate_limit_key(request, "resend_code")):
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")

    email = email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if user and user.is_verified:
        # Generic response to prevent enumeration
        return {"message": "If the email exists and is unverified, a new code has been sent"}

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
        user_id=user.id if user else None
    )
    db.add(verification)
    db.commit()

    # Send verification email
    send_verification_email(email, code)

    return {"message": "If the email exists and is unverified, a new code has been sent"}


# Password Reset Endpoints
@app.post("/api/auth/password-reset/request", tags=["auth"])
def request_password_reset(request: Request, data: PasswordResetRequest, db: Session = Depends(get_db)):
    """Request password reset code"""
    # Rate limit
    if is_rate_limited(rate_limit_key(request, "password_reset_request")):
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")

    email = data.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()

    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If the email exists, a reset code has been sent"}

    # Generate reset code
    code = generate_verification_code()
    expires_at = datetime.utcnow() + timedelta(minutes=15)

    # Invalidate old reset codes
    db.query(PasswordResetCode).filter(
        PasswordResetCode.email == email,
        PasswordResetCode.is_used == False
    ).delete()

    reset_code = PasswordResetCode(
        user_id=user.id,
        email=email,
        code=code,
        expires_at=expires_at
    )
    db.add(reset_code)
    db.commit()

    # Send reset email
    send_password_reset_email(email, code)

    return {"message": "If the email exists, a reset code has been sent"}


@app.post("/api/auth/password-reset/verify", tags=["auth"])
def verify_password_reset(request: Request, data: PasswordResetVerify, db: Session = Depends(get_db)):
    """Verify reset code and set new password"""
    # Rate limit
    if is_rate_limited(rate_limit_key(request, "password_reset_verify")):
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")

    # Password policy
    password_errors = validate_password(data.new_password)
    if password_errors:
        raise HTTPException(status_code=400, detail=" ".join(password_errors))

    email = data.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Do dummy work to blunt timing differences, then return a generic error
        get_password_hash("dummy-timing-equalizer")
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    # Find valid reset code
    reset_code = db.query(PasswordResetCode).filter(
        PasswordResetCode.email == email,
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


# ---------------------------------------------------------------------------
# Application endpoints
# ---------------------------------------------------------------------------
@app.get("/api/applications", response_model=List[JobApplicationResponse], tags=["applications"])
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


@app.get("/api/applications/{app_id}", response_model=JobApplicationResponse, tags=["applications"])
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


@app.post("/api/applications", response_model=JobApplicationResponse, tags=["applications"])
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


@app.put("/api/applications/{app_id}", response_model=JobApplicationResponse, tags=["applications"])
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


@app.delete("/api/applications/{app_id}", tags=["applications"])
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


# ---------------------------------------------------------------------------
# SPA static file serving (frontend build)
# ---------------------------------------------------------------------------
static_path = os.path.join(os.path.dirname(__file__), "static")

if os.path.exists(static_path):
    # Mount static assets under /static so API routes keep precedence
    app.mount("/static", StaticFiles(directory=static_path), name="static")

    @app.exception_handler(404)
    async def spa_fallback(request: Request, exc):
        # API routes should return JSON 404, not the SPA
        if request.url.path.startswith("/api/"):
            return JSONResponse(
                status_code=404,
                content={"detail": "Not found", "error_code": "HTTP_404", "timestamp": datetime.now(timezone.utc).isoformat()}
            )
        return FileResponse(os.path.join(static_path, "index.html"))


if __name__ == "__main__":
    # Prende la porta dalle variabili d'ambiente di Fly.io o usa la 8080 di default
    port = int(os.getenv("PORT", 8080))
    # 'app' deve coincidere con il nome della variabile FastAPI definita sopra
    # host '0.0.0.0' è OBBLIGATORIO per Docker/Fly.io
    uvicorn.run(app, host="0.0.0.0", port=port)
