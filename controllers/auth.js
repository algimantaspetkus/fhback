const joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
require('dotenv').config();

const { JWT } = process.env;

const signup = async (req, res) => {
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
      const { _id } = newUser;
      return res.status(201).json({ message: 'User created', userId: _id });
    } catch (err) {
      return res.status(500).json({ error: 'Server error' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};

const login = async (req, res) => {
  const { body } = req;
  const { email, password } = body;
  const schema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().min(6).required(),
  });

  const { error } = schema.validate(body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const { _id } = user;
    const token = jwt.sign(
      {
        userId: _id.toString(),
        defaultGroupId: user?.defaultGroupId?.toString(),
      },
      JWT,
    );
    return res.status(200).json({
      token,
      userId: _id.toString(),
      displayName: user.displayName,
      defaultGroupId: user?.defaultGroupId?.toString(),
      avatar: user.avatar,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { signup, login };
