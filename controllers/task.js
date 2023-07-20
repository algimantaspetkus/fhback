const joi = require('joi');
const TaskList = require('../models/tasklist');
const Task = require('../models/task');
const UserFamily = require('../models/userfamily');
require('dotenv').config();

const getTasks = async (req, res) => {
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

      Task.find({ taskListId, active: true })
        .sort({ priority: -1 })
        .then((result) => res.status(200).json({ taskList, tasks: result }))
        .catch(() => {
          res.status(500).json({ err: 'Internal server error' });
        });
    } catch (err) {
      return res.status(403).json({ err: 'User does not belong to this family' });
    }
  } catch (err) {
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
        .catch(() => {
          res.status(500).json({ err: 'Internal server error' });
        });
    } catch (err) {
      return res.status(403).json({ err: 'User does not belong to this family' });
    }
  } catch (err) {
    res.status(500).json({ err: 'Internal server error' });
  }
};

const updateTask = async (req, res, next, io) => {
  const { userId, body } = req;
  const { taskId, data } = body;

  const schema = joi.object().keys({
    taskId: joi.string().required(),
    data: joi.object().required(),
  });

  const schemaData = joi.object().keys({
    taskTitle: joi.string().min(3).max(64),
    taskDescription: joi.string().min(3).max(256),
    assignedToUser: joi.string().allow(null),
    dueBy: joi.date().allow(null),
    priority: joi.number().min(0).max(100).default(0),
    completed: joi.boolean(),
  });

  const { error: errorData } = schemaData.validate(data);

  const { error } = schema.validate(body);

  if (error || errorData) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const task = await Task.findOne({ _id: taskId, active: true });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const taskList = await TaskList.findById(task.taskListId);
    if (taskList.isPrivate && taskList.createdByUser.toString() !== userId) {
      return res.status(403).json({ error: 'Task list is private' });
    }
    const userFamily = await UserFamily.findOne({ userId, familyId: taskList.familyId });

    if (!userFamily) {
      return res.status(403).json({ error: 'User does not belong to this family' });
    }
    const updatedTask = {
      ...task.toObject(),
      ...data,
    };

    if (data.completed) {
      updatedTask.completedAt = Date.now();
    } else {
      updatedTask.completedAt = undefined;
    }

    const result = await Task.findByIdAndUpdate(taskId, updatedTask, { new: true });
    io.to(taskList._id.toString()).emit('taskItemAdded');
    io.to(taskId.toString()).emit('taskItemUpdated');
    return res.status(200).json({ task: result });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteTask = async (req, res, next, io) => {
  const { userId } = req;
  const { taskId } = req.params;

  try {
    const task = await Task.findOne({ _id: taskId, active: true });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const taskList = await TaskList.findById(task.taskListId);
    if (taskList.isPrivate && taskList.createdByUser.toString() !== userId) {
      return res.status(403).json({ error: 'Task list is private' });
    }
    const userFamily = await UserFamily.findOne({ userId, familyId: taskList.familyId });

    if (!userFamily) {
      return res.status(403).json({ error: 'User does not belong to this family' });
    }

    const result = await Task.findOneAndUpdate({ _id: taskId }, { $set: { active: false } }, { new: true });

    io.to(taskList._id.toString()).emit('taskItemAdded');
    return res.status(200).json({ result });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getTask = async (req, res, next, io) => {
  const { userId } = req;
  const { taskId } = req.params;

  try {
    const task = await Task.findOne({ _id: taskId, active: true })
      .populate('taskListId', 'listTitle isPrivate') // Populate createdByUser field and select displayName
      .populate('createdByUser', 'displayName avatar') // Populate createdByUser field and select displayName
      .populate('assignedToUser', 'displayName avatar'); // Populate assignedToUser field and select displayName

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const taskList = await TaskList.findById(task.taskListId);
    if (taskList.isPrivate && taskList.createdByUser.toString() !== userId) {
      return res.status(403).json({ error: 'Task list is private' });
    }

    const userFamily = await UserFamily.findOne({ userId, familyId: taskList.familyId });
    if (!userFamily) {
      return res.status(403).json({ error: 'User does not belong to this family' });
    }

    io.to(taskId.toString()).emit('taskItemUpdated');
    return res.status(200).json({ task });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { addNew, getTasks, updateTask, deleteTask, getTask };
