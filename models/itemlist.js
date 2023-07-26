const mongoose = require('mongoose');

const { Schema } = mongoose;

const itemListSchema = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'groupId is required'],
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
    type: {
      type: String,
      enum: ['task', 'shopping', 'event'],
      required: [true, 'type is required'],
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('ItemList', itemListSchema);
