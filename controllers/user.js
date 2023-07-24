const joi = require('joi');
const User = require('../models/user');
const Group = require('../models/group');
const TaskList = require('../models/tasklist');

require('dotenv').config();

exports.updateDefaultGroup = (req, res, next) => {
  const { body, userId } = req;
  const schema = joi.object({
    defaultGroupId: joi.string().required(),
  });

  const { error } = schema.validate(body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  } else {
    User.findById(userId)
      .then((user) => {
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        user.defaultGroupId = body.defaultGroupId;
        const group = Group.findOne({
          _id: body.defaultGroupId,
          $or: [{ ownerId: userId }, { members: userId }],
        });
        if (group) {
          user
            .save()
            .then((result) => {
              // respond with the updated user information
              const { _id, email, defaultGroupId, displayName } = result;
              res.status(200).json({
                _id,
                email,
                displayName,
                defaultGroupId,
              });
            })
            .catch((err) => {
              if (!err.statusCode) {
                err.statusCode = 500;
              }
              next(err);
            });
        } else {
          res.status(404).json({ error: 'User does not belong to this group' });
        }
      })
      .catch((err) => {
        if (!err.statusCode) {
          err.statusCode = 500;
        }
        next(err);
      });
  }
};

exports.getUser = (req, res, next) => {
  const { userId } = req;
  User.findById(userId).then((user) => {
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { _id, email, defaultGroupId, displayName } = user;
    res.status(200).json({
      _id,
      email,
      displayName,
      defaultGroupId,
    });
  });
};
