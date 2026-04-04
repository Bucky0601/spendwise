const express = require('express');
const cors = require('cors');
const fs = require('fs');
const https = require('https');
const cron = require('node-cron');

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

// --- TELEGRAM (direct HTTP, no library) ---
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function telegramSend(text, options = {}) {
  if (!BOT_TOKEN || !CHAT_ID) return Promise.resolve();
  const data = JSON.stringify({ chat_id: CHAT_ID, text, ...options });
  return new Promise((resolve) => {
    const req = https.request(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve());
    });
    req.on('error', () => resolve());
    req.write(data);
    req.end();
  });
}

function sendStartupMsg() {
  telegramSend('✅ *SpendWise* server started!', { parse_mode: 'Markdown' });
}

// Monthly report — 1st of every month at 9 AM UTC (2:30 PM IST)
cron.schedule('0 9 1 * *', async () => {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const y = prev.getFullYear();
  const m = String(prev.getMonth() + 1).padStart(2, '0');
  const monthData = expenses.filter(e => e.date.startsWith(`${y}-${m}`));

  if (!monthData.length) {
    return telegramSend('📊 *Monthly Report*\n\nNo expenses recorded this month.', { parse_mode: 'Markdown' });
  }

  const total = monthData.reduce((s, e) => s + e.amount, 0);
  const cats = {};
  monthData.forEach(e => { cats[e.category] = (cats[e.category] || 0) + e.amount; });
  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);

  let msg = `📊 *Monthly Expense Report*\n📅 *${prev.toLocaleString('en-US', { month: 'long', year: 'numeric' })}*\n\n`;
  sorted.forEach(([name, amount]) => {
    const pct = ((amount / total) * 100).toFixed(1);
    msg += `*${name}*\n₹${amount.toLocaleString('en-IN')} (${pct}%)\n\n`;
  });
  msg += `━━━━━━━━━━━━━━━━━\n`;
  msg += `🏦 *Total:* ₹${total.toLocaleString('en-IN')}\n`;
  msg += `📝 ${monthData.length} transactions`;

  await telegramSend(msg, { parse_mode: 'Markdown' });
});

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

app.delete('/api/expenses/:id', (req, res) => {
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
  sendStartupMsg();
});
