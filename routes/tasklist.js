const express = require('express');

const router = express.Router();
const itemListController = require('../controllers/itemList');

const type = 'task';

const addItemList = (io) => (req, res, next) => {
  itemListController.addItemList(req, res, next, io, type);
};

const getItemList = (io) => (req, res, next) => {
  itemListController.getItemList(req, res, next, io, type);
};
const makePublic = (io) => (req, res, next) => {
  itemListController.makePublic(req, res, next, io);
};
const disableItemList = (io) => (req, res, next) => {
  itemListController.disableItemList(req, res, next, io);
};

module.exports = (io) => {
  router.post('/add', addItemList(io));
  router.put('/makepublic', makePublic(io));
  router.put('/disable', disableItemList(io));
  router.get('/list', getItemList(io));
  return router;
};
