const joi = require('joi');
const TaskList = require('../models/tasklist');
const Group = require('../models/group');
const User = require('../models/user');
require('dotenv').config();

const getTaskList = async (req, res, next) => {
  try {
    const { userId } = req;
    const { defaultGroupId } = await User.findById(userId);
    const schema = joi.object().keys({
      userId: joi.string().required(),
    });

    const { error } = schema.validate({ userId });

    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    if (!defaultGroupId) {
      return res.status(400).json({ error: 'You must belong to a group to get the task list' });
    }

    const taskList = await TaskList.find({
      $or: [
        { groupId: defaultGroupId.toString(), isPrivate: false },
        { groupId: defaultGroupId.toString(), isPrivate: true, createdByUser: userId },
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
  const { defaultGroupId } = await User.findById(userId);

  const schema = joi.object().keys({
    listTitle: joi.string().required(),
    isPrivate: joi.boolean().required(),
  });

  const { error } = schema.validate(body);

  if (error) {
    res.status(400).json({ error: error.details[0].message });
  } else if (!defaultGroupId === null) {
    res.status(400).json({ error: 'You must belong to a group to create a task list' });
  } else {
    Group.findById(defaultGroupId)
      .then((group) => {
        if (group.active) {
          const taskList = new TaskList({
            groupId: defaultGroupId,
            createdByUser: userId,
            listTitle: body.listTitle,
            isPrivate: body.isPrivate,
          });
          taskList
            .save()
            .then(() => {
              io.to(defaultGroupId.toString()).emit('updateTaskList');
              getTaskList(req, res, next);
            })
            .catch((err) => {
              res.status(400).json({ error: 'Something went wrong' });
              next(err);
            });
        } else {
          res.status(400).json({ error: 'You are not a member of an active group' });
        }
      })
      .catch((err) => {
        res.status(400).json({ error: 'Something went wrong' });
        next(err);
      });
  }
};
module.exports = { getTaskList, addNew };
