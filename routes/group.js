const express = require('express');

const router = express.Router();
const groupController = require('../controllers/group');

const addGroup = (io) => (req, res, next) => {
  groupController.addNew(req, res, next, io);
};

const disableGroup = (io) => (req, res, next) => {
  groupController.disableGroup(req, res, next, io);
};

const leaveGroup = (io) => (req, res, next) => {
  groupController.leaveGroup(req, res, next, io);
};

const joinGroup = (io) => (req, res, next) => {
  groupController.joinGroup(req, res, next, io);
};

module.exports = (io) => {
  router.post('/addgroup', addGroup(io));
  router.post('/disablegroup', disableGroup(io));
  router.post('/leavegroup', leaveGroup(io));
  router.post('/joingroup', joinGroup(io));
  router.get('/getListMembers/:listId', groupController.getListMembers);
  router.get('/getgroupsecret/:groupId', groupController.getGroupSecret);
  router.get('/getgroups', groupController.getGroups);

  return router;
};
