import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['paid', 'due', 'overdue'],
    default: 'due'
  },
  paidDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'UPI', 'NEFT'],
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
  }
}, {
  timestamps: true
});

// Method to check and update status based on due date
paymentSchema.methods.updateStatus = function() {
  if (this.status === 'paid') {
    return this.status;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(this.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  
  if (dueDate < today) {
    this.status = 'overdue';
  } else {
    this.status = 'due';
  }
  
  return this.status;
};

export default mongoose.model('Payment', paymentSchema);
