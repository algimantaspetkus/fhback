const express = require('express');

const router = express.Router();
const taskController = require('../controllers/task');

const addTask = (io) => (req, res, next) => {
  taskController.addNew(req, res, next, io);
};

const getTasks = (io) => (req, res, next) => {
  taskController.getTasks(req, res, next, io);
};

module.exports = (io) => {
  router.post('/addtask', addTask(io));
  router.get('/tasks/:taskListId', getTasks(io));
  return router;
};
