const joi = require('joi');
const Family = require('../models/family');
const UserFamily = require('../models/userfamily');
const TaskList = require('../models/tasklist');
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

const getFamilies = (req, res, next) => {
  const { userId } = req;
  UserFamily.find({ userId })
    .populate({
      path: 'familyId',
      select: 'name active',
      match: { active: true },
    })
    .sort({ createdAt: -1 })
    .then((result) => {
      const filteredResult = result.filter((item) => item.familyId !== null);
      res.status(200).json({ families: filteredResult });
    })
    .catch((err) => {
      res.status(400).json({ error: 'Something went wrong' });
      next(err);
    });
};

const disableFamily = (req, res, next, io) => {
  const { familyId } = req.body;
  const { userId } = req;
  UserFamily.findOne({ familyId, userId })
    .then((result) => {
      if (result.role === 'owner') {
        Family.findOneAndUpdate({ _id: familyId }, { active: false }, { new: true })
          .then(() => {
            io.to(userId).emit('updateFamily');
            getFamilies(req, res, next);
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
    const family = new Family({
      name: body.name,
      secret: generateRandomString(),
    });
    family
      .save()
      .then((result) => {
        const { _id } = result;
        const { userId } = req;
        const userFamily = new UserFamily({
          userId,
          familyId: _id,
          role: 'owner',
        });
        userFamily
          .save()
          .then(() => {
            io.to(userId).emit('updateFamily');
            getFamilies(req, res, next);
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

const leaveFamily = (req, res, next, io) => {
  const { familyId } = req.body;
  const { userId } = req;
  UserFamily.findOne({ familyId, userId })
    .then((result) => {
      if (result.role !== 'owner') {
        UserFamily.findOneAndDelete({ familyId, userId })
          .then(() => {
            io.to(userId).emit('updateFamily');
            getFamilies(req, res, next);
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

const getFamilySecret = (req, res, next) => {
  const { familyId } = req.params;
  const { userId } = req;
  UserFamily.findOne({ familyId, userId })
    .then((result) => {
      if (result.role === 'owner') {
        Family.findOne({ _id: familyId })
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

const joinFamily = (req, res, next, io) => {
  const { secret } = req.body;
  const { userId } = req;
  Family.findOne({ secret })
    .then(({ active, familyId, _id }) => {
      if (active) {
        UserFamily.findOne({ userId, familyId })
          .then((belongs) => {
            if (belongs === null) {
              const userFamily = new UserFamily({
                userId,
                familyId: _id,
                role: 'guest',
              });
              userFamily
                .save()
                .then(() => {
                  io.to(userId).emit('updateFamily');
                  getFamilies(req, res, next);
                })
                .catch((err) => {
                  res.status(400).json({ error: 'Something went wrong' });
                  next(err);
                });
            } else {
              res.status(400).json({ error: 'You already belong to a family' });
            }
          })
          .catch((err) => {
            res.status(400).json({ error: 'Something went wrong' });
            next(err);
          });
      } else {
        res.status(400).json({ error: 'Family is not active' });
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
    const list = await TaskList.findOne({ _id: listId });
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
      const userFamily = await UserFamily.find({ familyId: list.familyId });
      if (!userFamily || userFamily.length === 0) {
        return res.status(400).json({ error: 'You cannot access this list' });
      }

      const userIds = userFamily.map((family) => family.userId);
      const familyMembers = await User.find({ _id: { $in: userIds } });
      return res.status(200).json({ members: familyMembers });
    }
    return res.status(400).json({ error: 'You cannot access this list' });
  } catch (error) {
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

module.exports = {
  addNew,
  getFamilies,
  disableFamily,
  leaveFamily,
  getFamilySecret,
  joinFamily,
  getListMembers,
};
