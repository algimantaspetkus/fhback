const joi = require('joi');
const ItemList = require('../models/itemlist');
const Task = require('../models/task');
const UserGroup = require('../models/usergroup');
require('dotenv').config();

const getItems = async (req, res) => {
  const { userId } = req;
  const { itemListId } = req.params;

  const schema = joi.object().keys({
    itemListId: joi.string().required(),
  });

  const { error } = schema.validate({ itemListId });

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const itemList = await ItemList.findById(itemListId);

    try {
      const group = await UserGroup.findOne({ userId, groupId: itemList.groupId });
      if (!group) {
        return res.status(403).json({ err: 'User does not belong to this group' });
      }
      if (itemList.isPrivate && itemList.createdByUser.toString() !== userId.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (!itemList) {
        return res.status(404).json({ error: 'Task list not found' });
      }

      Task.find({ itemListId, active: true })
        .sort({ priority: -1 })
        .then((result) => res.status(200).json({ itemList, tasks: result }))
        .catch(() => {
          res.status(500).json({ err: 'Internal server error' });
        });
    } catch (err) {
      return res.status(403).json({ err: 'User does not belong to this group' });
    }
  } catch (err) {
    res.status(500).json({ err: 'Internal server error' });
  }
};

const addItem = async (req, res, next, io) => {
  const { body } = req;
  const { userId } = req;

  const schema = joi.object().keys({
    itemListId: joi.string().required(),
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

  const { itemListId } = body;

  try {
    const itemList = await ItemList.findById(itemListId);

    try {
      const group = await UserGroup.findOne({ userId, groupId: itemList.groupId });
      if (!group) {
        return res.status(403).json({ err: 'User does not belong to this group' });
      }

      if (itemList.isPrivate && itemList.createdByUser !== userId.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (!itemList) {
        return res.status(404).json({ error: 'Task list not found' });
      }

      const task = new Task({ ...body, createdByUser: userId });
      task
        .save()
        .then(async (result) => {
          io.to(itemListId.toString()).emit('taskItemAdded');
          return res.status(200).json({ task: result });
        })
        .catch(() => {
          res.status(500).json({ err: 'Internal server error' });
        });
    } catch (err) {
      return res.status(403).json({ err: 'User does not belong to this group' });
    }
  } catch (err) {
    res.status(500).json({ err: 'Internal server error' });
  }
};

const updateItem = async (req, res, next, io) => {
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
    const itemList = await ItemList.findById(task.itemListId);
    if (itemList.isPrivate && itemList.createdByUser.toString() !== userId) {
      return res.status(403).json({ error: 'Task list is private' });
    }
    const userGroup = await UserGroup.findOne({ userId, groupId: itemList.groupId });

    if (!userGroup) {
      return res.status(403).json({ error: 'User does not belong to this group' });
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
    io.to(itemList._id.toString()).emit('taskItemAdded');
    io.to(taskId.toString()).emit('taskItemUpdated');
    return res.status(200).json({ task: result });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteItem = async (req, res, next, io) => {
  const { userId } = req;
  const { taskId } = req.params;

  try {
    const task = await Task.findOne({ _id: taskId, active: true });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const itemList = await ItemList.findById(task.itemListId);
    if (itemList.isPrivate && itemList.createdByUser.toString() !== userId) {
      return res.status(403).json({ error: 'Task list is private' });
    }
    const userGroup = await UserGroup.findOne({ userId, groupId: itemList.groupId });

    if (!userGroup) {
      return res.status(403).json({ error: 'User does not belong to this group' });
    }

    const result = await Task.findOneAndUpdate({ _id: taskId }, { $set: { active: false } }, { new: true });

    io.to(itemList._id.toString()).emit('taskItemAdded');
    return res.status(200).json({ result });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getItem = async (req, res, next, io) => {
  const { userId } = req;
  const { taskId } = req.params;

  try {
    const task = await Task.findOne({ _id: taskId, active: true })
      .populate('itemListId', 'listTitle isPrivate') // Populate createdByUser field and select displayName
      .populate('createdByUser', 'displayName avatar') // Populate createdByUser field and select displayName
      .populate('assignedToUser', 'displayName avatar'); // Populate assignedToUser field and select displayName

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const itemList = await ItemList.findById(task.itemListId);
    if (itemList.isPrivate && itemList.createdByUser.toString() !== userId) {
      return res.status(403).json({ error: 'Task list is private' });
    }

    const userGroup = await UserGroup.findOne({ userId, groupId: itemList.groupId });
    if (!userGroup) {
      return res.status(403).json({ error: 'User does not belong to this group' });
    }

    io.to(taskId.toString()).emit('taskItemUpdated');
    return res.status(200).json({ task });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { addItem, getItem, updateItem, deleteItem, getItems };
