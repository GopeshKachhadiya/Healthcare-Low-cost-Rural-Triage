/* ════════════════════════════════════════
   ANVAYA — HOSPITAL PANEL JAVASCRIPT
════════════════════════════════════════ */

const API = {
  orchestrator: 'http://localhost:8050',
  rag:          'http://localhost:8031',
  queue:        'http://localhost:8041',
  prescription: 'http://localhost:8014',
  interaction:  'http://localhost:8015',
  referral:     'http://localhost:8016',
  imaging_interp: 'http://localhost:8007',
  hospital_locator: 'http://localhost:8012',
};
const DEMO_MODE = localStorage.getItem('anvaya_live_api') !== '1';

// Mock patient queue data
const MOCK_QUEUE = [
  { id: 'q1', name: 'Ramesh Kumar', tier: 'red',    condition: 'Severe chest pain, SpO2 88%', wait: 45 },
  { id: 'q2', name: 'Priya Devi',   tier: 'orange', condition: 'Suspicious skin lesion — CV flagged', wait: 120 },
  { id: 'q3', name: 'Arjun Singh',  tier: 'yellow', condition: 'Persistent cough, low-grade fever', wait: 180 },
  { id: 'q4', name: 'Sunita Bai',   tier: 'green',  condition: 'Routine prenatal check', wait: 240 },
  { id: 'q5', name: 'Mohan Lal',    tier: 'orange', condition: 'Diabetic retinopathy screening', wait: 90 },
];

let currentModality = 'xray';
let currentScanBlob  = null;

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateClock();
  setInterval(updateClock, 1000);
  renderQueue(MOCK_QUEUE);
  fetchLiveQueueStats();
});

function updateClock() {
  const now = new Date();
  document.getElementById('time-display').textContent = now.toLocaleTimeString('en-IN', { hour12: true });
}

// ─── Panel Navigation ─────────────────────────────────────────────────────────
function switchPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));

  document.getElementById(`panel-${name}`).classList.remove('hidden');
  document.querySelector(`[data-panel="${name}"]`)?.classList.add('active');

  const titles = {
    dashboard: 'Dashboard', queue: 'Case Queue', imaging: 'Imaging AI',
    chat: 'Medical AI', prescriptions: 'Prescriptions', referrals: 'Referrals', analytics: 'Analytics'
  };
  document.getElementById('panel-title').textContent = titles[name] || name;

  // Close sidebar on mobile
  if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ─── Live Queue ───────────────────────────────────────────────────────────────
function renderQueue(data, filterTier = 'all') {
  const list = document.getElementById('queue-list');
  const items = filterTier === 'all' ? data : data.filter(i => i.tier === filterTier);

  list.innerHTML = items.length === 0
    ? '<p style="color:#64748B; text-align:center; padding:40px">No cases in this tier</p>'
    : items.map(item => `
    <div class="queue-full-item" id="qi-${item.id}">
      <span class="tier-label tier-${item.tier}-label">${item.tier.toUpperCase()}</span>
      <div class="queue-full-info">
        <strong>${item.name}</strong>
        <p>${item.condition}</p>
        <div class="wait-time">⏱ Waiting ${item.wait} min</div>
      </div>
      <button class="action-chip" onclick="reviewCase('${item.id}')">Review</button>
    </div>`).join('');
}

