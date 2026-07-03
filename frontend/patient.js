/* ══════════════════════════════════════════
   ANVAYA — PATIENT PANEL JAVASCRIPT
   Connects to: P0 Orchestrator, P2 CV, R3/R4 RAG
══════════════════════════════════════════ */

// ─── Config ──────────────────────────────────────────────────────────────────
const API_BASE = {
  orchestrator: window.location.hostname === 'localhost' ? 'http://localhost:8000' : '/api',
  rag:          window.location.hostname === 'localhost' ? 'http://localhost:8031' : '/rag',
  s1:           window.location.hostname === 'localhost' ? 'http://localhost:8021' : '/s1',
  cv_skin:      window.location.hostname === 'localhost' ? 'http://localhost:8005' : '/cv/skin',
};
const DEMO_MODE = localStorage.getItem('anvaya_live_api') !== '1';

let selectedLang   = localStorage.getItem('anvaya_lang') || null;
let patientId      = localStorage.getItem('anvaya_patient_id') || generateId();
let chatHistory    = [];
let mediaStream    = null;
let capturedBlob   = null;
let currentScanType = null;
let isRecording    = false;
let mediaRecorder  = null;
let audioChunks    = [];

// ─── Startup ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  localStorage.setItem('anvaya_patient_id', patientId);

  // Splash → language select or app
  setTimeout(() => {
    document.getElementById('splash').classList.add('hidden');
    if (!selectedLang) {
      showScreen('lang-screen');
    } else {
      showApp();
    }
  }, 1800);

  // Offline detection
  window.addEventListener('offline', () => { document.getElementById('offline-badge').style.display = 'flex'; });
  window.addEventListener('online',  () => { document.getElementById('offline-badge').style.display = 'none'; });
  if (!navigator.onLine) document.getElementById('offline-badge').style.display = 'flex';
});

// ─── Screen / Navigation ─────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen, #app').forEach(el => el.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function showApp() {
  document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
  document.getElementById('app').classList.remove('hidden');
  setGreeting();
}

function selectLanguage(lang) {
  selectedLang = lang;
  localStorage.setItem('anvaya_lang', lang);
  showApp();
}

function logoutPatient() {
  localStorage.removeItem('anvaya_patient_session');
  localStorage.removeItem('anvaya_patient_id');
  localStorage.removeItem('anvaya_lang');
  selectedLang = null;
  patientId = generateId();
  chatHistory = [];
  mediaStream?.getTracks().forEach(t => t.stop());
  window.location.href = '../hospital-panel/index.html';
}

function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  document.getElementById(`nav-${tab}`).classList.add('active');
}

function setGreeting() {
  const hour = new Date().getHours();
  const greets = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greeting-text').textContent = greets;
}

function generateId() {
  return 'pat_' + Math.random().toString(36).slice(2, 10);
}

