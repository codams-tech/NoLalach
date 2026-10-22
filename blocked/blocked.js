/* ============================================================
   TraderLock — Blocked Page Logic
   Countdown timer, rotating quotes, close-tab button
   ============================================================ */

(async function () {
  'use strict';

  // Set page title
  document.title = '🔒 TRADING LOCKED';

  // ── Load quotes ────────────────────────────────────────────
  let quotes = [];
  try {
    const resp = await fetch(chrome.runtime.getURL('assets/quotes.json'));
    quotes = await resp.json();
  } catch {
    quotes = [
      { text: 'Discipline is the bridge between trading goals and trading results.', source: 'Trading Wisdom' }
    ];
  }

  // ── Get status from background ─────────────────────────────
  let status = {};
  try {
    status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
  } catch {
    status = { isLocked: true, lockReason: 'Extension loading…', nextWindow: null };
  }

  // Display lock reason
  const lockReasonEl = document.getElementById('lockReason');
  if (lockReasonEl && status.lockReason) {
    lockReasonEl.textContent = status.lockReason;
  }

  // Display next window name
  const windowNameEl = document.getElementById('windowName');
  if (windowNameEl && status.nextWindow) {
    if (status.nextWindow.type === 'current_end') {
      windowNameEl.textContent = `${status.nextWindow.label} — Session ends at ${status.nextWindow.time}`;
    } else {
      windowNameEl.textContent = `→ ${status.nextWindow.label} at ${status.nextWindow.time}`;
    }
  }

  // ── Countdown Timer ────────────────────────────────────────
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');

  function updateCountdown() {
    if (!status.nextWindow) {
      hoursEl.textContent = '--';
      minutesEl.textContent = '--';
      secondsEl.textContent = '--';
      return;
    }

    // Calculate target time
    const now = new Date();
    const [targetH, targetM] = status.nextWindow.time.split(':').map(Number);
    let target = new Date();
    target.setHours(targetH, targetM, 0, 0);

    // If target is in the past (next day), add 24 hours
    if (status.nextWindow.type === 'next_day' || target <= now) {
      if (status.nextWindow.type === 'next_day') {
        target.setDate(target.getDate() + 1);
      }
    }

    const diff = target - now;
    if (diff <= 0) {
      hoursEl.textContent = '00';
      minutesEl.textContent = '00';
      secondsEl.textContent = '00';
      // Reload the page — status may have changed
      setTimeout(() => location.reload(), 2000);
      return;
    }

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    hoursEl.textContent = String(h).padStart(2, '0');
    minutesEl.textContent = String(m).padStart(2, '0');
    secondsEl.textContent = String(s).padStart(2, '0');
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  // ── Quote Carousel ─────────────────────────────────────────
  const quoteTextEl = document.getElementById('quoteText');
  const quoteSourceEl = document.getElementById('quoteSource');
  const quoteDotsEl = document.getElementById('quoteDots');

  let currentQuoteIndex = 0;

  // Shuffle quotes for variety
  const shuffled = [...quotes].sort(() => Math.random() - 0.5);

  // Create dots
  shuffled.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'quote-dot' + (i === 0 ? ' active' : '');
    quoteDotsEl.appendChild(dot);
  });

  function showQuote(index) {
    if (shuffled.length === 0) return;
    const q = shuffled[index % shuffled.length];

    // Fade out
    quoteTextEl.style.opacity = '0';
    quoteSourceEl.style.opacity = '0';

    setTimeout(() => {
      quoteTextEl.textContent = `"${q.text}"`;
      quoteSourceEl.textContent = `— ${q.source}`;
      quoteTextEl.style.opacity = '1';
      quoteSourceEl.style.opacity = '1';

      // Update dots
      const dots = quoteDotsEl.querySelectorAll('.quote-dot');
      dots.forEach((d, i) => d.classList.toggle('active', i === index % shuffled.length));
    }, 400);
  }

  showQuote(0);
  setInterval(() => {
    currentQuoteIndex++;
    showQuote(currentQuoteIndex);
  }, 8000);

  // ── Floating Particles ─────────────────────────────────────
  const particlesContainer = document.getElementById('particles');
  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 6 + 's';
    particle.style.animationDuration = (4 + Math.random() * 4) + 's';
    particle.style.width = (1 + Math.random() * 3) + 'px';
    particle.style.height = particle.style.width;
    particlesContainer.appendChild(particle);
  }

  // ── Close Tab Button ───────────────────────────────────────
  document.getElementById('closeBtn').addEventListener('click', () => {
    window.close();
    // Fallback if window.close doesn't work (some contexts)
    setTimeout(() => {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0f;color:#8a8a9a;font-family:Inter,sans-serif;"><p>You can close this tab manually.</p></div>';
    }, 500);
  });

  // ── Periodically re-check if we should still be blocked ────
  setInterval(async () => {
    try {
      const newStatus = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
      if (!newStatus.isLocked) {
        // Trading window opened! Auto-redirect would be annoying, just show a message
        document.querySelector('.title').textContent = 'TRADING WINDOW OPEN';
        document.querySelector('.title').style.color = '#10b981';
        document.querySelector('.lock-icon').style.borderColor = 'rgba(16, 185, 129, 0.3)';
        document.querySelector('.lock-icon svg').style.color = '#10b981';
        lockReasonEl.textContent = 'Your trading window is now open. You may navigate to your broker.';
      }
    } catch {
      // Extension context invalidated — do nothing
    }
  }, 30000);
})();
