from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import enum

DATABASE_URL = "sqlite:///./job_applications.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class ApplicationStatus(str, enum.Enum):
    WANTED = "wanted"
    APPLIED = "applied"
    INTERVIEW = "interview"
    OFFER = "offer"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    bio = Column(Text, nullable=True)
    is_verified = Column(Boolean, default=False)
    date_created = Column(DateTime, default=datetime.utcnow)
    
    applications = relationship("JobApplication", back_populates="user", cascade="all, delete-orphan")
    verification_codes = relationship("VerificationCode", back_populates="user", cascade="all, delete-orphan")


class VerificationCode(Base):
    __tablename__ = "verification_codes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    code = Column(String(6), nullable=False)
    email = Column(String(255), nullable=False)
    is_used = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="verification_codes")


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    company_name = Column(String(255), nullable=False)
    position_title = Column(String(255), nullable=False)
    job_url = Column(String(500), nullable=True)
    status = Column(String(50), default=ApplicationStatus.WANTED.value)
    location = Column(String(255), nullable=True)
    salary_range = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    contact_name = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=True)
    date_applied = Column(DateTime, nullable=True)
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="applications")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


Base.metadata.create_all(bind=engine)
