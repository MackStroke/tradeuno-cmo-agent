# TradeUno CMO Agent - AI-Powered Marketing Operations Dashboard

**TradeUno CMO Agent** is an advanced, premium AI-powered marketing operations and analytics command center built for **TradeUno Fabrics**. It integrates SQLite analytics, Express.js backend services, and Google Gemini AI model generation to streamline daily marketing workflows, analyze search visibility, generate SEO content briefs, monitor brand reputation, track campaign performance, and generate daily executive reports.

---

## 🌟 Key Features

### 🏆 AI Intelligence Modules
1. **AI Citation Score**
   - Track brand citation rates across major AI search engines (Google AI Overview, ChatGPT, Claude, Gemini, Perplexity, Bing Copilot).
   - Generates a weekly Citation Score (0–100) trend sparkline.
   - Outputs a platform-specific visibility breakdown and automatically builds a personalized gap-closing action checklist.
2. **AI Content Engine (SEO Briefs)**
   - Enter a target keyword to instantly generate CTR-optimized title variations, metadata under 160 characters, semantic/LSI keywords, and a complete hierarchical heading structure (H1, H2s, H3s).
   - Identifies the specific content angles and topic gaps that top-performing competitor websites missed.
3. **AI Gap Analysis**
   - Scans and detects high-volume, critical search queries where competitors are winning citations but TradeUno is missing.
   - Provides estimated monthly volumes and generates a one-click actionable SEO fix plan for each gap.
4. **Custom Prompt reputation Tracker**
   - Tracks custom prompts across ChatGPT, Claude, and Gemini side-by-side.
   - Monitors model responses and tags mentions of TradeUno or competitors with live status badges.
5. **Enhanced Leads Dashboard**
   - Classifies B2B/B2C pipeline leads by channel and heat level (🔥 Hot / ☀️ Warm / ❄️ Cold).
   - Leverages automated bot-submission detection and flags underperforming marketing campaigns burning budget.
   - Features a natural language query interface for asking plain-English questions about lead and campaign data.

### 💼 Core Marketing Operations
* **How It Works Onboarding Guide**: A step-by-step onboarding guide styled directly into the main dashboard page.
* **Automated Task Management**: Team task tracker with AI feedback and quality scoring (1–100) based on submitted image/video proofs.
* **Social Media Manager**: Schedule, view, and approve/reject drafted social posts with media upload integration.
* **Competitor Intel**: Store website and social profiles for competitors, running AI SWOT/competitor insights analysis.
* **Meta Ads Analytics**: Track budget, spent, impressions, CTR, CPC, and ROAS with AI recommendations.
* **Shopify Sync**: Simulated order telemetry and product metrics sync.
* **AI CMO Chatbot**: A contextual assistant tailored to the premium fabric market.
* **Executive Daily Reporter**: One-click daily summary PDF/Markdown generator highlighting key wins, metric shifts, and improvements.

---

## 🛠️ Tech Stack

- **Backend**: Node.js & Express.js
- **Database**: SQLite (managed with promises via `sqlite3` and automatic schema migrations)
- **Session Auth**: `express-session`, `bcryptjs`
- **File Uploads**: `multer` (for visual verification proofs and social creatives)
- **AI Integration**: Google Gemini API (`@google/genai` using `gemini-2.5-flash` with Google Search tool enabled)
- **Frontend**: Single Page Application (SPA) designed with Vanilla HTML5, CSS3 (glassmorphism theme, CSS variables, gradient effects, micro-animations), and native Vanilla Javascript.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- A Gemini API Key (Optional; runs in simulated demo mode if not provided)

### Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   SESSION_SECRET=your_secure_session_secret
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Start the Application:**
   ```bash
   npm run dev
   # or
   npm start
   ```

4. **Access the Dashboard:**
   Open your browser and navigate to `http://localhost:3000`

---

## 🔐 Default Credentials

The database is automatically initialized and seeded with sample fabric team members, tasks, and data on server startup:

* **Admin Access (CMO)**
  - **Email**: `admin@tradeuno.com`
  - **Password**: `admin123`
* **Team Member Access**
  - **Email**: `priya@tradeuno.com` (Social Media) / `rahul@tradeuno.com` (Content) / `anita@tradeuno.com` (Video)
  - **Password**: `team123`

---

## 📂 Project Structure

```text
tradeuno-cmo-agent/
├── server.js           # Main Express app, API endpoints & router logic
├── db.js               # SQLite database client, tables, & seeding scripts
├── package.json        # Node configuration & project metadata
├── .env                # Local secrets (ignored by git)
├── .gitignore          # Git exclusion specifications
└── public/             # SPA Frontend files
    ├── index.html      # Main interface container & layout markup
    ├── app.js          # Client-side API controllers, routers & renderers
    ├── style.css       # Core design sheets, visual effects & theme
    └── uploads/        # User-uploaded assets (ignored by git)
```