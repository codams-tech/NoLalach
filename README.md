<p align="center">
  <img src="assets/icons/icon-128.png" alt="TraderLock Icon" width="80" height="80">
</p>

<h1 align="center">TraderLock: Anti-Overtrading & Discipline Blocker</h1>
<h3 align="center">संयम (Sanyam) — "Trade with discipline. Protect your wealth."</h3>

<p align="center">
  <strong>An open-source product by <a href="https://codams.in">codams.in</a></strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/product%20owner-codams.in-blue?style=flat-square" alt="Owner codams.in">
  <img src="https://img.shields.io/badge/manifest-v3-blue?style=flat-square" alt="Manifest V3">
  <img src="https://img.shields.io/badge/dependencies-zero-brightgreen?style=flat-square" alt="Zero Dependencies">
  <img src="https://img.shields.io/badge/license-MIT-orange?style=flat-square" alt="MIT License">
  <img src="https://img.shields.io/badge/telemetry-none-red?style=flat-square" alt="Zero Telemetry">
  <img src="https://img.shields.io/badge/works-offline-purple?style=flat-square" alt="Works Offline">
</p>

---

## 🎯 The Problem: Why Traders Blow Accounts

Traders don't blow accounts because they don't know the rules. They blow accounts because **in high-cortisol, impulse-driven moments**, they break every rule they've set for themselves.

### The Three Account Killers

| Killer | What Happens | TraderLock's Solution |
|--------|-------------|----------------------|
| **Chop Zone Trading** (10:30 AM – 1:15 PM) | Low volume, theta decay, false breakouts trap retail option buyers. Institutions accumulate while retailers bleed premiums. | **Time-based lockout** — broker websites redirect to a locked screen during non-trading hours |
| **Revenge Trading** | A ₹2,000 loss turns into ₹50,000 as the trader takes 10–20 impulsive trades trying to "recover" | **Daily trade counter + circuit breaker** — lock all brokers after max trades are exhausted |
| **Disabling Blockers** | Stressed traders with basic tech knowledge disable extensions, delete overlay divs, or open Incognito | **Bulletproof redirect architecture + Strict Mode + Incognito safeguards** |

### Why 10:30 AM – 1:15 PM Is the Kill Zone

For Indian equity and F&O markets, the period between 10:30 AM and 1:15 PM is statistically the worst time for retail option buyers:

1. **Theta Decay Acceleration**: Options premiums bleed fastest during low-volatility periods. Every minute of sideways chop costs money.
2. **Low Volume = Low Conviction**: Institutional players step back, creating a liquidity vacuum. Any move is likely a false breakout.
3. **Range Compression**: The day's range is typically established by 10:30 AM. Trading inside this range is a coin flip minus fees.
4. **False Breakout Trap**: The 11:00 AM – 12:30 PM zone generates the most false breakouts, trapping impulsive traders who chase every green/red candle.

> **SEBI Data (2023)**: 93% of individual F&O traders lost money, with an average loss of ₹2 Lakhs. **Overtrading was the primary contributor.**

---

## ✨ Features

### 🔒 Bulletproof Redirection Architecture
- **Not a DOM overlay** — trader can't just `F12 → Delete Element` to bypass it
- Uses `chrome.webNavigation` to intercept broker URLs **before** the page loads
- Redirects to an internal extension page (`blocked.html`) — completely severs the broker's WebSocket feeds, ticker scripts, and DOM
- Automatically mutes audio and sets tab title to "🔒 TRADING LOCKED"

### ⏰ Configurable Trading Windows
- **Default Presets for Indian F&O**:
  - `09:00 - 10:30` — Opening Momentum (highest probability setups)
  - `13:15 - 15:00` — Afternoon / European Session Reversal
- Add unlimited custom windows (24-hour format, local timezone)
- Weekend lock toggle (Saturday & Sunday auto-block)

