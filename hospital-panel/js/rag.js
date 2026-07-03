// ============================================================
// ArogyaMitra Hospital Panel — RAG Medical Assistant
// rag.js — Doctor-grade chatbot with patient context
// ============================================================

const RAGAssistant = (() => {
  let conversationHistory = [];
  let currentPatientContext = null;
  let isLoading = false;

  const SYSTEM_PROMPT_DOCTOR = `You are ArogyaMitra's Doctor-Grade RAG Medical Assistant. You provide:
- Full clinical terminology and treatment protocols
- Differential diagnosis lists and contraindication tables
- Drug mechanisms, interactions, and dosing tables
- Full citations (WHO, ICMR, BNF standards)
- Context-aware responses using patient's current vitals, history, allergies, and CV results
You never auto-prescribe, but present treatment options for the doctor's consideration.`;

  function setPatientContext(patientId) {
    if (!patientId) { currentPatientContext = null; return; }
    const patient = getPatient(patientId);
    const vitals = getVitals(patientId);
    const prescriptions = getPrescriptions(patientId);
    currentPatientContext = { patient, vitals, prescriptions };
  }

  function buildRAGScreen(patientId = null) {
    if (patientId) setPatientContext(patientId);

    const contextHtml = currentPatientContext ? buildContextPanel() : `
      <div style="padding:var(--space-4);background:var(--bg-600);border-radius:var(--radius-md);border:1px solid var(--surface-border)">
        <p style="font-size:0.8rem;color:var(--text-muted)">No patient context loaded. Answers will be general clinical guidelines.</p>
        <button class="btn btn-ghost btn-sm" style="margin-top:var(--space-2)" onclick="RAGAssistant.selectPatient()">Load Patient Context</button>
      </div>
    `;

    return `
      <div style="display:grid;grid-template-columns:1fr 300px;gap:var(--space-5);height:100%;">
        <!-- Chat area -->
        <div style="display:flex;flex-direction:column;height:100%;">
          <div class="section-header" style="flex-shrink:0">
            <div>
              <h2 class="section-title">🤖 Medical AI Assistant</h2>
              <p style="font-size:0.78rem;color:var(--text-muted)">Doctor-grade RAG · Powered by Gemma 4 31B via OpenRouter · Full clinical terminology</p>
            </div>
            <div class="flex gap-2 items-center">
              <span class="badge badge-teal">Gemma 4 31B</span>
              <span class="realtime-dot">Online</span>
            </div>
          </div>

          <!-- Messages -->
          <div id="ragMessages" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:var(--space-3);padding:var(--space-3) 0;min-height:0;">
            ${buildWelcomeMessage()}
          </div>

          <!-- Quick queries -->
          <div id="quickQueries" style="display:flex;gap:var(--space-2);flex-wrap:wrap;padding:var(--space-3) 0;border-top:1px solid var(--surface-border);flex-shrink:0;">
            <span style="font-size:0.72rem;color:var(--text-muted);align-self:center">Quick queries:</span>
            ${buildQuickQueries()}
          </div>

          <!-- Input bar -->
          <div style="display:flex;gap:var(--space-3);flex-shrink:0;padding-top:var(--space-3);">
            <input type="text" id="ragInput"
              placeholder="Ask a clinical question... e.g. 'CAP treatment protocol' or 'Drug interaction check'"
              style="flex:1;padding:12px 16px;background:var(--bg-600);border:1px solid var(--surface-border);border-radius:var(--radius-lg);color:var(--text-primary);font-size:0.9rem;outline:none;"
              onkeydown="if(event.key==='Enter')RAGAssistant.sendQuery()"
              onfocus="this.style.borderColor='var(--teal)'"
              onblur="this.style.borderColor='var(--surface-border)'" />
            <button class="btn btn-primary" onclick="RAGAssistant.sendQuery()">
              Send ➤
            </button>
            <button class="btn btn-ghost btn-icon" onclick="RAGAssistant.clearChat()" title="Clear chat">🗑️</button>
          </div>
        </div>

        <!-- Context sidebar -->
        <div style="overflow-y:auto;display:flex;flex-direction:column;gap:var(--space-4);">
          <div class="card">
            <div class="card-header">
              <span style="font-size:0.8rem;font-weight:700;">Patient Context</span>
              ${currentPatientContext ? `<span class="badge badge-teal">Loaded</span>` : `<span class="badge" style="background:var(--bg-500);color:var(--text-muted)">None</span>`}
            </div>
            ${contextHtml}
          </div>

          <div class="card">
            <div class="card-header"><span style="font-size:0.8rem;font-weight:700;">📚 Knowledge Base</span></div>
            <div style="display:flex;flex-direction:column;gap:var(--space-2);">
              ${['WHO IMCI Guidelines 2024', 'ICMR Treatment Protocols', 'RNTCP TB Guidelines 2024', 'BNF Drug Database', 'ESMO Oncology 2023', 'DrugBank Interactions'].map(s =>
                `<div style="font-size:0.75rem;color:var(--text-secondary);display:flex;align-items:center;gap:6px;">
                  <span style="color:var(--teal);">✓</span> ${s}
                </div>`
              ).join('')}
            </div>
          </div>

          <div class="card">
            <div class="card-header"><span style="font-size:0.8rem;font-weight:700;">⚡ Model Stack</span></div>
            <div style="display:flex;flex-direction:column;gap:var(--space-2);">
              <div style="font-size:0.75rem;color:var(--text-secondary)">
                <div style="color:var(--teal);font-weight:600;">Primary: Gemma 4 31B</div>
                <div style="color:var(--text-muted)">128K context · Multilingual</div>
              </div>
              <div style="font-size:0.75rem;color:var(--text-secondary)">
                <div style="font-weight:600;">Fallback 1: Gemma 4 26B</div>
                <div style="color:var(--text-muted)">Multimodal · 200 req/day</div>
              </div>
              <div style="font-size:0.75rem;color:var(--text-secondary)">
                <div style="font-weight:600;">Fallback 2: DeepSeek V4 Flash</div>
                <div style="color:var(--text-muted)">Reasoning-first architecture</div>
              </div>
              <div style="font-size:0.75rem;color:var(--text-secondary)">
                <div style="font-weight:600;">Embeddings: MiniLM-L12</div>
                <div style="color:var(--text-muted)">50+ languages · pgvector</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function buildContextPanel() {
    const { patient, vitals } = currentPatientContext;
    const v = vitals;
    return `
      <div style="display:flex;flex-direction:column;gap:var(--space-2);">
        <div style="font-size:0.875rem;font-weight:700;">${patient.name} · ${patient.gender}/${patient.age}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">${patient.village}</div>
        ${v ? `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);margin-top:var(--space-2);">
            <div style="background:var(--bg-600);padding:6px 10px;border-radius:8px;font-size:0.72rem;">
              <div style="color:var(--text-muted)">SpO₂</div>
              <div style="font-weight:700;color:${v.spo2<94?'var(--tier-red)':'var(--text-primary)'}">${v.spo2}%</div>
            </div>
            <div style="background:var(--bg-600);padding:6px 10px;border-radius:8px;font-size:0.72rem;">
              <div style="color:var(--text-muted)">BP</div>
              <div style="font-weight:700;">${v.bp_sys}/${v.bp_dia}</div>
            </div>
          </div>` : ''}
        ${patient.allergies.length ? `
          <div style="margin-top:var(--space-2);">
            <div style="font-size:0.68rem;color:var(--text-muted);margin-bottom:4px;">⚠️ ALLERGIES</div>
            ${patient.allergies.map(a => `<span class="allergy-tag" style="margin-right:4px;">${a}</span>`).join('')}
          </div>` : ''}
        ${patient.known_conditions.length ? `
          <div style="margin-top:var(--space-2);">
            <div style="font-size:0.68rem;color:var(--text-muted);margin-bottom:4px;">CONDITIONS</div>
            ${patient.known_conditions.map(c => `<span class="condition-tag" style="margin-right:4px;display:inline-block;margin-bottom:4px;">${c.replace(/_/g,' ')}</span>`).join('')}
          </div>` : ''}
      </div>
    `;
  }

  function buildWelcomeMessage() {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:var(--space-6);opacity:0.8;" id="ragWelcome">
        <div style="font-size:3rem;margin-bottom:var(--space-3)">🤖</div>
        <div style="font-size:1rem;font-weight:700;margin-bottom:var(--space-2)">ArogyaMitra Medical AI</div>
        <div style="font-size:0.85rem;color:var(--text-secondary);max-width:340px;line-height:1.6;">
          Ask any clinical question. I have access to WHO guidelines, ICMR protocols, drug interactions, and your patient's current context.
        </div>
      </div>
    `;
  }

  function buildQuickQueries() {
    const queries = [
      'CAP treatment protocol',
      'Drug interaction check',
      'TB diagnostic protocol',
      'Glioma management',
      'Referral criteria',
      'Diabetes management',
    ];
    return queries.map(q =>
      `<button class="btn btn-ghost btn-sm" onclick="RAGAssistant.sendQueryText('${q}')">${q}</button>`
    ).join('');
  }

  function sendQuery() {
    const input = document.getElementById('ragInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    processQuery(text);
  }

  function sendQueryText(text) {
    processQuery(text);
  }

  function processQuery(queryText) {
    if (isLoading) return;
    isLoading = true;

    const messagesEl = document.getElementById('ragMessages');
    if (!messagesEl) return;

    // Remove welcome message if present
    const welcome = document.getElementById('ragWelcome');
    if (welcome) welcome.remove();

    // Add user message
    messagesEl.appendChild(createMessage('user', queryText));
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // Add loading indicator
    const loadingMsg = createLoadingMessage();
    messagesEl.appendChild(loadingMsg);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    conversationHistory.push({ role: 'user', content: queryText });

    // Find best mock response
    setTimeout(() => {
      const response = findBestResponse(queryText);
      loadingMsg.remove();

      const aiMsg = createMessage('assistant', response.answer, response.sources);
      messagesEl.appendChild(aiMsg);
      messagesEl.scrollTop = messagesEl.scrollHeight;

      conversationHistory.push({ role: 'assistant', content: response.answer });
      isLoading = false;
    }, 1200 + Math.random() * 800);
  }

  function findBestResponse(query) {
    const q = query.toLowerCase();

    if (q.includes('pneumonia') || q.includes('cap') || q.includes('respiratory'))
      return MOCK_DB.ragResponses['pneumonia treatment'];
    if (q.includes('glioma') || q.includes('brain tumor') || q.includes('mri'))
      return MOCK_DB.ragResponses['glioma management'];
    if (q.includes('tb') || q.includes('tuberculosis'))
      return MOCK_DB.ragResponses['tb diagnosis'];
    if (q.includes('metformin') || q.includes('ibuprofen') || q.includes('interaction'))
      return MOCK_DB.ragResponses['drug interaction metformin ibuprofen'];

    // Generic response
    const patientNote = currentPatientContext ?
      `\n\n**Note for current patient (${currentPatientContext.patient.name}):** Given their known conditions (${currentPatientContext.patient.known_conditions.join(', ') || 'none'}) and allergies (${currentPatientContext.patient.allergies.join(', ') || 'none'}), apply appropriate modifications to standard protocols.` : '';

    return {
      answer: `**Clinical Query: "${query}"**

Based on available WHO/ICMR guidelines and the knowledge base:

This query matches general clinical management protocols. For specific condition guidance, please refine your query (e.g., "pneumonia treatment adult outpatient", "TB diagnostic protocol", "glioma referral criteria").

**General principles:**
- Always verify patient allergies and current medications before prescribing
- Consider patient's comorbidities (diabetes, hypertension) in dose adjustments
- For rural settings, follow IPHS/RNTCP essential drug lists
- Document all clinical decisions with clear rationale${patientNote}

**Suggested follow-up queries:**
- "Treatment guidelines for [specific condition]"
- "Drug interactions: [drug A] + [drug B]"
- "Referral criteria for [condition]"`,
      sources: ['WHO IMCI Guidelines 2024', 'ICMR Treatment Protocols', 'IPHS Standards 2023'],
    };
  }

  function createMessage(role, content, sources = []) {
    const isUser = role === 'user';
    const div = document.createElement('div');
    div.style.cssText = `display:flex;flex-direction:column;gap:6px;align-items:${isUser ? 'flex-end' : 'flex-start'};`;

    const bubble = document.createElement('div');
    bubble.style.cssText = `
      max-width:85%;
      padding:14px 16px;
      border-radius:${isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};
      font-size:0.875rem;
      line-height:1.7;
      border:1px solid;
      ${isUser
        ? 'background:var(--teal-light);border-color:rgba(0,212,170,0.25);color:var(--text-primary);align-self:flex-end;'
        : 'background:var(--surface-1);border-color:var(--surface-border);color:var(--text-secondary);align-self:flex-start;'
      }
    `;

    bubble.innerHTML = content
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>')
      .replace(/\n/g, '<br/>');

    div.appendChild(bubble);

    if (sources && sources.length) {
      const sourcesDiv = document.createElement('div');
      sourcesDiv.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;max-width:85%;';
      sourcesDiv.innerHTML = sources.map(s =>
        `<span style="padding:2px 8px;background:var(--bg-600);border:1px solid var(--surface-border);border-radius:99px;font-size:0.65rem;color:var(--text-muted);">📚 ${s}</span>`
      ).join('');
      div.appendChild(sourcesDiv);
    }

    // Timestamp
    const time = document.createElement('div');
    time.style.cssText = 'font-size:0.65rem;color:var(--text-muted);';
    time.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    div.appendChild(time);

    return div;
  }

  function createLoadingMessage() {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 0;';
    div.innerHTML = `
      <div style="width:32px;height:32px;border-radius:50%;background:var(--teal-light);border:1px solid rgba(0,212,170,0.3);display:flex;align-items:center;justify-content:center;font-size:0.9rem;">🤖</div>
      <div style="display:flex;gap:6px;align-items:center;background:var(--surface-1);border:1px solid var(--surface-border);padding:12px 16px;border-radius:16px 16px 16px 4px;">
        <div class="typing-dot" style="width:7px;height:7px;border-radius:50%;background:var(--teal);animation:bounce 1.2s ease infinite;"></div>
        <div class="typing-dot" style="width:7px;height:7px;border-radius:50%;background:var(--teal);animation:bounce 1.2s ease 0.2s infinite;"></div>
        <div class="typing-dot" style="width:7px;height:7px;border-radius:50%;background:var(--teal);animation:bounce 1.2s ease 0.4s infinite;"></div>
        <span style="font-size:0.75rem;color:var(--text-muted);margin-left:8px;">Retrieving from knowledge base...</span>
      </div>
    `;
    return div;
  }

  function clearChat() {
    const msgs = document.getElementById('ragMessages');
    if (msgs) {
      msgs.innerHTML = buildWelcomeMessage();
      conversationHistory = [];
    }
  }

  function selectPatient() {
    // Open a patient picker
    const patientsHtml = MOCK_DB.patients.map(p =>
      `<div class="facility-result-item" onclick="RAGAssistant.loadPatient('${p.id}');document.querySelector('.modal-backdrop')?.remove()">
        <span style="font-size:1.2rem;">${p.gender === 'M' ? '👨' : '👩'}</span>
        <div>
          <div style="font-weight:600;">${p.name}</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">${p.gender}/${p.age} · ${p.village}</div>
        </div>
        <span class="badge badge-${p.current_tier}">${p.current_tier.toUpperCase()}</span>
      </div>`
    ).join('');

    showModal('Load Patient Context', `<div class="facility-results">${patientsHtml}</div>`, null, null);
  }

  function loadPatient(patientId) {
    setPatientContext(patientId);
    const screen = document.getElementById('mainContentArea');
    if (screen) screen.innerHTML = buildRAGScreen(patientId);
    Notifications.success('Context Loaded', `Patient context loaded for ${getPatient(patientId)?.name}`);
  }

  return { buildRAGScreen, sendQuery, sendQueryText, clearChat, selectPatient, loadPatient, setPatientContext };
})();

// CSS animation for typing dots
const typingStyle = document.createElement('style');
typingStyle.textContent = `
  @keyframes bounce {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-6px); }
  }
`;
document.head.appendChild(typingStyle);
