const express = require('express');

const router = express.Router();
const taskListController = require('../controllers/tasklist');

const addTaskList = (io) => (req, res, next) => {
  taskListController.addNew(req, res, next, io);
};

const getTaskList = (io) => (req, res, next) => {
  taskListController.getTaskList(req, res, next, io);
};

module.exports = (io) => {
  router.post('/addtasklist', addTaskList(io));
  router.get('/gettasklists', getTaskList(io));
  return router;
};
