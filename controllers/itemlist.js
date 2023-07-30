const joi = require('joi');
const ItemList = require('../models/itemlist');
const UserGroup = require('../models/usergroup');
const Group = require('../models/group');
const User = require('../models/user');
require('dotenv').config();

const getItemList = async (req, res, next, io, type) => {
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
  try {
    const itemList = await ItemList.find({
      $or: [
        { groupId: defaultGroupId.toString(), isPrivate: false, active: true, type },
        { groupId: defaultGroupId.toString(), isPrivate: true, createdByUser: userId, active: true, type },
      ],
    });
    res.status(200).json({ itemList });
  } catch (err) {
    res.status(400).json({ error: 'Something went wrong' });
    next(err);
  }
};

const disableItemList = async (req, res, next, io, type) => {
  const { userId, body } = req;
  const { itemListId } = body;
  // check if itemListId is exists
  const schema = joi.object().keys({
    itemListId: joi.string().required(),
  });
  const { error } = schema.validate({ itemListId });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  // check if tasklist exists
  const itemList = await ItemList.findById(itemListId);
  if (!itemList) {
    return res.status(400).json({ error: 'Task list does not exist' });
  }
  // check if user belongs to group
  const userGroup = await UserGroup.findOne({ userId, groupId: itemList.groupId });
  if (!userGroup) {
    return res.status(400).json({ error: 'User does not belong to this group' });
  }
  if (itemList.isPrivate && itemList.createdByUser.toString() !== userId.toString() && !userGroup.role !== 'owner') {
    return res.status(403).json({ error: 'Access denied' });
  }
  itemList.active = false;
  itemList
    .save()
    .then(() => {
      io.to(itemList.groupId.toString()).emit(`update${type[0].toUpperCase() + type.slice(1, type.length)}List`);
      getItemList(req, res, next);
    })
    .catch((err) => {
      res.status(400).json({ error: 'Something went wrong' });
      next(err);
    });
};

const makePublic = async (req, res, next, io, type) => {
  const { userId, body } = req;
  const { itemListId } = body;
  // check if itemListId is exists
  const schema = joi.object().keys({
    itemListId: joi.string().required(),
  });
  const { error } = schema.validate({ itemListId });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  // check if tasklist exists
  const itemList = await ItemList.findById(itemListId);
  if (!itemList) {
    return res.status(400).json({ error: 'Task list does not exist' });
  }
  // check if user belongs to group
  const userGroup = await UserGroup.findOne({ userId, groupId: itemList.groupId });
  if (!userGroup) {
    return res.status(400).json({ error: 'User does not belong to this group' });
  }
  if (itemList.isPrivate && itemList.createdByUser.toString() !== userId.toString() && !userGroup.role !== 'owner') {
    return res.status(403).json({ error: 'Access denied' });
  }
  itemList.isPrivate = false;
  itemList
    .save()
    .then(() => {
      io.to(itemList.groupId.toString()).emit(`update${type[0].toUpperCase() + type.slice(1, type.length)}List`);
      getItemList(req, res, next);
    })
    .catch((err) => {
      res.status(400).json({ error: 'Something went wrong' });
      next(err);
    });
};

const addItemList = async (req, res, next, io, type) => {
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
          const itemList = new ItemList({
            groupId: defaultGroupId,
            createdByUser: userId,
            listTitle: body.listTitle,
            isPrivate: body.isPrivate,
            type,
          });
          itemList
            .save()
            .then(() => {
              io.to(defaultGroupId.toString()).emit(`update${type[0].toUpperCase() + type.slice(1, type.length)}List`);
              getItemList(req, res, next);
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

module.exports = { getItemList, addItemList, disableItemList, makePublic };
