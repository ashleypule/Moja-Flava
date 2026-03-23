const fs = require('fs');
const path = require('path');

const defaultDataFilePath = path.join(__dirname, '..', '..', 'data', 'store.json');
const dataFilePath = process.env.DATA_FILE_PATH
  ? path.resolve(process.env.DATA_FILE_PATH)
  : (process.env.VERCEL ? '/tmp/store.json' : defaultDataFilePath);

const MENU_CATALOG = [
  {
    name: 'Signature BBQ Wings',
    description: 'Smoky grilled wings with house BBQ glaze',
    price: 89.99,
    category: 'Main',
    image: 'bbqwings.avif'
  },
  {
    name: 'Moja Loaded Burger',
    description: 'Beef patty, cheddar, onion rings, spicy mayo',
    price: 109.99,
    category: 'Main',
    image: 'loadedburger.png'
  },
  {
    name: 'Kota',
    description: 'South African street-style kota loaded with flavor',
    price: 74.99,
    category: 'Wraps',
    image: 'kota.jpg'
  },
  {
    name: 'Veggie Power Bowl',
    description: 'Roasted veggies, quinoa, avocado dressing',
    price: 79.99,
    category: 'Healthy',
    image: 'veggiebowl.jpg'
  },
  {
    name: 'Family Feast Platter',
    description: 'Mixed meats, fries, salads and dips',
    price: 249.99,
    category: 'Combo',
    image: 'familyplatter.jpg'
  },
  {
    name: 'Chilli Cheese Fries',
    description: 'Fries topped with melted cheese and jalapeños',
    price: 54.99,
    category: 'Sides',
    image: 'cheesefries.jpg'
  },
  {
    name: 'Classic Milkshake',
    description: 'Creamy vanilla shake with whipped topping',
    price: 39.99,
    category: 'Drinks',
    image: 'milkshake.jpg'
  },
  {
    name: 'Tropical Cooler',
    description: 'Fresh pineapple, mint and citrus fizz',
    price: 34.99,
    category: 'Drinks',
    image: 'tropicalcooler.webp'
  }
];

function defaultData() {
  return {
    users: [],
    menu_items: [],
    orders: [],
    reviews: [],
    counters: {
      users: 1,
      menu_items: 1,
      orders: 1,
      reviews: 1
    }
  };
}

function ensureCounter(data, key, listKey) {
  if (Number.isInteger(data.counters[key]) && data.counters[key] > 0) {
    return false;
  }

  const items = Array.isArray(data[listKey]) ? data[listKey] : [];
  const maxId = items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
  data.counters[key] = maxId + 1;
  return true;
}

function normalizeDataShape(data) {
  let changed = false;

  if (!Array.isArray(data.users)) {
    data.users = [];
    changed = true;
  }

  if (!Array.isArray(data.menu_items)) {
    data.menu_items = [];
    changed = true;
  }

  if (!Array.isArray(data.orders)) {
    data.orders = [];
    changed = true;
  }

  if (!Array.isArray(data.reviews)) {
    data.reviews = [];
    changed = true;
  }

  if (!data.counters || typeof data.counters !== 'object') {
    data.counters = {};
    changed = true;
  }

  changed = ensureCounter(data, 'users', 'users') || changed;
  changed = ensureCounter(data, 'menu_items', 'menu_items') || changed;
  changed = ensureCounter(data, 'orders', 'orders') || changed;
  changed = ensureCounter(data, 'reviews', 'reviews') || changed;

  return changed;
}

function ensureDataFile() {
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify(defaultData(), null, 2), 'utf8');
  }
}

function loadData() {
  ensureDataFile();
  const raw = fs.readFileSync(dataFilePath, 'utf8');
  const parsed = JSON.parse(raw);
  const changed = normalizeDataShape(parsed);

  if (changed) {
    saveData(parsed);
  }

  return parsed;
}

function saveData(data) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
}

function selectOrderFields(order, fields) {
  const mapped = {};
  fields.forEach((field) => {
    mapped[field] = order[field];
  });
  return mapped;
}

