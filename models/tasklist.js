const mongoose = require('mongoose');

const { Schema } = mongoose;

const taskListSchema = new Schema(
  {
    familyId: {
      type: Schema.Types.ObjectId,
      ref: 'Family',
      required: [true, 'familyId is required'],
    },
    createdByUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
    },
    listTitle: {
      type: String,
      required: [true, 'name is required'],
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('TaskList', taskListSchema);
