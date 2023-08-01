const express = require('express');

const router = express.Router();
const itemListController = require('../controllers/itemlist');

const type = 'task';

const addItemList = (io) => (req, res) => {
  itemListController.addItemList(req, res, io, type);
};

const getItemList = () => (req, res) => {
  itemListController.getItemList(req, res, type);
};

const makePublic = (io) => (req, res) => {
  itemListController.makePublic(req, res, io, type);
};
const disableItemList = (io) => (req, res) => {
  itemListController.disableItemList(req, res, io, type);
};

module.exports = (io) => {
  router.post('/add', addItemList(io));
  router.put('/makepublic', makePublic(io));
  router.put('/disable', disableItemList(io));
  router.get('/list', getItemList);
  return router;
};