async function run(query, params = []) {
  const normalized = query.replace(/\s+/g, ' ').trim().toLowerCase();
  const data = loadData();

  if (normalized.startsWith('create table if not exists')) {
    return { lastID: 0, changes: 0 };
  }

  if (normalized.startsWith('insert into menu_items')) {
    const [name, description, price, category, image] = params;
    const record = {
      id: data.counters.menu_items++,
      name,
      description,
      price: Number(price),
      category,
      image: image || null,
      created_at: new Date().toISOString()
    };
    data.menu_items.push(record);
    saveData(data);
    return { lastID: record.id, changes: 1 };
  }

  if (normalized.startsWith('insert into users')) {
    const [fullName, email, passwordHash] = params;
    const record = {
      id: data.counters.users++,
      full_name: fullName,
      email,
      password_hash: passwordHash,
      created_at: new Date().toISOString()
    };
    data.users.push(record);
    saveData(data);
    return { lastID: record.id, changes: 1 };
  }

  if (normalized.startsWith('insert into orders')) {
    const [
      orderNumber,
      trackingCode,
      userId,
      itemsJson,
      subtotal,
      deliveryFee,
      total,
      paymentStatus,
      orderStatus,
      addressLine,
      city,
      notes
    ] = params;

    const record = {
      id: data.counters.orders++,
      order_number: orderNumber,
      tracking_code: trackingCode,
      user_id: Number(userId),
      items_json: itemsJson,
      subtotal: Number(subtotal),
      delivery_fee: Number(deliveryFee),
      total: Number(total),
      payment_provider: null,
      payment_status: paymentStatus,
      order_status: orderStatus,
      address_line: addressLine,
      city,
      notes,
      created_at: new Date().toISOString()
    };

    data.orders.push(record);
    saveData(data);
    return { lastID: record.id, changes: 1 };
  }

  if (normalized.startsWith('insert into reviews')) {
    const [userId, userName, rating, comment] = params;
    const record = {
      id: data.counters.reviews++,
      user_id: Number(userId),
      user_name: userName,
      rating: Number(rating),
      comment,
      created_at: new Date().toISOString()
    };

    data.reviews.push(record);
    saveData(data);
    return { lastID: record.id, changes: 1 };
  }

  if (normalized.startsWith('update orders set payment_provider')) {
    const [provider, paymentStatus, orderStatus, orderId] = params;
    const target = data.orders.find((order) => order.id === Number(orderId));
    if (!target) {
      return { lastID: 0, changes: 0 };
    }
    target.payment_provider = provider;
    target.payment_status = paymentStatus;
    target.order_status = orderStatus;
    saveData(data);
    return { lastID: target.id, changes: 1 };
  }

  throw new Error(`Unsupported run query: ${query}`);
}

async function get(query, params = []) {
  const normalized = query.replace(/\s+/g, ' ').trim().toLowerCase();
  const data = loadData();

  if (normalized === 'select count(*) as count from menu_items') {
    return { count: data.menu_items.length };
  }

  if (normalized === 'select id from users where email = ?') {
    const [email] = params;
    const user = data.users.find((item) => item.email === email);
    return user ? { id: user.id } : undefined;
  }

  if (normalized === 'select id, full_name, password_hash from users where email = ?') {
    const [email] = params;
    const user = data.users.find((item) => item.email === email);
    if (!user) return undefined;
    return {
      id: user.id,
      full_name: user.full_name,
      password_hash: user.password_hash
    };
  }

  if (normalized === 'select tracking_code, order_number, payment_status, order_status, created_at from orders where tracking_code = ?') {
    const [trackingCode] = params;
    const order = data.orders.find((item) => item.tracking_code === trackingCode);
    if (!order) return undefined;
    return selectOrderFields(order, ['tracking_code', 'order_number', 'payment_status', 'order_status', 'created_at']);
  }

  if (normalized === 'select id, order_number, total, payment_status from orders where id = ? and user_id = ?') {
    const [orderId, userId] = params;
    const order = data.orders.find((item) => item.id === Number(orderId) && item.user_id === Number(userId));
    if (!order) return undefined;
    return selectOrderFields(order, ['id', 'order_number', 'total', 'payment_status']);
  }

  if (normalized === 'select id, tracking_code from orders where id = ? and user_id = ?') {
    const [orderId, userId] = params;
    const order = data.orders.find((item) => item.id === Number(orderId) && item.user_id === Number(userId));
    if (!order) return undefined;
    return selectOrderFields(order, ['id', 'tracking_code']);
  }

  if (normalized.includes('from orders where tracking_code = ? and user_id = ?')) {
    const [trackingCode, userId] = params;
    const order = data.orders.find((item) => item.tracking_code === trackingCode && item.user_id === Number(userId));
    if (!order) return undefined;
    return selectOrderFields(order, [
      'id',
      'order_number',
      'tracking_code',
      'total',
      'payment_provider',
      'payment_status',
      'order_status',
      'address_line',
      'city',
      'notes',
      'items_json',
      'created_at'
    ]);
  }

  throw new Error(`Unsupported get query: ${query}`);
}

