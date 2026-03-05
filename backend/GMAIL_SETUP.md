# Gmail SMTP Setup Guide

## Step-by-Step Instructions

### Step 1: Enable 2-Factor Authentication

1. Go to your Google Account: https://myaccount.google.com/
2. Click on **Security** in the left sidebar
3. Under "Signing in to Google", click **2-Step Verification**
4. Click **Get Started** and follow the prompts
5. Enable 2-Step Verification

### Step 2: Create App Password

1. Go to App Passwords: https://myaccount.google.com/apppasswords
2. You may need to sign in again
3. Under "App passwords":
   - Select app: **Mail**
   - Select device: **Other (Custom name)**
   - Enter: `JobRoom`
   - Click **Generate**

4. Copy the 16-character password (looks like: `abcd efgh ijkl mnop`)

### Step 3: Create .env File

1. In the `backend` folder, create a file named `.env`

2. Add your credentials:
```bash
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
FROM_EMAIL=your.email@gmail.com
```

**Important:** 
- Use the App Password, NOT your regular Gmail password
- You can keep or remove the spaces in the password
- Make sure the file is named exactly `.env` (not `.env.txt`)

### Step 4: Restart Backend

```bash
# Stop the backend (Ctrl+C)
# Then restart:
cd backend
python3 -m uvicorn main:app --reload
```

### Step 5: Test

1. Go to http://localhost:3000
2. Click "Sign Up"
3. Enter your email and password
4. Check your email inbox for the verification code!

---

## Troubleshooting

### "Less secure app access" error
- Google no longer uses this setting
- Make sure you're using an **App Password**, not your regular password

### "Invalid credentials" error
- Double-check your App Password
- Make sure 2FA is enabled
- Try regenerating the App Password

### Emails going to spam
- Check your spam folder
- The first email might take a moment to arrive

### Connection timeout
- Check your internet connection
- Gmail SMTP requires port 587 with TLS

---

## Security Notes

- **Never commit .env to GitHub** (it's in .gitignore)
- App Passwords can be revoked anytime from your Google Account
- You can create separate App Passwords for different apps
- Monitor your Google Account activity regularly

---

## Alternative: Use Console in Development

If you don't want to set up Gmail SMTP right now, the code will automatically fall back to console logging:

```
📧 [DEV MODE] Verification code for test@example.com: 123456
```

Just copy the code from the terminal and paste it in the verification form!
