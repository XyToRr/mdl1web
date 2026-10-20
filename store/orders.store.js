// In-memory order storage.
// Knows nothing about HTTP: no req/res, no status codes.
// Data lives in the process and disappears on restart (by design).

const orders = [];

function add(order) {
  orders.push(order);
}

function list() {
  return [...orders];
}

function findById(id) {
  return orders.find((order) => order.id === id);
}

function removeById(id) {
  const index = orders.findIndex((order) => order.id === id);

  if (index === -1) {
    return false;
  }

  orders.splice(index, 1);
  return true;
}

module.exports = { add, list, findById, removeById };