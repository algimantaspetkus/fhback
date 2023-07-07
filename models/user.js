const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    displayName: {
      type: String,
      required: [true, 'displayName is required'],
    },
    email: {
      type: String,
      required: [true, 'email is required'],
    },
    password: {
      type: String,
      required: [true, 'password is required'],
    },
    defaultFamilyId: {
      type: Schema.Types.ObjectId,
    },
    avatar: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
