const mongoose = require('mongoose');

const { Schema } = mongoose;

const eventSchema = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'ItemList',
      required: [true, 'itemListId is required'],
    },
    eventTitle: {
      type: String,
      required: [true, 'taskTitle is required'],
    },
    eventDescription: {
      type: String,
    },
    createdByUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'createdByUser is required'],
    },
    eventDate: {
      type: Date,
      required: [true, 'eventDate is required'],
    },
    type: {
      type: String,
      enum: ['birthday', 'gift', 'medical', 'travel', 'graduation', 'party', 'pet', 'food'],
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('EventItem', eventSchema);
