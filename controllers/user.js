const joi = require('joi');
const User = require('../models/user');
const Family = require('../models/family');
const TaskList = require('../models/tasklist');

require('dotenv').config();

exports.updateDefaultFamily = (req, res, next) => {
  const { body, userId } = req;
  const schema = joi.object({
    defaultFamilyId: joi.string().required(),
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
        user.defaultFamilyId = body.defaultFamilyId;
        const family = Family.findOne({
          _id: body.defaultFamilyId,
          $or: [{ ownerId: userId }, { members: userId }],
        });
        if (family) {
          user
            .save()
            .then((result) => {
              // respond with the updated user information
              const { _id, email, defaultFamilyId, displayName } = result;
              res.status(200).json({
                _id,
                email,
                displayName,
                defaultFamilyId,
              });
            })
            .catch((err) => {
              if (!err.statusCode) {
                err.statusCode = 500;
              }
              next(err);
            });
        } else {
          res.status(404).json({ error: 'User does not belong to this family' });
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
    const { _id, email, defaultFamilyId, displayName } = user;
    res.status(200).json({
      _id,
      email,
      displayName,
      defaultFamilyId,
    });
  });
};
