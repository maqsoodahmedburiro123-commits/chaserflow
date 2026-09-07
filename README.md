# ChaserFlow — Automated Invoice Chaser & AI Cash Radar

> **Automated polite invoice reminders, AI Cashflow Risk Radar, and smart excuse-counter assistant for freelancers and agencies.**

![ChaserFlow Banner](https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80)

---

## 🌟 Key Features

- **⚡ Automated Reminder Cadence**: Multi-stage escalation sequences (3 days before due, due date, 3 days overdue, 7 days overdue, 14 days overdue, 30 days final notice).
- **🧠 AI Cashflow Risk Radar**: Real-time risk scoring powered by Google Gemini AI analyzing client payment history, contract clauses, and macroeconomic indicators.
- **🛡️ AI Excuse-Counter Assistant**: Turn common client payment stalls (*"waiting on client approval"*, *"accounting batch runs on the 15th"*, etc.) into polite, legally sound, relationship-preserving responses.
- **📬 Smart Dispatcher**: Bulk preview, customized one-click email drafts, and reminder logs with delivery status tracking.
- **📄 Instant PDF Invoice Generator**: Download clean, professional PDF invoices with auto-calculated line items and payment terms.
- **🔄 Cloud Sync**: Seamless persistence with Google Cloud Firestore and Google Sheets synchronization.

---

## 🚀 How to Publish & Deploy

### Method 1: Direct Export from Google AI Studio (Fastest)

1. In the upper right or left settings menu in Google AI Studio, click **Export** (or **Settings > Export to GitHub**).
2. Connect your GitHub account and select your organization or personal account.
3. Choose a name for your new repository (e.g. `chaserflow`) and choose Public or Private.
4. Click **Create Repository**. Your entire application and commit history will be pushed directly to GitHub.

---

### Method 2: Push to GitHub via Git CLI

If you downloaded the ZIP file or have local terminal access:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "feat: initial commit of ChaserFlow application"

# Rename branch to main
git branch -M main

# Add your GitHub repository as remote
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/chaserflow.git

# Push to GitHub
git push -u origin main
```

---

## 🌐 Deploying Live to Production

ChaserFlow is a full-stack application with an Express backend proxying Gemini AI calls and Vite serving the React frontend.

### Option A: Google Cloud Run (Recommended from AI Studio)
In Google AI Studio, simply click the **Deploy** button to deploy directly to Google Cloud Run with automatic SSL and scalable container hosting.

### Option B: Render / Railway / Fly.io

1. Connect your new GitHub repository to [Render](https://render.com) or [Railway](https://railway.app).
2. Configure the build and start commands:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
3. Set environment variables in the dashboard:
   - `NODE_ENV`: `production`
   - `GEMINI_API_KEY`: Your Google Gemini API Key (obtain from [Google AI Studio](https://aistudio.google.com/))
   - `PORT`: `3000` (or leave default if managed by host)

---

## 🛠️ Local Development Setup

### 1. Prerequisites
- Node.js 18+ or 20+
- npm, pnpm, or yarn
- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/<YOUR_GITHUB_USERNAME>/chaserflow.git
cd chaserflow

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy the example environment file and add your credentials:
```bash
cp .env.example .env
```

Open `.env` and set:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
APP_URL=http://localhost:3000
```

### 4. Running Locally
```bash
# Start the full-stack development server (Express + Vite with hot reloading)
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Scripts Overview

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts backend server and Vite frontend in development mode on port 3000 |
| `npm run build` | Builds client assets and bundles server to `dist/server.cjs` via esbuild |
| `npm start` | Runs the production bundled server |
| `npm run lint` | Runs TypeScript type verification (`tsc --noEmit`) |
| `npm run clean` | Cleans up previous build artifacts |

---

## 🏗️ Architecture & Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Motion, Lucide Icons
- **Backend**: Node.js, Express, esbuild
- **AI Engine**: `@google/genai` (Gemini 2.5/3.0 models)
- **Document Generation**: jsPDF & jsPDF-AutoTable
- **Database & Auth**: Firebase Firestore & Firebase Auth

---

## 📄 License
This project is licensed under the Apache 2.0 License.
