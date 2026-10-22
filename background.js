/* ============================================================
   TraderLock — Service Worker (background.js)
   Manifest V3 | Zero dependencies | All state in chrome.storage
   ============================================================ */

// ── Default Configuration ──────────────────────────────────────
const DEFAULT_CONFIG = {
  // Allowed trading windows (24-hr, local timezone)
  windows: [
    { id: 'w1', label: 'Opening Momentum', start: '09:00', end: '10:30', enabled: true },
    { id: 'w2', label: 'Afternoon Session', start: '13:15', end: '15:00', enabled: true }
  ],

  // Broker domains — toggled on/off individually
  brokers: [
    { domain: 'kite.zerodha.com',       label: 'Zerodha Kite',      enabled: true },
    { domain: 'web.dhan.co',            label: 'Dhan Web',           enabled: true },
    { domain: 'groww.in',               label: 'Groww',              enabled: true },
    { domain: 'trade.angelone.in',      label: 'Angel One',          enabled: true },
    { domain: 'pro.upstox.com',         label: 'Upstox Pro',         enabled: true },
    { domain: 'shoonya.finvasia.com',   label: 'Shoonya / Finvasia', enabled: true },
    { domain: 'neo.kotak.com',          label: 'Kotak Neo',          enabled: false },
    { domain: 'skytrading.hdfcsec.com', label: 'HDFC Sky',           enabled: false },
    { domain: 'trade.fyers.in',         label: 'Fyers',              enabled: false },
    { domain: 'in.tradingview.com',     label: 'TradingView (IN)',   enabled: false },
    { domain: 'tradingview.com',        label: 'TradingView',        enabled: false },
    { domain: 'www.tradingview.com',    label: 'TradingView (www)',  enabled: false }
  ],

  // Custom user-added domains
  customDomains: [],

  // Feature toggles
  strictMode: true,
  weekendLock: true,
  strictModeCooldownMinutes: 15,

  // Max trades per day
  maxDailyTrades: 3,

  // Incognito warning dismissed
  incognitoWarningDismissed: false
};

// ── Install / Update ───────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.storage.sync.set({ config: DEFAULT_CONFIG });
    await chrome.storage.local.set({
      dailyTradeCount: 0,
      tradeDate: getToday(),
      dayLocked: false,
      pendingUnlock: null
    });
  }

  // Start the periodic check alarm
  await chrome.alarms.create('traderlock-check', { periodInMinutes: 0.5 });

  // Run an immediate status check
  await updateBlockingState();
});

// ── Alarm Handler ──────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'traderlock-check') {
    await updateBlockingState();
  }
  if (alarm.name === 'traderlock-cooldown-expire') {
    await processCooldownExpiry();
  }
});

// ── Navigation Interceptor (Bulletproof Redirect) ──────────────
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only intercept main frame navigations
  if (details.frameId !== 0) return;

  const url = details.url;
  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return;
  }

  const shouldBlock = await shouldBlockDomain(hostname);
  if (shouldBlock) {
    const blockedUrl = chrome.runtime.getURL('blocked/blocked.html');
    await chrome.tabs.update(details.tabId, {
      url: blockedUrl,
      muted: true
    });
  }
});

// Also catch completed navigations (for tabs already open)
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const tab = await chrome.tabs.get(details.tabId);
  if (!tab.url) return;

  let hostname;
  try {
    hostname = new URL(tab.url).hostname;
  } catch {
    return;
  }

  const shouldBlock = await shouldBlockDomain(hostname);
  if (shouldBlock) {
    const blockedUrl = chrome.runtime.getURL('blocked/blocked.html');
    await chrome.tabs.update(details.tabId, {
      url: blockedUrl,
      muted: true
    });
  }
});

// ── Tab Update Listener (catch URL changes within SPA brokers) ─
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'loading' || !changeInfo.url) return;

  let hostname;
  try {
    hostname = new URL(changeInfo.url).hostname;
  } catch {
    return;
  }

  const shouldBlock = await shouldBlockDomain(hostname);
  if (shouldBlock) {
    const blockedUrl = chrome.runtime.getURL('blocked/blocked.html');
    await chrome.tabs.update(tabId, {
      url: blockedUrl,
      muted: true
    });
  }
});

