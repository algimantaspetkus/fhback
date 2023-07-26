const mongoose = require('mongoose');

const { Schema } = mongoose;

const taskSchema = new Schema(
  {
    itemListId: {
      type: Schema.Types.ObjectId,
      ref: 'ItemList',
      required: [true, 'itemListId is required'],
    },
    itemTitle: {
      type: String,
      required: [true, 'itemTitle is required'],
    },
    itemDescription: {
      type: String,
    },
    createdByUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'createdByUser is required'],
    },
    completed: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
    },
    completedAt: {
      type: Date,
    },
    required: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('ShoppingItem', taskSchema);
