const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const cron = require('node-cron');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// --- DATABASE ---
const db = new Database('expenses.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL
  );
`);

// --- TELEGRAM ---
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
let bot = null;

if (BOT_TOKEN && CHAT_ID) {
  bot = new TelegramBot(BOT_TOKEN, { polling: false });

  // Monthly report on the 1st at 9 AM UTC
  cron.schedule('0 9 1 * *', () => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const y = prev.getFullYear();
    const m = String(prev.getMonth() + 1).padStart(2, '0');
    const stmt = db.prepare('SELECT * FROM expenses WHERE date LIKE ? ORDER BY date ASC');
    const expenses = stmt.all(`${y}-${m}-%`);

    if (!expenses.length) {
      return bot.sendMessage(CHAT_ID, '📊 *Monthly Report*\n\nNo expenses recorded this month.', { parse_mode: 'Markdown' });
    }

    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const cats = {};
    expenses.forEach(e => { cats[e.category] = (cats[e.category] || 0) + e.amount; });
    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);

    let msg = `📊 *Monthly Expense Report*\n📅 *${prev.toLocaleString('en-US', { month: 'long', year: 'numeric' })}*\n`;
    msg += `${'─'.repeat(28)}\n\n`;
    sorted.forEach(([name, amount]) => {
      const pct = ((amount / total) * 100).toFixed(1);
      msg += `*${name}*\n💰 ₹${amount.toLocaleString('en-IN')} (${pct}%)\n\n`;
    });
    msg += `${'─'.repeat(28)}\n`;
    msg += `*🏦 TOTAL: ₹${total.toLocaleString('en-IN')}*\n`;
    msg += `📝 ${expenses.length} transactions`;

    bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' });
  });

  // Bot commands
  bot.onText(/\/start/, () => {
    bot.sendMessage(CHAT_ID, '✅ SpendWise bot is running!\nI\'ll send you monthly expense summaries.',
      { parse_mode: 'Markdown' });
  });

  bot.onText(/\/status/, () => {
    const stmt = db.prepare('SELECT COUNT(*) as cnt, SUM(amount) as total FROM expenses');
    const result = stmt.get();
    bot.sendMessage(CHAT_ID,
      `📋 *Status*\nTotal: ${result.cnt} expenses\nSpent: ₹${(result.total || 0).toLocaleString('en-IN')}`,
      { parse_mode: 'Markdown' });
  });
}

// --- API ROUTES ---
app.get('/api/expenses', (req, res) => {
  res.json(db.prepare('SELECT * FROM expenses ORDER BY date DESC').all());
});

app.post('/api/expenses', (req, res) => {
  const { date, description, amount, category } = req.body;
  if (!date || !description || !amount || !category) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const stmt = db.prepare('INSERT INTO expenses (date, description, amount, category) VALUES (?, ?, ?, ?)');
  const result = stmt.run(date, description, parseFloat(amount), category);
  res.json({ ok: true, id: result.lastInsertRowid });
});

app.delete('/api/expenses/:id', (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(parseInt(req.params.id));
  res.json({ ok: true });
});

app.get('/api/categories/:month', (req, res) => {
  const stmt = db.prepare(`
    SELECT category, COUNT(*) as count, SUM(amount) as total
    FROM expenses WHERE date LIKE ? GROUP BY category ORDER BY total DESC
  `);
  res.json(stmt.all(`${req.params.month}-%`));
});

// --- HEALTH ---
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 SpendWise server on port ${PORT}`);
  if (bot) bot.sendMessage(CHAT_ID, '✅ SpendWise server started!').catch(() => {});
});
