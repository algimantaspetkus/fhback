const express = require('express');

const router = express.Router();
const itemListController = require('../controllers/itemList');

const addTaskList = (io) => (req, res, next) => {
  itemListController.addNew(req, res, next, io);
};

const getTaskList = (io) => (req, res, next) => {
  itemListController.getTaskList(req, res, next, io);
};
const makePublic = (io) => (req, res, next) => {
  itemListController.makePublic(req, res, next, io);
};
const disableTaskList = (io) => (req, res, next) => {
  itemListController.disableTaskList(req, res, next, io);
};

module.exports = (io) => {
  router.post('/addtasklist', addTaskList(io));
  router.put('/makepublic', makePublic(io));
  router.put('/disabletasklist', disableTaskList(io));
  router.get('/gettasklists', getTaskList(io));
  return router;
};
