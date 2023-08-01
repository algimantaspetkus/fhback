const express = require('express');

const router = express.Router();
const taskController = require('../controllers/taskitems');

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
  router.post('/addtask', addItem(io));
  router.put('/update', updateItem(io));
  router.get('/tasks/:itemListId', taskController.getItems);
  router.delete('/:taskId', deleteItem(io));
  router.get('/:taskId', taskController.getItem);
  return router;
};
