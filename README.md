# 🚀 JobPilot AI
### Autonomous AI-Powered Job Discovery, Resume Tailoring & Application Automation Platform

JobPilot AI is an enterprise-grade autonomous job-hunting assistant designed to discover real job postings from public feeds, evaluate candidate suitability with explainable scoring, generate truthfully tailored resumes, prepare customized answers, submit verified applications via Playwright browser automation, and produce comprehensive Excel audit reports.

---

## 🏗️ System Architecture

```text
JobHunter/
├── .github/workflows/
│   ├── daily-job-hunt.yml         # 8:00 AM IST scheduled runner
│   └── manual-agent-run.yml       # Manual workflow dispatch
├── client/                        # React.js (Vite) + Tailwind CSS + Lucide Icons
│   ├── src/
│   │   ├── components/            # Layout, Navbar, Sidebar, ProtectedRoute
│   │   ├── context/               # AuthContext (JWT/RBAC), ThemeContext (Dark/Light)
│   │   ├── pages/                 # Dashboard, Jobs, Onboarding, Tracker, etc.
│   │   └── services/              # Axios API client with token interceptors
│   ├── package.json
│   └── vite.config.js
├── server/                        # Node.js + Express + Mongoose (Multi-Tenant)
│   ├── api/
│   │   └── index.js               # Vercel Serverless entry point
│   ├── src/
│   │   ├── agents/
│   │   │   └── jobHuntAgent.js    # Autonomous CLI Orchestrator
│   │   ├── config/                # Database, Cloudinary, Gemini, Environment
│   │   ├── controllers/           # Auth, Jobs, Profile, Applications, Admin
│   │   ├── middleware/            # Auth, RBAC, Multer upload, ErrorHandler
│   │   ├── models/                # 18 Mongoose models with strict userId scoping
│   │   ├── routes/                # REST endpoints
│   │   ├── services/
│   │   │   ├── discovery/         # Greenhouse & Lever source adapters
│   │   │   ├── ai/                # Gemini matcher, answer generator
│   │   │   ├── resume/            # PDF/DOCX parser & PDFKit tailor
│   │   │   ├── browser/           # Playwright automation & anti-bot detection
│   │   │   ├── reporting/         # ExcelJS 5-sheet workbook generator
│   │   │   └── email/             # Nodemailer Gmail SMTP dispatcher
│   │   └── server.js              # Local Express server entry point
│   ├── package.json
│   └── .env.example
└── package.json                   # Root coordination scripts
```

---

## 🔑 Key Features & Production Rules

1. **Verbatim Job Descriptions**:
   - Original postings retrieved from public Greenhouse and Lever APIs are rendered directly.
   - Job requirements, compensation details, and application URLs are never fabricated, rewritten, or summarized.
2. **Deterministic Pre-Filtering + Explainable AI Matching**:
   - Immediate exclusion checks for user-defined blocked companies, unwanted roles, and unpaid internships before burning tokens.
   - Structured JSON output with match scores (0-100), matching skills, missing skills, strengths, and gap analysis.
3. **Truth-Preserving Resume Tailoring**:
   - Candidate experience and project bullet points are re-ordered and highlighted based on target requirements.
   - **Zero Hallucination Rule**: Never invents degrees, skills, or fake project metrics.
   - Generates publication-ready PDF resumes using `PDFKit`.
4. **Authentic Experience Protection**:
   - If an application asks about personal challenges, failures, leadership, or opinions, the agent **never fabricates an answer**.
   - Halts and creates a **Pending Action** requiring user input.
   - Polishes the candidate's genuine response using Gemini and persists it to the reusable Answer Bank.
5. **Anti-Bot & CAPTCHA Safety Rails**:
   - Scans for reCAPTCHA, hCaptcha, Cloudflare Turnstile, and OTP gates.
   - Never attempts bypasses; creates a Pending Action so the user can complete submission directly via the original portal URL.
6. **Concurrency Guards & Daily Limits**:
   - Default daily application cap of 10 applications per user.
   - Atomic database checks and run leases guarantee zero duplicate submissions.
7. **5-Sheet Excel Audit Reports**:
   - Generated using `ExcelJS` containing Summary, Discovered Jobs, Applications, Pending Actions, and System Errors.
   - Emailed to candidate via Nodemailer and permanently downloadable from the dashboard.

---

## 🛠️ Quick Start & Local Setup

### 1. Prerequisites
- Node.js `v20+` or `v22+`
- MongoDB (Local running at `mongodb://127.0.0.1:27017` or MongoDB Atlas URI)

### 2. Environment Configuration
Create `server/.env` based on `server/.env.example`:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://127.0.0.1:27017/jobpilot

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_2026
JWT_EXPIRES_IN=7d

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# Cloudinary (Optional - falls back cleanly to local uploads if omitted)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email (Nodemailer / Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM="JobPilot AI" <noreply@jobpilot.ai>

# Default Application Rules
DEFAULT_MATCH_SCORE=80
DEFAULT_DAILY_APPLICATION_LIMIT=10
DEFAULT_POSTING_AGE_DAYS=7
```

### 3. Install Dependencies
```bash
# Install both backend and frontend dependencies
npm run server:install
npm run client:install
```

### 4. Run the Application
In separate terminal sessions:

```bash
# Start Backend API (Port 5000)
npm run server:dev

# Start Frontend (Port 5173)
npm run client:dev
```

Open `http://localhost:5173` in your browser.

---

## 🤖 Running the Autonomous Agent Manually

You can trigger the autonomous job hunt cycle directly via CLI:

```bash
# Executes discovery, matching, preparation, reporting, and email dispatch
npm run agent:hunt
```

Or click **"Start Job Hunt"** in the web dashboard.

---

## ⏰ Scheduled Execution via GitHub Actions

The platform includes `.github/workflows/daily-job-hunt.yml` configured to trigger daily at **8:00 AM IST (2:30 AM UTC)**:

1. Add your secrets to your GitHub Repository:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `GEMINI_API_KEY`
   - `EMAIL_USER` & `EMAIL_PASSWORD`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
2. The workflow will automatically launch Playwright with Chromium in headless mode, process eligible applications within daily limits, generate Excel reports, and email summaries.

---

## 🔒 Multi-Tenant Data Isolation

- Every user-specific query is strictly scoped to `req.user._id`.
- The first registered account automatically receives the `admin` role with access to `/admin` for monitoring platform health and configuring company boards. Subsequent registrations are standard `user` accounts.
- Administrative tools never expose candidate resumes or private answer bank entries.

