(function () {
  const ns = 'http://www.w3.org/2000/svg';
  const emojiRE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
  const emojiCleanupRE = /[\u200D\uFE0F]/g;
  const iconMap = new Map([
    ['📊', 'bar-chart-3'], ['📈', 'line-chart'], ['📋', 'clipboard-list'], ['🧠', 'brain'],
    ['💬', 'message-circle'], ['💊', 'pill'], ['🔗', 'link'], ['⚙️', 'settings'],
    ['⚙', 'settings'], ['☰', 'menu'], ['🔔', 'bell'], ['🚨', 'siren'], ['⚠️', 'triangle-alert'],
    ['⚠', 'triangle-alert'], ['✅', 'check-circle'], ['✓', 'check'], ['✔', 'check'],
    ['⏳', 'hourglass'], ['⏱', 'clock'], ['📤', 'upload'], ['🔬', 'microscope'],
    ['🤖', 'bot'], ['🗑️', 'trash-2'], ['🗑', 'trash-2'], ['🏠', 'home'], ['📷', 'camera'],
    ['🏥', 'hospital'], ['💧', 'droplets'], ['🎤', 'mic'], ['⏹', 'square'],
    ['🩺', 'stethoscope'], ['👁', 'eye'], ['🦷', 'tooth'], ['🌐', 'globe-2'],
    ['📡', 'wifi'], ['✕', 'x'], ['❌', 'circle-x'], ['🟢', 'circle'], ['🔴', 'circle'],
    ['🟠', 'circle'], ['🟡', 'circle'], ['⚪', 'circle'], ['➤', 'send'],
    ['👨‍⚕️', 'user-round-check'], ['👨', 'user'], ['👩', 'user'], ['👤', 'user'],
    ['👋', 'hand'], ['🙏', 'heart-handshake'], ['📅', 'calendar-days'], ['📚', 'book-open'],
    ['⚡', 'zap'], ['🔌', 'plug'], ['📍', 'map-pin'], ['🔍', 'search']
  ]);

  const paths = {
    'activity': '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    'bar-chart-3': '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    'line-chart': '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
    'clipboard-list': '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M8 11h8"/><path d="M8 16h6"/>',
    'brain': '<path d="M9.5 2A2.5 2.5 0 0 0 7 4.5v.2A3.5 3.5 0 0 0 4.5 10H4a3 3 0 0 0 0 6h.5A3.5 3.5 0 0 0 8 20.5V22"/><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v.2A3.5 3.5 0 0 1 19.5 10h.5a3 3 0 0 1 0 6h-.5A3.5 3.5 0 0 1 16 20.5V22"/><path d="M12 2v20"/><path d="M7 7.5A3 3 0 0 1 10 10"/><path d="M17 7.5A3 3 0 0 0 14 10"/>',
    'message-circle': '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 17 0Z"/>',
    'pill': '<path d="m10.5 20.5 10-10a4.95 4.95 0 0 0-7-7l-10 10a4.95 4.95 0 0 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
    'link': '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1"/>',
    'settings': '<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7.1 4l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 .9-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.9 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5.9h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
    'menu': '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
    'bell': '<path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/><path d="M18 8A6 6 0 0 0 6 8c0 7-3 7-3 9h18c0-2-3-2-3-9"/>',
    'siren': '<path d="M7 18v-6a5 5 0 0 1 10 0v6"/><path d="M5 21h14"/><path d="M12 7v4"/><path d="M4 8 2 6"/><path d="m20 8 2-2"/>',
    'triangle-alert': '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    'check-circle': '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="m9 11 3 3L22 4"/>',
    'check': '<path d="m20 6-11 11-5-5"/>',
    'hourglass': '<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.2a4 4 0 0 0-1.2-2.8L12 12l-3.8 3a4 4 0 0 0-1.2 2.8V22"/><path d="M7 2v4.2A4 4 0 0 0 8.2 9L12 12l3.8-3A4 4 0 0 0 17 6.2V2"/>',
    'clock': '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    'upload': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    'microscope': '<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 0 0 7-7"/><path d="M5 7 3 5l2-2 2 2"/><path d="m8 6 8 8"/><path d="m12 10 4-4 3 3-4 4"/>',
    'bot': '<path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M9 13h.01"/><path d="M15 13h.01"/><path d="M10 17h4"/>',
    'trash-2': '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    'home': '<path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10"/><path d="M9 21v-6h6v6"/>',
    'camera': '<path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3h5Z"/><circle cx="12" cy="13" r="3"/>',
    'hospital': '<path d="M12 6v4"/><path d="M10 8h4"/><path d="M4 22V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v18"/><path d="M9 22v-6h6v6"/><path d="M8 12h.01"/><path d="M16 12h.01"/>',
    'droplets': '<path d="M7 16.3C7 13 12 8 12 8s5 5 5 8.3a5 5 0 0 1-10 0Z"/><path d="M5 14c-1.7-2.5 1-6 1-6s2 2 2.5 4"/>',
    'mic': '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
    'square': '<rect x="6" y="6" width="12" height="12" rx="1"/>',
    'stethoscope': '<path d="M6 4v6a4 4 0 0 0 8 0V4"/><path d="M10 14v2a4 4 0 0 0 8 0v-2"/><circle cx="18" cy="10" r="2"/>',
    'eye': '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    'tooth': '<path d="M12 3c-2.5 0-3 1-5 1S3 5.5 3 9c0 4 2 5 2 9 0 2 1 3 2 3 2 0 2-6 5-6s3 6 5 6c1 0 2-1 2-3 0-4 2-5 2-9 0-3.5-2-5-4-5s-2.5-1-5-1Z"/>',
    'globe-2': '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20"/><path d="M12 2a15 15 0 0 0 0 20"/>',
    'wifi': '<path d="M5 13a10 10 0 0 1 14 0"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M12 20h.01"/>',
    'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    'circle-x': '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    'circle': '<circle cx="12" cy="12" r="9" fill="currentColor" stroke="none"/>',
    'send': '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    'user-round-check': '<path d="M2 21a8 8 0 0 1 13.3-6"/><circle cx="10" cy="8" r="5"/><path d="m16 19 2 2 4-4"/>',
    'user': '<path d="M19 21a7 7 0 0 0-14 0"/><circle cx="12" cy="7" r="4"/>',
    'hand': '<path d="M18 11V7a2 2 0 0 0-4 0v4"/><path d="M14 10V5a2 2 0 0 0-4 0v8"/><path d="M10 12V7a2 2 0 0 0-4 0v7a6 6 0 0 0 12 0v-3a2 2 0 0 0-4 0"/>',
    'heart-handshake': '<path d="M19 14c1.5-1.5 3-3.5 3-6a4 4 0 0 0-7-2.6L12 8.5 9 5.4A4 4 0 0 0 2 8c0 2.5 1.5 4.5 3 6l7 7Z"/><path d="m12 8.5 2.5 2.5a2 2 0 0 0 2.8 0"/>',
    'calendar-days': '<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/>',
    'book-open': '<path d="M2 4h7a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2Z"/><path d="M22 4h-7a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h8Z"/>',
    'zap': '<path d="M13 2 3 14h8l-1 8 10-12h-8Z"/>',
    'plug': '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v3a6 6 0 0 1-12 0V8Z"/>',
    'map-pin': '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    'phone': '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.4 2.1L8.1 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.6 1.9Z"/>',
    'lock': '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'
  };

  const aliases = {
    'alert-circle': 'triangle-alert',
    'alert-triangle': 'triangle-alert',
    'bar-chart-2': 'bar-chart-3',
    'cross': 'activity',
    'file-text': 'clipboard-list',
    'list-todo': 'clipboard-list',
    'log-out': 'x',
    'mail': 'message-circle',
    'message-square': 'message-circle',
    'power': 'activity',
    'power-off': 'activity',
    'refresh-cw': 'activity',
    'smartphone': 'phone',
    'syringe': 'stethoscope',
    'video': 'camera',
    'video-off': 'camera',
    'mic-off': 'mic',
    'edit-3': 'clipboard-list',
    'construction': 'triangle-alert'
  };

  function iconNameFor(token) {
    return iconMap.get(token) || 'activity';
  }

  function createIcon(name) {
    name = aliases[name] || name;
    const span = document.createElement('span');
    span.className = 'am-svg-icon';
    span.setAttribute('aria-hidden', 'true');
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.innerHTML = paths[name] || paths.activity;
    span.appendChild(svg);
    return span;
  }

  function replaceEmojiInElement(el) {
    if (!el || el.dataset?.amIconized === '1' || el.closest?.('.am-svg-icon')) return;
    if (el.children.length > 0) return;
    const raw = el.textContent || '';
    const trimmed = raw.trim();
    emojiRE.lastIndex = 0;
    if (!emojiRE.test(trimmed)) return;
    emojiRE.lastIndex = 0;
    const tokens = [...trimmed.matchAll(emojiRE)].map(m => m[0]);
    if (!tokens.length) return;
    const first = tokens[0];
    const icon = createIcon(iconNameFor(first));
    const cleaned = trimmed.replace(emojiRE, '').replace(emojiCleanupRE, '').replace(/\s{2,}/g, ' ').trim();
    el.textContent = '';
    el.appendChild(icon);
    if (cleaned) el.appendChild(document.createTextNode(' ' + cleaned));
    el.dataset.amIconized = '1';
  }

  function cleanTextNode(node) {
    emojiRE.lastIndex = 0;
    if (!node.nodeValue || !emojiRE.test(node.nodeValue)) return;
    emojiRE.lastIndex = 0;
    node.nodeValue = node.nodeValue.replace(emojiRE, '').replace(emojiCleanupRE, '').replace(/\s{2,}/g, ' ');
  }

  function transform(root) {
    if (!root || root.nodeType !== 1) return;
    root.querySelectorAll('span,button,div,h1,h2,h3,h4,p,label,option,strong').forEach(replaceEmojiInElement);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.parentElement?.closest('.am-svg-icon,svg,script,style')) return NodeFilter.FILTER_REJECT;
        emojiRE.lastIndex = 0;
        return emojiRE.test(node.nodeValue || '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(cleanTextNode);
  }

  function start() {
    transform(document.body);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        record.addedNodes.forEach(node => {
          if (node.nodeType === 1) transform(node);
          if (node.nodeType === 3) cleanTextNode(node);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.ArogyaIcons = { createIcon, transform };
  if (!window.lucide) {
    window.lucide = {
      createIcons() {
        document.querySelectorAll('i[data-lucide]').forEach(el => {
          const icon = createIcon(el.getAttribute('data-lucide') || 'activity');
          icon.classList.add('am-inline-icon');
          if (el.getAttribute('style')) icon.setAttribute('style', el.getAttribute('style'));
          el.replaceWith(icon);
        });
      }
    };
  }
})();
