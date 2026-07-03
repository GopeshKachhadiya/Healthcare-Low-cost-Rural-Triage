// ============================================================
// ArogyaMitra Hospital Panel — Case Queue
// queue.js — Prioritized queue, real-time sim, case cards
// ============================================================

const CaseQueue = (() => {
  let currentFilter = 'all';
  let searchTerm = '';
  let collapsedTiers = new Set();
  let realTimeInterval = null;
  let newCaseCount = 0;
  const auditLog = [];

  function init() {
    renderQueue();
    setupSearch();
    startRealTimeSimulation();
    updateQueueStats();
  }

  function setupSearch() {
    const input = document.getElementById('queueSearch');
    if (!input) return;
    input.addEventListener('input', e => {
      searchTerm = e.target.value.toLowerCase();
      renderQueue();
    });
  }

  function getFilteredCases() {
    const cases = getAllPendingCases();
    if (!searchTerm) return cases;
    return cases.filter(c => {
      const p = getPatient(c.patient_id);
      return p.name.toLowerCase().includes(searchTerm) ||
             c.symptom_summary.toLowerCase().includes(searchTerm) ||
             p.village.toLowerCase().includes(searchTerm);
    });
  }

  function renderQueue() {
    const tiers = ['red', 'orange', 'yellow', 'green'];
    const tierLabels = {
      red: '🔴 RED — Immediate', orange: '🟠 ORANGE — Urgent Same-Day',
      yellow: '🟡 YELLOW — Review 24–48h', green: '🟢 GREEN — Routine'
    };

    const container = document.getElementById('queueContent');
    if (!container) return;

    const cases = getFilteredCases();
    container.innerHTML = '';

    tiers.forEach(tier => {
      const tierCases = cases.filter(c => c.tier === tier);
      const isCollapsed = collapsedTiers.has(tier);

      const section = document.createElement('div');
      section.className = 'tier-section';
      section.id = `tier-section-${tier}`;

      const header = document.createElement('div');
      header.className = `tier-header${isCollapsed ? ' collapsed' : ''}`;
      header.style.color = getTierColor(tier);
      header.innerHTML = `
        <span class="tier-dot ${tier}"></span>
        <span class="tier-header-label">${tierLabels[tier]}</span>
        <span class="tier-header-count">${tierCases.length}</span>
        <span class="tier-header-chevron">▼</span>
      `;
      header.onclick = () => toggleTier(tier, header);
      section.appendChild(header);

      const casesContainer = document.createElement('div');
      casesContainer.className = `tier-cases${isCollapsed ? ' hidden' : ''}`;
      casesContainer.id = `tier-cases-${tier}`;

      if (tierCases.length === 0) {
        casesContainer.innerHTML = `
          <div style="padding: 12px 16px; font-size: 0.8rem; color: var(--text-muted); text-align: center;">
            No ${tier} cases at this time
          </div>`;
      } else {
        tierCases.forEach(c => {
          casesContainer.appendChild(buildCaseCard(c));
        });
      }

      section.appendChild(casesContainer);
      container.appendChild(section);
    });
  }

  function buildCaseCard(caseData) {
    const patient = getPatient(caseData.patient_id);
    const vitals = getVitals(caseData.patient_id);
    const timeAgo = formatTimeAgo(caseData.created_at);
    const hasCV = !!caseData.cv_screening_id;
    const vitalsStatus = vitals ? getVitalsStatus(vitals) : 'normal';

    const card = document.createElement('div');
    card.className = `case-card tier-${caseData.tier}${caseData.aging_alert ? ' aging-alert' : ''}`;
    card.dataset.caseId = caseData.id;

    const genderIcon = `<div style="width:100%;height:100%;border-radius:50%;overflow:hidden;background:#fff;"><img src="https://ui-avatars.com/api/?name=${patient.name}&background=random&color=fff" style="width:100%;height:100%;object-fit:cover;" /></div>`;
    const genderAge = `${patient.gender}/${patient.age}`;

    let vitalsHtml = '';
    if (vitals) {
      const spo2Class = vitals.spo2 < 90 ? 'critical' : vitals.spo2 < 94 ? 'warning' : '';
      const tempClass = vitals.temp > 39 ? 'warning' : '';
      const bpClass = vitals.bp_sys > 160 ? 'warning' : '';

      vitalsHtml = `
        <div class="case-vitals-mini">
          <span class="vital-chip ${spo2Class}"><i data-lucide="wind" style="width:12px;height:12px;margin-right:2px;"></i> SpO₂ ${vitals.spo2}%</span>
          <span class="vital-chip ${tempClass}"><i data-lucide="thermometer" style="width:12px;height:12px;margin-right:2px;"></i> ${vitals.temp}°C</span>
          <span class="vital-chip ${bpClass}"><i data-lucide="heart-pulse" style="width:12px;height:12px;margin-right:2px;"></i> ${vitals.bp_sys}/${vitals.bp_dia}</span>
        </div>`;
    }

    let agingHtml = caseData.aging_alert ? `<span class="aging-badge"><i data-lucide="clock" style="width:12px;height:12px;margin-right:2px;"></i> Aging</span>` : '';

    const sourceBadge = {
      cv_screening: `<span class="case-tag cv-tag"><i data-lucide="microscope" style="width:10px;height:10px;margin-right:2px;"></i> CV Screening</span>`,
      chatbot_flag: `<span class="case-tag"><i data-lucide="message-square-warning" style="width:10px;height:10px;margin-right:2px;"></i> Symptom Flag</span>`,
      manual_request: `<span class="case-tag"><i data-lucide="clipboard" style="width:10px;height:10px;margin-right:2px;"></i> Manual</span>`,
      follow_up_escalation: `<span class="case-tag"><i data-lucide="refresh-cw" style="width:10px;height:10px;margin-right:2px;"></i> Follow-up</span>`,
    }[caseData.source] || '';

    card.innerHTML = `
      <div class="case-avatar tier-${caseData.tier}">${genderIcon}</div>
      <div class="case-main">
        <div class="case-name-row">
          <span class="case-name">${patient.name}</span>
          <span class="case-demo text-muted">${genderAge} · ${patient.village}</span>
          ${agingHtml}
        </div>
        <div class="case-summary">${caseData.symptom_summary}</div>
        <div class="case-tags">
          ${sourceBadge}
          ${hasCV ? `<span class="case-tag cv-tag"><i data-lucide="bar-chart" style="width:10px;height:10px;margin-right:2px;"></i> AI Result</span>` : ''}
          ${patient.allergies.length ? `<span class="case-tag" style="color:var(--tier-red)"><i data-lucide="alert-triangle" style="width:10px;height:10px;margin-right:2px;"></i> Allergies</span>` : ''}
          <span class="case-time"><i data-lucide="timer" style="width:10px;height:10px;margin-right:2px;"></i> ${timeAgo}</span>
        </div>
        ${vitalsHtml}
      </div>
      <div class="case-actions">
        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); App.navigate('case-detail', '${caseData.id}')">
          <i data-lucide="file-search" style="width:14px;height:14px;"></i> Review Case
        </button>
        <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); App.navigate('teleconsult', '${caseData.patient_id}')">
          <i data-lucide="message-circle" style="width:14px;height:14px;"></i> Consult
        </button>
        <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); showReferralQuick('${caseData.id}')">
          <i data-lucide="hospital" style="width:14px;height:14px;"></i> Refer
        </button>
      </div>
    `;

    card.addEventListener('click', () => App.navigate('case-detail', caseData.id));

    return card;
  }

  function toggleTier(tier, header) {
    const casesEl = document.getElementById(`tier-cases-${tier}`);
    if (!casesEl) return;
    if (collapsedTiers.has(tier)) {
      collapsedTiers.delete(tier);
      casesEl.classList.remove('hidden');
      header.classList.remove('collapsed');
    } else {
      collapsedTiers.add(tier);
      casesEl.classList.add('hidden');
      header.classList.add('collapsed');
    }
  }

  function updateQueueStats() {
    const cases = getAllPendingCases();
    const counts = { red: 0, orange: 0, yellow: 0, green: 0 };
    cases.forEach(c => { if (counts[c.tier] !== undefined) counts[c.tier]++; });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    document.getElementById('statRed')?.querySelector('.queue-stat-count') &&
      (document.getElementById('statRed').querySelector('.queue-stat-count').textContent = counts.red);
    document.getElementById('statOrange')?.querySelector('.queue-stat-count') &&
      (document.getElementById('statOrange').querySelector('.queue-stat-count').textContent = counts.orange);
    document.getElementById('statYellow')?.querySelector('.queue-stat-count') &&
      (document.getElementById('statYellow').querySelector('.queue-stat-count').textContent = counts.yellow);
    document.getElementById('statGreen')?.querySelector('.queue-stat-count') &&
      (document.getElementById('statGreen').querySelector('.queue-stat-count').textContent = counts.green);

    // Update sidebar badge
    const badge = document.querySelector('.nav-item[data-section="queue"] .nav-badge');
    if (badge) {
      badge.textContent = counts.red > 0 ? counts.red : '';
      badge.style.display = counts.red > 0 ? 'block' : 'none';
    }

    // Update topbar mini stats
    const miniRed = document.getElementById('topbarRed');
    if (miniRed) miniRed.textContent = counts.red;
  }

  function startRealTimeSimulation() {
    // Simulate new cases arriving
    const newPatients = [
      { name: 'Suresh Patel', gender: 'M', age: 67, tier: 'red', symptom: 'Sudden onset weakness right side + slurred speech. Possible stroke.', source: 'chatbot_flag', village: 'Moradabad' },
      { name: 'Lakshmi Devi', gender: 'F', age: 40, tier: 'orange', symptom: 'Fever 39.2°C with joint pain, rash on hands. Suspected dengue.', source: 'chatbot_flag', village: 'Chandpur' },
    ];

    let idx = 0;
    realTimeInterval = setTimeout(() => {
      if (idx < newPatients.length) {
        const p = newPatients[idx++];
        injectNewCase(p);
      }
    }, 35000);
  }

  function injectNewCase(caseInfo) {
    const newId = `pat-new-${Date.now()}`;
    const caseId = `case-new-${Date.now()}`;

    MOCK_DB.patients.push({
      id: newId, name: caseInfo.name, age: caseInfo.age, gender: caseInfo.gender,
      village: caseInfo.village, phone: '+91 99000 00000', abha_id: null,
      blood_group: 'O+', facility_id: 'fac-001', known_conditions: [], allergies: [],
      current_tier: caseInfo.tier, registered_at: new Date().toISOString().split('T')[0], language: 'Hindi',
    });

    MOCK_DB.vitals[newId] = { spo2: 96, temp: 37.5, bp_sys: 130, bp_dia: 84, hr: 90, rr: 18, history: [] };

    MOCK_DB.cases.push({
      id: caseId, patient_id: newId, tier: caseInfo.tier, source: caseInfo.source,
      symptom_summary: caseInfo.symptom, cv_screening_id: null,
      created_at: new Date().toISOString(), status: 'pending', aging_alert: false,
    });

    if (caseInfo.tier === 'red') {
      Notifications.redAlert(caseInfo.name, caseInfo.symptom.substring(0, 80) + '...');
    } else {
      Notifications.warning(`New ${caseInfo.tier.toUpperCase()} case`, `${caseInfo.name} — ${caseInfo.symptom.substring(0, 60)}...`);
    }

    renderQueue();
    updateQueueStats();
    newCaseCount++;
  }

  function navigateToQueue() {
    App.navigate('queue');
  }

  function showReferralQuick(caseId) {
    App.navigate('referral', caseId);
  }

  function buildQueueScreen() {
    return `
      <div class="queue-screen">
        <div class="queue-header">
          <div>
            <h2 class="queue-title">Prioritized Case Queue</h2>
            <p style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">
              Real-time triage sorted by severity — Red cases auto-escalated
            </p>
          </div>
          <div class="queue-controls">
            <div class="realtime-dot">Live Updates</div>
            <div class="queue-search">
              <input type="text" id="queueSearch" placeholder="Search patients..." />
              <span class="queue-search-icon"><i data-lucide="search" style="width:16px;height:16px;"></i></span>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="CaseQueue.renderQueue()"><i data-lucide="refresh-ccw" style="width:14px;height:14px;"></i> Refresh</button>
          </div>
        </div>

        <!-- Queue Stats -->
        <div class="queue-stats">
          <div class="queue-stat red cursor-pointer" id="statRed" onclick="CaseQueue.scrollToTier('red')">
            <div>
              <div class="queue-stat-count text-red">0</div>
              <div class="queue-stat-label">🔴 Red — Immediate</div>
            </div>
            <span class="queue-stat-icon"><i data-lucide="siren" style="width:24px;height:24px;color:currentColor;"></i></span>
          </div>
          <div class="queue-stat orange cursor-pointer" id="statOrange" onclick="CaseQueue.scrollToTier('orange')">
            <div>
              <div class="queue-stat-count text-orange">0</div>
              <div class="queue-stat-label">🟠 Orange — Urgent</div>
            </div>
            <span class="queue-stat-icon"><i data-lucide="alert-triangle" style="width:24px;height:24px;color:currentColor;"></i></span>
          </div>
          <div class="queue-stat yellow cursor-pointer" id="statYellow" onclick="CaseQueue.scrollToTier('yellow')">
            <div>
              <div class="queue-stat-count text-yellow">0</div>
              <div class="queue-stat-label">🟡 Yellow — 24–48h</div>
            </div>
            <span class="queue-stat-icon"><i data-lucide="clipboard-list" style="width:24px;height:24px;color:currentColor;"></i></span>
          </div>
          <div class="queue-stat green cursor-pointer" id="statGreen" onclick="CaseQueue.scrollToTier('green')">
            <div>
              <div class="queue-stat-count text-green">0</div>
              <div class="queue-stat-label">🟢 Green — Routine</div>
            </div>
            <span class="queue-stat-icon"><i data-lucide="check-circle" style="width:24px;height:24px;color:currentColor;"></i></span>
          </div>
        </div>

        <!-- Queue Content -->
        <div class="queue-content" id="queueContent"></div>
      </div>
    `;
  }

  function scrollToTier(tier) {
    const el = document.getElementById(`tier-section-${tier}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function addAuditEntry(entry) {
    auditLog.unshift({ ...entry, timestamp: new Date().toISOString() });
  }

  function getAuditLog() { return auditLog; }

  return { init, renderQueue, buildQueueScreen, updateQueueStats, scrollToTier, navigateToQueue, addAuditEntry, getAuditLog };
})();
