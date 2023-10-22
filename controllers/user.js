const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const joi = require('joi');
const User = require('../models/user');
const Group = require('../models/group');
const UserGroup = require('../models/usergroup');

require('dotenv').config();

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    cb(null, 'public/avatars'); // Set the destination folder for uploaded avatars
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().getTime();
    cb(null, `${req.userId}${timestamp}.${file.originalname.split('.').reverse()[0]}`); // Generate a filename with userId as a prefix
  },
});

const upload = multer({ storage });

exports.updateAvatar = (req, res) => {
  const uploadMiddleware = upload.single('avatar');
  uploadMiddleware(req, res, async (err) => {
    // Wrap the callback in 'async'
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: 'File upload error' });
    }

    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }

    const { filename } = req.file;
    const { userId } = req;
    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const oldAvatar = user.avatar;
      if (oldAvatar !== '/avatars/default.png') {
        const filePath = `public${oldAvatar}`;
        fs.unlink(filePath, (error) => {
          if (error) {
            console.error('Error deleting the file:', err);
          } else {
            console.log(`${filePath} deleted}`);
          }
        });
      }

      user.avatar = `/avatars/${filename}`;
      await user.save();

      const { _id, email, defaultGroupId, displayName } = user;

      return res.status(200).json({
        _id,
        email,
        displayName,
        defaultGroupId,
        avatar: `/avatars/${filename}`,
      });
    } catch (e) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
};

exports.updateDefaultGroup = async (req, res) => {
  const { body, userId } = req;
  const { defaultGroupId: newDefaultGroup } = body;
  const schema = joi.object({
    defaultGroupId: joi.string().required(),
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

    const group = await Group.findOne({
      _id: body.defaultGroupId,
      active: true,
    });

    if (!group) {
      return res.status(404).json({ error: 'Group does not exist' });
    }

    const userGroup = await UserGroup.findOne({
      userId,
      groupId: body.defaultGroupId,
    });

    if (!userGroup) {
      return res.status(404).json({ error: 'User does not belong to this group' });
    }

    user.defaultGroupId = newDefaultGroup;
    const { _id, email, defaultGroupId, displayName, avatar } = await user.save();

    return res.status(200).json({
      _id,
      email,
      displayName,
      defaultGroupId,
      avatar,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateDisplayName = async (req, res) => {
  const { userId, body } = req;
  const { displayName: newDisplayName } = body;

  const schema = joi.object({
    displayName: joi
      .string()
      .min(3)
      .max(32)
      .regex(/^[a-zA-Z0-9]+( [a-zA-Z0-9]+)*$/)
      .required()
      .error((errors) => {
        return new Error(
          errors
            .map((error) => {
              switch (error.code) {
                case 'string.min':
                  return 'Display name must be at least 3 characters long';
                case 'string.max':
                  return 'Display name must be at most 32 characters long';
                case 'string.pattern.base':
                  return 'Display name must contain only alphanumeric characters with one space between words';
                case 'any.required':
                  return 'Display name is required';
                default:
                  return 'Invalid value for display name';
              }
            })
            .join('. '),
        ); // Join multiple errors with a period and space
      }),
  });

  const { error } = schema.validate(body);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    user.displayName = newDisplayName;
    const result = await user.save();
    const { _id, email, defaultGroupId, displayName, avatar } = result;
    return res.status(200).json({
      _id,
      email,
      displayName,
      defaultGroupId,
      avatar,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.changePassword = async (req, res) => {
  const { userId, body } = req;
  const { oldPassword, newPassword } = body;

  const schema = joi.object({
    oldPassword: joi.required(),
    newPassword: joi
      .string()
      .min(8)
      .max(128)
      .required()
      .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z\d\s]).*$/)
      .error((errors) => {
        return new Error(
          errors
            .map((error) => {
              switch (error.code) {
                case 'string.min':
                  return 'New password must be at least 8 characters long';
                case 'string.max':
                  return 'New password must be at most 128 characters long';
                case 'string.pattern.base':
                  return 'New password must require at least one digit, one uppercase character, one lowercase character, and one special character';
                case 'any.required':
                  return 'New password is required';
                default:
                  return 'Invalid value for new password';
              }
            })
            .join('. '),
        ); // Join multiple errors with a period and space
      }),
  });

  const { error } = schema.validate(body);

  if (error) {
    return res.status(400).json({ error: error.message });
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
    return res.status(200).json({ message: 'Password changed' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getUser = async (req, res) => {
  const { userId } = req;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { _id, email, defaultGroupId, displayName, avatar } = user;
    return res.status(200).json({
      _id,
      email,
      displayName,
      defaultGroupId,
      avatar,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};