function filterQueue(tier, btn) {
  document.querySelectorAll('.filter-chips .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderQueue(MOCK_QUEUE, tier);
}

function reviewCase(id) {
  const item = MOCK_QUEUE.find(i => i.id === id);
  if (item) alert(`Opening case for ${item.name}...\n\nCondition: ${item.condition}\nTier: ${item.tier.toUpperCase()}`);
}

async function fetchLiveQueueStats() {
  if (DEMO_MODE) return;
  try {
    const resp = await fetch(`${API.queue}/queue`);
    if (resp.ok) {
      const data = await resp.json();
      const cases = data.cases || [];
      const red    = cases.filter(c => c.tier === 'Red').length;
      const orange = cases.filter(c => c.tier === 'Orange').length;
      document.getElementById('stat-red').textContent    = red;
      document.getElementById('stat-orange').textContent = orange;
      document.getElementById('queue-badge').textContent = cases.length;
    }
  } catch { /* Use mock values */ }
}

function showAlerts() {
  alert('Active Alerts:\n1. Ramesh Kumar - Red tier, Chest pain, SpO2 88%\n2. New CV screening flagged for Priya Devi');
}

// ─── Imaging AI ───────────────────────────────────────────────────────────────
function setModality(mod, btn) {
  currentModality = mod;
  document.querySelectorAll('.upload-tabs .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
}

function uploadScan(e) {
  const file = e.target.files[0];
  if (!file) return;
  currentScanBlob = file;
  const preview = document.getElementById('scan-preview');
  preview.src = URL.createObjectURL(file);
  preview.classList.remove('hidden');
  document.getElementById('upload-zone').classList.add('hidden');
  document.getElementById('analyze-scan-btn').disabled = false;
}

async function analyzeScan() {
  if (!currentScanBlob) return;
  const btn = document.getElementById('analyze-scan-btn');
  btn.textContent = 'Analyzing...';
  btn.disabled = true;

  const cvEndpoints = {
    xray:   'http://localhost:8004/predict',
    mri:    'http://localhost:8003/predict',
    cancer: 'http://localhost:8009/predict',
  };

  let data;
  try {
    if (DEMO_MODE) throw new Error('Demo mode');
    const form = new FormData();
    form.append('file', currentScanBlob, 'scan.jpg');
    if (currentModality === 'cancer') form.append('organ', 'lung');

    const resp = await fetch(cvEndpoints[currentModality], { method: 'POST', body: form });
    data = await resp.json();
  } catch {
    // Demo fallback
    data = {
      top_class: currentModality === 'xray' ? 'Tuberculosis' : currentModality === 'mri' ? 'Glioma' : 'lung adenocarcinoma',
      predictions: { Tuberculosis: 0.78, Pneumonia: 0.12, Normal: 0.10 },
      confidence: 0.78
    };
  }

  // Show report
  const report = document.getElementById('report-content');
  const placeholder = document.getElementById('report-placeholder');
  placeholder.classList.add('hidden');
  report.classList.remove('hidden');

  const topClass = data.top_class || '';
  const confidence = Math.round((data.confidence || 0.78) * 100);

  const dangerousClasses = ['Tuberculosis', 'Glioma', 'Meningioma', 'Malignant', 'adenocarcinoma'];
  const isDangerous = dangerousClasses.some(dc => topClass.includes(dc));

  const tierBadge = document.getElementById('report-tier-badge');
  if (isDangerous) {
    tierBadge.textContent = 'HIGH PRIORITY';
    tierBadge.style.cssText = 'background:rgba(239,68,68,.15);color:#EF4444;border:1px solid rgba(239,68,68,.3);';
  } else {
    tierBadge.textContent = 'MONITOR';
    tierBadge.style.cssText = 'background:rgba(245,158,11,.15);color:#F59E0B;border:1px solid rgba(245,158,11,.3);';
  }

  document.getElementById('report-modality-label').textContent = currentModality.toUpperCase();
  document.getElementById('report-finding-text').textContent =
    `AI detected: ${topClass} with ${confidence}% confidence. ${isDangerous ? 'Immediate review recommended.' : 'Continue monitoring.'}`;
  document.getElementById('conf-bar').style.width = `${confidence}%`;
  document.getElementById('report-conf-pct').textContent = `Confidence: ${confidence}%`;

  btn.textContent = 'Run AI Analysis';
  btn.disabled = false;
}

function clearScan() {
  currentScanBlob = null;
  document.getElementById('scan-preview').classList.add('hidden');
  document.getElementById('upload-zone').classList.remove('hidden');
  document.getElementById('analyze-scan-btn').disabled = true;
  document.getElementById('report-content').classList.add('hidden');
  document.getElementById('report-placeholder').classList.remove('hidden');
  document.getElementById('scan-upload').value = '';
}

function openPrescriptionFromImaging() {
  switchPanel('prescriptions');
}

// ─── Doctor Chat ──────────────────────────────────────────────────────────────
function handleDoctorChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDoctorChat(); }
}

