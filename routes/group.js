const express = require('express');

const router = express.Router();
const groupController = require('../controllers/group');

const addGroup = (io) => (req, res) => {
  groupController.createItem(req, res, io);
};

const disableGroup = (io) => (req, res) => {
  groupController.disableGroup(req, res, io);
};

const leaveGroup = (io) => (req, res) => {
  groupController.leaveGroup(req, res, io);
};

const joinGroup = (io) => (req, res) => {
  groupController.joinGroup(req, res, io);
};

module.exports = (io) => {
  router.post('/addgroup', addGroup(io));
  router.post('/disablegroup', disableGroup(io));
  router.post('/leavegroup', leaveGroup(io));
  router.post('/joingroup', joinGroup(io));
  router.get('/listmembers/:listId', groupController.getListMembers);
  router.get('/groupsecret/:groupId', groupController.getGroupSecret);
  router.get('/getgroups', groupController.getGroups);

  return router;
};
