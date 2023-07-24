const mongoose = require('mongoose');

const { Schema } = mongoose;

const userGroupSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'groupId is required'],
    },
    role: {
      type: String,
      enum: ['owner', 'guest'],
      default: 'owner',
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('UserGroup', userGroupSchema);
