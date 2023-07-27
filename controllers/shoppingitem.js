const joi = require('joi');
const ItemList = require('../models/itemlist');
const ShoppingItem = require('../models/shoppingitem');
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
        return res.status(404).json({ error: 'ShoppingItem list not found' });
      }

      ShoppingItem.find({ itemListId, active: true })
        .sort({ required: -1 })
        .then((result) => res.status(200).json({ itemList, shoppingItems: result }))
        .catch(() => {
          return res.status(500).json({ err: 'Internal server error' });
        });
    } catch (err) {
      return res.status(403).json({ err: 'User does not belong to this group' });
    }
  } catch (err) {
    return res.status(500).json({ err: 'Internal server error' });
  }
};

const addItem = async (req, res, next, io) => {
  const { body } = req;
  const { userId } = req;

  const schema = joi.object().keys({
    itemListId: joi.string().required(),
    itemTitle: joi.string().required().min(3).max(64),
    itemDescription: joi.string().min(3).max(256),
    required: joi.boolean(),
    type: joi.string(),
    url: joi.string(),
    quantity: joi.string(),
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
        return res.status(404).json({ error: 'ShoppingItem list not found' });
      }

      try {
        const shoppingItem = new ShoppingItem({ ...body, createdByUser: userId });
        await shoppingItem.save();
        io.to(itemListId.toString()).emit('shoppingItemAdded');
        return res.status(200).json({ shoppingItem });
      } catch (error) {
        return res.status(500).json({ err: 'Internal server error' });
      }
    } catch (err) {
      return res.status(403).json({ err: 'User does not belong to this group' });
    }
  } catch (err) {
    return res.status(500).json({ err: 'Internal server error' });
  }
};

const updateItem = async (req, res, next, io) => {
  const { userId, body } = req;
  const { shoppingItemId, data } = body;

  const schema = joi.object().keys({
    shoppingItemId: joi.string().required(),
    data: joi.object().required(),
  });

  const schemaData = joi.object().keys({
    itemTitle: joi.string().min(3).max(64),
    itemDescription: joi.string().min(3).max(256),
    required: joi.boolean(),
    type: joi.string(),
    completed: joi.boolean(),
    url: joi.string(),
    quantity: joi.string(),
  });

  const { error: errorData } = schemaData.validate(data);

  const { error } = schema.validate(body);

  if (error || errorData) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const shoppingItem = await ShoppingItem.findOne({ _id: shoppingItemId, active: true });
    if (!shoppingItem) {
      return res.status(404).json({ error: 'ShoppingItem not found' });
    }
    const itemList = await ItemList.findById(shoppingItem.itemListId);
    if (itemList.isPrivate && itemList.createdByUser.toString() !== userId) {
      return res.status(403).json({ error: 'ShoppingItem list is private' });
    }
    const userGroup = await UserGroup.findOne({ userId, groupId: itemList.groupId });

    if (!userGroup) {
      return res.status(403).json({ error: 'User does not belong to this group' });
    }
    const updatedShoppingItem = {
      ...shoppingItem.toObject(),
      ...data,
    };

    if (data.completed) {
      updatedShoppingItem.completedAt = Date.now();
    } else {
      updatedShoppingItem.completedAt = undefined;
    }

    const result = await ShoppingItem.findByIdAndUpdate(shoppingItemId, updatedShoppingItem, { new: true });
    io.to(itemList._id.toString()).emit('shoppingItemAdded');
    io.to(shoppingItemId.toString()).emit('shoppingItemAdded');
    return res.status(200).json({ shoppingItem: result });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteItem = async (req, res, next, io) => {
  const { userId } = req;
  const { shoppingItemId } = req.params;

  try {
    const shoppingItem = await ShoppingItem.findOne({ _id: shoppingItemId, active: true });
    if (!shoppingItem) {
      return res.status(404).json({ error: 'ShoppingItem not found' });
    }
    const itemList = await ItemList.findById(shoppingItem.itemListId);
    if (itemList.isPrivate && itemList.createdByUser.toString() !== userId) {
      return res.status(403).json({ error: 'ShoppingItem list is private' });
    }
    const userGroup = await UserGroup.findOne({ userId, groupId: itemList.groupId });

    if (!userGroup) {
      return res.status(403).json({ error: 'User does not belong to this group' });
    }

    const result = await ShoppingItem.findOneAndUpdate({ _id: shoppingItemId }, { $set: { active: false } }, { new: true });
    io.to(itemList._id.toString()).emit('shoppingItemAdded');
    return res.status(200).json({ result });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getItem = async (req, res, next, io) => {
  const { userId } = req;
  const { shoppingItemId } = req.params;

  try {
    const shoppingItem = await ShoppingItem.findOne({ _id: shoppingItemId, active: true }).populate('createdByUser', 'displayName');

    if (!shoppingItem) {
      return res.status(404).json({ error: 'ShoppingItem not found' });
    }

    const itemList = await ItemList.findById(shoppingItem.itemListId);
    if (itemList.isPrivate && itemList.createdByUser.toString() !== userId) {
      return res.status(403).json({ error: 'ShoppingItem list is private' });
    }

    const userGroup = await UserGroup.findOne({ userId, groupId: itemList.groupId });
    if (!userGroup) {
      return res.status(403).json({ error: 'User does not belong to this group' });
    }

    io.to(shoppingItemId.toString()).emit('shoppingItemAdded');
    return res.status(200).json({ shoppingItem });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { addItem, getItem, updateItem, deleteItem, getItems };
