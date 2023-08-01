const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const joi = require('joi');
const User = require('../models/user');
const Group = require('../models/group');

require('dotenv').config();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/avatars'); // Set the destination folder for uploaded avatars
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().getTime();
    cb(null, req.userId + timestamp + '.' + file.originalname.split('.').reverse()[0]); // Generate a filename with userId as a prefix
  },
});

const upload = multer({ storage: storage });

exports.updateAvatar = (req, res, next) => {
  const uploadMiddleware = upload.single('avatar');

  uploadMiddleware(req, res, async (err) => {
    // Wrap the callback in 'async'
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: 'File upload error' });
    } else if (err) {
      return res.status(500).json({ error: 'Server error' });
    }

    const { filename } = req.file;
    try {
      const { userId } = req;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      const oldAvatar = user.avatar;
      const filePath = `public${oldAvatar}`;
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Error deleting the file:', err);
        } else {
          console.log(`${filePath} deleted}`);
        }
      });
      user.avatar = `/avatars/${filename}`;
      await user.save(); // Use 'await' directly here

      // Respond with the updated user information
      const { _id, email, defaultGroupId, displayName } = user;
      res.status(200).json({
        _id,
        email,
        displayName,
        defaultGroupId,
        avatar: filename,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Server error' });
    }
  });
};

exports.updateDefaultGroup = (req, res, next) => {
  const { body, userId } = req;
  const { defaultGroupId: newDefaultGroup } = body;
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
        user.defaultGroupId = newDefaultGroup;
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

exports.updateDisplayName = async (req, res, next) => {
  const { userId, body } = req;
  const { displayName: newDisplayName } = body;
  const schema = joi.object({
    displayName: joi.string().min(3).required(),
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
    user.displayName = newDisplayName;
    await user.save();
    const { _id, email, defaultGroupId, displayName, avatar } = user;
    res.status(200).json({
      _id,
      email,
      displayName,
      defaultGroupId,
      avatar,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.changePassword = async (req, res, next) => {
  const { userId, body } = req;
  const { oldPassword, newPassword } = body;

  const schema = joi.object({
    oldPassword: joi.string().min(6).required(),
    newPassword: joi.string().min(6).required(),
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
    const isEqual = await bcrypt.compare(oldPassword, user.password);
    if (!isEqual) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();
    res.status(200).json({ message: 'Password changed' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.getUser = (req, res, next) => {
  const { userId } = req;
  User.findById(userId).then((user) => {
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { _id, email, defaultGroupId, displayName, avatar } = user;
    res.status(200).json({
      _id,
      email,
      displayName,
      defaultGroupId,
      avatar,
    });
  });
};
