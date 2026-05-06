import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  LogOut, 
  PieChart as PieIcon,
  Download,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip
} from 'recharts';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, balance: 0, pieChartData: [] });
  const [budgetLimit, setBudgetLimit] = useState(15000);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    amount: '',
    type: 'expense',
    category: 'Food',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    if (!user) return;
    
    try {
      // Fetch Transactions
      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (transError) throw transError;

      // Fetch Profile/Budget
      const { data: profileData } = await supabase
        .from('profiles')
        .select('budget_limit')
        .eq('id', user.id)
        .single();

      if (profileData) setBudgetLimit(profileData.budget_limit);

      setTransactions(transData);
      calculateSummary(transData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err.message);
    }
  };

  const calculateSummary = (data) => {
    const income = data.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const expense = data.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
    
    const categoryMap = data.filter(t => t.type === 'expense').reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {});

    const pieData = Object.keys(categoryMap).map(name => ({
      name,
      value: categoryMap[name]
    }));

    setSummary({
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
      pieChartData: pieData
    });
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('transactions').insert([{
        user_id: user.id,
        amount: Number(formData.amount),
        type: formData.type,
        category: formData.category,
        description: formData.description,
        date: formData.date
      }]);

      if (error) throw error;
      
      setShowAddModal(false);
      setFormData({ amount: '', type: 'expense', category: 'Food', description: '', date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (err) {
      alert('Error adding transaction: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) alert(error.message);
      else fetchData();
    }
  };

  const exportCSV = () => {
    const headers = ['Date,Description,Category,Type,Amount\n'];
    const rows = transactions.map(t => 
      `${new Date(t.date).toLocaleDateString()},${t.description},${t.category},${t.type},${t.amount}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expenses.csv';
    a.click();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="bg-primary/20 p-2 rounded-xl"><Wallet className="text-primary w-8 h-8" /></span>
            Expense Tracker
          </h1>
          <p className="text-zinc-400 mt-1">Welcome, {user.user_metadata?.name || 'User'}!</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5" /> Add Transaction
          </button>
          <button 
            onClick={logout}
            className="p-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-900 transition-all text-zinc-400 hover:text-white"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard title="Total Balance" value={summary.balance} icon={<Wallet className="text-blue-500" />} color="blue" />
        <StatCard title="Total Income" value={summary.totalIncome} icon={<TrendingUp className="text-emerald-500" />} color="emerald" />
        <StatCard title="Total Expenses" value={summary.totalExpense} icon={<TrendingDown className="text-red-500" />} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-2xl border border-zinc-800 overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">Recent Transactions</h3>
              <button onClick={exportCSV} className="text-sm text-zinc-400 hover:text-white flex items-center gap-2">
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-900/50 text-zinc-400 text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Description</th>
                    <th className="px-6 py-4 font-semibold">Category</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                    <th className="px-6 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {transactions.map((t) => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={t.id} 
                      className="hover:bg-zinc-900/30 transition-all"
                    >
                      <td className="px-6 py-4 text-sm text-zinc-400">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm font-medium">{t.description}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {t.category}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-sm font-bold ${t.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {t.type === 'income' ? '+' : '-'}${t.amount}
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleDelete(t.id)} className="text-zinc-500 hover:text-red-500 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass p-6 rounded-2xl border border-zinc-800">
            <h3 className="font-bold mb-6 flex items-center gap-2"><PieIcon className="w-5 h-5 text-primary" /> Expenses by Category</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {summary.pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass p-6 rounded-2xl border border-zinc-800">
            <h3 className="font-bold mb-2">Budget Status</h3>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-400">Monthly Limit</span>
              <span className="font-bold">${budgetLimit}</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 mb-4">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${summary.totalExpense > budgetLimit ? 'bg-red-500' : 'bg-primary'}`}
                style={{ width: `${Math.min((summary.totalExpense / budgetLimit) * 100, 100)}%` }}
              />
            </div>
            {summary.totalExpense > budgetLimit && (
              <p className="text-xs text-red-500 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                Warning: You have exceeded your monthly budget limit!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[60] p-6"
            >
              <div className="glass p-8 rounded-2xl border border-zinc-800 shadow-2xl">
                <h2 className="text-xl font-bold mb-6">New Transaction</h2>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Type</label>
                      <select 
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-sm"
                      >
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Amount</label>
                      <input 
                        type="number"
                        required
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Category</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-sm"
                    >
                      {['Food', 'Travel', 'Bills', 'Shopping', 'Entertainment', 'Health', 'Education', 'Salary', 'Freelance', 'Investment', 'Other'].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Description</label>
                    <input 
                      type="text"
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-sm"
                      placeholder="What was it for?"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Date</label>
                    <input 
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-sm"
                    />
                  </div>
                  <button type="submit" className="w-full bg-primary py-3 rounded-xl font-bold mt-4 shadow-lg shadow-primary/20">
                    Add Transaction
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }) => (
  <div className="glass p-6 rounded-2xl border border-zinc-800 flex items-center gap-4">
    <div className={`p-3 rounded-xl bg-${color}-500/10`}>
      {icon}
    </div>
    <div>
      <p className="text-xs text-zinc-400 uppercase font-semibold tracking-wider">{title}</p>
      <p className="text-2xl font-bold">${value.toLocaleString()}</p>
    </div>
  </div>
);

export default Dashboard;
