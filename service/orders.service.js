// Business logic for orders: validation, normalization, total calculation,
// id and status rules. Knows nothing about Express (no req/res/status codes);
// talks to the data layer only through the store.

const { randomUUID } = require("node:crypto");
const store = require("../store/orders.store");

const DEFAULT_ORDER_STATUS = "created";

function makeOrderId() {
  return `ord-${randomUUID().slice(0, 8)}`;
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateTotal(items) {
  return roundMoney(
    items.reduce((sum, item) => sum + item.quantity * item.price, 0),
  );
}

// Returns a list of problems; an empty list means the body is valid.
function validateCreateOrder(body) {
  const problems = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    problems.push("Request body must be a JSON object");
    return problems;
  }

  if (
    typeof body.customerName !== "string" ||
    body.customerName.trim().length === 0
  ) {
    problems.push("customerName is required");
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    problems.push("At least one item is required");
    return problems;
  }

  body.items.forEach((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      problems.push(`items[${index}] must be an object`);
      return;
    }

    if (typeof item.name !== "string" || item.name.trim().length === 0) {
      problems.push(`items[${index}].name is required`);
    }

    if (
      typeof item.quantity !== "number" ||
      !Number.isFinite(item.quantity) ||
      item.quantity <= 0
    ) {
      problems.push(`items[${index}].quantity must be greater than zero`);
    }

    if (
      typeof item.price !== "number" ||
      !Number.isFinite(item.price) ||
      item.price <= 0
    ) {
      problems.push(`items[${index}].price must be greater than zero`);
    }
  });

  return problems;
}

function normalizeItems(items) {
  return items.map((item) => ({
    name: item.name.trim(),
    quantity: item.quantity,
    price: item.price,
  }));
}

async function prepareOrderContext(order) {
  return {
    record: order,
    itemCount: order.items.length,
  };
}

async function persistOrderWithContext(order) {
  store.add(order);
  const context = await prepareOrderContext(order);
  return context.record;
}

async function verifyOrderStateForRemoval(order) {
  const context = await prepareOrderContext(order);
  return context.itemCount === order.items.length;
}

// --- Public service API (what the routes call) ---

// Expects a body that already passed validateCreateOrder().
async function createOrder(body) {
  const items = normalizeItems(body.items);

  const newOrder = {
    id: makeOrderId(),
    customerName: body.customerName.trim(),
    items,
    total: calculateTotal(items),
    status: DEFAULT_ORDER_STATUS,
    createdAt: new Date().toISOString(),
  };

  return persistOrderWithContext(newOrder);
}

function listOrders() {
  return store.list();
}

// Returns the order, or null if it does not exist.
async function getOrder(id) {
  const order = store.findById(id);

  if (!order) {
    return null;
  }

  const context = await prepareOrderContext(order);
  return context.record;
}

// Returns true if the order was deleted, false if it does not exist.
async function deleteOrder(id) {
  const order = store.findById(id);

  if (!order) {
    return false;
  }

  await verifyOrderStateForRemoval(order);

  return store.removeById(id);
}

module.exports = {
  validateCreateOrder,
  createOrder,
  listOrders,
  getOrder,
  deleteOrder,
};