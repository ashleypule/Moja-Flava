const express = require('express');
const bcrypt = require('bcryptjs');
const { get, run } = require('../db/database');

const router = express.Router();

router.get('/signup', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/menu');
  }

  return res.render('pages/signup', {
    title: 'Sign Up | Moja Flava',
    error: null
  });
});

router.post('/signup', async (req, res) => {
  const fullName = (req.body.fullName || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  if (!fullName || !email || password.length < 6) {
    return res.render('pages/signup', {
      title: 'Sign Up | Moja Flava',
      error: 'Enter full name, valid email and a password with at least 6 characters.'
    });
  }

  const existingUser = await get('SELECT id FROM users WHERE email = ?', [email]);
  if (existingUser) {
    return res.render('pages/signup', {
      title: 'Sign Up | Moja Flava',
      error: 'This email is already registered. Please login.'
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const insertResult = await run(
    'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
    [fullName, email, passwordHash]
  );

  req.session.userId = insertResult.lastID;
  req.session.userName = fullName;
  return res.redirect('/menu');
});

router.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/menu');
  }

  return res.render('pages/login', {
    title: 'Login | Moja Flava',
    error: null
  });
});

router.post('/login', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  const user = await get('SELECT id, full_name, password_hash FROM users WHERE email = ?', [email]);
  if (!user) {
    return res.render('pages/login', {
      title: 'Login | Moja Flava',
      error: 'Invalid email or password.'
    });
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    return res.render('pages/login', {
      title: 'Login | Moja Flava',
      error: 'Invalid email or password.'
    });
  }

  req.session.userId = user.id;
  req.session.userName = user.full_name;
  return res.redirect('/menu');
});

router.post('/logout', (req, res) => {
  req.session = null;
  return res.redirect('/');
});

module.exports = {
  authRouter: router
};
