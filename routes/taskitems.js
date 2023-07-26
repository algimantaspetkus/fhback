const express = require('express');

const router = express.Router();
const taskController = require('../controllers/taskitems');

const addItem = (io) => (req, res, next) => {
  taskController.addItem(req, res, next, io);
};

const getItems = (io) => (req, res, next) => {
  taskController.getItems(req, res, next, io);
};
const updateItem = (io) => (req, res, next) => {
  taskController.updateItem(req, res, next, io);
};
const deleteItem = (io) => (req, res, next) => {
  taskController.deleteItem(req, res, next, io);
};
const getItem = (io) => (req, res, next) => {
  taskController.getItem(req, res, next, io);
};

module.exports = (io) => {
  router.post('/addtask', addItem(io));
  router.put('/update', updateItem(io));
  router.get('/tasks/:itemListId', getItems(io));
  router.delete('/:taskId', deleteItem(io));
  router.get('/:taskId', getItem(io));
  return router;
};