async function all(query, params = []) {
  const normalized = query.replace(/\s+/g, ' ').trim().toLowerCase();
  const data = loadData();

  if (normalized.startsWith('select id, name, description, price, category from menu_items where id in')) {
    const ids = params.map((value) => Number(value));
    return data.menu_items
      .filter((item) => ids.includes(item.id))
      .map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        image: item.image || null
      }));
  }

  if (normalized === 'select id, name, description, price, category from menu_items order by category, name') {
    return [...data.menu_items]
      .sort((left, right) => {
        if (left.category === right.category) {
          return left.name.localeCompare(right.name);
        }
        return left.category.localeCompare(right.category);
      })
      .map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        image: item.image || null
      }));
  }

  if (normalized === 'select id, order_number, tracking_code, total, payment_provider, payment_status, order_status, created_at from orders where user_id = ? order by id desc') {
    const [userId] = params;
    return data.orders
      .filter((item) => item.user_id === Number(userId))
      .sort((left, right) => right.id - left.id)
      .map((order) => selectOrderFields(order, [
        'id',
        'order_number',
        'tracking_code',
        'total',
        'payment_provider',
        'payment_status',
        'order_status',
        'created_at'
      ]));
  }

  if (normalized === 'select id, user_name, rating, comment, created_at from reviews order by id desc') {
    return [...data.reviews]
      .sort((left, right) => right.id - left.id)
      .map((review) => selectOrderFields(review, ['id', 'user_name', 'rating', 'comment', 'created_at']));
  }

  throw new Error(`Unsupported all query: ${query}`);
}

async function seedMenuItems() {
  const data = loadData();
  const currentItems = Array.isArray(data.menu_items) ? data.menu_items : [];
  const existingByName = new Map(data.menu_items.map((item) => [item.name.toLowerCase(), item]));
  const nextItems = [];

  for (const catalogItem of MENU_CATALOG) {
    const existingItem = existingByName.get(catalogItem.name.toLowerCase());

    if (existingItem) {
      nextItems.push({
        ...existingItem,
        name: catalogItem.name,
        description: catalogItem.description,
        price: Number(catalogItem.price),
        category: catalogItem.category,
        image: catalogItem.image
      });
      continue;
    }

    nextItems.push({
      id: data.counters.menu_items++,
      name: catalogItem.name,
      description: catalogItem.description,
      price: Number(catalogItem.price),
      category: catalogItem.category,
      image: catalogItem.image,
      created_at: new Date().toISOString()
    });
  }

  const isSameLength = currentItems.length === nextItems.length;
  const hasDifferences = !isSameLength || nextItems.some((item, index) => {
    const currentItem = currentItems[index];
    if (!currentItem) {
      return true;
    }

    return (
      currentItem.id !== item.id
      || currentItem.name !== item.name
      || currentItem.description !== item.description
      || Number(currentItem.price) !== Number(item.price)
      || currentItem.category !== item.category
      || (currentItem.image || null) !== (item.image || null)
    );
  });

  if (hasDifferences) {
    data.menu_items = nextItems;
    saveData(data);
  }
}

async function initializeDatabase() {
  ensureDataFile();
  await seedMenuItems();
}

module.exports = {
  db: null,
  run,
  get,
  all,
  initializeDatabase
};
