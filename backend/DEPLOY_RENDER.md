# Deploying Nayaruvi Pulse Backend to Render.com

This guide explains how to deploy the `backend` folder as a Web Service on **Render.com** to enable automated email invitations.

---

## 1. Quick Settings Summary

| Setting | Value |
|---|---|
| **Service Type** | **Web Service** |
| **Language / Environment** | **Node** |
| **Root Directory** | `backend` ⚠️ *(Crucial! Tells Render where the backend files are)* |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Health Check Path** | `/api/health` |

---

## 2. Step-by-Step Deployment Instructions

### Step 1: Push Your Code to GitHub / GitLab
Make sure your latest code with the `backend/` folder is pushed to your Git repository.

### Step 2: Create a New Web Service on Render
1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** in the top right and select **Web Service**.
3. Choose **Build and deploy from a Git repository** and connect your repository (`pulse`).
4. Fill in the service configuration:
   - **Name**: `pulse-backend` (or any name you choose)
   - **Region**: Choose the closest region (e.g. `Singapore` for Asia)
   - **Branch**: `main` (or your active branch)
   - **Root Directory**: `backend` *(DO NOT leave this blank)*
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: **Free**

### Step 3: Configure Environment Variables
Under the **Environment Variables** section on Render, add the following key-value pairs:

| Variable Key | Example Value | Description |
|---|---|---|
| `FIREBASE_DATABASE_URL` | `https://pulsenayaruvi-default-rtdb.asia-southeast1.firebasedatabase.app` | Your Firebase Realtime Database URL |
| `FRONTEND_URL` | `https://pulsenayaruvi.web.app` | Your live frontend app URL (used for invite links) |
| `SMTP_USER` | `nayaruvi.official@gmail.com` | Your Gmail address |
| `SMTP_PASS` | `kmmkwcgnriucqnbk` | 16-character Google App Password |

*(Optional)* If you want full Admin privileges for RTDB from Render, you can also add:
- `FIREBASE_SERVICE_ACCOUNT`: Paste the full raw JSON content of your `serviceAccountKey.json`.

### Step 4: Deploy
1. Click **Create Web Service**.
2. Render will build and deploy the application.
3. Once deployed, Render will provide a URL, for example:  
   `https://pulse-backend-xxxx.onrender.com`

---

## 3. Connect Frontend to Your Live Render Backend

Once your backend is running on Render, update your frontend environment:

In your root `.env` (and in your frontend hosting settings, e.g., Firebase / Vercel):
```env
VITE_API_URL="https://your-backend-service-name.onrender.com/api"
```

Rebuild / redeploy your frontend:
```bash
npm run build
npm run deploy
```

Now, whenever you invite any team member by email in **Settings > Team**, the invite request will go to your Render backend and the user will receive a styled email with the direct project link!
