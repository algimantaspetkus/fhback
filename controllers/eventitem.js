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
      io.emit('eventItemAdded', savedEventItem);
      return res.status(201).json(savedEventItem);
    } catch (err) {
      return res.status(500).json({ err: 'Internal server error' });
    }
  } catch (err) {
    res.status(500).json({ err: 'Internal server error' });
  }
};

module.exports = { addItem };