### 🏦 Broker Presets & Custom Domains
One-click toggles for popular Indian brokers:
- Zerodha Kite (`kite.zerodha.com`)
- Dhan Web (`web.dhan.co`)
- Groww (`groww.in`)
- Angel One (`trade.angelone.in`)
- Upstox Pro (`pro.upstox.com`)
- Shoonya / Finvasia (`shoonya.finvasia.com`)
- Kotak Neo, HDFC Sky, Fyers
- TradingView (optional toggle)
- **Custom URL input** for any global broker (Interactive Brokers, Robinhood, etc.)

### 🛡️ Anti-Tampering Strict Mode
During market hours (09:00 – 15:30), if a trader tries to modify settings:
1. **15-minute mandatory cooling-off timer** (configurable 5–60 min)
2. **Pledge Typing Test** (copy-paste disabled) — must type the exact phrase:
   > *"I acknowledge that breaking my trading schedule causes overtrading and account blowouts. I am stepping away from my desk."*
3. If they close or cancel, the cooldown timer resets

### 📊 Daily Trade Counter & Circuit Breaker
- Set max daily trades (default: 3)
- Visual "pip" indicators show trade usage
- One-click **"Lock Rest of Day"** kill switch — blocks all brokers until 9:00 AM next morning

### 🎨 Aesthetic Lockout Screen
- Dark glassmorphism design with red accent glow
- **Live countdown clock** to the next allowed trading session
- **Psychology quote carousel** — rotating brutal truths about overtrading
- **Action suggestions** — drink water, go for a walk, close the laptop
- Floating particle animations for visual impact

### 🕶️ Incognito Safeguard
- Detects if incognito access is disabled
- Displays prominent warning with step-by-step fix instructions
- Badge reminder on the extension icon

---

## 📦 Installation

### Load Unpacked (Recommended for Development & Personal Use)

Works on **Chrome**, **Brave**, **Edge**, and any Chromium-based browser.

1. **Clone or Download** this repository:
   ```bash
   git clone https://github.com/abhishakegupta91/Sanyam.git
   ```

2. **Open your browser's extension page**:
   - Chrome: Navigate to `chrome://extensions`
   - Brave: Navigate to `brave://extensions`
   - Edge: Navigate to `edge://extensions`

3. **Enable Developer Mode** (toggle in the top-right corner)

4. **Click "Load Unpacked"** and select the `Sanyam` folder (the one containing `manifest.json`)

5. **Pin the extension** to your toolbar for quick access

### ⚠️ CRITICAL: Enable Incognito Access

Without this, traders can bypass TraderLock by opening broker websites in Incognito mode.

1. Go to `chrome://extensions`
2. Find **TraderLock** in the list
3. Click **"Details"**
4. Toggle **"Allow in Incognito"** to **ON**

---

## 🗂️ Project Structure

```
Sanyam/
├── manifest.json              # Manifest V3 configuration
├── background.js              # Service worker: time logic, navigation interception, alarms
├── blocked/
│   ├── blocked.html           # Fullscreen lockout page (internal extension page)
│   ├── blocked.css            # Dark glassmorphism styling
│   └── blocked.js             # Countdown timer, quote carousel, close button
├── popup/
│   ├── popup.html             # Quick status popup (LOCKED/OPEN badge, trade counter)
│   ├── popup.css              # Compact dark popup styling
│   └── popup.js               # Status display, trade logging, lock-rest-of-day
├── options/
│   ├── options.html           # Full settings page (windows, brokers, strict mode)
│   ├── options.css            # Two-column settings layout
│   └── options.js             # Config editor, domain management, incognito check
├── assets/
│   ├── icons/
│   │   ├── icon-16.png        # Toolbar icon (16×16)
│   │   ├── icon-48.png        # Extension page icon (48×48)
│   │   └── icon-128.png       # Store/install icon (128×128)
│   └── quotes.json            # Discipline & risk-management quote database
├── LICENSE                    # MIT License
└── README.md                  # This file
```

---

## ⚙️ Technical Architecture

### Blocking Mechanism (Why It's Bulletproof)

