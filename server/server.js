const express = require('express');
const cors = require('cors');
const fs = require('fs');
const cron = require('node-cron');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// Root route — just confirms server is running
app.get('/', (req, res) => res.json({ name: 'SpendWise', status: 'running' }));

// --- FILE-BASED STORAGE (no native deps, works everywhere) ---
const DATA_FILE = 'expenses.json';

function readDB() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}

function writeDB(arr) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2));
}

let expenses = readDB();

// --- TELEGRAM ---
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
let bot = null;

if (BOT_TOKEN && CHAT_ID) {
  bot = new TelegramBot(BOT_TOKEN, { polling: false });
}

// Monthly report on the 1st at 9 AM UTC (2:30 PM IST)
cron.schedule('0 9 1 * *', async () => {
  if (!bot) return;
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const y = prev.getFullYear();
  const m = String(prev.getMonth() + 1).padStart(2, '0');
  const monthData = expenses.filter(e => e.date.startsWith(`${y}-${m}`));

  if (!monthData.length) {
    return bot.sendMessage(CHAT_ID, '📊 *Monthly Report*\n\nNo expenses recorded this month.', { parse_mode: 'Markdown' });
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
  msg += `*Total: ₹${total.toLocaleString('en-IN')}*\n`;
  msg += `${monthData.length} transactions`;

  bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(() => {});
});

// Bot commands
if (bot) {
  bot.on('message', (msg) => {
    if (msg.chat.id != CHAT_ID) return;
    if (msg.text === '/start') {
      bot.sendMessage(CHAT_ID, '✅ SpendWise bot is running!\nI\'ll send you monthly expense summaries on the 1st of each month.');
    } else if (msg.text === '/status') {
      const total = expenses.reduce((s, e) => s + e.amount, 0);
      bot.sendMessage(CHAT_ID, `📋 *Status*\nExpenses: ${expenses.length}\nTotal: ₹${total.toLocaleString('en-IN')}`, { parse_mode: 'Markdown' });
    }
  });
}

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
  res.json(Object.entries(cats).map(([category, total]) => ({ category, total, count: filtered.filter(e => e.category === category).length })));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 SpendWise server running on port ${PORT}`);
  if (bot) bot.sendMessage(CHAT_ID, '✅ SpendWise server started!').catch(() => {});
});
