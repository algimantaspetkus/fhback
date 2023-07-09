const joi = require('joi');
const TaskList = require('../models/tasklist');
const Family = require('../models/family');
const User = require('../models/user');
require('dotenv').config();

const getTaskList = async (req, res, next) => {
  try {
    const { userId } = req;
    const { defaultFamilyId } = await User.findById(userId);
    const schema = joi.object().keys({
      userId: joi.string().required(),
    });

    const { error } = schema.validate({ userId });

    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    if (!defaultFamilyId) {
      return res.status(400).json({ error: 'You must belong to a family to get the task list' });
    }

    const taskList = await TaskList.find({
      $or: [
        { familyId: defaultFamilyId.toString(), isPrivate: false },
        { familyId: defaultFamilyId.toString(), isPrivate: true, createdByUser: userId },
      ],
    });
    res.status(200).json({ taskList });
  } catch (err) {
    res.status(400).json({ error: 'Something went wrong' });
    next(err);
  }
};

const addNew = async (req, res, next, io) => {
  const { body } = req;
  const { userId } = req;
  const { defaultFamilyId } = await User.findById(userId);

  const schema = joi.object().keys({
    listTitle: joi.string().required(),
    isPrivate: joi.boolean().required(),
  });

  const { error } = schema.validate(body);

  if (error) {
    res.status(400).json({ error: error.details[0].message });
  } else if (!defaultFamilyId === null) {
    res.status(400).json({ error: 'You must belong to a family to create a task list' });
  } else {
    Family.findById(defaultFamilyId)
      .then((family) => {
        if (family.active) {
          const taskList = new TaskList({
            familyId: defaultFamilyId,
            createdByUser: userId,
            listTitle: body.listTitle,
            isPrivate: body.isPrivate,
          });
          taskList
            .save()
            .then(() => {
              io.to(defaultFamilyId.toString()).emit('updateTaskList');
              getTaskList(req, res, next);
            })
            .catch((err) => {
              res.status(400).json({ error: 'Something went wrong' });
              next(err);
            });
        } else {
          res.status(400).json({ error: 'You are not a member of an active family' });
        }
      })
      .catch((err) => {
        res.status(400).json({ error: 'Something went wrong' });
        next(err);
      });
  }
};
module.exports = { getTaskList, addNew };
