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

const getGroups = async (req, res) => {
  const { userId } = req;
  try {
    const userGroups = await UserGroup.find({ userId })
      .populate({
        path: 'groupId',
        select: 'name active',
        match: { active: true },
      })
      .sort({ createdAt: -1 });
    const filtered = userGroups.filter((group) => group.groupId !== null);
    return res.status(200).json({ groups: filtered });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const disableGroup = async (req, res, io) => {
  const { groupId } = req.body;
  const { userId } = req;
  try {
    const userGroup = await UserGroup.findOne({ groupId, userId });
    if (!userGroup) {
      return res.status(400).json({ error: 'Group does not exist' });
    }
    if (userGroup.role !== 'owner') {
      return res.status(400).json({ error: 'You are not the owner' });
    }
    if (userGroup.role === 'owner') {
      await Group.findOneAndUpdate({ _id: groupId }, { active: false }, { new: true });
      const user = await User.findOne({ _id: userId });
      if (user.defaultGroupId.toString() === groupId.toString()) {
        await User.findOneAndUpdate({ _id: userId }, { defaultGroupId: null }, { new: true });
      }
      io.to(userId).emit('updateGroup');
      return getGroups(req, res);
    }
    return res.status(400).json({ error: 'Something went wrong' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const createItem = async (req, res, io) => {
  const { userId } = req;
  const { body } = req;
  const schema = joi.object({
    name: joi.string().min(6).required(),
  });

  const { error } = schema.validate(body);

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const newGroup = new Group({
      name: body.name,
      secret: generateRandomString(),
    });

    const group = await newGroup.save();
    const { _id } = group;
    const newUserGroup = new UserGroup({
      userId,
      groupId: _id,
      role: 'owner',
    });

    await newUserGroup.save();
    io.to(userId).emit('updateGroup');
    return res.status(200).json({ groupId: _id });
  } catch (err) {
    return res.status(500).json({ err: 'Internal server error' });
  }
};

const leaveGroup = async (req, res, io) => {
  const { userId, body } = req;
  const { groupId } = body;
  const schema = joi.object({
    groupId: joi.string().required(),
  });
  const { error } = schema.validate(body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  try {
    const userGroup = await UserGroup.findOne({ groupId, userId });
    if (!userGroup) {
      return res.status(400).json({ error: 'Group does not exist' });
    }
    if (userGroup.role === 'owner') {
      return res.status(400).json({ error: 'Owners can not leave' });
    }
    await UserGroup.findOneAndDelete({ groupId, userId });
    const user = User.findById({ _id: userId });
    if (user.defaultGroupId.toString() === groupId.toString()) {
      await User.findOneAndUpdate({ _id: userId }, { defaultGroupId: null }, { new: true });
    }
    io.to(userId).emit('updateGroup');
    return getGroups(req, res);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getGroupSecret = async (req, res) => {
  const { groupId } = req.params;
  const { userId } = req;
  const schema = joi.object({
    groupId: joi.string().required(),
  });
  const { error } = schema.validate(req.params);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  try {
    const userGroup = await UserGroup.findOne({ groupId, userId });
    if (!userGroup) {
      return res.status(400).json({ error: 'Group does not exist' });
    }
    if (userGroup.role !== 'owner') {
      return res.status(400).json({ error: 'You are not the owner' });
    }

    const group = await Group.findOne({ _id: groupId });

    if (group && userGroup.role === 'owner') {
      return res.status(200).json({ secret: group.secret });
    }
    return res.status(400).json({ error: 'Something went wrong' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const joinGroup = async (req, res, io) => {
  const { userId, body } = req;
  const { secret } = body;

  const schema = joi.object({
    secret: joi.string().required(),
  });
  const { error } = schema.validate(body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const group = await Group.findOne({ secret });
    if (!group) {
      return res.status(400).json({ error: 'Invalid code' });
    }
    const { _id, active } = group;
    if (!active) {
      return res.status(400).json({ error: 'Group is not active' });
    }
    const userGroup = await UserGroup.findOne({ groupId: _id, userId });
    if (userGroup) {
      return res.status(400).json({ error: 'You are already in this group' });
    }
    const newUserGroup = new UserGroup({
      userId,
      groupId: _id,
      role: 'guest',
    });
    await newUserGroup.save();
    io.to(userId).emit('updateGroup');
    return getGroups(req, res);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getListMembers = async (req, res) => {
  const { listId } = req.params;
  const { userId } = req;

  const schema = joi.object({
    listId: joi.string().required(),
  });
  const { error } = schema.validate(req.params);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

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
    }
    if (!list.isPrivate) {
      const userGroup = await UserGroup.find({ groupId: list.groupId });
      if (!userGroup || userGroup.length === 0) {
        return res.status(400).json({ error: 'You cannot access this list' });
      }

      const userIds = userGroup.map((group) => group.userId);
      const groupMembers = await User.find({ _id: { $in: userIds } }).select(
        '_id displayName email avatar',
      );
      return res.status(200).json({ members: groupMembers });
    }
    return res.status(400).json({ error: 'You cannot access this list' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createItem,
  getGroups,
  disableGroup,
  leaveGroup,
  getGroupSecret,
  joinGroup,
  getListMembers,
};
