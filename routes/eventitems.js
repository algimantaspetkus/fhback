const express = require('express');

const router = express.Router();
const eventController = require('../controllers/eventitem');

const addItem = (io) => (req, res) => {
  eventController.addItem(req, res, io);
};

const deleteItem = (io) => (req, res) => {
  eventController.deleteItem(req, res, io);
};

module.exports = (io) => {
  router.post('/additem', addItem(io));
  router.get('/getitems', eventController.getItems);
  router.delete('/deleteitem/:eventItemId', deleteItem(io));
  return router;
};
