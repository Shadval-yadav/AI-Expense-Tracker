require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const connectDB = require('./config/db');

const categories = ['Food', 'Travel', 'Bills', 'Shopping', 'Entertainment', 'Health', 'Education', 'Other'];
const incomeCategories = ['Salary', 'Freelance', 'Investment'];

const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

const descriptions = {
  Food: ['Lunch at cafe', 'Grocery shopping', 'Dinner with friends', 'Pizza delivery'],
  Travel: ['Uber ride', 'Bus pass', 'Flight ticket', 'Petrol refill'],
  Bills: ['Electricity bill', 'Internet bill', 'Water bill', 'Phone recharge'],
  Shopping: ['New shoes', 'Clothing', 'Electronics', 'Books'],
  Entertainment: ['Netflix subscription', 'Movie tickets', 'Concert', 'Games'],
  Health: ['Doctor visit', 'Medicine', 'Gym membership', 'Health checkup'],
  Education: ['Online course', 'Books', 'Tuition fee', 'Stationery'],
  Other: ['Miscellaneous', 'Gift', 'Donation', 'Repair'],
  Salary: ['Monthly salary', 'Bonus', 'Salary increment'],
  Freelance: ['Web project', 'Design work', 'Consulting'],
  Investment: ['Stock dividend', 'FD interest', 'Mutual fund return'],
};

const seed = async () => {
  await connectDB();

  // Clear existing data
  await User.deleteMany({});
  await Transaction.deleteMany({});

  // Create demo user
  const user = await User.create({
    name: 'Demo User',
    email: 'demo@example.com',
    password: 'password123',
    budgetLimit: 15000,
  });

  console.log('✅ Demo user created: demo@example.com / password123');

  // Generate 35 sample transactions over last 6 months
  const transactions = [];
  const now = new Date();

  for (let i = 0; i < 35; i++) {
    const daysAgo = randomBetween(0, 180);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    const isIncome = Math.random() < 0.25; // 25% income, 75% expense
    const type = isIncome ? 'income' : 'expense';
    const category = isIncome ? randomItem(incomeCategories) : randomItem(categories);
    const amount = isIncome ? randomBetween(5000, 30000) : randomBetween(100, 5000);
    const descList = descriptions[category];
    const description = randomItem(descList);

    transactions.push({
      user: user._id,
      amount,
      type,
      category,
      date,
      description,
    });
  }

  await Transaction.insertMany(transactions);
  console.log(`✅ ${transactions.length} sample transactions created`);
  console.log('🌱 Database seeded successfully!');
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
