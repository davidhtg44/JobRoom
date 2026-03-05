# JobRoom 📋

> **Professional Job Application Tracking Platform**

A secure, multi-user web application to manage your job search. Track applications, contacts, and interview progress with a clean, professional interface.

## Features

- 🔐 **User Authentication** - Secure login/register with JWT tokens
- 👤 **Multi-User Support** - Each user has their own private data
- 📊 **Dashboard Stats** - Quick overview of your application pipeline
- 📝 **Full CRUD** - Add, edit, and delete applications
- 🏷️ **Status Tracking** - Track applications through your pipeline
- 🔗 **Job Links** - Store direct links to job postings
- 👤 **Contact Management** - Keep track of recruiters
- 📱 **Responsive Design** - Works on all devices

## Tech Stack

- **Frontend:** React 18 + CSS3
- **Backend:** Python + FastAPI
- **Database:** SQLite
- **Authentication:** JWT (JSON Web Tokens)
- **Password Security:** Bcrypt hashing

## Quick Start

### 1. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Start the Backend

```bash
cd backend
python3 -m uvicorn main:app --reload
```

Backend runs on: **http://localhost:8000**

API documentation: **http://localhost:8000/docs**

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 4. Start the Frontend

```bash
cd frontend
npm start
```

Frontend runs on: **http://localhost:3000**

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |

### Applications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applications` | Get all applications (user's only) |
| GET | `/api/applications/{id}` | Get single application |
| POST | `/api/applications` | Create application |
| PUT | `/api/applications/{id}` | Update application |
| DELETE | `/api/applications/{id}` | Delete application |

## Usage

1. Open http://localhost:3000
2. Register a new account or login
3. Click "+ Add Application" to start tracking
4. Manage your applications with the table actions

## Data Fields

| Field | Description |
|-------|-------------|
| Company Name | The company name |
| Position Title | The role you're applying for |
| Job URL | Link to the job posting |
| Status | Current status (Wanted, Applied, Interview, Offer, Rejected, Withdrawn) |
| Location | Job location |
| Salary Range | Expected/posted salary |
| Contact Name | Recruiter/hiring manager name |
| Contact Email | Contact email address |
| Date Applied | Application submission date |
| Notes | Additional notes |

## Security Notes

⚠️ **For Production:** Change the `SECRET_KEY` in `main.py` to a secure random value.

## License

MIT License
