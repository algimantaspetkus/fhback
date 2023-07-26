const express = require('express');

const router = express.Router();
const taskController = require('../controllers/shoppingitem');

const addItem = (io) => (req, res, next) => {
  taskController.addItem(req, res, next, io);
};

const getItem = (io) => (req, res, next) => {
  taskController.getItem(req, res, next, io);
};
const updateItem = (io) => (req, res, next) => {
  taskController.updateItem(req, res, next, io);
};
const deleteItem = (io) => (req, res, next) => {
  taskController.deleteItem(req, res, next, io);
};
const getItems = (io) => (req, res, next) => {
  taskController.getItems(req, res, next, io);
};

module.exports = (io) => {
  router.post('/additem', addItem(io));
  router.put('/update', updateItem(io));
  router.get('/items/:itemListId', getItems(io));
  router.delete('/:shoppingItemId', deleteItem(io));
  router.get('/:shoppingItemId', getItem(io));
  return router;
};
