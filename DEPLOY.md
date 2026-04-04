# SpendWise — Deploy Guide

## Project Structure
```
├── docs/index.html          ← Frontend (GitHub Pages)
├── server/
│   ├── server.js            ← Backend (Render/Railway)
│   └── package.json         ← Backend dependencies
```

---

## 1. Create Telegram Bot (2 min)

1. Open Telegram → search `@BotFather`
2. Send `/newbot` → choose name → copy the **token**
3. Search `@userinfobot` → send any message → copy the **chat ID**

---

## 2. Deploy Backend to Render (Free)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → **Web Service**
3. Connect your repo
4. Config:
   - **Build Command:** `cd server && npm install && npm install better-sqlite3`
   - **Start Command:** `cd server && node server.js`
5. Add environment variables:
   - `TELEGRAM_BOT_TOKEN` = your BotFather token
   - `TELEGRAM_CHAT_ID` = your chat ID
6. Deploy → wait 2-3 min → copy the URL (e.g. `https://spendwise-abc123.onrender.com`)

**Note:** Render free tier spins down after 15 min of inactivity. First request after sleep takes ~30s.

**Alternative:** Use [Railway.app](https://railway.app) — similar free tier, auto-detects Node.js.

### Alternative: Run Locally (for testing)
```bash
cd server
npm install
# create .env file with your TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
node server.js
```
Server runs at `http://localhost:3000`

---

## 3. Deploy Frontend to GitHub Pages (Free)

1. Edit `docs/index.html` — find this line (around line 152):
   ```js
   var API_URL = 'https://your-server-render-app.onrender.com';
   ```
   Replace with your Render server URL.

2. Push to GitHub

3. Go to your repo → **Settings** → **Pages** → Source: **Deploy from branch** → `main` → `/docs` folder → Save

4. Your site is live at: `https://yourusername.github.io/your-repo/`

---

## 4. Telegram Alerts

The bot automatically sends a monthly expense summary on the **1st of every month at 2:30 PM IST** (9 AM UTC).

You can also:
- Send `/status` to the bot anytime for current stats
- Send `/start` to verify the bot is running

---

## Monthly Summary on Telegram looks like:

```
📊 Monthly Expense Report
📅 January 2025
─────────────────────────

*Food*
💰 ₹4,500 (35.2%)

*Transport*
💰 ₹2,300 (18.0%)

─────────────────────────
🏦 TOTAL: ₹12,780
📝 32 transactions
```
