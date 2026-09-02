<p align="center">
  <img src="frontend/public/favicon.svg" alt="Lumina" width="80" />
</p>

<h1 align="center">Lumina — Business Intelligence AI</h1>

<p align="center">
  An AI-powered business intelligence platform that turns your sales, customer, product, and financial data into actionable insights through natural language conversation.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Express-5-green?logo=express" alt="Express 5" />
  <img src="https://img.shields.io/badge/Gemini-3.6--flash-4285F4?logo=google" alt="Gemini" />
  <img src="https://img.shields.io/badge/Prisma-7-3B82F6?logo=prisma" alt="Prisma 7" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
</p>

---

## Features

### Dashboard
- **KPI Cards** — Total revenue, active customers, total orders, average order value
- **Sales Chart** — Monthly revenue breakdown with order counts
- **Forecast Chart** — Linear regression-based sales projections (3 months ahead)
- **Customer Segments** — Breakdown by Enterprise, SMB, Startup, Consumer
- **Product Performance** — Top products by revenue, units sold, and margin
- **Financial Overview** — Monthly P&L with revenue, expenses, COGS, and net profit

### AI Chat Agent
- Natural language queries about your business data
- Context-aware responses powered by **Google Gemini 3.6 Flash**
- Intelligent topic detection — only fetches relevant data for each question
- Falls back to rule-based analytics when AI is unavailable
- Chat history support (last 5 messages for context)

## Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | React 19, Vite 8, Tailwind CSS 4, Recharts, React Router 7 |
| Backend   | Express 5, TypeScript, Zod validation   |
| AI        | Google Gemini (via OpenAI-compatible API)|
| Database  | SQLite via Prisma 7 (better-sqlite3 adapter) |
| Charts    | Recharts 3                              |

## Project Structure

```
lumina-ai/
├── backend/
│   ├── prisma/
│   │   ├── migrations/       # Database migrations
│   │   ├── schema.prisma     # Data model (Customer, Product, Sale, FinancialRecord)
│   │   └── seed.ts           # Generates ~2,000 sales + 500 financial records
│   └── src/
│       ├── routes/           # Express route handlers
│       ├── services/         # Analytics, AI agent, context builder, forecasting
│       ├── middleware/       # Error handling
│       └── types/            # TypeScript type definitions
└── frontend/
    └── src/
        ├── components/       # Dashboard charts, chat UI, layout
        ├── hooks/            # useAnalytics, useChat
        ├── pages/            # DashboardPage, ChatPage
        └── api/              # API client (Axios)
```

## Getting Started

### Prerequisites
- **Node.js** 18+
- **Google AI Studio API Key** — Get one at [aistudio.google.com](https://aistudio.google.com/apikey)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Rusiru-Randika/lumina-ai.git
   cd lumina-ai
   ```

2. **Configure environment variables**
   ```bash
   # Create .env in the project root
   GEMINI_API_KEY=your-gemini-api-key-here
   DATABASE_URL="file:./dev.db"
   PORT=3001
   NODE_ENV=development
   ```

3. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

4. **Set up the database**
   ```bash
   cd backend
   npx prisma migrate deploy
   npm run seed
   ```

5. **Start the application**
   ```bash
   # Terminal 1 — Backend (port 3001)
   cd backend
   npm run dev

   # Terminal 2 — Frontend (port 5173)
   cd frontend
   npm run dev
   ```

6. **Open the app**
   Navigate to [http://localhost:5173](http://localhost:5173)

## Data Model

The seed script generates realistic sample data:

| Model           | Records | Description                                      |
|-----------------|---------|--------------------------------------------------|
| Customer        | 50      | Enterprise / SMB / Startup / Consumer segments   |
| Product         | 30      | Electronics / Software / Services / Hardware     |
| Sale            | ~2,000  | Jan 2025 – Jun 2026, seasonal patterns + growth  |
| FinancialRecord | ~500    | 18 months of monthly P&L lines                   |

## How the AI Agent Works

1. **Topic Detection** — Scans your question for keywords (sales, forecast, customer, product, financial, region)
2. **Context Building** — Fetches only the relevant data slice from the database
3. **Prompt Assembly** — Combines system prompt + business context + chat history + your question
4. **Gemini Call** — Sends to `gemini-3.6-flash` via Google's OpenAI-compatible endpoint
5. **Fallback** — If the AI is unavailable, a rule-based engine generates answers directly from the database

## Scripts

| Command              | Description                          |
|----------------------|--------------------------------------|
| `cd backend && npm run dev`    | Start backend with hot reload        |
| `cd backend && npm run seed`   | Seed the database with sample data   |
| `cd backend && npm run studio` | Open Prisma Studio (database GUI)    |
| `cd frontend && npm run dev`   | Start frontend dev server            |
| `cd frontend && npm run build` | Build for production                 |

## License

MIT
