const express = require('express');

const router = express.Router();
const taskController = require('../controllers/task');

const addTask = (io) => (req, res, next) => {
  taskController.addNew(req, res, next, io);
};

const getTasks = (io) => (req, res, next) => {
  taskController.getTasks(req, res, next, io);
};
const updateTask = (io) => (req, res, next) => {
  taskController.updateTask(req, res, next, io);
};
const deleteTask = (io) => (req, res, next) => {
  taskController.deleteTask(req, res, next, io);
};
const getTask = (io) => (req, res, next) => {
  taskController.getTask(req, res, next, io);
};

module.exports = (io) => {
  router.post('/addtask', addTask(io));
  router.put('/update', updateTask(io));
  router.get('/tasks/:itemListId', getTasks(io));
  router.delete('/:taskId', deleteTask(io));
  router.get('/:taskId', getTask(io));
  return router;
};
