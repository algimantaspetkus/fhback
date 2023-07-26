const express = require('express');

const router = express.Router();
const itemListController = require('../controllers/itemList');

const type = 'task';

const addTaskList = (io) => (req, res, next) => {
  itemListController.addNew(req, res, next, io, type);
};

const getTaskList = (io) => (req, res, next) => {
  itemListController.getTaskList(req, res, next, io, type);
};
const makePublic = (io) => (req, res, next) => {
  itemListController.makePublic(req, res, next, io);
};
const disableTaskList = (io) => (req, res, next) => {
  itemListController.disableTaskList(req, res, next, io);
};

module.exports = (io) => {
  router.post('/add', addTaskList(io));
  router.put('/makepublic', makePublic(io));
  router.put('/disable', disableTaskList(io));
  router.get('/list', getTaskList(io));
  return router;
};
