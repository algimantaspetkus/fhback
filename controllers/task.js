const joi = require('joi');
const TaskList = require('../models/tasklist');
const Task = require('../models/task');
const UserFamily = require('../models/userfamily');
require('dotenv').config();

const getTasks = async (req, res, next, io) => {
  const { userId } = req;
  const { taskListId } = req.params;

  const schema = joi.object().keys({
    taskListId: joi.string().required(),
  });

  const { error } = schema.validate({ taskListId });

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const taskList = await TaskList.findById(taskListId);

    try {
      const family = await UserFamily.findOne({ userId, familyId: taskList.familyId });
      if (!family) {
        return res.status(403).json({ err: 'User does not belong to this family' });
      }

      if (taskList.isPrivate && taskList.createdByUser !== userId.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (!taskList) {
        return res.status(404).json({ error: 'Task list not found' });
      }

      Task.find({ taskListId })
        .sort({ priority: -1 })
        .then((result) => res.status(200).json({ taskList, tasks: result }))
        .catch((err) => {
          console.error('Error:', err);
          res.status(500).json({ err: 'Internal server error' });
        });
    } catch (err) {
      return res.status(403).json({ err: 'User does not belong to this family' });
    }
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ err: 'Internal server error' });
  }
};

const addNew = async (req, res, next, io) => {
  const { body } = req;
  const { userId } = req;

  const schema = joi.object().keys({
    taskListId: joi.string().required(),
    taskTitle: joi.string().required().min(3).max(64),
    taskDescription: joi.string().min(3).max(256),
    assignedToUser: joi.string().allow(null),
    dueBy: joi.date().allow(null),
    priority: joi.number().min(0).max(100).default(0),
    tags: joi.array().items(joi.string()).allow(null),
  });

  const { error } = schema.validate(body);

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { taskListId } = body;

  try {
    const taskList = await TaskList.findById(taskListId);

    try {
      const family = await UserFamily.findOne({ userId, familyId: taskList.familyId });
      if (!family) {
        return res.status(403).json({ err: 'User does not belong to this family' });
      }

      if (taskList.isPrivate && taskList.createdByUser !== userId.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (!taskList) {
        return res.status(404).json({ error: 'Task list not found' });
      }

      const task = new Task({ ...body, createdByUser: userId });
      task
        .save()
        .then(async (result) => {
          io.to(taskListId.toString()).emit('taskItemAdded');
          return res.status(200).json({ task: result });
        })
        .catch((err) => {
          console.error('Error:', err);
          res.status(500).json({ err: 'Internal server error' });
        });
    } catch (err) {
      return res.status(403).json({ err: 'User does not belong to this family' });
    }
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ err: 'Internal server error' });
  }
};

module.exports = { addNew, getTasks };
