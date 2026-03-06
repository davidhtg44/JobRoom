# 🚀 Fly.io Deployment Guide

Complete guide to deploy JobRoom to Fly.io with persistent database storage.

---

## 📋 Prerequisites

1. **Fly.io Account** - Sign up at https://fly.io
2. **Fly.io CLI** - Install from https://fly.io/docs/hands-on/install-flyctl/
3. **GitHub Account** - Your code should be on GitHub

---

## 🔧 Installation

### Install Fly.io CLI

```bash
# macOS/Linux
curl -L https://fly.io/install.sh | sh

# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Verify installation
fly version
```

### Login to Fly.io

```bash
fly auth login
```

---

## 🗄️ Database Setup

Fly.io uses **persistent volumes** to store the SQLite database.

### Create Volume

```bash
cd backend
fly volumes create jobroom_data --region fra --size 1
```

This creates a 1GB persistent volume in Frankfurt (fra).

**Available regions:**
- `fra` - Frankfurt, Germany (Europe)
- `ams` - Amsterdam, Netherlands (Europe)
- `lhr` - London, UK (Europe)
- `cdg` - Paris, France (Europe)
- `iad` - Washington DC, USA
- `sjc` - San Jose, USA
- `sea` - Seattle, USA

---

## 🚀 Deploy Backend

### Step 1: Navigate to Backend

```bash
cd /Users/kamm/Desktop/Qwen/job_tracker/backend
```

### Step 2: Launch Fly.io App

```bash
fly launch --name jobroom-api --region fra
```

When prompted:
- **Would you like to copy its configuration to the app?** → No
- **Do you want to tweak these settings before proceeding?** → No

### Step 3: Set Environment Variables

```bash
# Security
fly secrets set SECRET_KEY=$(openssl rand -hex 32)

# Email (Gmail SMTP)
fly secrets set SMTP_SERVER=smtp.gmail.com
fly secrets set SMTP_PORT=587
fly secrets set SMTP_USER=kammdavid42@gmail.com
fly secrets set SMTP_PASS=vsdg auqx kcpy krvh
fly secrets set FROM_EMAIL=kammdavid42@gmail.com

# CORS (your frontend URL - update after frontend deployment)
fly secrets set ALLOWED_ORIGINS="https://jobroom.fly.dev,https://jobroom-api.fly.dev"
```

### Step 4: Deploy

```bash
fly deploy --remote-only
```

### Step 5: Verify Deployment

```bash
# Check status
fly status

# View logs
fly logs

# Test health endpoint
curl https://jobroom-api.fly.dev/api/health

# Open in browser
fly open
```

---

## 🎨 Deploy Frontend

### Step 1: Navigate to Frontend

```bash
cd /Users/kamm/Desktop/Qwen/job_tracker/frontend
```

### Step 2: Update nginx.conf

Edit `frontend/nginx.conf` and replace the backend URL:

```nginx
# Change this line:
proxy_pass https://jobroom-api.fly.dev;

# To your actual backend URL (from backend deployment)
proxy_pass https://jobroom-api.fly.dev;
```

### Step 3: Launch Fly.io App

```bash
fly launch --name jobroom --region fra
```

When prompted:
- **Would you like to copy its configuration to the app?** → No
- **Do you want to tweak these settings before proceeding?** → No

### Step 4: Set Backend API URL

```bash
# Note: This is handled by nginx.conf proxy
# No environment variables needed for frontend
```

### Step 5: Deploy

```bash
fly deploy --remote-only
```

### Step 6: Verify Deployment

```bash
# Check status
fly status

# View logs
fly logs

# Open in browser
fly open
```

---

## 📱 Update Chrome Extension

After deployment, update the Chrome extension URLs:

### Edit `chrome-extension/manifest.json`:

```json
"host_permissions": [
  "https://jobroom-api.fly.dev/*",
  "https://jobroom.fly.dev/*"
],
```

### Edit `chrome-extension/popup.js`:

```javascript
const API_URL = 'https://jobroom-api.fly.dev/api';

// And in the openJobRoom button:
chrome.tabs.create({ url: 'https://jobroom.fly.dev' });
```

### Reload Extension:

1. Go to `chrome://extensions/`
2. Find JobRoom
3. Click refresh icon ⟳

---

## 🔍 Monitoring & Management

### View Logs

```bash
# Backend logs
fly logs --app jobroom-api

# Frontend logs
fly logs --app jobroom

# Real-time logs
fly logs --app jobroom-api --follow
```

