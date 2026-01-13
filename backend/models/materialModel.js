import mongoose from 'mongoose';

const materialSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['Finishes', 'Hardware', 'Electrical', 'Electronics'],
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  installedAt: {
    type: String,
    required: true,
    trim: true
  },
  vendor: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      trim: true
    }
  },
  cost: {
    type: Number,
    required: true,
    min: 0
  },
  warranty: {
    duration: {
      type: String,
      trim: true
    },
    model: {
      type: String,
      trim: true
    },
    since: {
      type: Date
    }
  },
  invoice: {
    type: String, // File path
    trim: true
  },
  photo: {
    type: String, // File path
    trim: true
  },
  warrantyDoc: {
    type: String, // File path
    trim: true
  },
  siteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true,
    index: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Material', materialSchema);








