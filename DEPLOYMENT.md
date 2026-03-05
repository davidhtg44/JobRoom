# Deploy JobRoom to Vercel (Frontend)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   cd frontend
   vercel
   ```

4. **Set Environment Variable:**
   - Go to vercel.com
   - Select your project
   - Settings → Environment Variables
   - Add: `REACT_APP_API_URL` = `https://your-backend-url.onrender.com`

5. **Add Custom Domain (Optional):**
   - Go to your project on vercel.com
   - Settings → Domains
   - Add your domain (e.g., jobroom.vercel.app)

---

# Deploy to Render (Backend)

1. **Create Account:**
   - Go to render.com
   - Sign up with GitHub

2. **Create Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - Name: jobroom-api
     - Region: Frankfurt (or closest to you)
     - Branch: main
     - Root Directory: backend
     - Runtime: Python 3
     - Build Command: `pip install -r requirements.txt`
     - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
     - Instance Type: Free

3. **Add Environment Variables:**
   - SECRET_KEY: (auto-generated)
   - SMTP_SERVER: smtp.gmail.com
   - SMTP_PORT: 587
   - SMTP_USER: your-email@gmail.com
   - SMTP_PASS: your-app-password
   - FROM_EMAIL: your-email@gmail.com

4. **Add Disk (for SQLite database):**
   - Click "Add Disk"
   - Mount Path: /backend
   - Size: 1 GB (free tier)

5. **Deploy!**
   - Click "Create Web Service"
   - Wait for deployment
   - Copy your backend URL (e.g., https://jobroom-api.onrender.com)

---

# Update Frontend with Backend URL

After backend is deployed:

1. Go to Vercel dashboard
2. Select your frontend project
3. Settings → Environment Variables
4. Add: `REACT_APP_API_URL` = `https://your-backend-url.onrender.com`
5. Redeploy frontend

---

# Chrome Extension Update

Update `manifest.json` host_permissions:

```json
"host_permissions": [
  "https://your-backend-url.onrender.com/*",
  "https://your-frontend-url.vercel.app/*"
]
```

Then reload the extension.
