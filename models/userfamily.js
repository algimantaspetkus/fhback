const mongoose = require('mongoose');

const { Schema } = mongoose;

const userFamilySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
    },
    familyId: {
      type: Schema.Types.ObjectId,
      ref: 'Family',
      required: [true, 'familyId is required'],
    },
    role: {
      type: String,
      enum: ['owner', 'guest'],
      default: 'owner',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserFamily', userFamilySchema);