```
Trader tries to open kite.zerodha.com
         │
         ▼
┌─────────────────────────────────┐
│  chrome.webNavigation           │
│  .onBeforeNavigate listener     │
│  (fires BEFORE page loads)      │
└──────────────┬──────────────────┘
               │
         Is it locked?
        ┌──────┴──────┐
        │             │
      Yes            No
        │             │
        ▼             ▼
  chrome.tabs.update   Page loads
  → blocked.html       normally
  (internal page)
        │
        ▼
  Broker's entire
  execution context
  is DESTROYED:
  - No WebSocket feeds
  - No ticker scripts
  - No DOM to manipulate
  - Tab audio muted
```

### Why DOM Overlays Don't Work

Most "website blocker" extensions inject a `<div>` overlay on top of the page. A stressed trader can:
1. Press `F12` to open DevTools
2. Find the overlay element
3. Press `Delete`
4. Continue trading

TraderLock **never loads the broker's page at all**. The `chrome.webNavigation.onBeforeNavigate` listener fires *before* the browser sends the HTTP request. The tab is redirected to an internal `chrome-extension://` page where the broker's code never executes.

### State Management

All state is stored in `chrome.storage.sync` (config) and `chrome.storage.local` (daily counters, cooldowns). The service worker stores **zero state in global variables** — every event handler reads from storage on-demand.

### Alarm-Based Architecture

Uses `chrome.alarms` (not `setTimeout`/`setInterval`) for:
- **30-second periodic check** — updates badge, scans tabs, enforces blocks
- **Cooldown timer** — strict mode cooling-off period

---

## 🛠️ Configuration

### Default Trading Windows (Indian F&O)

| Window | Time | Rationale |
|--------|------|-----------|
| Opening Momentum | 09:00 – 10:30 | Highest volume, clearest trends, best risk/reward setups |
| Afternoon Session | 13:15 – 15:00 | European session overlap, reversal setups, closing momentum |
| **LOCKED** | 10:30 – 13:15 | Theta decay chop, false breakouts, premium erosion |
| **LOCKED** | 15:00+ | Post-market, no new positions |

### Customization

All windows, broker lists, and settings are fully customizable through the **Options page** (right-click extension icon → Options).

---

## 🤝 Contributing

### Adding a New Broker Preset

1. Open `background.js`
2. Add the broker to the `DEFAULT_CONFIG.brokers` array:
   ```js
   { domain: 'newbroker.example.com', label: 'New Broker Name', enabled: false }
   ```
3. Add the corresponding `host_permissions` entry in `manifest.json`:
   ```json
   "*://newbroker.example.com/*"
   ```
4. Submit a PR with the broker name, domain, and a brief note about which country/market it serves

### Adding New Psychology Quotes

1. Open `assets/quotes.json`
2. Add a new object:
   ```json
   {
     "text": "Your quote text here.",
     "source": "Attribution / Source"
   }
   ```
3. Keep quotes factual, impactful, and relevant to overtrading/discipline

### General Contribution Guidelines

- **Zero dependencies** — no npm, no build step, no external libraries
- **Pure vanilla JS** — no TypeScript, no frameworks
- **Test with "Load Unpacked"** before submitting PRs
- **Follow existing code style** — `async`/`await`, no `.then()` chains

---

## 🔐 Privacy & Security

- **Zero telemetry** — no analytics, no tracking, no data collection
- **Fully offline** — works without an internet connection
- **No external requests** — all logic runs locally in the browser
- **Open source** — audit every line of code yourself
- **chrome.storage only** — data stays on your machine (or syncs via your Google account if using Chrome Sync)

---

## 📄 License & Product Ownership

TraderLock (संयम) is an open-source product owned and maintained by [codams.in](https://codams.in).

Licensed under the [MIT License](LICENSE). Contributions, suggestions, and feedback are warmly welcomed.

---

## 🙏 Philosophy

> **संयम (Sanyam)** — Sanskrit for self-restraint, discipline, and control.

The market rewards patience and punishes impulse. TraderLock doesn't make you a better trader — it removes the moments where you're your own worst enemy.

The best trade you'll ever make is the one you didn't take.

---

<p align="center">
  <strong>Built with discipline, for discipline.</strong><br>
  <em>Trade with संयम. Protect your wealth.</em><br><br>
  Crafted as an open-source initiative by <a href="https://codams.in"><strong>codams.in</strong></a>
</p>