### Check Status

```bash
fly status --app jobroom-api
fly status --app jobroom
```

### Restart App

```bash
fly restart --app jobroom-api
fly restart --app jobroom
```

### Scale Resources

```bash
# Increase memory (backend)
fly scale vm jobroom-api --memory 1024

# Add more instances
fly scale count jobroom-api 2
```

### Open Console

```bash
# SSH into running machine
fly ssh console --app jobroom-api

# Check database
sqlite3 /app/data/job_applications.db
```

---

## 📊 Database Backup

### Download Database

```bash
# SSH into machine
fly ssh console --app jobroom-api

# Copy database to local
fly ssh sftp get /app/data/job_applications.db ./backup.db
```

### Restore Database

```bash
# Upload backup
fly ssh sftp put ./backup.db /app/data/job_applications.db

# Restart app
fly restart --app jobroom-api
```

---

## 🔐 Security Best Practices

### 1. Update SECRET_KEY

Generate a new secret key:

```bash
fly secrets set SECRET_KEY=$(openssl rand -hex 32)
fly restart --app jobroom-api
```

### 2. Enable HTTPS

Already enabled by default in `fly.toml`:

```toml
[http_service]
  force_https = true
```

### 3. Restrict CORS

Update allowed origins:

```bash
fly secrets set ALLOWED_ORIGINS="https://jobroom.fly.dev"
```

### 4. Monitor Logs

```bash
fly logs --app jobroom-api --follow
```

---

## ⚠️ Troubleshooting

### App Won't Start

```bash
# Check logs
fly logs --app jobroom-api

# Check volume is mounted
fly ssh console --app jobroom-api
ls -la /app/data/
```

### Database Errors

```bash
# SSH into machine
fly ssh console --app jobroom-api

# Check database permissions
ls -la /app/data/job_applications.db

# Fix permissions if needed
chmod 644 /app/data/job_applications.db
```

### CORS Errors

```bash
# Update allowed origins
fly secrets set ALLOWED_ORIGINS="https://jobroom.fly.dev,https://jobroom-api.fly.dev"

# Restart app
fly restart --app jobroom-api
```

### Email Not Sending

```bash
# Check SMTP credentials
fly secrets list

# Re-set SMTP password if needed
fly secrets set SMTP_PASS=your-app-password

# Restart app
fly restart --app jobroom-api
```

---

## 💰 Pricing

Fly.io free tier includes:

- **3 shared-cpu-1x VMs** (256MB RAM each)
- **3GB persistent volume storage**
- **160GB outbound data transfer**

**Estimated cost for JobRoom:**
- Backend (512MB): ~$2/month
- Frontend (256MB): ~$0 (free tier)
- Database (1GB): ~$0 (free tier)
- **Total: ~$2/month**

---

## 📈 Scaling

### Vertical Scaling (More Resources)

```bash
# Backend: 1GB RAM
fly scale vm jobroom-api --memory 1024

# Frontend: 512MB RAM
fly scale vm jobroom --memory 512
```

### Horizontal Scaling (More Instances)

```bash
# Add more backend instances
fly scale count jobroom-api 2
```

---

## ✅ Post-Deployment Checklist

- [ ] Backend deployed and healthy
- [ ] Frontend deployed and accessible
- [ ] Database volume created and mounted
- [ ] Environment variables set
- [ ] Email verification working
- [ ] Password reset working
- [ ] Chrome extension URLs updated
- [ ] HTTPS enabled
- [ ] CORS configured correctly
- [ ] Logs monitored for errors

---

## 🎉 You're Done!

Your JobRoom application is now live on Fly.io with:

- ✅ Persistent SQLite database
- ✅ Automatic HTTPS
- ✅ Email verification
- ✅ Password reset
- ✅ Production-ready security
- ✅ Auto-scaling capability

**Your URLs:**
- Frontend: https://jobroom.fly.dev
- Backend API: https://jobroom-api.fly.dev
- API Docs: https://jobroom-api.fly.dev/docs

---

## 📚 Useful Commands

```bash
# Deploy updates
fly deploy --remote-only

# View logs
fly logs --follow

# SSH into machine
fly ssh console

# Restart app
fly restart

# Check status
fly status

# Open in browser
fly open

# List volumes
fly volumes list

# List secrets
fly secrets list
```

---

**Need Help?**
- Fly.io Docs: https://fly.io/docs
- Fly.io Community: https://community.fly.io
- JobRoom Issues: https://github.com/davidhtg44/JobRoom/issues
