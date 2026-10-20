// HTTP layer for /orders: reads req, calls the service,
// maps results to status codes, headers and response bodies.
// Mounted in app.js as app.use("/orders", router).

const express = require("express");
const service = require("../service/orders.service");
const { validationProblem, notFoundProblem } = require("./errors");

const router = express.Router();

function copyItem(item) {
  return {
    name: item.name,
    quantity: item.quantity,
    price: item.price,
  };
}

// Public shape of an order (hides internal fields such as createdAt).
function orderResponse(order) {
  return {
    id: order.id,
    customerName: order.customerName,
    items: order.items.map(copyItem),
    total: order.total,
    status: order.status,
  };
}

router.post("/", async (req, res, next) => {
  try {
    const validationErrors = service.validateCreateOrder(req.body);

    if (validationErrors.length > 0) {
      return res
        .status(400)
        .json(validationProblem("Invalid order", validationErrors));
    }

    const order = await service.createOrder(req.body);

    return res
      .status(201)
      .location(`/orders/${order.id}`)
      .json(orderResponse(order));
  } catch (error) {
    return next(error);
  }
});

router.get("/", (req, res) => {
  const orders = service.listOrders().map((order) => orderResponse(order));

  res.status(200).json({
    orders,
    count: orders.length,
  });
});

router.get("/:id", async (req, res, next) => {
  try {
    const order = await service.getOrder(req.params.id);

    if (!order) {
      return res.status(404).json(notFoundProblem());
    }

    return res.status(200).json(orderResponse(order));
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await service.deleteOrder(req.params.id);

    if (!deleted) {
      return res.status(404).json(notFoundProblem());
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;