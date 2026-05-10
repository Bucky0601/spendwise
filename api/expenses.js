const https = require('https');

const REPO = 'Bucky0601/spendwise';
const PATH = 'data/expenses.json';
const TOKEN = process.env.GITHUB_TOKEN;
const BRANCH = 'main';

function ghApi(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const url = endpoint.startsWith('http') ? new URL(endpoint) : new URL(endpoint, 'https://api.github.com');
    const opts = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'spendwise',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    };
    if (body) opts.headers['Content-Type'] = 'application/json';
    const req = https.request(url, opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d || '{}')); }
        catch { resolve(d); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getExpenses() {
  // Get file SHA and content
  const content = await ghApi('GET', `/repos/${REPO}/contents/${PATH}`, null);
  // Handle 404 - file doesn't exist yet
  if (content.message && content.message.includes('No file')) {
    return { expenses: null, sha: null };
  }
  if (content.sha) {
    const decoded = Buffer.from(content.content.replace(/\n/g, ''), 'base64').toString();
    try { return { expenses: JSON.parse(decoded), sha: content.sha }; }
    catch { return { expenses: [], sha: content.sha }; }
  }
  return { expenses: [], sha: null };
}

async function saveExpenses(expenses, sha) {
  const content = Buffer.from(JSON.stringify(expenses, null, 2)).toString('base64');
  const body = { message: 'add expense', content, branch: BRANCH };
  if (sha) body.sha = sha;
  return ghApi('PUT', `/repos/${REPO}/contents/${PATH}`, body);
}

module.exports.config = { runtime: 'nodejs' };

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      if (req.query.health) return res.json({ status: 'ok' });
      const { expenses } = await getExpenses();
      const arr = expenses || [];
      const sorted = [...arr].sort((a, b) => b.date.localeCompare(a.date));
      return res.json(sorted);
    }

    if (req.method === 'POST') {
      const { date, description, amount, category } = req.body;
      if (!date || !description || !amount || !category) {
        return res.status(400).json({ error: 'All fields required' });
      }
      const { expenses: current, sha } = await getExpenses();
      const arr = current || [];
      const entry = { id: Date.now(), date, description, amount: parseFloat(amount), category };
      arr.push(entry);
      await saveExpenses(arr, sha);
      return res.json({ ok: true, id: entry.id });
    }

    if (req.method === 'PUT') {
      const id = parseInt(req.query.id);
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { date, description, amount, category } = req.body;
      if (!date || !description || !amount || !category) {
        return res.status(400).json({ error: 'All fields required' });
      }
      const { expenses: current, sha } = await getExpenses();
      const arr = current || [];
      const idx = arr.findIndex(e => e.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Not found' });
      arr[idx] = { id, date, description, amount: parseFloat(amount), category };
      await saveExpenses(arr, sha);
      return res.json({ ok: true });
    }
    if (req.method === 'DELETE') {
      const id = parseInt(req.query.id);
      const { expenses: current, sha } = await getExpenses();
      const arr = (current || []).filter(e => e.id !== id);
      await saveExpenses(arr, sha);
      return res.json({ ok: true });
    }

    res.status(405).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
