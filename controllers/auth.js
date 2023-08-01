const User = require('../models/user');
const joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { JWT } = process.env;

exports.signup = async (req, res, next) => {
  const { body } = req;
  const schema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().min(6).required(),
    displayName: joi.string().min(3).required(),
  });

  const { error } = schema.validate(body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  try {
    const user = await User.findOne({ email: body.email });
    if (user) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    try {
      const hashedPassword = await bcrypt.hash(body.password, 12);
      const newUser = new User(body);
      newUser.password = hashedPassword;
      newUser.avatar = '/avatars/default.png';
      await newUser.save();
      return res.status(201).json({ message: 'User created', userId: newUser._id });
    } catch (err) {
      return res.status(500).json({ error: 'Server error' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.login = (req, res, next) => {
  const { body } = req;
  const { email, password } = body;
  let loadedUser;
  User.findOne({ email })
    .then((user) => {
      if (!user) {
        return res.status(400).json({ error: 'Invalid username or password' });
      }
      loadedUser = user;
      return bcrypt.compare(password, user.password);
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
