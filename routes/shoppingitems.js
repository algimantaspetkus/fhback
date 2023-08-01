const express = require('express');

const router = express.Router();
const taskController = require('../controllers/shoppingitem');

const addItem = (io) => (req, res) => {
  taskController.addItem(req, res, io);
};

const updateItem = (io) => (req, res) => {
  taskController.updateItem(req, res, io);
};

const deleteItem = (io) => (req, res) => {
  taskController.deleteItem(req, res, io);
};

module.exports = (io) => {
  router.post('/additem', addItem(io));
  router.put('/update', updateItem(io));
  router.get('/items/:itemListId', taskController.getItems);
  router.delete('/:shoppingItemId', deleteItem(io));
  router.get('/:shoppingItemId', taskController.getItem);
  return router;
};