// ── Message Handler ────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case 'GET_STATUS': {
          const status = await getFullStatus();
          sendResponse(status);
          break;
        }
        case 'INCREMENT_TRADE': {
          const result = await incrementDailyTrade();
          sendResponse(result);
          break;
        }
        case 'RESET_TRADES': {
          await chrome.storage.local.set({ dailyTradeCount: 0, tradeDate: getToday() });
          sendResponse({ count: 0 });
          break;
        }
        case 'LOCK_REST_OF_DAY': {
          await chrome.storage.local.set({ dayLocked: true });
          await updateBlockingState();
          sendResponse({ locked: true });
          break;
        }
        case 'REQUEST_UNLOCK': {
          const unlockResult = await requestStrictModeUnlock(message.pledge);
          sendResponse(unlockResult);
          break;
        }
        case 'CHECK_COOLDOWN': {
          const cooldown = await checkCooldownStatus();
          sendResponse(cooldown);
          break;
        }
        case 'CANCEL_COOLDOWN': {
          await chrome.storage.local.set({ pendingUnlock: null });
          await chrome.alarms.clear('traderlock-cooldown-expire');
          sendResponse({ cancelled: true });
          break;
        }
        case 'GET_CONFIG': {
          const { config } = await chrome.storage.sync.get('config');
          sendResponse({ config: config || DEFAULT_CONFIG });
          break;
        }
        case 'SAVE_CONFIG': {
          await chrome.storage.sync.set({ config: message.config });
          await updateBlockingState();
          sendResponse({ saved: true });
          break;
        }
        case 'CHECK_INCOGNITO': {
          const allowed = await checkIncognitoAccess();
          sendResponse({ incognitoAllowed: allowed });
          break;
        }
        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (err) {
      sendResponse({ error: err.message });
    }
  })();
  return true; // Keep channel open for async response
});

// ── Core Logic ─────────────────────────────────────────────────

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function getCurrentMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function isWeekend() {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

function isWithinAnyWindow(windows) {
  const currentMin = getCurrentMinutes();
  return windows
    .filter(w => w.enabled)
    .some(w => {
      const start = timeToMinutes(w.start);
      const end = timeToMinutes(w.end);
      return currentMin >= start && currentMin < end;
    });
}

function isMarketHours() {
  const currentMin = getCurrentMinutes();
  const marketOpen = timeToMinutes('09:00');
  const marketClose = timeToMinutes('15:30');
  return currentMin >= marketOpen && currentMin < marketClose;
}

async function getConfig() {
  const { config } = await chrome.storage.sync.get('config');
  return config || DEFAULT_CONFIG;
}

async function shouldBlockDomain(hostname) {
  const config = await getConfig();
  const localData = await chrome.storage.local.get(['dayLocked', 'tradeDate']);

  // Reset dayLocked if it's a new day
  if (localData.tradeDate !== getToday()) {
    await chrome.storage.local.set({ dayLocked: false, tradeDate: getToday(), dailyTradeCount: 0 });
  }

  // Check if this domain is in the blocked list
  const allDomains = [
    ...config.brokers.filter(b => b.enabled).map(b => b.domain),
    ...config.customDomains.filter(d => d.enabled).map(d => d.domain)
  ];

  const domainMatched = allDomains.some(d => hostname === d || hostname.endsWith('.' + d));
  if (!domainMatched) return false;

  // Day locked by user
  const { dayLocked } = await chrome.storage.local.get('dayLocked');
  if (dayLocked) return true;

  // Weekend lock
  if (config.weekendLock && isWeekend()) return true;

  // Check if within any allowed window
  if (isWithinAnyWindow(config.windows)) return false;

  // Outside all windows → block
  return true;
}

async function updateBlockingState() {
  const config = await getConfig();
  const { dayLocked } = await chrome.storage.local.get('dayLocked');

  let isLocked = false;

  if (dayLocked) {
    isLocked = true;
  } else if (config.weekendLock && isWeekend()) {
    isLocked = true;
  } else if (!isWithinAnyWindow(config.windows)) {
    isLocked = true;
  }

  // Update badge
  if (isLocked) {
    await chrome.action.setBadgeText({ text: '🔒' });
    await chrome.action.setBadgeBackgroundColor({ color: '#DC2626' });
  } else {
    await chrome.action.setBadgeText({ text: '✓' });
    await chrome.action.setBadgeBackgroundColor({ color: '#16A34A' });
  }

  // Check incognito and set badge warning
  const incognitoAllowed = await checkIncognitoAccess();
  if (!incognitoAllowed) {
    const { incognitoWarningDismissed } = await chrome.storage.sync.get('incognitoWarningDismissed');
    if (!incognitoWarningDismissed) {
      await chrome.action.setTitle({
        text: 'TraderLock — ⚠️ Enable "Allow in Incognito" for full protection!'
      });
    }
  }

  // Scan existing tabs and redirect blocked ones
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!tab.url) continue;
    let hostname;
    try {
      hostname = new URL(tab.url).hostname;
    } catch {
      continue;
    }
    const blocked = await shouldBlockDomain(hostname);
    if (blocked) {
      const blockedUrl = chrome.runtime.getURL('blocked/blocked.html');
      try {
        await chrome.tabs.update(tab.id, { url: blockedUrl, muted: true });
      } catch {
        // Tab may have been closed
      }
    }
  }
}

async function incrementDailyTrade() {
  const data = await chrome.storage.local.get(['dailyTradeCount', 'tradeDate']);
  const today = getToday();

  let count = data.dailyTradeCount || 0;
  if (data.tradeDate !== today) {
    count = 0;
  }

  count++;
  await chrome.storage.local.set({ dailyTradeCount: count, tradeDate: today });

  return { count };
}