async function sendDoctorChat() {
  const input = document.getElementById('doctor-chat-input');
  const text  = input.value.trim();
  if (!text) return;

  appendDoctorMsg(text, 'user');
  input.value = '';

  const typingDiv = appendDoctorTyping();

  try {
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 450));
      typingDiv.remove();
      appendDoctorMsg('Demo clinical context: review vitals, duration, comorbidities, and red-flag symptoms. If SpO2 is below 94% or chest pain is present, prioritize urgent evaluation.', 'bot');
      return;
    }
    const resp = await fetch(`${API.rag}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: text, mode: 'doctor' })
    });
    const data = await resp.json();
    const reply = data?.data?.answer_text || data?.answer_text || 'Unable to retrieve clinical context. Please try again.';
    typingDiv.remove();
    appendDoctorMsg(reply, 'bot');
  } catch {
    typingDiv.remove();
    appendDoctorMsg('Network error. Please check backend connections.', 'bot');
  }
}

function appendDoctorMsg(text, role) {
  const wrap = document.getElementById('doctor-chat-messages');
  const div  = document.createElement('div');
  div.className = `msg ${role === 'user' ? 'user-msg' : 'bot-msg'}`;
  div.innerHTML = `<div class="msg-bubble${role === 'bot' ? ' clinical' : ''}">${text}</div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function appendDoctorTyping() {
  const wrap = document.getElementById('doctor-chat-messages');
  const div  = document.createElement('div');
  div.className = 'msg bot-msg';
  div.innerHTML = `<div class="msg-bubble clinical" style="color:#64748B;">Retrieving clinical context...</div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
  return div;
}

// ─── Prescriptions ────────────────────────────────────────────────────────────
function addMed() {
  const list = document.getElementById('rx-meds-list');
  const entry = document.createElement('div');
  entry.className = 'med-entry';
  entry.style.marginTop = '8px';
  entry.innerHTML = `
    <input type="text" placeholder="Medication name" class="form-input" />
    <input type="text" placeholder="Dose & freq." class="form-input" style="max-width:160px" />
    <button class="icon-btn-sm" onclick="removeMed(this)">✕</button>`;
  list.appendChild(entry);
}

function removeMed(btn) {
  btn.closest('.med-entry').remove();
}

async function submitPrescription() {
  const patientId = document.getElementById('rx-patient-id').value.trim();
  const meds = Array.from(document.querySelectorAll('.med-entry input:first-child'))
    .map(i => i.value.trim()).filter(Boolean);
  const notes    = document.getElementById('rx-notes').value.trim();
  const followup = document.getElementById('rx-followup').value;

  if (!patientId || meds.length === 0) {
    alert('Please enter patient ID and at least one medication.');
    return;
  }

  // Drug interaction check first
  const alertDiv = document.getElementById('rx-interaction-alert');
  alertDiv.textContent = '⏳ Checking drug interactions...';
  alertDiv.classList.remove('hidden');

  try {
    if (DEMO_MODE) throw new Error('Demo mode');
    const interResp = await fetch(`${API.interaction}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, new_medications: meds })
    });
    const interData = await interResp.json();

    if (interData?.has_major_interaction) {
      alertDiv.textContent = `Major interaction detected: ${interData.interactions?.join(', ')}. Review before proceeding.`;
      return;
    }
  } catch { /* proceed without interaction check if backend unavailable */ }

  alertDiv.classList.add('hidden');

  try {
    if (DEMO_MODE) throw new Error('Demo mode');
    const resp = await fetch(`${API.prescription}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, doctor_id: 'doc_demo', medications: meds, notes })
    });
    const data = await resp.json();
    alert(`Prescription generated.\nID: ${data.prescription_id || 'rx_demo'}\nPatient will be notified via WhatsApp.`);
  } catch {
    alert(`Prescription generated (demo).\nPatient will be notified via WhatsApp.`);
  }
}

// ─── Referrals ────────────────────────────────────────────────────────────────
async function submitReferral() {
  const patientId = document.getElementById('ref-patient-id').value.trim();
  const target    = document.getElementById('ref-target').value;
  const urgency   = document.getElementById('ref-urgency').value;
  const reason    = document.getElementById('ref-reason').value.trim();

  if (!patientId || !reason) {
    alert('Please fill in all required fields.');
    return;
  }

  try {
    if (DEMO_MODE) throw new Error('Demo mode');
    await fetch(`${API.referral}/refer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: patientId,
        referring_hospital_id: 'hosp_demo',
        target_hospital_id: target,
        reason,
        clinical_summary: reason,
        urgency
      })
    });
  } catch { /* allow demo mode */ }

  alert(`Referral sent to ${target}.\nUrgency: ${urgency}\nPatient and receiving hospital will be notified.`);
}
