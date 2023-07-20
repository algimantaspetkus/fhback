const mongoose = require('mongoose');

const { Schema } = mongoose;

const taskSchema = new Schema(
  {
    taskListId: {
      type: Schema.Types.ObjectId,
      ref: 'TaskList',
      required: [true, 'taskListId is required'],
    },
    taskTitle: {
      type: String,
      required: [true, 'taskTitle is required'],
    },
    taskDescription: {
      type: String,
    },
    assignedToUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
    completedAt: {
      type: Date,
    },
    dueBy: {
      type: Date,
    },
    priority: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Task', taskSchema);