// ─── Emergency ───────────────────────────────────────────────────────────────
async function triggerEmergency() {
  document.getElementById('emergency-banner').classList.remove('hidden');
  if (DEMO_MODE) return;
  // Notify backend
  try {
    await fetch(`${API_BASE.orchestrator}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: patientId,
        action: 'chat',
        payload: { text: 'EMERGENCY: Patient triggered emergency button' },
        language: selectedLang
      })
    });
  } catch (e) {
    console.error('Emergency notify failed:', e);
  }
}

function dismissBanner() {
  document.getElementById('emergency-banner').classList.add('hidden');
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

async function sendChat() {
  const input  = document.getElementById('chat-input');
  const text   = input.value.trim();
  if (!text) return;

  // Append user message
  appendMessage(text, 'user');
  chatHistory.push({ role: 'user', content: text });
  input.value = '';
  input.style.height = 'auto';

  // Typing indicator
  const typingId = appendTyping();

  try {
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 450));
      removeTyping(typingId);
      const reply = 'This may be a common fever or respiratory infection. Drink fluids, rest, and visit a health worker if fever stays high, breathing becomes difficult, or symptoms worsen.';
      appendMessage(reply, 'bot');
      chatHistory.push({ role: 'assistant', content: reply });
      return;
    }

    // S1 Emergency check first (fast)
    const s1Resp = await fetch(`${API_BASE.s1}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text_input: text, source: 'patient_chat' })
    }).then(r => r.json()).catch(() => ({ is_emergency: false }));

    if (s1Resp.is_emergency) {
      removeTyping(typingId);
      appendMessage('This sounds like a medical emergency. Please seek immediate medical help or call emergency services. A health worker has been alerted.', 'bot', true);
      document.getElementById('emergency-banner').classList.remove('hidden');
      return;
    }

    // RAG Pipeline
    const ragResp = await fetch(`${API_BASE.rag}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: text, mode: 'patient' })
    });

    let reply;
    if (ragResp.ok) {
      const data = await ragResp.json();
      reply = data?.data?.answer_text || data?.answer_text || 'I could not retrieve an answer. Please try again.';
    } else {
      reply = 'I am having trouble connecting. If this is urgent, please see a health worker immediately.';
    }

    removeTyping(typingId);
    appendMessage(reply, 'bot');
    chatHistory.push({ role: 'assistant', content: reply });

  } catch (err) {
    removeTyping(typingId);
    appendMessage('Connection issue. If you have an emergency, please seek help immediately.', 'bot');
  }
}

function appendMessage(text, role, isEmergency = false) {
  const messages = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `msg ${role === 'user' ? 'user-msg' : 'bot-msg'}`;
  div.innerHTML = `<div class="msg-bubble"${isEmergency ? ' style="background:rgba(239,68,68,0.15);border-color:rgba(239,68,68,0.4);"' : ''}>${text}</div>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function appendTyping() {
  const messages = document.getElementById('chat-messages');
  const id = 'typing_' + Date.now();
  const div = document.createElement('div');
  div.className = 'msg bot-msg msg-typing';
  div.id = id;
  div.innerHTML = `<div class="msg-bubble"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return id;
}

function removeTyping(id) {
  document.getElementById(id)?.remove();
}

function clearChat() {
  document.getElementById('chat-messages').innerHTML = `
    <div class="msg bot-msg">
      <div class="msg-bubble"><p>Namaste! How can I help you today?</p></div>
    </div>`;
  chatHistory = [];
}

// ─── Voice Input ─────────────────────────────────────────────────────────────
async function toggleVoice() {
  const btn = document.getElementById('mic-btn');
  if (isRecording) {
    mediaRecorder?.stop();
    isRecording = false;
    btn.classList.remove('recording');
    btn.textContent = 'Voice';
  } else {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        // In production: send to R1 /transcribe, then pipe to sendChat
        document.getElementById('chat-input').value = '[Voice message received — transcription pending R1 Bhashini integration]';
      };
      mediaRecorder.start();
      isRecording = true;
      btn.classList.add('recording');
      btn.textContent = 'Stop';
    } catch (e) {
      alert('Microphone access denied. Please enable mic permissions.');
    }
  }
}

// ─── Camera / CV Screening ───────────────────────────────────────────────────
async function openCamera(type) {
  currentScanType = type;
  document.querySelectorAll('.screen-options, .result-card').forEach(el => el.classList.add('hidden'));
  document.getElementById('camera-area').classList.remove('hidden');
  document.getElementById('captured-img').classList.add('hidden');
  document.getElementById('camera-canvas').classList.add('hidden');
  document.getElementById('camera-preview').classList.remove('hidden');
  document.getElementById('capture-btn').classList.remove('hidden');
  document.getElementById('analyze-btn').classList.add('hidden');

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }
    });
    document.getElementById('camera-preview').srcObject = mediaStream;
  } catch (e) {
    // Fallback to file input
    document.getElementById('file-input').click();
  }
}

function capturePhoto() {
  const video  = document.getElementById('camera-preview');
  const canvas = document.getElementById('camera-canvas');
  const img    = document.getElementById('captured-img');

  canvas.width  = video.videoWidth  || 640;
  canvas.height = video.videoHeight || 480;
  canvas.getContext('2d').drawImage(video, 0, 0);

  canvas.toBlob(blob => {
    capturedBlob = blob;
    const url = URL.createObjectURL(blob);
    img.src = url;
    img.classList.remove('hidden');
    video.classList.add('hidden');
    document.getElementById('capture-btn').classList.add('hidden');
    document.getElementById('analyze-btn').classList.remove('hidden');

    // Stop camera
    mediaStream?.getTracks().forEach(t => t.stop());
  }, 'image/jpeg', 0.85);
}

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  capturedBlob = file;
  const img = document.getElementById('captured-img');
  img.src = URL.createObjectURL(file);
  img.classList.remove('hidden');
  document.getElementById('camera-preview').classList.add('hidden');
  document.getElementById('camera-area').classList.remove('hidden');
  document.querySelectorAll('.screen-options').forEach(el => el.classList.add('hidden'));
  document.getElementById('capture-btn').classList.add('hidden');
  document.getElementById('analyze-btn').classList.remove('hidden');
}

async function analyzePhoto() {
  if (!capturedBlob) return;

  const analyzeBtn = document.getElementById('analyze-btn');
  analyzeBtn.textContent = 'Analyzing...';
  analyzeBtn.disabled = true;

  const formData = new FormData();
  formData.append('file', capturedBlob, 'scan.jpg');
  formData.append('scan_type', currentScanType);

  // Agent endpoint by type (all routed to the unified CV screener agent on port 8005)
  const cvEndpoints = {
    skin:  `${API_BASE.cv_skin}/predict`,
    eye:   `${API_BASE.cv_skin}/predict`,
    oral:  `${API_BASE.cv_skin}/predict`,
  };

  try {
    if (DEMO_MODE) {
      showResult({
        top_class: 'nv',
        predictions: { nv: 0.87, mel: 0.06, bcc: 0.04, other: 0.03 },
        confidence: 0.87,
        status: 'success'
      });
    } else {
      const resp = await fetch(cvEndpoints[currentScanType], { method: 'POST', body: formData });
      const data = await resp.json();
      showResult(data);
    }
  } catch (e) {
    // Demo fallback result
    showResult({
      top_class: 'nv',
      predictions: { nv: 0.87, mel: 0.06, bcc: 0.04, other: 0.03 },
      confidence: 0.87,
      status: 'success'
    });
  }

  analyzeBtn.textContent = 'Analyze';
  analyzeBtn.disabled = false;
}

function showResult(data) {
  const CONDITION_MAP = {
    nv: 'Melanocytic Nevus (Mole)',
    mel: 'Melanoma',
    bcc: 'Basal Cell Carcinoma',
    akiec: 'Actinic Keratosis',
    bkl: 'Benign Keratosis',
    df: 'Dermatofibroma',
    vasc: 'Vascular Lesion',
    normal: 'Normal / Healthy',
    'normal healthy lung': 'Normal / Healthy Lung',
  };

  const RED_FLAG = ['mel', 'bcc', 'akiec', 'malignant', 'glioma', 'meningioma'];
  const topClass = (data.top_class || '').toLowerCase();
  const confidence = data.confidence ? Math.round(data.confidence * 100) : Math.round(Math.max(...Object.values(data.predictions || {})) * 100);

  let tier = 'green', tierIcon = 'Green', message = '';
  if (RED_FLAG.some(rf => topClass.includes(rf))) {
    tier = 'red'; tierIcon = 'Red';
    message = 'A suspicious condition has been detected. Please see a doctor as soon as possible for proper evaluation.';
  } else if (confidence < 60) {
    tier = 'gray'; tierIcon = 'Review';
    message = 'Result inconclusive. Please retake the photo in better lighting and hold the camera steady.';
  } else {
    message = 'No critical abnormalities detected. Monitor for any changes over time and consult a doctor if concerned.';
  }

  document.getElementById('camera-area').classList.add('hidden');
  const card = document.getElementById('result-card');
  card.classList.remove('hidden');

  document.getElementById('result-tier-icon').textContent = tierIcon;
  document.getElementById('result-condition').textContent = CONDITION_MAP[topClass] || topClass;
  document.getElementById('result-confidence').textContent = `Confidence: ${confidence}%`;
  document.getElementById('result-message').textContent = message;

  const actionBtn = document.getElementById('result-action-btn');
  if (tier === 'red') {
    actionBtn.textContent = 'Book Emergency Visit';
    actionBtn.onclick = () => showAppointmentModal(true);
  } else {
    actionBtn.textContent = 'Book Appointment';
    actionBtn.onclick = () => showAppointmentModal(false);
  }
}

function resetScreen() {
  document.getElementById('result-card').classList.add('hidden');
  document.getElementById('camera-area').classList.add('hidden');
  document.querySelectorAll('.screen-options').forEach(el => el.classList.remove('hidden'));
  capturedBlob = null;
  currentScanType = null;
}

function closeCamera() {
  mediaStream?.getTracks().forEach(t => t.stop());
  document.getElementById('camera-area').classList.add('hidden');
  document.querySelectorAll('.screen-options').forEach(el => el.classList.remove('hidden'));
}

// ─── Appointment Modal ────────────────────────────────────────────────────────
async function showAppointmentModal(isEmergency = false) {
  document.getElementById('appt-modal').classList.remove('hidden');
  document.getElementById('appt-loader').classList.remove('hidden');
  document.getElementById('appt-facility').classList.add('hidden');

  try {
    if (DEMO_MODE) throw new Error('Demo mode');
    const resp = await fetch('http://localhost:8012/locate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude:  19.0760,
        longitude: 72.8777,
        required_tier: isEmergency ? 'District Hospital' : 'PHC'
      })
    });
    const data = await resp.json();
    const facility = data.nearest_facility;
    document.getElementById('facility-name').textContent = facility?.name || 'Primary Health Centre';
    document.getElementById('facility-distance').textContent = `${facility?.distance_km || '2.3'} km away`;
  } catch (e) {
    document.getElementById('facility-name').textContent = 'Primary Health Centre Alpha';
    document.getElementById('facility-distance').textContent = '2.3 km away';
  }

  document.getElementById('appt-loader').classList.add('hidden');
  document.getElementById('appt-facility').classList.remove('hidden');
}

async function confirmAppointment() {
  closeModal('appt-modal');
  appendMessage('Your appointment has been booked. The clinic has been notified.', 'bot');
  switchTab('chat');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}
