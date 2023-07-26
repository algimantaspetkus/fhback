const joi = require('joi');
const Group = require('../models/group');
const UserGroup = require('../models/usergroup');
const ItemList = require('../models/itemlist');
const User = require('../models/user');
require('dotenv').config();

const generateRandomString = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@.';
  const length = 32;
  let result = '';
  for (let i = 0; i < length; i += 1) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
};

const getGroups = (req, res, next) => {
  const { userId } = req;
  UserGroup.find({ userId })
    .populate({
      path: 'groupId',
      select: 'name active',
      match: { active: true },
    })
    .sort({ createdAt: -1 })
    .then((result) => {
      const filteredResult = result.filter((item) => item.groupId !== null);
      res.status(200).json({ groups: filteredResult });
    })
    .catch((err) => {
      res.status(400).json({ error: 'Something went wrong' });
      next(err);
    });
};

const disableGroup = (req, res, next, io) => {
  const { groupId } = req.body;
  const { userId } = req;
  UserGroup.findOne({ groupId, userId })
    .then((result) => {
      if (result.role === 'owner') {
        Group.findOneAndUpdate({ _id: groupId }, { active: false }, { new: true })
          .then(() => {
            io.to(userId).emit('updateGroup');
            getGroups(req, res, next);
          })
          .catch((err) => {
            res.status(400).json({ error: 'Something went wrong' });
            next(err);
          });
      } else {
        res.status(400).json({ error: 'You are not the owner' });
      }
    })
    .catch((err) => {
      res.status(400).json({ error: 'Something went wrong' });
      next(err);
    });
};

const addNew = (req, res, next, io) => {
  const { body } = req;
  const schema = joi.object({
    name: joi.string().min(6).required(),
  });

  const { error } = schema.validate(body);
  if (error) {
    res.status(400).json({ error: error.details[0].message });
  } else {
    const group = new Group({
      name: body.name,
      secret: generateRandomString(),
    });
    group
      .save()
      .then((result) => {
        const { _id } = result;
        const { userId } = req;
        const userGroup = new UserGroup({
          userId,
          groupId: _id,
          role: 'owner',
        });
        userGroup
          .save()
          .then((resp) => {
            io.to(userId).emit('updateGroup');
            res.status(200).json({ groupId: resp.groupId });
          })
          .catch((err) => {
            res.status(400).json({ error: 'Something went wrong' });
            next(err);
          });
      })
      .catch((err) => {
        res.status(400).json({ error: 'Something went wrong' });
        next(err);
      });
  }
};

const leaveGroup = (req, res, next, io) => {
  const { groupId } = req.body;
  const { userId } = req;
  UserGroup.findOne({ groupId, userId })
    .then((result) => {
      if (result.role !== 'owner') {
        UserGroup.findOneAndDelete({ groupId, userId })
          .then(() => {
            io.to(userId).emit('updateGroup');
            getGroups(req, res, next);
          })
          .catch((err) => {
            res.status(400).json({ error: 'Something went wrong' });
            next(err);
          });
      } else {
        res.status(400).json({ error: 'Owners can not leave' });
      }
    })
    .catch((err) => {
      res.status(400).json({ error: 'Something went wrong' });
      next(err);
    });
};

const getGroupSecret = (req, res, next) => {
  const { groupId } = req.params;
  const { userId } = req;
  UserGroup.findOne({ groupId, userId })
    .then((result) => {
      if (result.role === 'owner') {
        Group.findOne({ _id: groupId })
          .then(({ secret }) => {
            res.status(200).json({ secret });
          })
          .catch((err) => {
            res.status(400).json({ error: 'Something went wrong' });
            next(err);
          });
      } else {
        res.status(400).json({ error: 'You are not the owner' });
      }
    })
    .catch((err) => {
      res.status(400).json({ error: 'Something went wrong' });
      next(err);
    });
};

const joinGroup = (req, res, next, io) => {
  const { secret } = req.body;
  const { userId } = req;
  Group.findOne({ secret })
    .then(({ active, groupId, _id }) => {
      if (active) {
        UserGroup.findOne({ userId, groupId })
          .then((belongs) => {
            if (belongs === null) {
              const userGroup = new UserGroup({
                userId,
                groupId: _id,
                role: 'guest',
              });
              userGroup
                .save()
                .then(() => {
                  io.to(userId).emit('updateGroup');
                  getGroups(req, res, next);
                })
                .catch((err) => {
                  res.status(400).json({ error: 'Something went wrong' });
                  next(err);
                });
            } else {
              res.status(400).json({ error: 'You already belong to a group' });
            }
          })
          .catch((err) => {
            res.status(400).json({ error: 'Something went wrong' });
            next(err);
          });
      } else {
        res.status(400).json({ error: 'Group is not active' });
      }
    })
    .catch((err) => {
      res.status(400).json({ error: 'Something went wrong' });
      next(err);
    });
};

const getListMembers = async (req, res) => {
  const { listId } = req.params;
  const { userId } = req;

  try {
    const list = await ItemList.findOne({ _id: listId });
    if (!list) {
      return res.status(400).json({ error: 'List does not exist' });
    }

    if (list.isPrivate && list.createdByUser === userId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.status(200).json({ members: [user] });
    } else if (!list.isPrivate) {
      const userGroup = await UserGroup.find({ groupId: list.groupId });
      if (!userGroup || userGroup.length === 0) {
        return res.status(400).json({ error: 'You cannot access this list' });
      }

      const userIds = userGroup.map((group) => group.userId);
      const groupMembers = await User.find({ _id: { $in: userIds } });
      return res.status(200).json({ members: groupMembers });
    }
    return res.status(400).json({ error: 'You cannot access this list' });
  } catch (error) {
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

module.exports = {
  addNew,
  getGroups,
  disableGroup,
  leaveGroup,
  getGroupSecret,
  joinGroup,
  getListMembers,
};
