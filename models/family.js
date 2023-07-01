const mongoose = require('mongoose');

const { Schema } = mongoose;

const familySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'name is required'],
    },
    secret: {
      type: String,
      required: [true, 'secret is required'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Family', familySchema);
