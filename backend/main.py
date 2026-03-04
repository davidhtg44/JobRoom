from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime
from models import get_db, JobApplication, ApplicationStatus

app = FastAPI(title="Job Application Tracker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    date_created: datetime
    date_updated: datetime

    class Config:
        from_attributes = True


@app.get("/")
def read_root():
    return {"message": "Job Application Tracker API"}


@app.get("/api/applications", response_model=List[JobApplicationResponse])
def get_applications(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    applications = db.query(JobApplication).offset(skip).limit(limit).all()
    return applications


@app.get("/api/applications/{app_id}", response_model=JobApplicationResponse)
def get_application(app_id: int, db: Session = Depends(get_db)):
    application = db.query(JobApplication).filter(JobApplication.id == app_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return application


@app.post("/api/applications", response_model=JobApplicationResponse)
def create_application(
    application: JobApplicationCreate, db: Session = Depends(get_db)
):
    db_application = JobApplication(**application.model_dump())
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    return db_application


@app.put("/api/applications/{app_id}", response_model=JobApplicationResponse)
def update_application(
    app_id: int, application: JobApplicationUpdate, db: Session = Depends(get_db)
):
    db_application = db.query(JobApplication).filter(JobApplication.id == app_id).first()
    if not db_application:
        raise HTTPException(status_code=404, detail="Application not found")

    update_data = application.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_application, key, value)

    db.commit()
    db.refresh(db_application)
    return db_application


@app.delete("/api/applications/{app_id}")
def delete_application(app_id: int, db: Session = Depends(get_db)):
    db_application = db.query(JobApplication).filter(JobApplication.id == app_id).first()
    if not db_application:
        raise HTTPException(status_code=404, detail="Application not found")
    db.delete(db_application)
    db.commit()
    return {"message": "Application deleted"}


@app.get("/api/statuses")
def get_statuses():
    return {"statuses": [status.value for status in ApplicationStatus]}
