import mongoose from 'mongoose';

const boqItemSchema = new mongoose.Schema({
  roomName: {
    type: String,
    required: true,
    trim: true
  },
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  purchaseRate: {
    type: Number,
    default: null,
    min: 0
  },
  totalCost: {
    type: Number,
    required: true,
    min: 0
  },
  comments: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  referenceImage: {
    path: { type: String, default: null },
    filename: { type: String, default: null }
  },
  bill: {
    type: String, // File path
    trim: true,
    default: null
  },
  photo: {
    type: String, // File path
    trim: true,
    default: null
  },
  siteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Furniture', 'Finishes', 'Hardware', 'Electrical', 'Miscellaneous'],
    default: 'Furniture'
  }
}, {
  timestamps: true
});

export default mongoose.model('BOQItem', boqItemSchema);