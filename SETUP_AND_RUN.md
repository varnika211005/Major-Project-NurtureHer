# 💻 NurtureHer AI — Beginner's Setup & Run Guide (Windows + VS Code)

Welcome! This step-by-step tutorial explains exactly how to run **NurtureHer AI** on any Windows laptop using **Visual Studio Code (VS Code)**. Even if you have never set up a full-stack Python + React app before, follow these instructions step by step.

---

## 📦 What You Need Installed (Only 3 Things!)

Before starting, make sure these 3 free programs are installed on your Windows machine:

1. **Python 3.11 or 3.12**:
   - Download from: [python.org/downloads](https://www.python.org/downloads/)
   - ⚠️ **VERY IMPORTANT**: On the very first installer screen, check the box that says:
     `☑ Add python.exe to PATH` before clicking "Install Now".
2. **Node.js LTS (v18 or v20)**:
   - Download from: [nodejs.org](https://nodejs.org/) (Choose "LTS" version).
   - Click Next -> Next -> Finish with all default settings.
3. **Visual Studio Code**:
   - Download from: [code.visualstudio.com](https://code.visualstudio.com/)

---

## 🚀 Step 1: Open the Project in VS Code

1. Extract the `NurtureHer_AI_Final_Delivery.zip` file (Right-click -> **Extract All...**).
2. Open **Visual Studio Code**.
3. Click **File** -> **Open Folder...** (or press `Ctrl + K, Ctrl + O`).
4. Select the `NurtureHer` folder that was extracted.
5. You will see the project files in the left sidebar (`app/`, `frontend/`, `scripts/`, etc.).

---

## 🖥️ Step 2: Open Split Terminals in VS Code

We need two terminal windows running side-by-side:
- **Terminal 1**: Runs the Python FastAPI Backend server.
- **Terminal 2**: Runs the React Vite Frontend application.

### How to open split terminals:
1. In VS Code, press ``Ctrl + ` `` (Ctrl + Backtick) or click **Terminal** -> **New Terminal**.
2. Click the **Split Terminal** icon in the terminal title bar (looks like a square split in half `|`).
3. You now have two PowerShell terminals side by side!

---

## 🐍 Step 3: Set Up and Start the Backend (Terminal 1)

In the **left terminal** (Terminal 1), paste and run these commands one by one:

```powershell
# 1. Allow PowerShell to run virtual environment scripts (run once)
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force

# 2. Create a Python virtual environment named 'venv'
python -m venv venv

# 3. Activate the virtual environment
.\venv\Scripts\Activate.ps1
```
*(You will see `(venv)` appear at the beginning of your command line).*

```powershell
# 4. Install backend dependencies
pip install -r requirements.txt

# 5. Populate pre-configured demo users and clinical data
python -m scripts.seed
```
*(You will see: `Seeding completed successfully! All demo roles, clinical data, and guides are ready.`)*

```powershell
# 6. Start the FastAPI backend server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
You will see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```
✅ **The backend is now live! Leave this terminal running.**

---

## ⚛️ Step 4: Set Up and Start the Frontend (Terminal 2)

In the **right terminal** (Terminal 2), paste and run these commands:

```powershell
# 1. Move into the frontend folder
cd frontend

# 2. Install all frontend UI libraries
npm install

# 3. Start the Vite React development server
npm run dev
```
You will see:
```
  VITE v8.1.3  ready in 350 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```
✅ **The frontend is now live!**

---

## 🌐 Step 5: Open the App in Your Browser

1. Open **Google Chrome** or **Microsoft Edge**.
2. Go to: **`http://localhost:5173`**
3. You will see the calm lavender login screen of **NurtureHer AI**!

---

## ⚡ Step 6: 1-Click Demo Login (How to Present to Examiners)

At the bottom of the login card, you will see the **"⚡ 1-Click Demo Access"** buttons:

```
+-------------------+-------------------+
|  🌸 Mother        |  🩺 Doctor        |
|  1-click demo     |  1-click demo     |
+-------------------+-------------------+
|  🤝 Caregiver     |  🛡️ Admin         |
|  1-click demo     |  1-click demo     |
+-------------------+-------------------+
```

### Presentation Walkthrough Steps:

1. **Click "🌸 Mother"**:
   - Logs in as `Ananya Sharma` (2nd Trimester pregnancy).
   - **Dashboard**: View today's mood, active symptom count, and cycle prediction.
   - **Quick Actions**:
     - Click **"PCOS Screening"** -> View the Rotterdam risk meters and click **"Download Report PDF"**.
     - Click **"Doctor Visit Prep"** -> Show the 7-day symptom frequencies and tailored questions to ask the doctor.
     - Click **"CareCircle QR"** -> Show the zero-data QR code card, rotate token, and approve sharing consent.
     - Click **"AI Health Coach"** -> Click the **Microphone** icon to speak a question (supports English, Hindi, and Kannada), then click **Listen** to hear audio speech!
     - Click **"Nutrition Guide"** -> Show cultural meal plans and tap the water glasses to log daily hydration.

2. **Click "Log Out" (bottom of sidebar), then Click "🩺 Doctor"**:
   - Logs in as `Dr. Priya Rao, MD`.
   - **Doctor Portal**:
     - View the authorized patient roster.
     - Filter patients by **High Risk**.
     - Click on `Ananya Sharma` to inspect her longitudinal timeline (mood trend, symptoms, PCOS risk).
     - Type and save a clinical consultation note in her permanent record.
     - Click **"Printable Summary"** to generate a clinic consultation brief.

3. **Log Out, then Click "🤝 Caregiver"**:
   - Logs in as `Ramesh Sharma`.
   - View caregiver communication tips, safe newborn soothing, nighttime duty schedule, 112 emergency warning signs, and consent-filtered mother status.

4. **Log Out, then Click "🛡️ Admin"**:
   - Logs in as `NurtureHer Administrator`.
   - View live KPI metrics (users, screenings, alerts, audit logs).
   - View immutable security audit logs capturing every evaluation and access event.
   - Toggle user account active/disabled states.
   - Inspect AI Model health status cards.

---

## ❓ Frequently Asked Questions & Quick Fixes

### Q: PowerShell says "running scripts is disabled on this system"?
**Fix**: In Terminal 1, run:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
```
Then run `.\venv\Scripts\Activate.ps1` again.

### Q: How do I stop the servers when I am done?
**Fix**: Click inside each terminal window in VS Code and press `Ctrl + C`.

### Q: Do I need to install or start PostgreSQL?
**Answer**: **No!** NurtureHer AI includes an intelligent automatic fallback. If PostgreSQL is not running on your machine, it automatically uses SQLite (`nurtureher.db`) with zero configuration. Everything works out of the box!

### Q: How do I test the backend API directly?
**Answer**: Visit **`http://127.0.0.1:8000/docs`** in your browser for the interactive Swagger UI testing every endpoint.

### Q: Which port does the backend use?
**Answer**: The standard backend port is **8000** (`http://localhost:8000/api/v1`). The frontend connects to port 8000 by default. If you ever need to run the backend on a different port (such as 8001), you can override it in the frontend environment by setting `VITE_API_BASE_URL=http://localhost:<PORT>/api/v1` in `frontend/.env`.

---

🎉 **Good luck with your project presentation on Wednesday! You have a complete, clinic-ready AI healthcare platform.**
