/* ============================================================
   TraderLock — Popup Logic
   Status display, trade counter, lock-rest-of-day
   ============================================================ */

(async function () {
  'use strict';

  // ── DOM Elements ───────────────────────────────────────────
  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const statusCard = document.getElementById('statusCard');
  const statusIcon = document.getElementById('statusIcon');
  const lockSvg = document.getElementById('lockSvg');
  const unlockSvg = document.getElementById('unlockSvg');
  const statusReason = document.getElementById('statusReason');
  const nextWindowEl = document.getElementById('nextWindow');
  const nextWindowValue = document.getElementById('nextWindowValue');
  const tradeCount = document.getElementById('tradeCount');
  const addTradeBtn = document.getElementById('addTradeBtn');
  const lockDayBtn = document.getElementById('lockDayBtn');
  const resetBtn = document.getElementById('resetBtn');
  const optionsLink = document.getElementById('optionsLink');
  const incognitoWarning = document.getElementById('incognitoWarning');

  // ── Options link ───────────────────────────────────────────
  optionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // ── Load Status ────────────────────────────────────────────
  async function loadStatus() {
    try {
      const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
      updateUI(status);
    } catch (err) {
      statusReason.textContent = 'Error loading status';
    }
  }

  function updateUI(status) {
    // Status badge
    statusBadge.className = 'status-badge ' + (status.isLocked ? 'locked' : 'open');
    statusText.textContent = status.isLocked ? 'LOCKED' : 'OPEN';

    // Status card
    statusCard.className = 'status-card ' + (status.isLocked ? 'locked' : 'open');

    // Icons
    if (status.isLocked) {
      lockSvg.style.display = '';
      unlockSvg.style.display = 'none';
    } else {
      lockSvg.style.display = 'none';
      unlockSvg.style.display = '';
    }

    // Reason
    statusReason.textContent = status.isLocked
      ? status.lockReason
      : 'Trading window is open. Trade with discipline.';

    // Next window
    if (status.nextWindow) {
      nextWindowEl.style.display = '';
      if (status.nextWindow.type === 'current_end') {
        nextWindowValue.textContent = `Ends at ${status.nextWindow.time}`;
      } else {
        const h = Math.floor(status.nextWindow.minutesRemaining / 60);
        const m = status.nextWindow.minutesRemaining % 60;
        nextWindowValue.textContent = `${status.nextWindow.time} (${h}h ${m}m)`;
      }
    } else {
      nextWindowEl.style.display = 'none';
    }

    // Trade counter
    const count = status.tradeCount || 0;
    const max = status.maxTrades || 3;
    tradeCount.textContent = `${count} / ${max}`;
    updatePips(count, max);

    // Lock day button
    if (status.dayLocked) {
      lockDayBtn.disabled = true;
      lockDayBtn.textContent = '✓ Day Locked';
    }

    // Disable add trade if day is locked
    if (status.dayLocked) {
      addTradeBtn.disabled = true;
    }
  }

  function updatePips(count, max) {
    // Clear existing pips
    const pipsContainer = document.querySelector('.trade-pips');
    pipsContainer.innerHTML = '';

    for (let i = 0; i < max; i++) {
      const pip = document.createElement('div');
      pip.className = 'trade-pip';
      if (i < count) {
        if (count >= max) {
          pip.classList.add('danger');
        } else if (count >= max - 1) {
          pip.classList.add('warning');
        } else {
          pip.classList.add('filled');
        }
      }
      pipsContainer.appendChild(pip);
    }
  }

  // ── Add Trade ──────────────────────────────────────────────
  addTradeBtn.addEventListener('click', async () => {
    const result = await chrome.runtime.sendMessage({ type: 'INCREMENT_TRADE' });
    await loadStatus();

    // Brief flash feedback
    addTradeBtn.style.borderColor = 'rgba(34, 197, 94, 0.5)';
    addTradeBtn.style.color = '#22c55e';
    setTimeout(() => {
      addTradeBtn.style.borderColor = '';
      addTradeBtn.style.color = '';
    }, 500);
  });

  // ── Lock Rest of Day ───────────────────────────────────────
  lockDayBtn.addEventListener('click', async () => {
    const confirmed = confirm(
      '🔒 Lock all broker access for the rest of today?\n\nThis will block all broker websites until 9:00 AM tomorrow.\n\nThis cannot be easily undone (Strict Mode applies).'
    );
    if (!confirmed) return;

    await chrome.runtime.sendMessage({ type: 'LOCK_REST_OF_DAY' });
    await loadStatus();
  });

  // ── Reset Trades ───────────────────────────────────────────
  resetBtn.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'RESET_TRADES' });
    await loadStatus();
  });

  // ── Check Incognito ────────────────────────────────────────
  async function checkIncognito() {
    try {
      const result = await chrome.runtime.sendMessage({ type: 'CHECK_INCOGNITO' });
      if (!result.incognitoAllowed) {
        incognitoWarning.style.display = 'flex';
      }
    } catch {
      // Ignore
    }
  }

  // ── Init ───────────────────────────────────────────────────
  await loadStatus();
  await checkIncognito();

  // Refresh every 30 seconds while popup is open
  setInterval(loadStatus, 30000);
})();
