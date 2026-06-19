# TradeUno CMO Agent Dashboard

**TradeUno CMO Agent** is an AI-powered marketing operations and analytics dashboard designed specifically for TradeUno Fabrics. It streamlines daily marketing workflows, integrates with OpenAI for strategic insights, and acts as a comprehensive command center for a marketing team.

## 🌟 Features

- **Automated Task Management:** Assign, track, and review marketing tasks with AI-powered scoring and feedback.
- **AI Content Generation:** Quickly generate ideas and scripts for blogs, Instagram reels, and social media posts.
- **Competitor Analysis:** Store competitor profiles and run AI analysis to discover market gaps and strategy recommendations.
- **Meta Ads Analytics:** Track ad campaign metrics (spend, ROAS, CTR) and get AI-driven optimization recommendations.
- **Lead Generation & Management:** Manage B2B/B2C leads, track lead scores, and use AI to generate potential lead targets based on location and industry.
- **Shopify Insights:** Generate AI-driven e-commerce insights on product performance and order patterns.
- **Social Media Management:** Plan and approve social media posts with media upload support.
- **AI CMO Assistant:** A built-in chatbot that provides on-demand, contextual marketing advice tailored to the premium fabric market.
- **Daily Reporting:** Generate comprehensive daily marketing reports for founders with a single click.

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** SQLite (using `better-sqlite3` with WAL mode enabled for performance)
- **Authentication:** `express-session`, `bcryptjs`
- **File Uploads:** `multer` (Handles image and video proofs/assets)
- **AI Integration:** `openai` (GPT-4o-mini)

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- An OpenAI API Key (Optional, but required for AI features. A fallback demo mode is included).

### Installation & Setup

1. **Clone/Navigate to the repository:**
   ```bash
   cd /Users/apple/Documents/tradeuno-cmo-agent
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   The project requires a `.env` file in the root directory.
   ```env
   PORT=5000
   SESSION_SECRET=your_secure_session_secret
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Start the Application:**
   ```bash
   npm run dev
   # or
   npm start
   ```

5. **Access the Dashboard:**
   Open your browser and navigate to `http://localhost:5000` (or whichever port you specified).

### Database Initialization

The SQLite database (`tradeuno_cmo.db`) is automatically initialized and seeded with sample data the first time you start the server. This includes default users, sample tasks, sample campaigns, and dummy leads.

## 🔐 Default Credentials

Use these default credentials to log in (seeded automatically):

**Admin Access (CMO):**
- Email: `admin@tradeuno.com`
- Password: `admin123`

**Team Member Access (e.g., Social Media Manager):**
- Email: `priya@tradeuno.com`
- Password: `team123`

*(Other team members include: rahul@, anita@, karan@, meera@ - all with password `team123`)*

## 📂 Project Structure

```text
tradeuno-cmo-agent/
├── server.js           # Main Express server and API routes
├── db.js               # SQLite database setup and seeding logic
├── package.json        # Dependencies and scripts
├── .env                # Environment variables
├── public/             # Frontend assets and static HTML/JS/CSS (if applicable)
│   └── uploads/        # Directory for user-uploaded media
└── tradeuno_cmo.db     # SQLite database file (created at runtime)
```

## 🔌 API Overview

The backend provides several RESTful API endpoints secured by session authentication:

- **Auth:** `POST /api/login`, `POST /api/logout`, `GET /api/me`
- **Team & Tasks:** `GET /api/team`, `GET /api/tasks`, `POST /api/tasks`, `PUT /api/tasks/:id`, `POST /api/tasks/:id/score` (AI feedback)
- **Content & Social:** `GET /api/content`, `POST /api/content/generate` (AI), `GET /api/social/posts`, `POST /api/social/posts`
- **Competitors:** `GET /api/competitors`, `POST /api/competitors/:id/analyze` (AI)
- **Leads:** `GET /api/leads`, `POST /api/leads`, `POST /api/leads/generate` (AI)
- **Ads & Analytics:** `GET /api/meta/campaigns`, `POST /api/meta/analyze` (AI), `POST /api/shopify/analyze` (AI)
- **Reports:** `GET /api/reports`, `POST /api/reports/generate` (AI)
- **AI Chat:** `POST /api/ai/chat`, `GET /api/ai/history`

## 🛡️ Security & Roles
- Basic session-based authentication is implemented.
- Endpoints have middleware guards (`auth`, `adminOnly`) to protect sensitive actions like scoring tasks, adding social accounts, and approving social media posts.

---
*Built for TradeUno Fabrics.*
