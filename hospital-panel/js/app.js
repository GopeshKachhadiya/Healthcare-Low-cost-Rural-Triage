// ============================================================
// ArogyaMitra Hospital Panel — App Router & Core Logic
// app.js — Navigation, auth guard, page rendering, teleconsult
// ============================================================

// ── Auth Guard ──────────────────────────────────────────────
function getSession() {
  try {
    const s = localStorage.getItem('arogyamitra_session');
    return s ? JSON.parse(s) : null;
  } catch(e) { return null; }
}

function logout() {
  localStorage.removeItem('arogyamitra_session');
  window.location.href = 'index.html';
}

// ── Utility Helpers ─────────────────────────────────────────
function getTierColor(tier) {
  return { red:'var(--tier-red)', orange:'var(--tier-orange)', yellow:'var(--tier-yellow)', green:'var(--tier-green)' }[tier] || 'var(--text-secondary)';
}

function getTierLabel(tier) {
  return { red:'RED', orange:'ORANGE', yellow:'YELLOW', green:'GREEN' }[tier] || tier;
}

function formatTimeAgo(isoString) {
  if (!isoString) return 'unknown';
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getVitalsStatus(vitals) {
  if (vitals.spo2 < 90) return 'critical';
  if (vitals.spo2 < 94 || vitals.bp_sys > 160 || vitals.temp > 39) return 'warning';
  return 'normal';
}

function getPatient(id) {
  return MOCK_DB.patients.find(p => p.id === id);
}

function getVitals(patientId) {
  return MOCK_DB.vitals[patientId] || null;
}

function getCVScreening(id) {
  if (!id) return null;
  return MOCK_DB.cvScreenings[id] || null;
}

function getPrescriptions(patientId) {
  return MOCK_DB.prescriptions[patientId] || [];
}

function getHistory(patientId) {
  return MOCK_DB.history[patientId] || [];
}

function getAllPendingCases() {
  return MOCK_DB.cases
    .filter(c => c.status === 'pending')
    .sort((a, b) => {
      const tierOrder = { red: 0, orange: 1, yellow: 2, green: 3 };
      const tierDiff = tierOrder[a.tier] - tierOrder[b.tier];
      if (tierDiff !== 0) return tierDiff;
      return new Date(a.created_at) - new Date(b.created_at);
    });
}

function showModal(title, bodyHtml, confirmText, onConfirm) {
  const existing = document.querySelector('.modal-backdrop');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" onclick="this.closest('.modal-backdrop').remove()">✕</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      ${confirmText ? `
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="this.closest('.modal-backdrop').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="${onConfirm};this.closest('.modal-backdrop').remove()">${confirmText}</button>
        </div>
      ` : ''}
    </div>
  `;

  document.body.appendChild(backdrop);
}

// ── Main App Router ─────────────────────────────────────────
const App = (() => {
  let currentSection = 'queue';
  let currentParam = null;
  let currentPatientId = null;
  let onCallStatus = true;

  const navItems = [
    { id: 'queue',        label: 'Case Queue',      icon: 'list-todo', badge: true },
    { id: 'imaging',      label: 'Imaging & AI',    icon: 'brain' },
    { id: 'rag',          label: 'AI Assistant',    icon: 'bot' },
    { id: 'prescribe',    label: 'Prescriptions',   icon: 'pill' },
    { id: 'teleconsult',  label: 'Teleconsult',     icon: 'video' },
    { id: 'history',      label: 'Patient History', icon: 'file-text' },
    { id: 'area',         label: 'Area Dashboard',  icon: 'activity' },
    { id: 'referral',     label: 'Referrals',       icon: 'hospital' },
    { id: 'settings',     label: 'Settings',        icon: 'settings' },
  ];

  function init() {
    const session = getSession();
    if (!session?.loggedIn) { window.location.href = 'index.html'; return; }

    setupSidebar(session);
    setupTopbar(session);
    setupClock();
    navigate('queue');
    CaseQueue.updateQueueStats();

    // Start real-time clock
    setInterval(updateClock, 1000);
  }

  function setupSidebar(session) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const navHtml = navItems.map(item => `
      <button class="nav-item${item.id === 'queue' ? ' active' : ''}"
              data-section="${item.id}"
              data-tooltip="${item.label}"
              onclick="App.navigate('${item.id}')">
        <span class="nav-icon"><i data-lucide="${item.icon}" style="width:20px;height:20px;"></i></span>
        <span class="nav-label">${item.label}</span>
        ${item.badge ? '<span class="nav-badge" id="queueBadge"></span>' : ''}
      </button>
    `).join('');

    sidebar.querySelector('.sidebar-nav').innerHTML = navHtml;
  }

  function setupTopbar(session) {
    const topbar = document.getElementById('topbar');
    if (!topbar) return;

    const doctorName = session.name || 'Dr. Unknown';
    const facility = session.facility || 'PHC Rampur';

    topbar.innerHTML = `
      <div class="topbar-left">
        <div>
          <div class="page-title" id="pageTitle">Case Queue</div>
          <div class="page-subtitle" id="pageSubtitle">${facility}</div>
        </div>
        <div class="queue-ministat">
          <span class="queue-ministat-count text-red" id="topbarRed">—</span>
          <span>Red |</span>
          <span class="realtime-dot">Live</span>
        </div>
      </div>
      <div class="topbar-right">
        <div class="topbar-clock" id="topbarClock">00:00:00</div>
        <button class="on-call-toggle" id="onCallToggle" onclick="App.toggleOnCall()">
          <i data-lucide="power" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"></i> On Duty
        </button>
        <div class="notif-btn" onclick="App.showNotifications()">
          <i data-lucide="bell" style="width:20px;height:20px;"></i><span class="notif-dot"></span>
        </div>
        <img src="https://ui-avatars.com/api/?name=${doctorName}&background=20c7a8&color=fff" class="doctor-avatar" title="${doctorName}" onclick="App.showProfile()" style="border-radius:50%;width:36px;height:36px;cursor:pointer;object-fit:cover;" />
        <button class="btn btn-ghost btn-sm" onclick="logout()">Logout</button>
      </div>
    `;
  }

  function setupClock() {
    updateClock();
  }

  function updateClock() {
    const el = document.getElementById('topbarClock');
    if (el) el.textContent = new Date().toLocaleTimeString('en-IN', { hour12: false });
  }

  function navigate(section, param = null) {
    currentSection = section;
    currentParam = param;

    // Update sidebar active
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.section === section);
    });

    // Update page title
    const titles = {
      queue:       ['Case Queue', 'Real-time prioritized triage'],
      imaging:     ['Imaging & AI Analysis', 'MRI · X-ray · Cancer Screening'],
      rag:         ['AI Medical Assistant', 'Doctor-grade RAG · Gemma 4 31B'],
      prescribe:   ['Prescriptions', 'E-prescription with drug interaction check'],
      teleconsult: ['Teleconsult', 'Video consultation with patients'],
      history:     ['Patient History', 'Clinical timeline and vitals'],
      area:        ['Area Dashboard', 'District-wide disease surveillance'],
      referral:    ['Patient Referral', 'Refer to specialist or higher facility'],
      settings:    ['Settings', 'Panel configuration'],
      'case-detail': ['Case Detail', 'Review patient case'],
    };

    const [title, sub] = titles[section] || [section, ''];
    const ptEl = document.getElementById('pageTitle');
    const psEl = document.getElementById('pageSubtitle');
    if (ptEl) ptEl.textContent = title;
    if (psEl) psEl.textContent = sub;

    renderSection(section, param);
  }

  function renderSection(section, param) {
    const main = document.getElementById('mainContentArea');
    if (!main) return;

    switch (section) {
      case 'queue':
        main.innerHTML = CaseQueue.buildQueueScreen();
        CaseQueue.init();
        break;

      case 'case-detail':
        main.innerHTML = buildCaseDetail(param);
        break;

      case 'imaging':
        main.innerHTML = ImagingModule.buildImagingScreen();
        ImagingModule.renderModalityContent();
        break;

      case 'rag':
        currentPatientId = param;
        main.innerHTML = RAGAssistant.buildRAGScreen(param);
        break;

      case 'prescribe':
        currentPatientId = param || MOCK_DB.cases[0].patient_id;
        main.innerHTML = PrescriptionModule.build(currentPatientId);
        break;

      case 'teleconsult':
        currentPatientId = param || MOCK_DB.patients[0].id;
        main.innerHTML = buildTeleconsultScreen(currentPatientId);
        TeleconsultModule.init(currentPatientId);
        break;

      case 'history':
        currentPatientId = param || MOCK_DB.patients[0].id;
        HistoryModule.setCurrentPatient(currentPatientId);
        main.innerHTML = HistoryModule.build(currentPatientId);
        setTimeout(() => HistoryModule.initCharts(currentPatientId), 100);
        break;

      case 'area':
        main.innerHTML = AreaDashboard.build();
        setTimeout(() => {
          AreaDashboard.initMap();
          AreaDashboard.initTrendChart();
        }, 100);
        break;

      case 'referral':
        const caseId = param || MOCK_DB.cases[0].id;
        main.innerHTML = ReferralModule.build(caseId);
        break;

      case 'settings':
        main.innerHTML = buildSettingsScreen();
        break;

      default:
        main.innerHTML = `<div class="empty-state"><div class="empty-icon"><i data-lucide="construction" style="width:44px;height:44px;"></i></div><div class="empty-title">Section under construction</div></div>`;
    }
  }

  function buildCaseDetail(caseId) {
    const caseData = MOCK_DB.cases.find(c => c.id === caseId) || MOCK_DB.cases[0];
    const patient = getPatient(caseData.patient_id);
    const vitals = getVitals(caseData.patient_id);
    const cvData = getCVScreening(caseData.cv_screening_id);
    const history = getHistory(caseData.patient_id);
    const prescriptions = getPrescriptions(caseData.patient_id);

    if (!patient) return '<div class="empty-state"><div class="empty-icon"><i data-lucide="circle-x" style="width:44px;height:44px;"></i></div><div class="empty-title">Patient not found</div></div>';

    const vitalsHtml = vitals ? (() => {
      const items = [
        { name: 'SpO₂', value: vitals.spo2, unit: '%', status: vitals.spo2 < 90 ? 'critical' : vitals.spo2 < 94 ? 'warning' : 'normal' },
        { name: 'Temperature', value: vitals.temp, unit: '°C', status: vitals.temp > 39 ? 'warning' : 'normal' },
        { name: 'Systolic BP', value: vitals.bp_sys, unit: '', status: vitals.bp_sys > 160 ? 'warning' : 'normal' },
        { name: 'Diastolic BP', value: vitals.bp_dia, unit: '', status: 'normal' },
        { name: 'Heart Rate', value: vitals.hr, unit: 'bpm', status: vitals.hr > 100 ? 'warning' : 'normal' },
        { name: 'Resp. Rate', value: vitals.rr, unit: '/min', status: vitals.rr > 20 ? 'warning' : 'normal' },
      ];
      return items.map(v => `
        <div class="vital-item ${v.status}">
          <div class="vital-value">${v.value}<span class="vital-unit">${v.unit}</span></div>
          <div class="vital-name">${v.name}</div>
        </div>
      `).join('');
    })() : '<div style="color:var(--text-muted);font-size:0.8rem;">No vitals recorded</div>';

    const cvHtml = cvData ? `
      <div class="card">
        <div class="card-header">
          <span style="font-weight:700;display:flex;align-items:center;gap:6px;"><i data-lucide="microscope" style="width:16px;height:16px;color:var(--teal)"></i> CV Screening Result</span>
          <span class="badge badge-${cvData.ai_findings.tier}">${getTierLabel(cvData.ai_findings.tier)}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-2)">
          <div style="font-size:1rem;font-weight:700;">${cvData.ai_findings.top_class}</div>
          <div style="font-size:0.85rem;color:var(--text-secondary)">${Math.round(cvData.ai_findings.confidence*100)}% confidence</div>
          <div style="font-size:0.78rem;color:var(--text-muted)">${cvData.ai_findings.heatmap_note || ''}</div>
          <button class="btn btn-ghost btn-sm" onclick="App.navigate('imaging')">View Full Analysis →</button>
        </div>
      </div>
    ` : '';

    const historyHtml = history.slice(0,4).map(h => `
      <div style="padding:var(--space-2) 0;border-bottom:1px solid var(--surface-border);font-size:0.8rem;">
        <span style="color:var(--text-muted);font-size:0.68rem;">${h.date}</span>
        <div style="color:var(--text-secondary);">${h.summary}</div>
      </div>
    `).join('') || '<div style="font-size:0.8rem;color:var(--text-muted)">No history</div>';

    const allergyHtml = patient.allergies.map(a => `<span class="allergy-tag"><i data-lucide="alert-triangle" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:2px;"></i> ${a}</span>`).join(' ') || '<em style="color:var(--text-muted)">None</em>';
    const conditionsHtml = patient.known_conditions.map(c => `<span class="condition-tag">${c.replace(/_/g,' ')}</span>`).join(' ') || '<em style="color:var(--text-muted)">None</em>';

    return `
      <div class="case-detail-screen">
        <div class="case-detail-header">
          <button class="back-btn" onclick="App.navigate('queue')">←</button>
          <div style="flex:1">
            <h2 style="font-size:1.1rem;font-weight:800;">${patient.name}</h2>
            <div style="font-size:0.78rem;color:var(--text-secondary)">${patient.gender}/${patient.age} · ${patient.village} · ${caseData.symptom_summary.substring(0,60)}...</div>
          </div>
          <span class="badge badge-${caseData.tier}" style="font-size:0.9rem;padding:6px 14px;">${getTierLabel(caseData.tier)}</span>
          <div class="flex gap-2">
            <button class="btn btn-ghost btn-sm" onclick="App.navigate('history','${patient.id}')"><i data-lucide="file-text" style="width:14px;height:14px;"></i> History</button>
            <button class="btn btn-ghost btn-sm" onclick="App.navigate('teleconsult','${patient.id}')"><i data-lucide="video" style="width:14px;height:14px;"></i> Teleconsult</button>
            <button class="btn btn-primary btn-sm" onclick="App.navigate('prescribe','${patient.id}')"><i data-lucide="pill" style="width:14px;height:14px;"></i> Prescribe</button>
            <button class="btn btn-warning btn-sm" onclick="App.navigate('referral','${caseData.id}')"><i data-lucide="hospital" style="width:14px;height:14px;"></i> Refer</button>
          </div>
        </div>

        <div class="case-detail-grid" style="flex:1;overflow:hidden;">
          <div class="case-detail-left">
            <!-- Patient Info -->
            <div class="patient-info-card">
              <div class="patient-header">
                <div class="patient-avatar-lg" style="padding:0;overflow:hidden;background:transparent;"><img src="https://ui-avatars.com/api/?name=${patient.name}&background=random&color=fff" style="width:100%;height:100%;object-fit:cover;" /></div>
                <div class="patient-name-block">
                  <div class="patient-name">${patient.name}</div>
                  <div class="patient-meta">${patient.gender}/${patient.age} · ${patient.blood_group || 'Blood group unknown'}</div>
                  <div class="patient-meta" style="display:flex;align-items:center;gap:4px;"><i data-lucide="phone" style="width:12px;height:12px;"></i> ${patient.phone}</div>
                </div>
              </div>
              <div class="patient-details-grid">
                <div class="patient-detail-item"><div class="patient-detail-label">Village</div><div class="patient-detail-value">${patient.village}</div></div>
                <div class="patient-detail-item"><div class="patient-detail-label">Facility</div><div class="patient-detail-value">PHC Rampur</div></div>
                <div class="patient-detail-item"><div class="patient-detail-label">Registered</div><div class="patient-detail-value">${patient.registered_at}</div></div>
                <div class="patient-detail-item"><div class="patient-detail-label">Language</div><div class="patient-detail-value">${patient.language}</div></div>
              </div>
              <div class="condition-tags">${conditionsHtml}</div>
              <div class="condition-tags">${allergyHtml}</div>
              ${patient.abha_id ? `<div style="margin-top:var(--space-2);font-size:0.75rem;color:var(--text-muted)">ABHA: <code>${patient.abha_id}</code></div>` : ''}
            </div>

            <!-- Vitals -->
            <div class="vitals-card">
              <div class="card-header" style="margin-bottom:var(--space-3)">
                <span style="font-weight:700;">Current Vitals</span>
                <span style="font-size:0.72rem;color:var(--text-muted)">${vitals ? 'Recorded today' : 'Not recorded'}</span>
              </div>
              <div class="vitals-grid">${vitalsHtml}</div>
            </div>

            <!-- CV Screening -->
            ${cvHtml}

            <!-- Quick Actions -->
            <div class="action-panel">
              <div class="card-header" style="margin-bottom:var(--space-3)"><span style="font-weight:700;">Quick Actions</span></div>
              <div class="action-grid">
                <button class="btn btn-primary btn-sm" onclick="App.navigate('prescribe','${patient.id}')"><i data-lucide="pill" style="width:14px;height:14px;"></i> Prescribe</button>
                <button class="btn btn-ghost btn-sm" onclick="App.navigate('imaging')"><i data-lucide="microscope" style="width:14px;height:14px;"></i> Run Imaging</button>
                <button class="btn btn-warning btn-sm" onclick="App.navigate('referral','${caseData.id}')"><i data-lucide="hospital" style="width:14px;height:14px;"></i> Refer</button>
                <button class="btn btn-ghost btn-sm" onclick="App.navigate('teleconsult','${patient.id}')"><i data-lucide="video" style="width:14px;height:14px;"></i> Teleconsult</button>
                <button class="btn btn-ghost btn-sm" onclick="App.navigate('rag','${patient.id}')"><i data-lucide="bot" style="width:14px;height:14px;"></i> Ask AI</button>
                <button class="btn btn-ghost btn-sm" onclick="App.navigate('history','${patient.id}')"><i data-lucide="file-text" style="width:14px;height:14px;"></i> View History</button>
              </div>
            </div>
          </div>

          <div class="case-detail-right">
            <!-- Symptom Summary -->
            <div class="card">
              <div class="card-header"><span style="font-weight:700;display:flex;align-items:center;gap:6px;"><i data-lucide="stethoscope" style="width:16px;height:16px;color:var(--text-secondary)"></i> Clinical Presentation</span></div>
              <div style="font-size:0.9rem;color:var(--text-secondary);line-height:1.7;">${caseData.symptom_summary}</div>
              <div style="margin-top:var(--space-3);display:flex;gap:var(--space-2);flex-wrap:wrap;">
                <span class="case-tag">Source: ${caseData.source?.replace(/_/g,' ')}</span>
                <span class="case-tag">Arrived: ${formatTimeAgo(caseData.created_at)}</span>
                ${caseData.aging_alert ? '<span class="aging-badge">⏰ Aging Case</span>' : ''}
              </div>
            </div>

            <!-- RAG Quick Suggest -->
            <div class="card" style="background:rgba(0,212,170,0.04);border-color:rgba(0,212,170,0.15);">
              <div class="card-header">
                <span style="font-weight:700;color:var(--teal);display:flex;align-items:center;gap:6px;"><i data-lucide="bot" style="width:16px;height:16px;"></i> AI Differential</span>
                <span style="font-size:0.72rem;color:var(--text-muted)">Based on symptoms + CV</span>
              </div>
              <div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.7;" id="aiDifferential">
                <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;">
                  <div class="spinner" style="display:inline-block;border-color:rgba(0,212,170,0.2);border-top-color:var(--teal);width:14px;height:14px;"></div>
                  Analyzing symptoms...
                </div>
              </div>
            </div>

            <!-- Previous History -->
            <div class="card">
              <div class="card-header">
                <span style="font-weight:700;display:flex;align-items:center;gap:6px;"><i data-lucide="clipboard-list" style="width:16px;height:16px;"></i> Recent History</span>
                <button class="btn btn-ghost btn-sm" onclick="App.navigate('history','${patient.id}')">View All →</button>
              </div>
              <div>${historyHtml}</div>
            </div>

            <!-- Prescriptions -->
            ${prescriptions.length ? `
              <div class="card">
                <div class="card-header">
                  <span style="font-weight:700;display:flex;align-items:center;gap:6px;"><i data-lucide="pill" style="width:16px;height:16px;"></i> Current Medications</span>
                  <button class="btn btn-ghost btn-sm" onclick="App.navigate('prescribe','${patient.id}')">+ New</button>
                </div>
                ${prescriptions.slice(0,1).flatMap(rx => rx.medicines.map(m => `
                  <div class="rx-history-item">
                    <div class="rx-history-date">${rx.issued_at?.split('T')[0]}</div>
                    <div class="rx-history-drug">${m.name} ${m.dosage}</div>
                    <div class="rx-history-details">${m.frequency?.replace(/_/g,' ')} × ${m.duration_days} days</div>
                  </div>
                `)).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  function buildTeleconsultScreen(patientId) {
    const patient = getPatient(patientId) || MOCK_DB.patients[0];
    const session = getSession();

    const waitingPatients = MOCK_DB.patients.slice(0, 4).map(p => `
      <div class="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg hover:bg-opacity-5 transition"
           style="padding:8px;border-radius:8px;cursor:pointer;"
           onclick="App.navigate('teleconsult','${p.id}')">
        <div style="width:36px;height:36px;border-radius:50%;overflow:hidden;flex-shrink:0;">
          <img src="https://ui-avatars.com/api/?name=${p.name}&background=random&color=fff" style="width:100%;height:100%;object-fit:cover;" />
        </div>
        <div style="flex:1">
          <div style="font-size:0.82rem;font-weight:600;">${p.name}</div>
          <div style="font-size:0.7rem;color:var(--text-muted)">${p.gender}/${p.age} · ${p.current_tier.toUpperCase()}</div>
        </div>
        <span class="badge badge-${p.current_tier}" style="font-size:0.6rem"></span>
      </div>
    `).join('');

    return `
      <div class="teleconsult-screen">
        <div class="teleconsult-left">
          <div style="font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:var(--space-2)">Waiting Queue</div>
          ${waitingPatients}
          <div class="sidebar-divider" style="margin:var(--space-3) 0;"></div>
          <div style="font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:var(--space-2)">Connection Quality</div>
          <div style="display:flex;flex-direction:column;gap:6px;font-size:0.78rem;color:var(--text-secondary);">
            <div class="flex gap-2 items-center"><span style="color:var(--tier-green)">●</span> Audio: <strong>Good</strong></div>
            <div class="flex gap-2 items-center"><span style="color:var(--tier-green)">●</span> Video: <strong>Good (720p)</strong></div>
            <div class="flex gap-2 items-center"><span style="color:var(--tier-yellow)">●</span> Latency: <strong>180ms</strong></div>
            <div class="flex gap-2 items-center"><i data-lucide="globe-2" style="width:14px;height:14px;color:var(--text-muted)"></i> WebRTC (Jitsi)</div>
          </div>
        </div>

        <div class="teleconsult-main">
          <div class="video-area">
            <div class="video-placeholder">
              <div class="patient-video-avatar" style="width:80px;height:80px;border-radius:50%;overflow:hidden;margin:0 auto 16px;"><img src="https://ui-avatars.com/api/?name=${patient.name}&background=random&color=fff" style="width:100%;height:100%;object-fit:cover;" /></div>
              <div class="patient-video-name">${patient.name}</div>
              <div class="patient-video-status">Connecting via WhatsApp Video Link...</div>
              <button class="btn btn-primary" id="startCallBtn" style="margin-top:16px;" onclick="TeleconsultModule.startCall('${patientId}')">
                <i data-lucide="video" style="width:16px;height:16px;"></i> Start Call
              </button>
            </div>
            <div class="doctor-pip" style="width:120px;height:160px;border-radius:12px;overflow:hidden;"><img src="https://ui-avatars.com/api/?name=${session?.name||'Doctor'}&background=20c7a8&color=fff" style="width:100%;height:100%;object-fit:cover;" /></div>
          </div>
          <div class="call-controls" id="callControls" style="display:none;">
            <button class="call-btn mute" id="muteBtn" onclick="TeleconsultModule.toggleMute(this)"><i data-lucide="mic" style="width:20px;height:20px;"></i></button>
            <button class="call-btn cam-off" id="camBtn" onclick="TeleconsultModule.toggleCam(this)"><i data-lucide="video" style="width:20px;height:20px;"></i></button>
            <div class="call-duration" id="callDuration">00:00</div>
            <button class="call-btn chat" onclick="TeleconsultModule.showChat()"><i data-lucide="message-square" style="width:20px;height:20px;"></i></button>
            <button class="call-btn end-call" onclick="TeleconsultModule.endCall()"><i data-lucide="phone-off" style="width:20px;height:20px;"></i> End Call</button>
          </div>
        </div>

        <div class="teleconsult-right">
          <div class="call-sidebar-tabs">
            <button class="call-sidebar-tab active" onclick="TeleconsultModule.showTab('notes',this)"><i data-lucide="edit-3" style="width:14px;height:14px;margin-right:4px;"></i> Notes</button>
            <button class="call-sidebar-tab" onclick="TeleconsultModule.showTab('vitals',this)"><i data-lucide="activity" style="width:14px;height:14px;margin-right:4px;"></i> Vitals</button>
            <button class="call-sidebar-tab" onclick="TeleconsultModule.showTab('chat',this)"><i data-lucide="message-square" style="width:14px;height:14px;margin-right:4px;"></i> Chat</button>
          </div>
          <div class="call-sidebar-content" id="callSidebarContent">
            <div style="font-size:0.85rem;font-weight:600;margin-bottom:var(--space-3);">${patient.name} · ${patient.gender}/${patient.age}</div>
            <textarea id="callNotes" style="width:100%;height:180px;background:var(--bg-600);border:1px solid var(--surface-border);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.82rem;padding:10px;resize:vertical;font-family:var(--font-sans);"
              placeholder="Type call notes here... These are saved to patient history."></textarea>
            <div style="margin-top:var(--space-3);display:flex;flex-direction:column;gap:var(--space-2);">
              <button class="btn btn-ghost btn-sm" onclick="App.navigate('prescribe','${patientId}')"><i data-lucide="pill" style="width:14px;height:14px;"></i> Write Prescription</button>
              <button class="btn btn-ghost btn-sm" onclick="App.navigate('referral')"><i data-lucide="hospital" style="width:14px;height:14px;"></i> Create Referral</button>
              <button class="btn btn-ghost btn-sm" onclick="App.navigate('rag','${patientId}')"><i data-lucide="bot" style="width:14px;height:14px;"></i> Ask AI</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function buildSettingsScreen() {
    const session = getSession();
    return `
      <div style="max-width:700px;margin:0 auto;display:flex;flex-direction:column;gap:var(--space-5)">
        <div>
          <h2 class="section-title">Settings</h2>
          <p style="font-size:0.78rem;color:var(--text-muted)">Panel configuration and preferences</p>
        </div>

        <!-- Profile -->
        <div class="card">
          <div class="card-header"><span style="font-weight:700;display:flex;align-items:center;gap:6px;"><i data-lucide="user" style="width:16px;height:16px;"></i> Doctor Profile</span></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);">
            <div class="form-group"><label class="form-label">Full Name</label><input type="text" class="form-control" value="${session?.name || 'Dr. Priya Sharma'}" /></div>
            <div class="form-group"><label class="form-label">Role</label><input type="text" class="form-control" value="${session?.role || 'doctor'}" readonly /></div>
            <div class="form-group"><label class="form-label">Facility</label><input type="text" class="form-control" value="${session?.facility || 'PHC Rampur, UP'}" /></div>
            <div class="form-group"><label class="form-label">Medical Council ID</label><input type="text" class="form-control" value="MCI-UP-12345" /></div>
          </div>
          <button class="btn btn-primary" onclick="Notifications.success('Profile Updated', 'Your profile changes have been saved.')">Save Profile</button>
        </div>

        <!-- Notification Preferences -->
        <div class="card">
          <div class="card-header"><span style="font-weight:700;display:flex;align-items:center;gap:6px;"><i data-lucide="bell" style="width:16px;height:16px;"></i> Alert Preferences</span></div>
          <div style="display:flex;flex-direction:column;gap:var(--space-3);">
            ${[
              ['Red cases (immediate audio alert)', true],
              ['Orange cases (push notification)', true],
              ['Aging case warnings', true],
              ['New imaging results', true],
              ['Referral acknowledgments', false],
              ['Daily digest report', false],
            ].map(([label, on]) => `
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <span style="font-size:0.875rem;">${label}</span>
                <div class="toggle-switch${on ? ' on' : ''}" onclick="this.classList.toggle('on')"><div class="toggle-knob"></div></div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- API Integrations -->
        <div class="card">
          <div class="card-header"><span style="font-weight:700;display:flex;align-items:center;gap:6px;"><i data-lucide="plug" style="width:16px;height:16px;"></i> Integrations</span></div>
          <div style="display:flex;flex-direction:column;gap:var(--space-3);">
            ${[
              ['Supabase (Database)', 'Connected · pgvector · Realtime'],
              ['OpenRouter (LLM)', 'Gemma 4 31B · 50 RPM'],
              ['Bhashini API (ASR/TTS)', 'Hindi, Tamil, Telugu · Online'],
              ['Hugging Face Spaces', 'CV Models deployed · T4 GPU'],
              ['NIKSHAY (TB Reporting)', 'Partial integration · Config pending'],
              ['ABDM (ABHA)', 'Not configured · Coming soon'],
            ].map(([name, status]) => `
              <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);background:var(--bg-600);border-radius:var(--radius-md);border:1px solid var(--surface-border);">
                <div style="flex:1;"><div style="font-size:0.85rem;font-weight:600;">${name}</div><div style="font-size:0.72rem;color:var(--text-muted);">${status}</div></div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="card" style="border-color:rgba(255,71,87,0.3);background:rgba(255,71,87,0.04);">
          <div class="card-header"><span style="font-weight:700;color:var(--tier-red);display:flex;align-items:center;gap:6px;"><i data-lucide="alert-triangle" style="width:16px;height:16px;"></i> Account</span></div>
          <button class="btn btn-danger" onclick="if(confirm('Are you sure you want to logout?'))logout()"><i data-lucide="log-out" style="width:16px;height:16px;"></i> Logout from All Devices</button>
        </div>
      </div>
    `;
  }

  function toggleOnCall() {
    onCallStatus = !onCallStatus;
    const btn = document.getElementById('onCallToggle');
    if (btn) {
      btn.innerHTML = onCallStatus
        ? '<i data-lucide="power" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"></i> On Duty'
        : '<i data-lucide="power-off" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"></i> Off Duty';
      lucide.createIcons();
      btn.classList.toggle('off-duty', !onCallStatus);
    }
    Notifications.info(onCallStatus ? 'On Duty' : 'Off Duty', onCallStatus ? 'You are now on call.' : 'You are marked as off duty.');
  }

  function showNotifications() {
    const log = CaseQueue.getAuditLog();
    const html = log.length ? log.slice(0,5).map(e => `
      <div style="padding:var(--space-3);border-bottom:1px solid var(--surface-border);font-size:0.82rem;">
        <div style="font-weight:600;display:flex;align-items:center;gap:6px;"><i data-lucide="${e.type === 'tier_override' ? 'refresh-cw' : 'alert-circle'}" style="width:14px;height:14px;"></i> ${e.type === 'tier_override' ? 'Tier Override' : 'Event'}</div>
        <div style="color:var(--text-secondary);">${JSON.stringify(e).substring(0,80)}...</div>
        <div style="font-size:0.68rem;color:var(--text-muted)">${e.timestamp?.split('T')[1]?.split('.')[0]}</div>
      </div>
    `).join('') : '<div style="padding:var(--space-4);color:var(--text-muted);text-align:center;">No recent events</div>';

    showModal('Recent Notifications', html, null, null);
  }

  function showProfile() {
    navigate('settings');
  }

  return { init, navigate, toggleOnCall, showNotifications, showProfile };
})();

// ── Teleconsult Module ──────────────────────────────────────
const TeleconsultModule = (() => {
  let callTimer = null;
  let callSeconds = 0;
  let isMuted = false;
  let isCamOff = false;
  let activePatientId = null;

  function init(patientId) {
    activePatientId = patientId || MOCK_DB.patients[0].id;
    callSeconds = 0;
    isMuted = false;
    isCamOff = false;
    clearInterval(callTimer);
  }

  function startCall(patientId) {
    activePatientId = patientId || activePatientId;
    const patient = getPatient(activePatientId);
    const startBtn = document.getElementById('startCallBtn');
    if (startBtn) startBtn.parentElement.innerHTML = `
      <div class="patient-video-avatar" style="width:80px;height:80px;border-radius:50%;overflow:hidden;margin:0 auto 16px;animation:pulse-call 1.5s ease infinite;"><img src="https://ui-avatars.com/api/?name=${patient?.name}&background=random&color=fff" style="width:100%;height:100%;object-fit:cover;" /></div>
      <div style="color:white;font-size:1rem;font-weight:700;">Connected to ${patient?.name || 'patient'}</div>
      <div style="color:rgba(255,255,255,0.6);font-size:0.8rem">WebRTC · E2E Encrypted</div>
    `;

    const controls = document.getElementById('callControls');
    if (controls) controls.style.display = 'flex';

    callSeconds = 0;
    callTimer = setInterval(() => {
      callSeconds++;
      const m = Math.floor(callSeconds / 60).toString().padStart(2,'0');
      const s = (callSeconds % 60).toString().padStart(2,'0');
      const el = document.getElementById('callDuration');
      if (el) el.textContent = `${m}:${s}`;
    }, 1000);
  }

  function toggleMute(btn) {
    isMuted = !isMuted;
    btn.innerHTML = isMuted ? '<i data-lucide="mic-off" style="width:20px;height:20px;"></i>' : '<i data-lucide="mic" style="width:20px;height:20px;"></i>';
    btn.classList.toggle('active', isMuted);
    lucide.createIcons();
  }

  function toggleCam(btn) {
    isCamOff = !isCamOff;
    btn.innerHTML = isCamOff ? '<i data-lucide="video-off" style="width:20px;height:20px;"></i>' : '<i data-lucide="video" style="width:20px;height:20px;"></i>';
    btn.classList.toggle('active', isCamOff);
    lucide.createIcons();
  }

  function endCall() {
    clearInterval(callTimer);
    Notifications.success('Call Ended', `Duration: ${Math.floor(callSeconds/60)}m ${callSeconds%60}s. Notes saved to patient history.`);
    setTimeout(() => App.navigate('queue'), 1000);
  }

  function showChat() {
    const chatTab = document.querySelector(".call-sidebar-tab[onclick*=\"'chat'\"]");
    showTab('chat', chatTab);
  }

  function showTab(tab, btn) {
    document.querySelectorAll('.call-sidebar-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const content = document.getElementById('callSidebarContent');
    if (!content) return;
    const patient = getPatient(activePatientId) || MOCK_DB.patients[0];
    const vitals = getVitals(patient.id);

    if (tab === 'notes') {
      content.innerHTML = `
        <div style="font-size:0.85rem;font-weight:600;margin-bottom:var(--space-3);">${patient.name} · ${patient.gender}/${patient.age}</div>
        <textarea id="callNotes" style="width:100%;height:180px;background:var(--bg-600);border:1px solid var(--surface-border);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.82rem;padding:10px;resize:vertical;font-family:var(--font-sans);"
          placeholder="Type call notes here... These are saved to patient history."></textarea>
        <div style="margin-top:var(--space-3);display:flex;flex-direction:column;gap:var(--space-2);">
          <button class="btn btn-ghost btn-sm" onclick="App.navigate('prescribe','${patient.id}')"><i data-lucide="pill" style="width:14px;height:14px;"></i> Write Prescription</button>
          <button class="btn btn-ghost btn-sm" onclick="App.navigate('referral','${MOCK_DB.cases.find(c => c.patient_id === patient.id)?.id || MOCK_DB.cases[0].id}')"><i data-lucide="hospital" style="width:14px;height:14px;"></i> Create Referral</button>
          <button class="btn btn-ghost btn-sm" onclick="App.navigate('rag','${patient.id}')"><i data-lucide="bot" style="width:14px;height:14px;"></i> Ask AI</button>
        </div>
      `;
    } else if (tab === 'vitals') {
      content.innerHTML = vitals ? `
        <div style="font-size:0.85rem;font-weight:600;margin-bottom:var(--space-3);">${patient.name} vitals snapshot</div>
        <div class="vitals-grid" style="grid-template-columns:1fr 1fr;">
          <div class="vital-item ${vitals.spo2 < 94 ? 'critical' : 'normal'}"><div class="vital-value">${vitals.spo2}<span class="vital-unit">%</span></div><div class="vital-name">SpO₂</div></div>
          <div class="vital-item ${vitals.temp > 39 ? 'warning' : 'normal'}"><div class="vital-value">${vitals.temp}<span class="vital-unit">°C</span></div><div class="vital-name">Temperature</div></div>
          <div class="vital-item ${vitals.bp_sys > 160 ? 'warning' : 'normal'}"><div class="vital-value">${vitals.bp_sys}/${vitals.bp_dia}</div><div class="vital-name">BP</div></div>
          <div class="vital-item ${vitals.hr > 100 ? 'warning' : 'normal'}"><div class="vital-value">${vitals.hr}</div><div class="vital-name">Heart Rate</div></div>
        </div>
        <button class="btn btn-ghost btn-sm" style="margin-top:var(--space-3)" onclick="App.navigate('history','${patient.id}')">View Full History →</button>
      ` : '<div class="empty-state"><div class="empty-title">No vitals recorded</div></div>';
    } else if (tab === 'chat') {
      content.innerHTML = `
        <div class="chat-messages" id="chatMessages">
          <div class="chat-message from-patient">Hello doctor, I have severe headache since yesterday</div>
          <div class="chat-message from-doctor">I can see your records. Let me ask you a few questions...</div>
        </div>
        <div class="chat-input-bar">
          <input type="text" id="chatInput" placeholder="Type message..." onkeydown="if(event.key==='Enter')TeleconsultModule.sendChat()" />
          <button class="chat-send-btn" onclick="TeleconsultModule.sendChat()"><i data-lucide="send" style="width:14px;height:14px;"></i></button>
        </div>
      `;
    }
  }

  function sendChat() {
    const input = document.getElementById('chatInput');
    if (!input?.value.trim()) return;
    const msgs = document.getElementById('chatMessages');
    if (msgs) {
      const msg = document.createElement('div');
      msg.className = 'chat-message from-doctor';
      msg.textContent = input.value;
      msgs.appendChild(msg);
      msgs.scrollTop = msgs.scrollHeight;
    }
    input.value = '';
  }

  return { init, startCall, toggleMute, toggleCam, endCall, showChat, showTab, sendChat };
})();

// ── Boot ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
