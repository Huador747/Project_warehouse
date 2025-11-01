const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    profileImage: { type: String, default: '' },
    lastLogin: { type: Date },
  },
  { timestamps: true } // สร้าง createdAt, updatedAt อัตโนมัติ
);

module.exports = mongoose.model('User', userSchema);