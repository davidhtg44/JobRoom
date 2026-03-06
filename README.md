# JobRoom 📋

> **Professional Job Application Tracking Platform**

A secure, multi-user web application to manage your job search with a clean, professional interface and Chrome extension for quick job saving.

**Live Demo:** https://jobroom.fly.dev

---

## ✨ Features

- 🔐 **User Authentication** - Secure JWT-based auth with bcrypt password hashing
- 📧 **Email Verification** - Verify emails during registration
- 🔑 **Password Recovery** - Reset password via email code
- 📊 **Dashboard Analytics** - Track your application pipeline
- 🔌 **Chrome Extension** - Auto-extract job details from 12+ job boards
- 📱 **Mobile Responsive** - Works perfectly on all devices
- 🎨 **Professional UI** - Clean, modern Swiss design

---

## 🚀 Quick Start

### Local Development

#### Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your SMTP credentials

# Run server
python3 -m uvicorn main:app --reload
```

Backend runs on: http://localhost:8000
API Docs: http://localhost:8000/docs

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm start
```

Frontend runs on: http://localhost:3000

---

## 📦 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete Fly.io deployment guide.

### Quick Deploy

```bash
# Backend
cd backend
fly launch
fly volumes create jobroom_data --region fra --size 1
fly secrets set SECRET_KEY=$(openssl rand -hex 32)
fly secrets set SMTP_USER=your-email@gmail.com
fly secrets set SMTP_PASS=your-app-password
fly deploy

# Frontend
cd ../frontend
fly launch
fly deploy
```

---

## 📁 Project Structure

```
job_tracker/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── models.py            # SQLAlchemy models
│   ├── requirements.txt     # Python dependencies
│   ├── Dockerfile           # Production container
│   ├── fly.toml            # Fly.io config
│   └── .env.example        # Environment template
├── frontend/
│   ├── src/
│   │   ├── App.js          # Main app component
│   │   ├── App.css         # App styles
│   │   ├── Landing.js      # Landing page
│   │   ├── Landing.css     # Landing styles
│   │   └── index.js        # Entry point
│   ├── public/
│   │   └── index.html
│   ├── Dockerfile          # Production container
│   ├── nginx.conf          # Nginx config
│   ├── fly.toml           # Fly.io config
│   └── package.json
├── chrome-extension/
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.css
│   ├── popup.js
│   └── content.js
├── DEPLOYMENT.md           # Deployment guide
└── README.md
```

---

## 🔌 Chrome Extension

Auto-extract job details from LinkedIn, Indeed, Glassdoor, and 10+ job boards.

### Install

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `chrome-extension` folder

### Usage

1. Navigate to any job posting
2. Click extension icon
3. Click **Auto-Extract**
4. Click **Save to JobRoom**

---

## 🛡️ Security

- **Password Hashing:** bcrypt with salt
- **Authentication:** JWT tokens (30min expiry)
- **Email Verification:** 6-digit codes (15min expiry)
- **Password Reset:** Secure email-based reset
- **CORS:** Configured for production domains
- **HTTPS:** Enforced in production

---

## 📊 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/register/verify` | Verify registration code |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/me` | Update profile |
| POST | `/api/auth/password-reset/request` | Request reset code |
| POST | `/api/auth/password-reset/verify` | Reset password |

### Applications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applications` | Get all applications |
| GET | `/api/applications/{id}` | Get single application |
| POST | `/api/applications` | Create application |
| PUT | `/api/applications/{id}` | Update application |
| DELETE | `/api/applications/{id}` | Delete application |

---

## 🧰 Tech Stack

**Backend:**
- Python 3.11
- FastAPI
- SQLAlchemy (SQLite)
- Bcrypt
- Python-JOSE (JWT)
- SMTPLib (Email)

**Frontend:**
- React 18
- CSS3 (Mobile-first)
- Bootstrap 5

**Infrastructure:**
- Fly.io (Deployment)
- Docker (Containerization)
- Nginx (Reverse Proxy)

---

## 📝 Environment Variables

### Backend (.env)

```bash
# Security
SECRET_KEY=your-secret-key-here

# Email (Gmail)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@gmail.com

# CORS
ALLOWED_ORIGINS=https://jobroom.fly.dev,https://jobroom-api.fly.dev

# Database (Fly.io)
DATABASE_URL=sqlite:////app/data/job_applications.db
```

---

## 🧪 Testing

### Test Registration

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}'
```

### Test Login

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}'
```

### Test Health Check

```bash
curl http://localhost:8000/api/health
```

---

## 📈 Monitoring

```bash
# View logs
fly logs --app jobroom-api

# Check status
fly status

# SSH into machine
fly ssh console --app jobroom-api

# Check database
sqlite3 /app/data/job_applications.db
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 📞 Support

- **Email:** jobroom.info@gmail.com
- **Issues:** https://github.com/davidhtg44/JobRoom/issues
- **Documentation:** https://github.com/davidhtg44/JobRoom/blob/main/DEPLOYMENT.md

---

## 🎯 Roadmap

- [ ] Export applications to CSV/PDF
- [ ] Email notifications for status changes
- [ ] Calendar integration for interview scheduling
- [ ] Resume storage and parsing
- [ ] Job search aggregation
- [ ] Mobile app (React Native)

---

**Made with ❤️ by David**

Track your job applications with style.
