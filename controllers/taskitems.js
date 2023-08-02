const joi = require('joi');
const ItemList = require('../models/itemlist');
const TaskItem = require('../models/taskitem');
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
    if (!itemList) {
      return res.status(404).json({ error: 'TaskItem list not found' });
    }

    const group = await UserGroup.findOne({ userId, groupId: itemList.groupId });
    if (!group) {
      return res.status(403).json({ err: 'User does not belong to this group' });
    }

    if (itemList.isPrivate && itemList.createdByUser.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const tasks = await TaskItem.find({ itemListId, active: true }).sort({ priority: -1 });
    return res.status(200).json({ itemList, tasks });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const addItem = async (req, res, io) => {
  const { body } = req;
  const { userId } = req;

  const schema = joi.object().keys({
    itemListId: joi.string().required(),
    taskTitle: joi.string().required().min(3).max(64),
    taskDescription: joi.string().max(256),
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
    if (!itemList) {
      return res.status(404).json({ error: 'TaskItem list not found' });
    }

    const group = await UserGroup.findOne({ userId, groupId: itemList.groupId });
    if (!group) {
      return res.status(403).json({ err: 'User does not belong to this group' });
    }

    if (itemList.isPrivate && itemList.createdByUser.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const task = new TaskItem({ ...body, createdByUser: userId });
    const result = await task.save();
    io.to(itemListId.toString()).emit('updateTaskItem');
    return res.status(200).json({ task: result });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const updateItem = async (req, res, io) => {
  const { userId, body } = req;
  const { taskId, data } = body;

  const schema = joi.object().keys({
    taskId: joi.string().required(),
    data: joi.object().required(),
  });

  const schemaData = joi.object().keys({
    taskTitle: joi.string().min(3).max(64),
    taskDescription: joi.string().max(256),
    assignedToUser: joi.string().allow(null),
    dueBy: joi.date().allow(null),
    priority: joi.number().min(0).max(100).default(0),
    completed: joi.boolean(),
  });

  const { error: errorData } = schemaData.validate(data);

  const { error } = schema.validate(body);

  if (error || errorData) {
    return res
      .status(400)
      .json({ error: error?.details[0].message || errorData?.details[0].message });
  }

  try {
    const task = await TaskItem.findOne({ _id: taskId, active: true });
    if (!task) {
      return res.status(404).json({ error: 'TaskItem not found' });
    }
    const itemList = await ItemList.findById(task.itemListId);
    if (itemList.isPrivate && itemList.createdByUser.toString() !== userId) {
      return res.status(403).json({ error: 'TaskItem list is private' });
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

    const { _id } = itemList;
    const result = await TaskItem.findByIdAndUpdate(taskId, updatedTask, { new: true });
    io.to(_id.toString()).emit('updateTaskItem');
    io.to(taskId.toString()).emit('updateTaskItem');
    return res.status(200).json({ task: result });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteItem = async (req, res, io) => {
  const { userId } = req;
  const { taskId } = req.params;

  const schema = joi.object().keys({
    taskId: joi.string().required(),
  });
  const { error } = schema.validate(req.params);

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const task = await TaskItem.findOne({ _id: taskId, active: true });
    if (!task) {
      return res.status(404).json({ error: 'TaskItem not found' });
    }
    const itemList = await ItemList.findById(task.itemListId);
    if (itemList.isPrivate && itemList.createdByUser.toString() !== userId) {
      return res.status(403).json({ error: 'TaskItem list is private' });
    }
    const userGroup = await UserGroup.findOne({ userId, groupId: itemList.groupId });

    if (!userGroup) {
      return res.status(403).json({ error: 'User does not belong to this group' });
    }

    const { _id } = itemList;
    const result = await TaskItem.findOneAndUpdate(
      { _id: taskId },
      { $set: { active: false } },
      { new: true },
    );

    io.to(_id.toString()).emit('updateTaskItem');
    return res.status(200).json({ result });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getItem = async (req, res) => {
  const { userId } = req;
  const { taskId } = req.params;

  const schema = joi.object().keys({
    taskId: joi.string().required(),
  });
  const { error } = schema.validate(req.params);

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const task = await TaskItem.findOne({ _id: taskId, active: true })
      .populate('itemListId', 'listTitle isPrivate') // Populate createdByUser field and select displayName
      .populate('createdByUser', 'displayName avatar') // Populate createdByUser field and select displayName
      .populate('assignedToUser', 'displayName avatar'); // Populate assignedToUser field and select displayName

    if (!task) {
      return res.status(404).json({ error: 'TaskItem not found' });
    }

    const itemList = await ItemList.findById(task.itemListId);
    if (itemList.isPrivate && itemList.createdByUser.toString() !== userId) {
      return res.status(403).json({ error: 'TaskItem list is private' });
    }

    const userGroup = await UserGroup.findOne({ userId, groupId: itemList.groupId });
    if (!userGroup) {
      return res.status(403).json({ error: 'User does not belong to this group' });
    }
    return res.status(200).json({ task });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  addItem,
  getItem,
  updateItem,
  deleteItem,
  getItems,
};
