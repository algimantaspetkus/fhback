const express = require('express');
const router = express.Router();
const familyController = require('../controllers/family');

const addFamily = (io) => (req, res, next) => {
  // Access the `io` object inside the route handler function
  //   io.emit('familyAdded', { message: 'A new family was added' });

  // Call the controller function
  familyController.addNew(req, res, next, io);
};

const disableFamily = (io) => (req, res, next) => {
  familyController.disableFamily(req, res, next, io);
};

const leaveFamily = (io) => (req, res, next) => {
  familyController.leaveFamily(req, res, next, io);
};

const joinFamily = (io) => (req, res, next) => {
  familyController.joinFamily(req, res, next, io);
};

module.exports = (io) => {
  // Assign the modified route handler function to the route
  router.post('/addfamily', addFamily(io)); // Pass the `io` object as a parameter
  router.post('/disablefamily', disableFamily(io));
  router.post('/leavefamily', leaveFamily(io));
  router.post('/joinfamily', joinFamily(io));
  router.get('/getfamilysecret/:familyId', familyController.getFamilySecret);
  router.get('/getfamilies', familyController.getFamilies);

  return router;
};
