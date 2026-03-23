require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieSession = require('cookie-session');
const { initializeDatabase } = require('./db/database');
const { publicRouter } = require('./routes/publicRoutes');
const { authRouter } = require('./routes/authRoutes');
const { appRouter } = require('./routes/appRoutes');

const app = express();

const dbReadyPromise = initializeDatabase();

app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(
  cookieSession({
    name: 'moja_flava_session',
    keys: [process.env.SESSION_SECRET || 'development_secret_change_me'],
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true
    }
  })
);

app.use(async (req, res, next) => {
  try {
    await dbReadyPromise;
    next();
  } catch (error) {
    next(error);
  }
});

app.use((req, res, next) => {
  const cart = req.session.cart || {};
  const cartCount = Object.values(cart).reduce((sum, qty) => sum + Number(qty || 0), 0);

  res.locals.currentUser = {
    id: req.session.userId || null,
    name: req.session.userName || null
  };
  res.locals.cartCount = cartCount;
  next();
});

app.use(publicRouter);
app.use(authRouter);
app.use(appRouter);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).send('Something went wrong. Please try again.');
});

module.exports = app;
