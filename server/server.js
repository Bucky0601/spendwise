const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// Root route
app.get('/', (req, res) => res.json({ name: 'SpendWise', status: 'running' }));

// --- FILE-BASED STORAGE ---
const DATA_FILE = 'expenses.json';
function readDB() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}
function writeDB(arr) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2));
}
let expenses = readDB();

// --- API ROUTES ---
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/expenses', (req, res) => {
  res.json([...expenses].sort((a, b) => b.date.localeCompare(a.date)));
});

app.post('/api/expenses', (req, res) => {
  const { date, description, amount, category } = req.body;
  if (!date || !description || !amount || !category) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const entry = { id: Date.now(), date, description, amount: parseFloat(amount), category };
  expenses.push(entry);
  writeDB(expenses);
  res.json({ ok: true, id: entry.id });
});

app.delete('/api/expenses/:id?', (req, res) => {
  expenses = expenses.filter(e => e.id !== parseInt(req.params.id));
  writeDB(expenses);
  res.json({ ok: true });
});

app.get('/api/categories/:month', (req, res) => {
  const month = req.params.month;
  const filtered = expenses.filter(e => e.date.startsWith(month));
  const cats = {};
  filtered.forEach(e => { cats[e.category] = (cats[e.category] || 0) + e.amount; });
  res.json(Object.entries(cats).map(([category, total]) => ({
    category, total, count: filtered.filter(e => e.category === category).length
  })));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SpendWise server running on port ${PORT}`);
});
