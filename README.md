# JobRoom 🚀

> **Track your job applications with style**

A modern, beautiful web application to manage your job search journey. Keep track of companies, positions, application status, contacts, and notes all in one place.

![JobRoom](https://img.shields.io/badge/React-18-blue?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-Latest-green?logo=fastapi)
![SQLite](https://img.shields.io/badge/Database-SQLite-blue?logo=sqlite)

## ✨ Features

- 📊 **Dashboard Stats** - See your application pipeline at a glance
- 🎨 **Beautiful UI** - Modern gradient design with smooth animations
- 📝 **Full CRUD** - Add, edit, and delete applications
- 🏷️ **Status Tracking** - Wanted → Applied → Interview → Offer/Rejected
- 🔗 **Job Links** - Store direct links to job postings
- 👤 **Contact Info** - Keep track of recruiters and hiring managers
- 📍 **Location & Salary** - Record important job details
- 📱 **Responsive** - Works on desktop and mobile

## 🛠️ Tech Stack

- **Frontend:** React 18 + Bootstrap 5 + Custom CSS
- **Backend:** Python + FastAPI
- **Database:** SQLite

## 🚀 Quick Start

### 1. Start the Backend

```bash
cd backend
pip install -r requirements.txt
python3 -m uvicorn main:app --reload
```

Backend runs on: **http://localhost:8000**

API documentation: **http://localhost:8000/docs**

### 2. Start the Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs on: **http://localhost:3000**

## 📊 Data Fields

| Field | Description |
|-------|-------------|
| Company Name | The company you're applying to |
| Position Title | The role you're applying for |
| Job URL | Link to the job posting |
| Status | Current application status |
| Location | Job location (remote, city, etc.) |
| Salary Range | Expected/posted salary |
| Contact Name | Recruiter/hiring manager name |
| Contact Email | Contact email address |
| Date Applied | When you submitted the application |
| Notes | Any additional notes |

## 📸 Screenshots

The app features:
- A beautiful gradient purple header with animated logo
- Stats cards showing Total, Wanted, Applied, Interview, and Offers
- Clean white card with application table
- Smooth animations and hover effects
- Mobile-responsive design

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applications` | Get all applications |
| GET | `/api/applications/{id}` | Get single application |
| POST | `/api/applications` | Create application |
| PUT | `/api/applications/{id}` | Update application |
| DELETE | `/api/applications/{id}` | Delete application |
| GET | `/api/statuses` | Get available statuses |

## 📝 Example Request

```bash
curl -X POST http://localhost:8000/api/applications \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Google",
    "position_title": "Software Engineer",
    "job_url": "https://careers.google.com/jobs/123",
    "status": "applied",
    "location": "Mountain View, CA",
    "salary_range": "$150k - $200k"
  }'
```

## 🙏 Made with ❤️

Happy job hunting! 🍀
