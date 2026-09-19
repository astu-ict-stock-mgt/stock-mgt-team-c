# Material Stock Management Frontend — Day 10

The authentication flow is now backend-driven. Day 9 reporting, audit, notifications, FIFO valuation and reconciliation pages use the live API.

Create `.env` from `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Install/run:

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Never place passwords, JWT secrets or backend credentials in frontend source.
