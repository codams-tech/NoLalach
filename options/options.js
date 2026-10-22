/* ============================================================
   TraderLock — Options Page Logic
   Config editor with strict mode friction barrier
   ============================================================ */

(async function () {
  'use strict';

  // ── DOM Elements ───────────────────────────────────────────
  const saveBtn = document.getElementById('saveBtn');
  const windowsList = document.getElementById('windowsList');
  const addWindowBtn = document.getElementById('addWindowBtn');
  const brokersList = document.getElementById('brokersList');
  const customDomainsList = document.getElementById('customDomainsList');
  const customDomainInput = document.getElementById('customDomainInput');
  const addDomainBtn = document.getElementById('addDomainBtn');
  const strictModeToggle = document.getElementById('strictModeToggle');
  const cooldownMinutes = document.getElementById('cooldownMinutes');
  const cooldownField = document.getElementById('cooldownField');
  const weekendLockToggle = document.getElementById('weekendLockToggle');
  const preLockWarningToggle = document.getElementById('preLockWarningToggle');
  const preLockMinutesInput = document.getElementById('preLockMinutesInput');
  const incognitoStatus = document.getElementById('incognitoStatus');
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toastText');

  const PRESETS = {
    fo: [
      { id: 'w1', label: 'Opening Momentum', start: '09:15', end: '10:30', enabled: true },
      { id: 'w2', label: 'Afternoon Reversal', start: '13:15', end: '15:00', enabled: true }
    ],
    fullday: [
      { id: 'w1', label: 'NSE Continuous Session', start: '09:15', end: '15:30', enabled: true }
    ],
    morning: [
      { id: 'w1', label: 'Morning High Momentum', start: '09:15', end: '11:30', enabled: true }
    ],
    afternoon: [
      { id: 'w1', label: 'Afternoon European Overlap', start: '13:15', end: '15:15', enabled: true }
    ],
    us: [
      { id: 'w1', label: 'US Market Regular Hours (IST)', start: '19:00', end: '01:30', enabled: true }
    ]
  };

  let config = null;

  // ── Load Config ────────────────────────────────────────────
  async function loadConfig() {
    try {
      const result = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
      config = result.config;
      renderAll();
      bindPresets();
    } catch (err) {
      showToast('Error loading configuration', true);
    }
  }

  function bindPresets() {
    document.querySelectorAll('.preset-chip').forEach(btn => {
      btn.onclick = () => {
        const pKey = btn.dataset.preset;
        if (PRESETS[pKey]) {
          config.windows = JSON.parse(JSON.stringify(PRESETS[pKey]));
          renderWindows();
          showToast(`Preset loaded: ${btn.textContent.trim()}`);
        }
      };
    });
  }

  function renderAll() {
    renderWindows();
    renderBrokers();
    renderCustomDomains();
    strictModeToggle.checked = config.strictMode;
    cooldownMinutes.value = config.strictModeCooldownMinutes || 15;
    weekendLockToggle.checked = config.weekendLock;
    maxDailyTrades.value = config.maxDailyTrades || 3;
    if (preLockWarningToggle) preLockWarningToggle.checked = config.preLockWarning !== false;
    if (preLockMinutesInput) preLockMinutesInput.value = config.preLockMinutes || 5;
    updateCooldownVisibility();
  }

  // ── Windows ────────────────────────────────────────────────
  function renderWindows() {
    windowsList.innerHTML = '';
    config.windows.forEach((w, index) => {
      const item = document.createElement('div');
      item.className = 'window-item';
      item.innerHTML = `
        <label class="switch">
          <input type="checkbox" data-window-index="${index}" class="window-toggle" ${w.enabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
        <div class="window-fields">
          <input type="text" class="window-label-input" data-window-index="${index}" data-field="label" value="${escapeHtml(w.label)}" placeholder="Window name">
          <input type="time" class="window-time" data-window-index="${index}" data-field="start" value="${w.start}">
          <span class="window-separator">to</span>
          <input type="time" class="window-time" data-window-index="${index}" data-field="end" value="${w.end}">
        </div>
        <button class="window-remove" data-window-index="${index}" title="Remove window">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;
      windowsList.appendChild(item);
    });

    // Bind events
    windowsList.querySelectorAll('.window-toggle').forEach(el => {
      el.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.windowIndex);
        config.windows[idx].enabled = e.target.checked;
      });
    });

    windowsList.querySelectorAll('.window-label-input').forEach(el => {
      el.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.windowIndex);
        config.windows[idx].label = e.target.value;
      });
    });

    windowsList.querySelectorAll('.window-time').forEach(el => {
      el.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.windowIndex);
        const field = e.target.dataset.field;
        config.windows[idx][field] = e.target.value;
      });
    });

    windowsList.querySelectorAll('.window-remove').forEach(el => {
      el.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.windowIndex);
        config.windows.splice(idx, 1);
        renderWindows();
      });
    });
  }

  addWindowBtn.addEventListener('click', () => {
    config.windows.push({
      id: 'w' + Date.now(),
      label: 'Custom Window',
      start: '09:00',
      end: '10:00',
      enabled: true
    });
    renderWindows();
  });

  // ── Brokers ────────────────────────────────────────────────
  function renderBrokers() {
    brokersList.innerHTML = '';
    config.brokers.forEach((broker, index) => {
      const item = document.createElement('div');
      item.className = 'broker-item';
      item.innerHTML = `
        <div class="broker-info">
          <span class="broker-name">${escapeHtml(broker.label)}</span>
          <span class="broker-domain">${escapeHtml(broker.domain)}</span>
        </div>
        <label class="switch">
          <input type="checkbox" data-broker-index="${index}" class="broker-toggle" ${broker.enabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      `;
      brokersList.appendChild(item);
    });

    brokersList.querySelectorAll('.broker-toggle').forEach(el => {
      el.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.brokerIndex);
        config.brokers[idx].enabled = e.target.checked;
      });
    });
  }

  // ── Custom Domains ─────────────────────────────────────────
  function renderCustomDomains() {
    customDomainsList.innerHTML = '';
    if (!config.customDomains) config.customDomains = [];

    config.customDomains.forEach((cd, index) => {
      const item = document.createElement('div');
      item.className = 'custom-domain-item';
      item.innerHTML = `
        <div class="broker-info">
          <span class="broker-domain">${escapeHtml(cd.domain)}</span>
        </div>
        <div class="custom-domain-actions">
          <label class="switch">
            <input type="checkbox" data-custom-index="${index}" class="custom-toggle" ${cd.enabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
          <button class="custom-remove" data-custom-index="${index}" title="Remove">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;
      customDomainsList.appendChild(item);
    });

    customDomainsList.querySelectorAll('.custom-toggle').forEach(el => {
      el.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.customIndex);
        config.customDomains[idx].enabled = e.target.checked;
      });
    });

    customDomainsList.querySelectorAll('.custom-remove').forEach(el => {
      el.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.customIndex);
        config.customDomains.splice(idx, 1);
        renderCustomDomains();
      });
    });
  }

  addDomainBtn.addEventListener('click', () => {
    const domain = customDomainInput.value.trim().toLowerCase();
    if (!domain) return;

    // Basic validation
    if (!domain.includes('.')) {
      showToast('Please enter a valid domain (e.g. broker.example.com)', true);
      return;
    }

    // Remove protocol if pasted
    const cleaned = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    if (!config.customDomains) config.customDomains = [];
    config.customDomains.push({ domain: cleaned, enabled: true });
    customDomainInput.value = '';
    renderCustomDomains();
  });

  customDomainInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addDomainBtn.click();
  });

  // ── Strict Mode Toggle ────────────────────────────────────
  strictModeToggle.addEventListener('change', () => {
    config.strictMode = strictModeToggle.checked;
    updateCooldownVisibility();
  });

  function updateCooldownVisibility() {
    cooldownField.style.display = config.strictMode ? 'flex' : 'none';
  }

  // ── Save ───────────────────────────────────────────────────
  saveBtn.addEventListener('click', async () => {
    // Gather values
    config.strictMode = strictModeToggle.checked;
    config.strictModeCooldownMinutes = parseInt(cooldownMinutes.value) || 15;
    config.weekendLock = weekendLockToggle.checked;
    config.maxDailyTrades = parseInt(maxDailyTrades.value) || 3;
    config.preLockWarning = preLockWarningToggle.checked;
    config.preLockMinutes = parseInt(preLockMinutesInput.value) || 5;

    try {
      await chrome.runtime.sendMessage({ type: 'SAVE_CONFIG', config });
      showToast('Working hours & settings saved!');
    } catch (err) {
      showToast('Error saving configuration', true);
    }
  });

  // ── Incognito Check ────────────────────────────────────────
  async function checkIncognito() {
    try {
      const result = await chrome.runtime.sendMessage({ type: 'CHECK_INCOGNITO' });
      const badge = incognitoStatus.querySelector('.incognito-badge');
      if (result.incognitoAllowed) {
        badge.className = 'incognito-badge enabled';
        badge.textContent = '✓ Incognito Access Enabled';
      } else {
        badge.className = 'incognito-badge disabled';
        badge.textContent = '✗ Incognito Access NOT Enabled — Loophole Open!';
      }
    } catch {
      // Ignore
    }
  }

  // ── Toast ──────────────────────────────────────────────────
  function showToast(message, isError = false) {
    toastText.textContent = message;
    toast.style.borderColor = isError ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)';
    toast.style.color = isError ? '#ef4444' : '#22c55e';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  // ── Utility ────────────────────────────────────────────────
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Init ───────────────────────────────────────────────────
  await loadConfig();
  await checkIncognito();
})();
