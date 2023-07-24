const User = require('../models/user');
const joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { JWT } = process.env;

exports.signup = (req, res, next) => {
  const { body } = req;
  const schema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().min(6).required(),
    displayName: joi.string().required(),
  });

  const { error } = schema.validate(body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  } else {
    User.findOne({ email: body.email })
      .then((existingUser) => {
        if (existingUser) {
          return res.status(400).json({ error: 'Email already in use' });
        } else {
          return bcrypt.hash(body.password, 12);
        }
      })
      .then((hashedPassword) => {
        const user = new User(body);
        user.password = hashedPassword;
        user.avatar = '/avatars/default.png';
        return user.save();
      })
      .then((result) => {
        res.status(201).json({ message: 'User created', userId: result._id });
      })
      .catch((err) => {
        if (!err.statusCode) {
          err.statusCode = 500;
        }
        next(err);
      });
  }
};

exports.login = (req, res, next) => {
  const { body } = req;
  let loadedUser;
  User.findOne({ email: body.email })
    .then((user) => {
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      loadedUser = user;
      return bcrypt.compare(body.password, user.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      const token = jwt.sign(
        {
          userId: loadedUser._id.toString(),
          defaultGroupId: loadedUser?.defaultGroupId?.toString(),
        },
        JWT,
        // { expiresIn: '31d' }
      );
      res.status(200).json({
        token,
        userId: loadedUser._id.toString(),
        displayName: loadedUser.displayName,
        defaultGroupId: loadedUser?.defaultGroupId?.toString(),
        avatar: loadedUser.avatar,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
