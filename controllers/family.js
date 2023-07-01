const Family = require('../models/family');
const UserFamily = require('../models/userfamily');
const joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { JWT } = process.env;

const generateRandomString = () => {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@.';
  const length = 32;

  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }

  return result;
};

const getFamilies = (req, res, next) => {
  const userId = req.userId;
  UserFamily.find({ userId })
    .populate({
      path: 'familyId',
      select: 'name',
    })
    .then((result) => {
      res.status(200).json({ families: result });
    })
    .catch((err) => {
      res.status(400).json({ error: 'Something went wrong' });
      next(err);
    });
};

const addNew = (req, res, next) => {
  const { body } = req;
  const schema = joi.object({
    name: joi.string().min(6).required(),
  });

  const { error } = schema.validate(body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  } else {
    const family = new Family({
      name: body.name,
      secret: generateRandomString(),
    });
    family
      .save()
      .then((result) => {
        const familyId = result._id;
        const userId = req.userId;
        const userFamily = new UserFamily({ userId, familyId, role: 'owner' });
        userFamily
          .save()
          .then((result) => {
            getFamilies(req, res, next);
          })
          .catch((err) => {
            res.status(400).json({ error: 'Something went wrong' });
            next(err);
          });
      })
      .catch((err) => {
        res.status(400).json({ error: 'Something went wrong' });
        next(err);
      });
  }
};

exports.addNew = addNew;
exports.getFamilies = getFamilies;
