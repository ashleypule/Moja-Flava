const express = require('express');
const crypto = require('crypto');
const { all, get, run } = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { computeOrderStatus } = require('./publicRoutes');

const router = express.Router();
const DELIVERY_FEE = 20;

function getSessionCart(req) {
  if (!req.session.cart) {
    req.session.cart = {};
  }
  return req.session.cart;
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

async function buildCartSummary(req) {
  const cart = getSessionCart(req);
  const itemIds = Object.keys(cart).map((key) => Number(key)).filter((id) => Number.isInteger(id));

  if (!itemIds.length) {
    return {
      items: [],
      subtotal: 0,
      deliveryFee: 0,
      total: 0
    };
  }

  const placeholders = itemIds.map(() => '?').join(',');
  const products = await all(`SELECT id, name, description, price, category FROM menu_items WHERE id IN (${placeholders})`, itemIds);

  const items = products.map((product) => {
    const quantity = Number(cart[product.id]) || 0;
    return {
      ...product,
      quantity,
      lineTotal: quantity * product.price
    };
  }).filter((product) => product.quantity > 0);

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFee = subtotal > 0 ? DELIVERY_FEE : 0;

  return {
    items,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee
  };
}

router.get('/menu', requireAuth, async (req, res) => {
  const menuItems = await all('SELECT id, name, description, price, category FROM menu_items ORDER BY category, name');

  return res.render('pages/menu', {
    title: 'Menu | Moja Flava',
    menuItems,
    success: req.query.success || null
  });
});

router.post('/cart/add', requireAuth, (req, res) => {
  const itemId = Number(req.body.itemId);
  const quantity = Math.max(1, Number(req.body.quantity || 1));

  if (!Number.isInteger(itemId)) {
    return res.redirect('/menu');
  }

  const cart = getSessionCart(req);
  cart[itemId] = (Number(cart[itemId]) || 0) + quantity;
  return res.redirect('/menu?success=Item added to cart');
});

router.get('/cart', requireAuth, async (req, res) => {
  const summary = await buildCartSummary(req);

  return res.render('pages/cart', {
    title: 'Your Cart | Moja Flava',
    ...summary
  });
});

router.post('/cart/update', requireAuth, (req, res) => {
  const itemId = Number(req.body.itemId);
  const quantity = Number(req.body.quantity);

  if (!Number.isInteger(itemId)) {
    return res.redirect('/cart');
  }

  const cart = getSessionCart(req);
  if (!quantity || quantity <= 0) {
    delete cart[itemId];
  } else {
    cart[itemId] = quantity;
  }

  return res.redirect('/cart');
});

router.post('/cart/remove', requireAuth, (req, res) => {
  const itemId = Number(req.body.itemId);
  const cart = getSessionCart(req);
  delete cart[itemId];
  return res.redirect('/cart');
});

router.get('/checkout', requireAuth, async (req, res) => {
  const summary = await buildCartSummary(req);

  if (!summary.items.length) {
    return res.redirect('/menu');
  }

  return res.render('pages/checkout', {
    title: 'Checkout | Moja Flava',
    ...summary,
    error: null
  });
});

router.post('/checkout/create-order', requireAuth, async (req, res) => {
  const addressLine = (req.body.addressLine || '').trim();
  const city = (req.body.city || '').trim();
  const notes = (req.body.notes || '').trim();

  if (!addressLine || !city) {
    const summary = await buildCartSummary(req);
    return res.render('pages/checkout', {
      title: 'Checkout | Moja Flava',
      ...summary,
      error: 'Address and city are required to place an order.'
    });
  }

  const summary = await buildCartSummary(req);
  if (!summary.items.length) {
    return res.redirect('/menu');
  }

  const orderNumber = `MF-${Date.now().toString().slice(-8)}`;
  const trackingCode = `TRK-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const insertOrder = await run(
    `INSERT INTO orders (
      order_number, tracking_code, user_id, items_json, subtotal, delivery_fee, total,
      payment_status, order_status, address_line, city, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orderNumber,
      trackingCode,
      req.session.userId,
      JSON.stringify(summary.items),
      formatMoney(summary.subtotal),
      formatMoney(summary.deliveryFee),
      formatMoney(summary.total),
      'pending',
      'Awaiting Payment',
      addressLine,
      city,
      notes || null
    ]
  );

  req.session.pendingOrderId = insertOrder.lastID;
  return res.redirect(`/checkout/payment/${insertOrder.lastID}`);
});

router.get('/checkout/payment/:orderId', requireAuth, async (req, res) => {
  const orderId = Number(req.params.orderId);
  const order = await get('SELECT id, order_number, total, payment_status FROM orders WHERE id = ? AND user_id = ?', [orderId, req.session.userId]);

  if (!order) {
    return res.redirect('/orders');
  }

  return res.render('pages/payment', {
    title: 'Payment | Moja Flava',
    order,
    paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxx',
    paypalClientId: process.env.PAYPAL_CLIENT_ID || 'YOUR_PAYPAL_SANDBOX_CLIENT_ID'
  });
});

router.post('/checkout/payment/:orderId/pay', requireAuth, async (req, res) => {
  const orderId = Number(req.params.orderId);
  const provider = (req.body.provider || '').trim().toLowerCase();

  if (!['paystack', 'paypal'].includes(provider)) {
    return res.redirect(`/checkout/payment/${orderId}`);
  }

  const order = await get('SELECT id, tracking_code FROM orders WHERE id = ? AND user_id = ?', [orderId, req.session.userId]);
  if (!order) {
    return res.redirect('/orders');
  }

  await run(
    'UPDATE orders SET payment_provider = ?, payment_status = ?, order_status = ? WHERE id = ?',
    [provider, 'paid_test', 'Payment Confirmed', orderId]
  );

  req.session.cart = {};
  delete req.session.pendingOrderId;

  return res.redirect(`/orders/${order.tracking_code}`);
});

router.get('/orders', requireAuth, async (req, res) => {
  const orders = await all(
    'SELECT id, order_number, tracking_code, total, payment_provider, payment_status, order_status, created_at FROM orders WHERE user_id = ? ORDER BY id DESC',
    [req.session.userId]
  );

  const decoratedOrders = orders.map((order) => ({
    ...order,
    computedStatus: computeOrderStatus(order)
  }));

  return res.render('pages/orders', {
    title: 'My Orders | Moja Flava',
    orders: decoratedOrders
  });
});

router.get('/orders/:trackingCode', requireAuth, async (req, res) => {
  const trackingCode = req.params.trackingCode;

  const order = await get(
    `SELECT id, order_number, tracking_code, total, payment_provider, payment_status, order_status,
            address_line, city, notes, items_json, created_at
     FROM orders WHERE tracking_code = ? AND user_id = ?`,
    [trackingCode, req.session.userId]
  );

  if (!order) {
    return res.redirect('/orders');
  }

  const items = JSON.parse(order.items_json || '[]');
  const computedStatus = computeOrderStatus(order);

  return res.render('pages/order-tracking', {
    title: `Order ${order.order_number} | Moja Flava`,
    order,
    items,
    computedStatus
  });
});

module.exports = {
  appRouter: router
};
