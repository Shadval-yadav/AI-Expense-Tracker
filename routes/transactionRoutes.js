const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/authMiddleware');

// @desc    Get all transactions
// @route   GET /api/transactions
router.get('/', protect, async (req, res) => {
  const { type, category, startDate, endDate, search } = req.query;
  
  let query = { user: req.user.id };

  if (type) query.type = type;
  if (category) query.category = category;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }
  if (search) {
    query.description = { $regex: search, $options: 'i' };
  }

  const transactions = await Transaction.find(query).sort({ date: -1 });
  res.status(200).json(transactions);
});

// @desc    Get summary stats for dashboard
// @route   GET /api/transactions/summary
router.get('/summary', protect, async (req, res) => {
  const transactions = await Transaction.find({ user: req.user.id });

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpense;

  // Category breakdown for pie chart
  const categoryData = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const pieChartData = Object.keys(categoryData).map((name) => ({
    name,
    value: categoryData[name],
  }));

  res.status(200).json({
    totalIncome,
    totalExpense,
    balance,
    pieChartData,
  });
});

// @desc    Create transaction
// @route   POST /api/transactions
router.post('/', protect, async (req, res) => {
  const { amount, type, category, description, date } = req.body;

  if (!amount || !type || !category || !description) {
    res.status(400);
    throw new Error('Please add all required fields');
  }

  const transaction = await Transaction.create({
    user: req.user.id,
    amount,
    type,
    category,
    description,
    date: date || Date.now(),
  });

  res.status(201).json(transaction);
});

// @desc    Update transaction
// @route   PUT /api/transactions/:id
router.put('/:id', protect, async (req, res) => {
  const transaction = await Transaction.findById(req.params.id);

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  // Make sure user owns transaction
  if (transaction.user.toString() !== req.user.id) {
    res.status(401);
    throw new Error('User not authorized');
  }

  const updatedTransaction = await Transaction.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  res.status(200).json(updatedTransaction);
});

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
router.delete('/:id', protect, async (req, res) => {
  const transaction = await Transaction.findById(req.params.id);

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  if (transaction.user.toString() !== req.user.id) {
    res.status(401);
    throw new Error('User not authorized');
  }

  await transaction.deleteOne();
  res.status(200).json({ id: req.params.id });
});

module.exports = router;
