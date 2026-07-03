// ============================================================
// ArogyaMitra Hospital Panel — Notification System
// notifications.js — Toast, audio alerts, browser notifs
// ============================================================

const Notifications = (() => {
  let container;

  function init() {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.id = 'toastContainer';
    document.body.appendChild(container);
  }

  function show(type, title, message, duration = 4000) {
    if (!container) init();

    const icons = {
      success: '✅', error: '🚨', warning: '⚠️', info: 'ℹ️', 'red-alert': '🔴'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close" onclick="this.closest('.toast').remove()">×</button>
    `;

    container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }

    return toast;
  }

  function success(title, message, duration) { return show('success', title, message, duration); }
  function error(title, message, duration)   { return show('error', title, message, duration); }
  function warning(title, message, duration) { return show('warning', title, message, duration); }
  function info(title, message, duration)    { return show('info', title, message, duration); }

  function redAlert(patientName, caseInfo) {
    const toast = show('red-alert', `🔴 NEW RED CASE — ${patientName}`, caseInfo, 0);
    playAlertSound();
    toast.style.cursor = 'pointer';
    toast.onclick = () => {
      toast.remove();
      if (window.CaseQueue) CaseQueue.navigateToQueue();
    };
    return toast;
  }

  function playAlertSound() {
    try {
      // Create audio context for alert beep
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const beep = (freq, start, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + start + 0.01);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur + 0.01);
      };

      beep(880, 0, 0.15);
      beep(1100, 0.2, 0.15);
      beep(880, 0.4, 0.15);
      beep(1100, 0.6, 0.3);
    } catch(e) {
      console.warn('Audio alert failed:', e);
    }
  }

  return { init, show, success, error, warning, info, redAlert, playAlertSound };
})();

// Initialize immediately
document.addEventListener('DOMContentLoaded', () => Notifications.init());
