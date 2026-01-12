import mongoose from 'mongoose';

const boqRoomLockSchema = new mongoose.Schema({
  siteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true,
    index: true
  },
  roomName: {
    type: String,
    required: true,
    trim: true
  },
  companyName: {
    type: String,
    required: true,
    index: true
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique room locks per site
boqRoomLockSchema.index({ siteId: 1, roomName: 1 }, { unique: true });

export default mongoose.model('BOQRoomLock', boqRoomLockSchema);

