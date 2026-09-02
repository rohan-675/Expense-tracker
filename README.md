# Expense Tracker Web App

A full-stack expense tracker built with React, Vite, Node.js, Express, MongoDB Atlas, JWT authentication, Mongoose, Axios, React Router, Recharts, PDF export, Google login, receipt uploads, and an AI finance assistant.

## Project Structure

```text
Expensetracker/
  client/   React + Vite frontend
  server/   Express + MongoDB REST API
```

## Setup

### Backend

```bash
cd server
npm install
copy .env.example .env
npm run dev
```

Update `server/.env` with your MongoDB Atlas connection string and JWT secret.

Optional backend environment variables:

```env
GOOGLE_CLIENT_ID=your_google_oauth_client_id
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
```

Receipt files are stored locally in `server/uploads/receipts` by default.

### Frontend

```bash
cd client
npm install
npm run dev
```

The frontend reads the backend URL from `client/.env`. This project is currently set to use `http://localhost:5050/api`.

Optional frontend environment variables:

```env
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

## API Overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`
- `POST /api/transactions/:id/receipt`
- `GET/POST /api/wallets`
- `GET/POST /api/budgets`
- `GET/POST /api/goals`
- `GET/POST /api/recurring`
- `GET /api/analytics`
- `POST /api/assistant/ask`

## New Feature Areas

- Category icons and dark mode
- Monthly category budgets with exceeded warnings
- Weekly/monthly recurring transactions
- PDF monthly report export
- Google OAuth login
- Smart analytics insights
- Savings goals with progress bars
- Multi-wallet balances
- Receipt image/PDF upload
- AI finance assistant powered by OpenAI when `OPENAI_API_KEY` is configured
