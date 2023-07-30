const joi = require('joi');
const EventItem = require('../models/eventitem');
const User = require('../models/user');
require('dotenv').config();

const addItem = async (req, res, next, io) => {
  const { body } = req;
  const { userId } = req;

  const schema = joi.object().keys({
    eventTitle: joi.string().required().min(3).max(64),
    eventDescription: joi.string().min(3).max(256),
    eventDate: joi.date().allow(null),
    type: joi.string().valid('birthday', 'gift', 'medical', 'travel', 'graduation', 'party', 'pet', 'food'),
  });

  const { error } = schema.validate(body);

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.defaultGroupId) {
      return res.status(404).json({ error: 'User does not have a default group' });
    }

    const eventItem = new EventItem({
      ...body,
      createdByUser: userId,
      groupId: user.defaultGroupId,
    });

    try {
      const savedEventItem = await eventItem.save();
      io.emit('updateEventItems', savedEventItem);
      return res.status(201).json(savedEventItem);
    } catch (err) {
      return res.status(500).json({ err: 'Internal server error' });
    }
  } catch (err) {
    res.status(500).json({ err: 'Internal server error' });
  }
};

const getItems = async (req, res, next) => {
  const { userId } = req;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.defaultGroupId) {
      return res.status(404).json({ error: 'User does not have a default group' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingItems = await EventItem.find({
      groupId: user.defaultGroupId,
      active: true,
      eventDate: { $gte: today },
    }).sort({ eventDate: 1 });

    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - 7);

    const passedItems = await EventItem.find({
      groupId: user.defaultGroupId,
      active: true,
      eventDate: { $gte: pastDate, $lt: today },
    }).sort({ eventDate: 1 });

    return res.status(200).json({ upcomingItems, passedItems });
  } catch (err) {
    return res.status(500).json({ err: 'Internal server error' });
  }
};

const deleteItem = async (req, res, next, io) => {
  const { userId } = req;
  const { eventItemId } = req.params;
  if (!eventItemId) {
    return res.status(400).json({ error: 'eventItemId is required' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.defaultGroupId) {
      return res.status(404).json({ error: 'User does not have a default group' });
    }

    const eventItem = await EventItem.findById(eventItemId);
    if (!eventItem) {
      return res.status(404).json({ error: 'Event item not found' });
    }

    eventItem.active = false;
    await eventItem.save();
    io.emit('updateEventItems', eventItem);
    getItems(req, res, next);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ err: 'Internal server error' });
  }
};

module.exports = { addItem, getItems, deleteItem };
