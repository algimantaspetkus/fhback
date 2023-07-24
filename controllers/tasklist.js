const joi = require('joi');
const TaskList = require('../models/tasklist');
const UserGroup = require('../models/usergroup');
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
        { groupId: defaultGroupId.toString(), isPrivate: false, active: true },
        { groupId: defaultGroupId.toString(), isPrivate: true, createdByUser: userId, active: true },
      ],
    });
    res.status(200).json({ taskList });
  } catch (err) {
    res.status(400).json({ error: 'Something went wrong' });
    next(err);
  }
};

const disableTaskList = async (req, res, next, io) => {
  const { userId, body } = req;
  const { taskListId } = body;
  // check if taskListId is exists
  const schema = joi.object().keys({
    taskListId: joi.string().required(),
  });
  const { error } = schema.validate({ taskListId });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  // check if tasklist exists
  const taskList = await TaskList.findById(taskListId);
  if (!taskList) {
    return res.status(400).json({ error: 'Task list does not exist' });
  }
  // check if user belongs to group
  const userGroup = await UserGroup.findOne({ userId, groupId: taskList.groupId });
  if (!userGroup) {
    return res.status(400).json({ error: 'User does not belong to this group' });
  }
  if (taskList.isPrivate && taskList.createdByUser.toString() !== userId.toString() && !userGroup.role !== 'owner') {
    return res.status(403).json({ error: 'Access denied' });
  }
  taskList.active = false;
  taskList
    .save()
    .then(() => {
      io.to(taskList.groupId.toString()).emit('updateTaskList');
      getTaskList(req, res, next);
    })
    .catch((err) => {
      res.status(400).json({ error: 'Something went wrong' });
      next(err);
    });
};

const makePublic = async (req, res, next, io) => {
  const { userId, body } = req;
  const { taskListId } = body;
  // check if taskListId is exists
  const schema = joi.object().keys({
    taskListId: joi.string().required(),
  });
  const { error } = schema.validate({ taskListId });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  // check if tasklist exists
  const taskList = await TaskList.findById(taskListId);
  if (!taskList) {
    return res.status(400).json({ error: 'Task list does not exist' });
  }
  // check if user belongs to group
  const userGroup = await UserGroup.findOne({ userId, groupId: taskList.groupId });
  if (!userGroup) {
    return res.status(400).json({ error: 'User does not belong to this group' });
  }
  if (taskList.isPrivate && taskList.createdByUser.toString() !== userId.toString() && !userGroup.role !== 'owner') {
    return res.status(403).json({ error: 'Access denied' });
  }
  taskList.isPrivate = false;
  taskList
    .save()
    .then(() => {
      io.to(taskList.groupId.toString()).emit('updateTaskList');
      getTaskList(req, res, next);
    })
    .catch((err) => {
      res.status(400).json({ error: 'Something went wrong' });
      next(err);
    });
};

const addNew = async (req, res, next, io) => {
  const { body } = req;
  const { userId } = req;
  const { defaultGroupId } = await User.findById(userId);

  const schema = joi.object().keys({
    listTitle: joi.string().min(3).max(32).required(),
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

module.exports = { getTaskList, addNew, disableTaskList, makePublic };
