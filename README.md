# PolyMind

AI-powered prediction market analyzer for Polymarket.

## Setup

1. **Environment variables** – Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` – Neon Postgres connection string
   - `JWT_SECRET` – Random string for JWT signing
   - `OPENAI_API_KEY` – OpenAI API key for AI analysis

2. **Database schema** – Run `npm run db:schema` and execute the output in the [Neon SQL Editor](https://console.neon.tech).

3. **Development** – `npm run dev`

## Features

- **ETH wallet login** – Sign in with Ethereum (SIWE)
- **Credits** – 50 credits per new user; 1 credit per AI analysis
- **Member center** – `/member` for credits, Tavily API Key, and settings
- **AI analysis** – Backend-powered streaming analysis with optional Tavily web search