async function getFullStatus() {
  const config = await getConfig();
  const localData = await chrome.storage.local.get(['dailyTradeCount', 'tradeDate', 'dayLocked', 'pendingUnlock']);

  const today = getToday();
  let tradeCount = localData.dailyTradeCount || 0;
  if (localData.tradeDate !== today) {
    tradeCount = 0;
    await chrome.storage.local.set({ dailyTradeCount: 0, tradeDate: today, dayLocked: false });
  }

  const dayLocked = (localData.tradeDate === today) ? (localData.dayLocked || false) : false;

  let isLocked = false;
  let lockReason = '';

  if (dayLocked) {
    isLocked = true;
    lockReason = 'Day locked by user (rest of day)';
  } else if (config.weekendLock && isWeekend()) {
    isLocked = true;
    lockReason = 'Weekend lock active';
  } else if (!isWithinAnyWindow(config.windows)) {
    isLocked = true;
    lockReason = 'Outside allowed trading windows';
  }

  // Calculate next window
  const nextWindow = getNextWindow(config.windows);

  return {
    isLocked,
    lockReason,
    tradeCount,
    maxTrades: config.maxDailyTrades,
    dayLocked,
    strictMode: config.strictMode,
    nextWindow,
    pendingUnlock: localData.pendingUnlock,
    isMarketHours: isMarketHours(),
    isWeekend: isWeekend(),
    weekendLock: config.weekendLock
  };
}

function getNextWindow(windows) {
  const currentMin = getCurrentMinutes();
  const enabledWindows = windows.filter(w => w.enabled).sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

  // Currently inside a window — find end of current window
  for (const w of enabledWindows) {
    const start = timeToMinutes(w.start);
    const end = timeToMinutes(w.end);
    if (currentMin >= start && currentMin < end) {
      return { label: w.label + ' (ends)', time: w.end, minutesRemaining: end - currentMin, type: 'current_end' };
    }
  }

  // Find next upcoming window today
  for (const w of enabledWindows) {
    const start = timeToMinutes(w.start);
    if (start > currentMin) {
      return { label: w.label, time: w.start, minutesRemaining: start - currentMin, type: 'next_start' };
    }
  }

  // All windows passed — next is tomorrow's first window
  if (enabledWindows.length > 0) {
    const first = enabledWindows[0];
    const firstStart = timeToMinutes(first.start);
    const minutesUntilMidnight = 1440 - currentMin;
    return {
      label: first.label + ' (tomorrow)',
      time: first.start,
      minutesRemaining: minutesUntilMidnight + firstStart,
      type: 'next_day'
    };
  }

  return null;
}

// ── Strict Mode & Cooldown ─────────────────────────────────────

async function requestStrictModeUnlock(pledge) {
  const config = await getConfig();
  const REQUIRED_PLEDGE = 'I acknowledge that breaking my trading schedule causes overtrading and account blowouts. I am stepping away from my desk.';

  if (!config.strictMode) {
    return { error: 'Strict mode is not enabled' };
  }

  // During market hours, enforce friction
  if (isMarketHours() && !isWeekend()) {
    // Verify pledge
    if (pledge !== REQUIRED_PLEDGE) {
      return { error: 'Pledge text does not match. You must type the exact phrase.', required: REQUIRED_PLEDGE };
    }

    // Set cooldown timer
    const cooldownMinutes = config.strictModeCooldownMinutes || 15;
    const expiresAt = Date.now() + (cooldownMinutes * 60 * 1000);

    await chrome.storage.local.set({
      pendingUnlock: {
        requestedAt: Date.now(),
        expiresAt,
        cooldownMinutes
      }
    });

    await chrome.alarms.create('traderlock-cooldown-expire', {
      delayInMinutes: cooldownMinutes
    });

    return {
      pending: true,
      expiresAt,
      cooldownMinutes
    };
  }

  // Outside market hours — no friction needed
  return { allowed: true };
}

async function processCooldownExpiry() {
  const { pendingUnlock } = await chrome.storage.local.get('pendingUnlock');
  if (!pendingUnlock) return;

  if (Date.now() >= pendingUnlock.expiresAt) {
    // Unlock: temporarily disable strict mode blocking for 30 minutes
    await chrome.storage.local.set({
      pendingUnlock: null,
      tempUnlockUntil: Date.now() + (30 * 60 * 1000)
    });
  }
}

async function checkCooldownStatus() {
  const { pendingUnlock } = await chrome.storage.local.get('pendingUnlock');
  if (!pendingUnlock) return { active: false };

  const remaining = pendingUnlock.expiresAt - Date.now();
  if (remaining <= 0) {
    await chrome.storage.local.set({ pendingUnlock: null });
    return { active: false, expired: true };
  }

  return {
    active: true,
    remainingMs: remaining,
    expiresAt: pendingUnlock.expiresAt
  };
}

// ── Incognito Detection ────────────────────────────────────────

async function checkIncognitoAccess() {
  return new Promise((resolve) => {
    chrome.extension.isAllowedIncognitoAccess((allowed) => {
      resolve(allowed);
    });
  });
}

// ── Startup ────────────────────────────────────────────────────
// On service worker startup, ensure alarm exists and run check
chrome.alarms.get('traderlock-check', async (alarm) => {
  if (!alarm) {
    await chrome.alarms.create('traderlock-check', { periodInMinutes: 0.5 });
  }
  await updateBlockingState();
});
