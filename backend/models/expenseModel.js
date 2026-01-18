import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
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
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  // Payment status for expense (paid/due)
  paymentStatus: {
    type: String,
    enum: ['paid', 'due'],
    default: 'due'
  },
  paidDate: {
    type: Date,
    default: undefined
  },
  paymentType: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'UPI', 'NEFT', 'Cheque', 'Credit Card'],
    default: null
  },
  vendorName: {
    type: String,
    trim: true,
    default: ''
  },
  invoice: {
    path: { type: String, default: null },
    filename: { type: String, default: null }
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
},

{
  timestamps: true
});

export default mongoose.model('Expense', expenseSchema);
