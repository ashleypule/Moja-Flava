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
