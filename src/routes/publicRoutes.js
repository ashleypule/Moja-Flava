const express = require('express');
const { all, get, run } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function computeOrderStatus(order) {
  if (!order || order.payment_status !== 'paid_test') {
    return 'Awaiting Payment';
  }

  const minutesElapsed = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);

  if (minutesElapsed < 1) return 'Payment Confirmed';
  if (minutesElapsed < 2) return 'Preparing';
  if (minutesElapsed < 3) return 'Out for Delivery';
  return 'Delivered';
}

router.get('/', (req, res) => {
  res.render('pages/landing', {
    title: 'Moja Flava | Bold Taste, Fast Delivery'
  });
});

router.get('/track', (req, res) => {
  res.render('pages/track', {
    title: 'Track Order | Moja Flava',
    order: null,
    computedStatus: null,
    error: null
  });
});

router.post('/track', async (req, res) => {
  const trackingCode = (req.body.trackingCode || '').trim().toUpperCase();

  if (!trackingCode) {
    return res.render('pages/track', {
      title: 'Track Order | Moja Flava',
      order: null,
      computedStatus: null,
      error: 'Please enter a valid tracking code.'
    });
  }

  const order = await get(
    'SELECT tracking_code, order_number, payment_status, order_status, created_at FROM orders WHERE tracking_code = ?',
    [trackingCode]
  );

  if (!order) {
    return res.render('pages/track', {
      title: 'Track Order | Moja Flava',
      order: null,
      computedStatus: null,
      error: 'Tracking code not found. Please check and try again.'
    });
  }

  return res.render('pages/track', {
    title: 'Track Order | Moja Flava',
    order,
    computedStatus: computeOrderStatus(order),
    error: null
  });
});

router.get('/reviews', async (req, res) => {
  const reviews = await all('SELECT id, user_name, rating, comment, created_at FROM reviews ORDER BY id DESC');

  return res.render('pages/reviews', {
    title: 'Customer Reviews | Moja Flava',
    reviews,
    error: null,
    success: req.query.success || null,
    formValues: {
      rating: '',
      comment: ''
    }
  });
});

router.post('/reviews', requireAuth, async (req, res) => {
  const rating = Number(req.body.rating);
  const comment = (req.body.comment || '').trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length < 5 || comment.length > 500) {
    const reviews = await all('SELECT id, user_name, rating, comment, created_at FROM reviews ORDER BY id DESC');
    return res.render('pages/reviews', {
      title: 'Customer Reviews | Moja Flava',
      reviews,
      error: 'Please provide a rating between 1 and 5 and a comment between 5 and 500 characters.',
      success: null,
      formValues: {
        rating: Number.isInteger(rating) ? String(rating) : '',
        comment
      }
    });
  }

  await run(
    'INSERT INTO reviews (user_id, user_name, rating, comment) VALUES (?, ?, ?, ?)',
    [req.session.userId, req.session.userName, rating, comment]
  );

  return res.redirect('/reviews?success=Thanks for sharing your review!');
});

module.exports = {
  publicRouter: router,
  computeOrderStatus
};
