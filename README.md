# Moja Flava Web App

A complete customer-ordering web platform for Moja Flava with:

- Professional landing page
- Sign up and login authentication
- Menu browsing and add-to-cart
- Checkout with delivery details
- Test-mode payment selection (Paystack or PayPal)
- Order history and order tracking via tracking code

## Tech Stack

- Node.js + Express
- EJS templates
- JSON file persistence (`data/store.json`)
- Session authentication

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
copy .env.example .env
```

3. Update `.env` with your test keys if needed.

4. Start app:

```bash
npm run dev
```

or

```bash
npm start
```

5. Open:

- `http://localhost:3000`

## Test Payment Flow

- Checkout creates an order with `pending` payment status.
- Payment page lets user choose:
  - **Paystack (test)**
  - **PayPal (test)**
- Clicking either marks payment as `paid_test` (simulation only).

## Deploying on Vercel

- This project now includes `vercel.json` and a serverless entry at `api/index.js`.
- Local runs still use `src/server.js` (`npm start` / `npm run dev`).
- In Vercel, routes are handled by the exported Express app (`src/app.js`) without `app.listen(...)`.

### Required Environment Variables

- `SESSION_SECRET` (required)
- `NODE_ENV=production`
- `PAYSTACK_PUBLIC_KEY` (optional, test key)
- `PAYPAL_CLIENT_ID` (optional, sandbox id)

### Data Persistence Note

- On Vercel, JSON data is written to `/tmp/store.json`.
- `/tmp` is ephemeral and may reset between cold starts, so production-grade persistence should use a managed database.
- You can override the JSON path with `DATA_FILE_PATH` if your host provides writable persistent storage.

## Order Tracking

- Users can open **My Orders** after login to trace details.
- Public `Track Order` page can check tracking code.

## Project Structure

- `src/app.js` - server bootstrap
- `src/db/database.js` - JSON datastore adapter and seed data
- `src/routes/publicRoutes.js` - landing + public tracking
- `src/routes/authRoutes.js` - signup/login/logout
- `src/routes/appRoutes.js` - menu/cart/checkout/payment/orders
- `views/` - EJS UI templates
- `public/css/styles.css` - styling
- `public/js/app.js` - small frontend behavior
