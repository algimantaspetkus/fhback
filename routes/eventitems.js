const express = require('express');

const router = express.Router();
const eventController = require('../controllers/eventitem');

const addItem = (io) => (req, res, next) => {
  eventController.addItem(req, res, next, io);
};

const deleteItem = (io) => (req, res, next) => {
  eventController.deleteItem(req, res, next, io);
};

module.exports = (io) => {
  router.post('/additem', addItem(io));
  router.get('/getitems', eventController.getItems);
  router.delete('/deleteitem/:eventItemId', deleteItem(io));
  return router;
};
