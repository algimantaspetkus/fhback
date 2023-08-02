const joi = require('joi');
const ItemList = require('../models/itemlist');
const UserGroup = require('../models/usergroup');
const Group = require('../models/group');
const User = require('../models/user');
require('dotenv').config();

const getItemList = async (req, res, type) => {
  const { userId } = req;
  try {
    const { defaultGroupId } = await User.findById(userId);
    if (!defaultGroupId) {
      return res.status(400).json({ error: 'Please set an active group' });
    }
    const itemList = await ItemList.find({
      $or: [
        {
          groupId: defaultGroupId.toString(),
          isPrivate: false,
          active: true,
          type,
        },
        {
          groupId: defaultGroupId.toString(),
          isPrivate: true,
          createdByUser: userId,
          active: true,
          type,
        },
      ],
    });
    return res.status(200).json({ itemList });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const disableItemList = async (req, res, io, type) => {
  const { userId, body } = req;
  const { itemListId } = body;

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
      return res.status(400).json({ error: 'Task list does not exist' });
    }
    const userGroup = await UserGroup.findOne({ userId, groupId: itemList.groupId });
    if (!userGroup) {
      return res.status(400).json({ error: 'User does not belong to this group' });
    }
    if (
      itemList.isPrivate &&
      itemList.createdByUser.toString() !== userId.toString() &&
      !userGroup.role !== 'owner'
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }
    itemList.active = false;
    await itemList.save();
    io.to(itemList.groupId.toString()).emit(
      `update${type[0].toUpperCase() + type.slice(1, type.length)}List`,
    );
    return getItemList(req, res, type);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const makePublic = async (req, res, io, type) => {
  const { userId, body } = req;
  const { itemListId } = body;

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
      return res.status(400).json({ error: 'Task list does not exist' });
    }
    const userGroup = await UserGroup.findOne({ userId, groupId: itemList.groupId });
    if (!userGroup) {
      return res.status(400).json({ error: 'User does not belong to this group' });
    }
    if (
      itemList.isPrivate &&
      itemList.createdByUser.toString() !== userId.toString() &&
      !userGroup.role !== 'owner'
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }
    itemList.isPrivate = false;
    await itemList.save();
    io.to(itemList.groupId.toString()).emit(
      `update${type[0].toUpperCase() + type.slice(1, type.length)}List`,
    );
    return getItemList(req, res, type);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const addItemList = async (req, res, io, type) => {
  const { userId, body } = req;
  const { listTitle, isPrivate } = body;

  const schema = joi.object().keys({
    listTitle: joi.string().min(3).max(32).required(),
    isPrivate: joi.boolean().required(),
  });

  const { error } = schema.validate({ listTitle, isPrivate });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const { defaultGroupId } = await User.findById(userId);
    if (!defaultGroupId) {
      return res.status(400).json({ error: 'Please set an active group' });
    }
    const group = await Group.findById(defaultGroupId);
    if (!group.active) {
      return res.status(400).json({ error: 'Group is not active' });
    }
    const itemList = new ItemList({
      listTitle,
      isPrivate,
      createdByUser: userId,
      groupId: defaultGroupId,
      type,
    });
    await itemList.save();
    io.to(defaultGroupId.toString()).emit(
      `update${type[0].toUpperCase() + type.slice(1, type.length)}List`,
    );
    return getItemList(req, res, type);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getItemList,
  addItemList,
  disableItemList,
  makePublic,
};
