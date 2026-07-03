// ============================================================
// ArogyaMitra — Prescription, History, Referral, Area Dashboard
// prescription.js + history.js + referral.js + dashboard-area.js
// ============================================================

// ── PRESCRIPTION MODULE ──────────────────────────────────────
const PrescriptionModule = (() => {
  let medicines = [];
  let followUpDays = 7;
  let ayushEnabled = false;
  let selectedAyush = null;
  let currentPatientId = null;

  function build(patientId) {
    currentPatientId = patientId;
    medicines = [{ name: '', strength: '', frequency: '', duration: '', route: 'oral', instructions: '' }];
    followUpDays = 7;
    ayushEnabled = false;

    const patient = getPatient(patientId);
    const vitals = getVitals(patientId);
    const existing = getPrescriptions(patientId);
    const v = vitals || {};

    const allergiesHtml = patient.allergies.map(a => `<span class="allergy-tag">${a}</span>`).join(' ') || '<em style="color:var(--text-muted)">None known</em>';
    const conditionsHtml = patient.known_conditions.map(c => `<span class="condition-tag">${c.replace(/_/g,' ')}</span>`).join(' ') || '<em style="color:var(--text-muted)">None</em>';

    return `
      <div class="prescription-screen">
        <div class="prescription-main">
          <div class="prescription-header">
            <div>
              <h2 style="font-size:1.2rem;font-weight:800;">Write Prescription</h2>
              <p style="font-size:0.78rem;color:var(--text-muted)">Doctor-only · Logged with timestamp · Drug interaction checked</p>
            </div>
            <div class="prescription-patient-pill" style="display:flex;align-items:center;gap:6px;">
              <img src="https://ui-avatars.com/api/?name=${patient.name}&background=random&color=fff" style="width:20px;height:20px;border-radius:50%;object-fit:cover;" /> ${patient.name} · ${patient.gender}/${patient.age}
              <span class="badge badge-${patient.current_tier} ml-2">${patient.current_tier.toUpperCase()}</span>
            </div>
          </div>

          <!-- Drug Interaction Alert placeholder -->
          <div id="interactionAlert" class="interaction-alert"></div>

          <!-- Medicine list -->
          <div class="rx-form-card">
            <div class="rx-section-title"><i data-lucide="pill" style="width:18px;height:18px;display:inline-block;vertical-align:middle;margin-right:6px;"></i> Medications</div>
            <div class="medicine-list" id="medicineList">
              ${renderMedicineRow(0)}
            </div>
            <button class="add-medicine-btn" onclick="PrescriptionModule.addMedicine()">+ Add Another Medicine</button>
          </div>

          <!-- Special Notes -->
          <div class="rx-form-card">
            <div class="rx-section-title"><i data-lucide="edit-3" style="width:18px;height:18px;display:inline-block;vertical-align:middle;margin-right:6px;"></i> Special Instructions & Notes</div>
            <textarea class="form-control" id="rxNotes" rows="3"
              placeholder="e.g. Complete the full course. Return if fever persists after 3 days. Avoid alcohol."
            ></textarea>
          </div>

          <!-- AYUSH Section -->
          <div class="ayush-section">
            <div class="ayush-toggle-row" onclick="PrescriptionModule.toggleAYUSH()">
              <div class="ayush-toggle-label">
                <i data-lucide="leaf" style="width:16px;height:16px;display:inline-block;vertical-align:middle;color:var(--tier-green);margin-right:6px;"></i> Add AYUSH / Ayurvedic Recommendation
                <span style="font-size:0.72rem;color:var(--text-muted);font-weight:400;">(optional — for Green-tier wellness)</span>
              </div>
              <div class="toggle-switch${ayushEnabled ? ' on' : ''}" id="ayushToggle">
                <div class="toggle-knob"></div>
              </div>
            </div>
            <div class="ayush-options${ayushEnabled ? ' open' : ''}" id="ayushOptions">
              ${MOCK_DB.ayushFormulations.map(a => `
                <div class="ayush-option${selectedAyush === a.code ? ' selected' : ''}" onclick="PrescriptionModule.selectAyush('${a.code}')">
                  <div>
                    <div class="ayush-code">${a.code}</div>
                    <div class="ayush-name">${a.name}</div>
                    <div class="ayush-indication">${a.indication}</div>
                    <div class="ayush-dose">Dose: ${a.dose}</div>
                    <div style="font-size:0.68rem;color:var(--text-muted);margin-top:2px;">Safety: ${a.safety}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Follow-up -->
          <div class="rx-form-card">
            <div class="rx-section-title"><i data-lucide="calendar" style="width:18px;height:18px;display:inline-block;vertical-align:middle;margin-right:6px;"></i> Follow-up Schedule</div>
            <div class="followup-chips">
              ${[3,5,7,10,14,30,60,90].map(d => `
                <div class="followup-chip${followUpDays === d ? ' selected' : ''}" onclick="PrescriptionModule.setFollowUp(${d})" id="fu-${d}">${d} days</div>
              `).join('')}
            </div>
          </div>

          <!-- Submit -->
          <div class="rx-submit-bar">
            <div class="rx-summary-text" id="rxSummary">
              ${medicines.length} medicine(s) · Follow-up in ${followUpDays} days
            </div>
            <div class="flex gap-3">
              <button class="btn btn-ghost" onclick="PrescriptionModule.previewPDF()"><i data-lucide="file-text" style="width:16px;height:16px;margin-right:4px;"></i> Preview PDF</button>
              <button class="btn btn-primary" onclick="PrescriptionModule.submit()">Submit Prescription →</button>
            </div>
          </div>

          <!-- Success state -->
          <div class="rx-success" id="rxSuccess">
            <div class="rx-success-icon"><i data-lucide="check-circle" style="width:48px;height:48px;color:var(--tier-green);"></i></div>
            <div class="rx-success-title">Prescription Submitted!</div>
            <div class="rx-success-desc">
              Prescription saved to patient history.<br/>
              ${patient.name} will receive a WhatsApp notification with prescription details.
            </div>
            <div class="flex gap-3 justify-center">
              <button class="btn btn-ghost" onclick="App.navigate('prescribe','${patientId}')">Write Another</button>
              <button class="btn btn-primary" onclick="App.navigate('case-detail','${MOCK_DB.cases.find(c=>c.patient_id===patientId)?.id || ''}')">Back to Case</button>
            </div>
          </div>
        </div>

        <div class="prescription-sidebar">
          <!-- Vitals -->
          <div class="card">
            <div class="card-header"><span style="font-weight:700;font-size:0.85rem;">Current Vitals</span></div>
            ${vitals ? `
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);">
                <div class="vital-item ${vitals.spo2<94?'critical':vitals.spo2<96?'warning':''}">
                  <div class="vital-value">${vitals.spo2}<span class="vital-unit">%</span></div>
                  <div class="vital-name">SpO₂</div>
                </div>
                <div class="vital-item ${vitals.temp>39?'warning':''}">
                  <div class="vital-value">${vitals.temp}<span class="vital-unit">°C</span></div>
                  <div class="vital-name">Temp</div>
                </div>
                <div class="vital-item ${vitals.bp_sys>160?'warning':''}">
                  <div class="vital-value">${vitals.bp_sys}/${vitals.bp_dia}</div>
                  <div class="vital-name">BP (mmHg)</div>
                </div>
                <div class="vital-item">
                  <div class="vital-value">${vitals.hr}</div>
                  <div class="vital-name">Heart Rate</div>
                </div>
              </div>
            ` : '<div style="font-size:0.8rem;color:var(--text-muted)">No vitals recorded</div>'}
          </div>

          <!-- Allergies & Conditions -->
          <div class="card">
            <div class="card-header"><span style="font-weight:700;font-size:0.85rem;">Patient Profile</span></div>
            <div style="display:flex;flex-direction:column;gap:var(--space-3)">
              <div>
                <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;"><i data-lucide="alert-triangle" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:2px;"></i> ALLERGIES</div>
                <div>${allergiesHtml}</div>
              </div>
              <div>
                <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;"><i data-lucide="stethoscope" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:2px;"></i> CONDITIONS</div>
                <div>${conditionsHtml}</div>
              </div>
            </div>
          </div>

          <!-- Previous Prescriptions -->
          <div class="card">
            <div class="card-header"><span style="font-weight:700;font-size:0.85rem;">Past Prescriptions</span></div>
            <div style="display:flex;flex-direction:column;gap:var(--space-2);">
              ${existing.length ? existing.flatMap(rx => rx.medicines.map(m =>
                `<div class="rx-history-item">
                  <div class="rx-history-date">${rx.issued_at?.split('T')[0] || 'Unknown date'}</div>
                  <div class="rx-history-drug">${m.name} ${m.dosage}</div>
                  <div class="rx-history-details">${m.frequency.replace(/_/g,' ')} × ${m.duration_days}d · ${m.route}</div>
                </div>`
              )).join('') : '<div style="font-size:0.8rem;color:var(--text-muted)">No previous prescriptions</div>'}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderMedicineRow(index) {
    const drugs = MOCK_DB.drugs.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
    return `
      <div class="medicine-row" id="med-row-${index}">
        <div class="medicine-row-header">
          <div class="medicine-number">${index + 1}</div>
          ${index > 0 ? `<button class="remove-medicine" onclick="PrescriptionModule.removeMedicine(${index})">✕</button>` : '<div></div>'}
        </div>
        <div class="medicine-row-fields">
          <div class="form-group">
            <label class="form-label">Drug Name</label>
            <div class="drug-autocomplete">
              <input type="text" class="form-control" id="drug-name-${index}" placeholder="Type drug name..."
                     list="drug-list-${index}" oninput="PrescriptionModule.onDrugInput(${index})" />
              <datalist id="drug-list-${index}">${drugs}</datalist>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Strength/Dosage</label>
            <input type="text" class="form-control" id="drug-strength-${index}" placeholder="e.g. 500mg" />
          </div>
          <div class="form-group">
            <label class="form-label">Frequency</label>
            <select class="form-control" id="drug-freq-${index}">
              <option value="once_daily">Once daily (OD)</option>
              <option value="twice_daily">Twice daily (BD)</option>
              <option value="thrice_daily">Thrice daily (TDS)</option>
              <option value="four_times_daily">Four times (QDS)</option>
              <option value="as_needed">As needed (PRN)</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Duration</label>
            <div style="display:flex;gap:4px;">
              <input type="number" class="form-control" id="drug-dur-${index}" placeholder="5" min="1" style="width:60px;" />
              <select class="form-control" id="drug-dur-unit-${index}" style="flex:1;">
                <option value="days">days</option>
                <option value="weeks">weeks</option>
                <option value="months">months</option>
              </select>
            </div>
          </div>
          <div class="form-group medicine-instructions">
            <label class="form-label">Route & Instructions</label>
            <div style="display:grid;grid-template-columns:1fr 2fr;gap:var(--space-3);">
              <select class="form-control" id="drug-route-${index}">
                <option value="oral">Oral</option>
                <option value="inhaled">Inhaled</option>
                <option value="IV">IV</option>
                <option value="topical">Topical</option>
                <option value="rectal">Rectal</option>
              </select>
              <input type="text" class="form-control" id="drug-instr-${index}" placeholder="e.g. Take after meals, with a full glass of water" />
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function addMedicine() {
    medicines.push({ name: '', strength: '', frequency: '', duration: '', route: 'oral', instructions: '' });
    const list = document.getElementById('medicineList');
    if (list) {
      const idx = medicines.length - 1;
      const div = document.createElement('div');
      div.innerHTML = renderMedicineRow(idx);
      list.appendChild(div.firstElementChild);
    }
    const summary = document.getElementById('rxSummary');
    if (summary) summary.textContent = `${medicines.length} medicine(s) · Follow-up in ${followUpDays} days`;
  }

  function removeMedicine(index) {
    medicines.splice(index, 1);
    const row = document.getElementById(`med-row-${index}`);
    if (row) row.remove();
    const summary = document.getElementById('rxSummary');
    if (summary) summary.textContent = `${medicines.length} medicine(s) · Follow-up in ${followUpDays} days`;
  }

  function onDrugInput(index) {
    const drugName = document.getElementById(`drug-name-${index}`)?.value;
    const drug = MOCK_DB.drugs.find(d => d.name.toLowerCase() === drugName?.toLowerCase());
    if (drug) {
      checkInteraction(drugName);
    }
  }

  function checkInteraction(newDrug) {
    const patient = getPatient(currentPatientId);
    const existing = getPrescriptions(currentPatientId);
    const alertEl = document.getElementById('interactionAlert');
    if (!alertEl) return;

    // Check allergy
    if (patient.allergies.some(a => newDrug.toLowerCase().includes(a.toLowerCase()))) {
      alertEl.className = 'interaction-alert visible severity-major';
      alertEl.innerHTML = `
        <div class="interaction-alert-header"><i data-lucide="shield-alert" style="width:16px;height:16px;margin-right:4px;"></i> ALLERGY CONFLICT — ${newDrug}</div>
        <div class="interaction-alert-body">Patient has a recorded allergy to <strong>${patient.allergies.join(', ')}</strong>. This medication is contraindicated.</div>
        <div class="interaction-recommendation"><i data-lucide="alert-triangle" style="width:14px;height:14px;display:inline-block;vertical-align:middle;"></i> Select an alternative drug. This prescription cannot be submitted without override.</div>
      `;
      return;
    }

    // Check known interactions
    const existingDrugs = existing.flatMap(rx => rx.medicines.map(m => m.name.toLowerCase()));
    for (const existing_drug of existingDrugs) {
      const key = `${existing_drug}+${newDrug.toLowerCase()}`;
      const reverseKey = `${newDrug.toLowerCase()}+${existing_drug}`;
      const interaction = MOCK_DB.drugInteractions[key] || MOCK_DB.drugInteractions[reverseKey];

      if (interaction) {
        alertEl.className = `interaction-alert visible severity-${interaction.severity}`;
        alertEl.innerHTML = `
          <div class="interaction-alert-header">
            <i data-lucide="${interaction.severity === 'major' ? 'shield-alert' : 'alert-triangle'}" style="width:16px;height:16px;margin-right:4px;display:inline-block;vertical-align:middle;"></i>
            ${interaction.severity.toUpperCase()} Interaction: ${newDrug} + ${existing_drug}
          </div>
          <div class="interaction-alert-body">${interaction.message}</div>
          <div class="interaction-recommendation"><i data-lucide="info" style="width:14px;height:14px;margin-right:4px;display:inline-block;vertical-align:middle;"></i> ${interaction.recommendation}</div>
        `;
        return;
      }
    }

    alertEl.className = 'interaction-alert';
  }

  function toggleAYUSH() {
    ayushEnabled = !ayushEnabled;
    const toggle = document.getElementById('ayushToggle');
    const options = document.getElementById('ayushOptions');
    if (toggle) toggle.classList.toggle('on', ayushEnabled);
    if (options) options.classList.toggle('open', ayushEnabled);
  }

  function selectAyush(code) {
    selectedAyush = code;
    document.querySelectorAll('.ayush-option').forEach(el => el.classList.remove('selected'));
    const opts = document.querySelectorAll('.ayush-option');
    const idx = MOCK_DB.ayushFormulations.findIndex(a => a.code === code);
    if (opts[idx]) opts[idx].classList.add('selected');
  }

  function setFollowUp(days) {
    followUpDays = days;
    document.querySelectorAll('.followup-chip').forEach(c => c.classList.remove('selected'));
    const chip = document.getElementById(`fu-${days}`);
    if (chip) chip.classList.add('selected');
    const summary = document.getElementById('rxSummary');
    if (summary) summary.textContent = `${medicines.length} medicine(s) · Follow-up in ${followUpDays} days`;
  }

  function previewPDF() {
    Notifications.info('PDF Preview', 'Prescription PDF generated. In production, this opens a printable preview.');
    window.print();
  }

  function submit() {
    const notes = document.getElementById('rxNotes')?.value || '';

    // Collect medicines from form
    const rxMedicines = [];
    for (let i = 0; i < medicines.length; i++) {
      const name = document.getElementById(`drug-name-${i}`)?.value;
      if (!name) continue;
      rxMedicines.push({
        name,
        dosage: document.getElementById(`drug-strength-${i}`)?.value || '',
        frequency: document.getElementById(`drug-freq-${i}`)?.value || 'once_daily',
        duration_days: parseInt(document.getElementById(`drug-dur-${i}`)?.value || '5'),
        route: document.getElementById(`drug-route-${i}`)?.value || 'oral',
        instructions: document.getElementById(`drug-instr-${i}`)?.value || '',
      });
    }

    if (rxMedicines.length === 0) {
      Notifications.error('Incomplete Prescription', 'Please add at least one medicine.');
      return;
    }

    // Save to mock DB
    if (!MOCK_DB.prescriptions[currentPatientId]) MOCK_DB.prescriptions[currentPatientId] = [];
    MOCK_DB.prescriptions[currentPatientId].unshift({
      id: `rx-${Date.now()}`,
      patient_id: currentPatientId,
      doctor_id: MOCK_DB.currentDoctor.id,
      medicines: rxMedicines,
      ayush_recommendation: selectedAyush,
      notes,
      follow_up_days: followUpDays,
      issued_at: new Date().toISOString(),
    });

    Notifications.success('Prescription Saved', `${getPatient(currentPatientId)?.name} will receive a WhatsApp notification.`);

    const successEl = document.getElementById('rxSuccess');
    const mainEl = document.querySelector('.prescription-main');
    if (successEl && mainEl) {
      mainEl.querySelectorAll('.rx-form-card, .ayush-section, .rx-submit-bar, #interactionAlert').forEach(el => el.style.display = 'none');
      successEl.classList.add('active');
    }
  }

  return { build, addMedicine, removeMedicine, onDrugInput, toggleAYUSH, selectAyush, setFollowUp, previewPDF, submit };
})();

// ── PATIENT HISTORY MODULE ──────────────────────────────────
const HistoryModule = (() => {
  function build(patientId) {
    const patient = getPatient(patientId);
    const vitals = getVitals(patientId);
    const history = getHistory(patientId);
    const prescriptions = getPrescriptions(patientId);
    const cvScreenings = Object.values(MOCK_DB.cvScreenings).filter(cv => cv.patient_id === patientId);

    const timelineHtml = history.map(item => {
      const icons = { registration: 'clipboard', vitals: 'activity', prescription: 'pill', followup: 'refresh-cw', cv_screening: 'microscope', teleconsult: 'video' };
      return `
        <div class="timeline-item">
          <div class="timeline-dot ${item.type}"><i data-lucide="${icons[item.type] || 'file-text'}" style="width:14px;height:14px;"></i></div>
          <div class="timeline-content">
            <div class="timeline-date">${item.date}</div>
            <div class="timeline-summary">${item.summary}</div>
          </div>
        </div>
      `;
    }).join('') || '<div class="empty-state"><div class="empty-icon"><i data-lucide="clipboard" style="width:32px;height:32px;"></i></div><div class="empty-title">No history recorded</div></div>';

    const tierHistory = [
      { tier: 'green', date: '2024-03-10' },
      { tier: 'yellow', date: '2024-06-25' },
      { tier: 'orange', date: '2024-07-01' },
      { tier: 'red', date: '2024-07-02' },
    ];

    const tierTrajHtml = tierHistory.map((t, i) => `
      <div class="tier-trajectory-item">
        <div class="tier-trajectory-badge badge-${t.tier}">${t.tier.toUpperCase()}</div>
        <div class="tier-trajectory-date">${t.date}</div>
      </div>
      ${i < tierHistory.length - 1 ? '<span class="tier-trajectory-arrow">→</span>' : ''}
    `).join('');

    return `
      <div class="history-screen">
        <div class="history-left">
          <div class="card">
            <div class="card-header">
              <span style="font-size:1rem;font-weight:800;">${patient?.name || 'Unknown'}</span>
              <span class="badge badge-${patient?.current_tier}">${patient?.current_tier?.toUpperCase()}</span>
            </div>
            <div class="patient-details-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
              <div><div class="patient-detail-label">Age / Gender</div><div class="patient-detail-value">${patient?.age} · ${patient?.gender}</div></div>
              <div><div class="patient-detail-label">Blood Group</div><div class="patient-detail-value">${patient?.blood_group || 'Unknown'}</div></div>
              <div><div class="patient-detail-label">Village</div><div class="patient-detail-value">${patient?.village}</div></div>
              <div><div class="patient-detail-label">Language</div><div class="patient-detail-value">${patient?.language}</div></div>
              <div><div class="patient-detail-label">Phone</div><div class="patient-detail-value">${patient?.phone}</div></div>
              <div><div class="patient-detail-label">ABHA ID</div><div class="patient-detail-value" style="font-size:0.75rem">${patient?.abha_id || 'Not linked'}</div></div>
            </div>
            ${patient?.known_conditions?.length ? `<div class="condition-tags">${patient.known_conditions.map(c=>`<span class="condition-tag">${c.replace(/_/g,' ')}</span>`).join('')}</div>` : ''}
            ${patient?.allergies?.length ? `<div class="condition-tags">${patient.allergies.map(a=>`<span class="allergy-tag"><i data-lucide="alert-triangle" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:2px;"></i> ${a} allergy</span>`).join('')}</div>` : ''}
          </div>

          <div class="card">
            <div class="card-header"><span style="font-weight:700;">Tier Trajectory</span></div>
            <div class="tier-trajectory">${tierTrajHtml}</div>
          </div>

          <div class="card">
            <div class="card-header"><span style="font-weight:700;">Internal Notes</span><button class="btn btn-ghost btn-sm" onclick="HistoryModule.addNote('${patientId}')">+ Add</button></div>
            <div class="internal-note">
              <div class="internal-note-header"><i data-lucide="lock" style="width:14px;height:14px;margin-right:4px;display:inline-block;vertical-align:middle;"></i> Doctor Only</div>
              Watch for renal function decline — patient is on metformin + ACE inhibitor combo. Next visit: request serum creatinine.
            </div>
          </div>
        </div>

        <div class="history-right">
          <div class="vitals-chart-section">
            <div class="card-header" style="margin-bottom:var(--space-4);">
              <span style="font-weight:700;">Vitals Trend</span>
              <div class="vitals-chart-tabs">
                <div class="vitals-tab active" onclick="HistoryModule.showVital('spo2',this)">SpO₂</div>
                <div class="vitals-tab" onclick="HistoryModule.showVital('temp',this)">Temp</div>
                <div class="vitals-tab" onclick="HistoryModule.showVital('bp',this)">BP</div>
                <div class="vitals-tab" onclick="HistoryModule.showVital('hr',this)">Heart Rate</div>
              </div>
            </div>
            <div class="chart-canvas-wrapper">
              <canvas id="vitalsChart"></canvas>
            </div>
            <div class="chart-note">Based on ${vitals?.history?.length || 0} recorded readings</div>
          </div>

          <div class="card">
            <div class="card-header"><span style="font-weight:700;display:flex;align-items:center;gap:6px;"><i data-lucide="clipboard-list" style="width:16px;height:16px;"></i> Case Timeline</span></div>
            <div class="timeline">${timelineHtml}</div>
          </div>
        </div>
      </div>
    `;
  }

  function initCharts(patientId) {
    const vitals = getVitals(patientId);
    if (!vitals?.history?.length) return;
    showVital('spo2', document.querySelector('.vitals-tab.active'));
  }

  function showVital(metric, tab) {
    const patientId = getCurrentPatientId();
    const vitals = getVitals(patientId);

    document.querySelectorAll('.vitals-tab').forEach(t => t.classList.remove('active'));
    if (tab) tab.classList.add('active');

    const canvas = document.getElementById('vitalsChart');
    if (!canvas) return;

    const history = vitals?.history || [];
    if (!history.length) return;

    const labels = history.map(h => h.date.split('-').slice(1).join('/'));
    const datasets = {
      spo2: { data: history.map(h => h.spo2), label: 'SpO₂ (%)', color: 'rgba(0,212,170,1)', fill: 'rgba(0,212,170,0.1)' },
      temp: { data: history.map(h => h.temp), label: 'Temperature (°C)', color: 'rgba(255,107,53,1)', fill: 'rgba(255,107,53,0.1)' },
      bp:   { data: history.map(h => h.bp_sys), label: 'Systolic BP (mmHg)', color: 'rgba(255,71,87,1)', fill: 'rgba(255,71,87,0.1)' },
      hr:   { data: history.map(h => h.hr || 80), label: 'Heart Rate (bpm)', color: 'rgba(61,157,232,1)', fill: 'rgba(61,157,232,0.1)' },
    };

    const ds = datasets[metric];
    if (!ds) return;

    if (window.vitalsChartInstance) window.vitalsChartInstance.destroy();

    window.vitalsChartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: ds.label,
          data: ds.data,
          borderColor: ds.color,
          backgroundColor: ds.fill,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: ds.color,
          pointRadius: 5,
          pointHoverRadius: 7,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(20,24,41,0.95)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            titleColor: '#f0f4ff',
            bodyColor: '#9aa5c4',
            padding: 12,
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5a6585', font: { size: 10 } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5a6585', font: { size: 10 } } },
        }
      }
    });
  }

  function addNote(patientId) {
    const note = prompt('Enter internal note (visible to doctors only):');
    if (note) Notifications.success('Note Added', 'Internal note saved to patient record.');
  }

  let _currentPatientId = null;
  function setCurrentPatient(id) { _currentPatientId = id; }
  function getCurrentPatientId() { return _currentPatientId; }

  return { build, initCharts, showVital, addNote, setCurrentPatient };
})();

// ── REFERRAL MODULE ─────────────────────────────────────────
const ReferralModule = (() => {
  let selectedFacility = null;
  let selectedUrgency = 'urgent';
  let attachedItems = new Set(['CV Results', 'Patient History', 'Vitals Snapshot', 'Prescriptions']);

  function build(caseId) {
    selectedFacility = null;
    const caseData = MOCK_DB.cases.find(c => c.id === caseId) || MOCK_DB.cases[0];
    const patient = getPatient(caseData?.patient_id);

    const facilitiesHtml = renderFacilityResults(MOCK_DB.facilities.slice(1));

    const attachHtml = ['CV Screening Results', 'Patient History', 'Current Vitals', 'Active Prescriptions', 'MRI/X-ray Scans', "Doctor's Notes"].map(item => `
      <div class="attach-item${attachedItems.has(item.split(' ')[0]) ? ' checked' : ''}" onclick="ReferralModule.toggleAttach('${item}', this)">
        <div class="attach-checkbox">${attachedItems.has(item.split(' ')[0]) ? '✓' : ''}</div>
        <span class="attach-label">${item}</span>
        <span class="attach-size">${(Math.random()*2+0.5).toFixed(1)}MB</span>
      </div>
    `).join('');

    return `
      <div class="referral-screen">
        <div class="referral-main">
          <div class="section-header" style="flex-shrink:0">
            <h2 class="section-title"><i data-lucide="hospital" style="width:24px;height:24px;margin-right:6px;display:inline-block;vertical-align:middle;"></i> Patient Referral</h2>
            <span class="badge badge-info">Case: ${caseData?.id || 'N/A'}</span>
          </div>

          <!-- Patient banner -->
          <div class="card" style="flex-shrink:0">
            <div style="display:flex;align-items:center;gap:var(--space-4)">
              <div style="width:48px;height:48px;border-radius:50%;overflow:hidden;"><img src="https://ui-avatars.com/api/?name=${patient?.name}&background=random&color=fff" style="width:100%;height:100%;object-fit:cover;" /></div>
              <div>
                <div style="font-weight:700;font-size:1rem;">${patient?.name || 'Unknown'}</div>
                <div style="font-size:0.8rem;color:var(--text-secondary)">${patient?.gender}/${patient?.age} · ${patient?.village}</div>
              </div>
              <span class="badge badge-${patient?.current_tier}" style="margin-left:auto">${patient?.current_tier?.toUpperCase()}</span>
            </div>
          </div>

          <!-- Urgency -->
          <div class="rx-form-card">
            <div class="rx-section-title"><i data-lucide="zap" style="width:18px;height:18px;display:inline-block;vertical-align:middle;margin-right:6px;"></i> Referral Urgency</div>
            <div class="urgency-options">
              <div class="urgency-opt emergency${selectedUrgency==='emergency'?' selected':''}" onclick="ReferralModule.setUrgency('emergency',this)">
                <div class="urgency-opt-icon"><i data-lucide="siren" style="width:24px;height:24px;"></i></div>
                <div class="urgency-opt-label" style="color:var(--tier-red)">Emergency</div>
                <div style="font-size:0.7rem;color:var(--text-muted)">Within 2h</div>
              </div>
              <div class="urgency-opt urgent${selectedUrgency==='urgent'?' selected':''}" onclick="ReferralModule.setUrgency('urgent',this)">
                <div class="urgency-opt-icon"><i data-lucide="alert-triangle" style="width:24px;height:24px;"></i></div>
                <div class="urgency-opt-label" style="color:var(--tier-orange)">Urgent</div>
                <div style="font-size:0.7rem;color:var(--text-muted)">Same day</div>
              </div>
              <div class="urgency-opt routine${selectedUrgency==='routine'?' selected':''}" onclick="ReferralModule.setUrgency('routine',this)">
                <div class="urgency-opt-icon"><i data-lucide="calendar" style="width:24px;height:24px;"></i></div>
                <div class="urgency-opt-label" style="color:var(--tier-green)">Routine</div>
                <div style="font-size:0.7rem;color:var(--text-muted)">Within 1 week</div>
              </div>
            </div>
          </div>

          <!-- Destination -->
          <div class="rx-form-card">
            <div class="rx-section-title"><i data-lucide="map-pin" style="width:18px;height:18px;display:inline-block;vertical-align:middle;margin-right:6px;"></i> Destination Facility</div>
            <div class="form-group" style="margin-bottom:var(--space-3)">
              <input type="text" class="form-control" placeholder="Search facility or specialty..." oninput="ReferralModule.searchFacility(this.value)" />
            </div>
            <div class="facility-results" id="facilityResults">${facilitiesHtml}</div>
          </div>

          <!-- Department & Reason -->
          <div class="rx-form-card">
            <div class="rx-section-title"><i data-lucide="clipboard-list" style="width:18px;height:18px;display:inline-block;vertical-align:middle;margin-right:6px;"></i> Referral Details</div>
            <div class="grid-2" style="margin-bottom:var(--space-3)">
              <div class="form-group">
                <label class="form-label">Department / Specialty</label>
                <select class="form-control" id="refDept">
                  <option value="neurosurgery">Neurosurgery</option>
                  <option value="oncology">Oncology</option>
                  <option value="cardiology">Cardiology</option>
                  <option value="pulmonology">Pulmonology</option>
                  <option value="dermatology">Dermatology</option>
                  <option value="general_medicine">General Medicine</option>
                  <option value="general_surgery">General Surgery</option>
                  <option value="tb_dots">TB/DOTS Centre</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Transport Required</label>
                <select class="form-control">
                  <option value="none">Patient self-arranges</option>
                  <option value="ambulance">Ambulance (108)</option>
                  <option value="facilityTransport">Facility vehicle</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Clinical Reason (for receiving doctor)</label>
              <textarea class="form-control" id="refReason" rows="3"
                placeholder="e.g. Suspected glioma on MRI (78% confidence, 18.4cm³ left temporal mass). Needs histopathological confirmation and surgical evaluation. Patient has active hypertension."></textarea>
            </div>
          </div>

          <!-- Attachments -->
          <div class="rx-form-card">
            <div class="rx-section-title"><i data-lucide="paperclip" style="width:18px;height:18px;display:inline-block;vertical-align:middle;margin-right:6px;"></i> Attach to Referral Packet</div>
            <div class="attach-list">${attachHtml}</div>
          </div>

          <div class="flex gap-3 justify-between" style="flex-shrink:0">
            <button class="btn btn-ghost" onclick="App.navigate('queue')">← Cancel</button>
            <div class="flex gap-3">
              <button class="btn btn-ghost" onclick="ReferralModule.previewPacket()"><i data-lucide="eye" style="width:16px;height:16px;margin-right:4px;"></i> Preview Packet</button>
              <button class="btn btn-primary" onclick="ReferralModule.sendReferral()">Send Referral →</button>
            </div>
          </div>
        </div>

        <div class="referral-sidebar">
          <!-- Override Panel -->
          <div class="card">
            <div class="card-header"><span style="font-weight:700;display:flex;align-items:center;gap:6px;"><i data-lucide="refresh-cw" style="width:16px;height:16px;"></i> Tier Override</span></div>
            <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:var(--space-3)">Override the AI-computed triage tier with your clinical judgment.</p>
            <div class="tier-override-options">
              ${['red','orange','yellow','green'].map(t => `
                <div class="tier-override-opt ${t}${patient?.current_tier===t?' selected':''}"
                     onclick="ReferralModule.overrideTier('${t}', this, '${patient?.id}')">
                  <div class="tier-override-icon" style="width:14px;height:14px;border-radius:50%;background-color:var(--tier-${t});"></div>
                  <div class="tier-override-label">${t.charAt(0).toUpperCase()+t.slice(1)}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Audit Log -->
          <div class="card">
            <div class="card-header"><span style="font-weight:700;display:flex;align-items:center;gap:6px;"><i data-lucide="scroll" style="width:16px;height:16px;"></i> Audit Log</span></div>
            <div class="audit-log" id="auditLog">
              <div style="font-size:0.8rem;color:var(--text-muted);text-align:center;padding:var(--space-3)">No overrides logged yet</div>
            </div>
          </div>

          <!-- Nearby facilities info -->
          <div class="card">
            <div class="card-header"><span style="font-weight:700;display:flex;align-items:center;gap:6px;"><i data-lucide="map-pin" style="width:16px;height:16px;"></i> PostGIS Facility Search</span></div>
            <p style="font-size:0.75rem;color:var(--text-muted)">Facilities sorted by distance from ${patient?.village || 'patient location'}</p>
            ${MOCK_DB.facilities.slice(1).map(f => `
              <div style="padding:var(--space-2) 0;border-bottom:1px solid var(--surface-border);display:flex;gap:var(--space-2);align-items:center;">
                <span style="font-size:0.8rem;flex:1">${f.name}</span>
                <span style="font-size:0.7rem;color:var(--text-muted)">${Math.round(Math.random()*50+15)}km</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderFacilityResults(facilities) {
    if (!facilities.length) {
      return '<div style="padding:var(--space-4);font-size:0.82rem;color:var(--text-muted);text-align:center;">No matching facility found</div>';
    }

    return facilities.map((f, index) => `
      <div class="facility-result-item${selectedFacility === f.id ? ' selected' : ''}"
           onclick="ReferralModule.selectFacility('${f.id}', this)">
        <span class="facility-result-icon"><i data-lucide="hospital" style="width:20px;height:20px;"></i></span>
        <div>
          <div class="facility-result-name">${f.name}</div>
          <div class="facility-result-meta">${f.level} · ${f.specialties.join(', ')}</div>
        </div>
        <span class="facility-result-distance">${18 + index * 11} km</span>
      </div>
    `).join('');
  }

  function selectFacility(id, el) {
    selectedFacility = id;
    document.querySelectorAll('.facility-result-item').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
  }

  function setUrgency(level, el) {
    selectedUrgency = level;
    document.querySelectorAll('.urgency-opt').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
  }

  function toggleAttach(item, el) {
    const key = item.split(' ')[0];
    if (attachedItems.has(key)) {
      attachedItems.delete(key);
      el.classList.remove('checked');
      el.querySelector('.attach-checkbox').textContent = '';
    } else {
      attachedItems.add(key);
      el.classList.add('checked');
      el.querySelector('.attach-checkbox').textContent = '✓';
    }
  }

  function overrideTier(tier, el, patientId) {
    const reason = prompt(`Enter clinical reason for overriding to ${tier.toUpperCase()}:`);
    if (!reason) return;

    document.querySelectorAll('.tier-override-opt').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');

    const patient = getPatient(patientId);
    const originalTier = patient?.current_tier;
    if (patient) patient.current_tier = tier;

    CaseQueue.addAuditEntry({
      type: 'tier_override',
      patient: patient?.name,
      from: originalTier,
      to: tier,
      reason,
      doctor: MOCK_DB.currentDoctor.name,
    });

    const logEl = document.getElementById('auditLog');
    if (logEl) {
      const entry = document.createElement('div');
      entry.className = 'audit-entry';
      entry.innerHTML = `
        <div class="audit-entry-header">
          <span>${patient?.name} · <span style="color:var(--text-muted)">${originalTier} → ${tier}</span></span>
          <span style="font-size:0.68rem;color:var(--text-muted)">${new Date().toLocaleTimeString('en-IN')}</span>
        </div>
        <div class="audit-entry-reason">${reason}</div>
      `;
      logEl.innerHTML = '';
      logEl.appendChild(entry);
    }

    Notifications.success('Tier Override Logged', `${patient?.name}: ${originalTier?.toUpperCase()} → ${tier.toUpperCase()} · Reason recorded.`);
  }

  function searchFacility(term) {
    const query = term.trim().toLowerCase();
    const results = MOCK_DB.facilities.slice(1).filter(f => {
      const haystack = `${f.name} ${f.level} ${f.district} ${f.specialties.join(' ')}`.toLowerCase();
      return !query || haystack.includes(query);
    });
    const container = document.getElementById('facilityResults');
    if (container) container.innerHTML = renderFacilityResults(results);
  }

  function previewPacket() {
    const fac = MOCK_DB.facilities.find(f => f.id === selectedFacility);
    Notifications.info('Referral Packet Preview', `Packet includes: ${Array.from(attachedItems).join(', ')}. Destination: ${fac?.name || 'Not selected'}.`);
  }

  function sendReferral() {
    if (!selectedFacility) { Notifications.error('No Facility', 'Please select a destination facility.'); return; }
    const fac = MOCK_DB.facilities.find(f => f.id === selectedFacility);
    Notifications.success('Referral Sent', `Referral packet sent to ${fac?.name}. Patient will receive WhatsApp notification.`);
    setTimeout(() => App.navigate('queue'), 1500);
  }

  return { build, selectFacility, setUrgency, toggleAttach, overrideTier, searchFacility, previewPacket, sendReferral };
})();

// ── AREA DASHBOARD MODULE ──────────────────────────────────
const AreaDashboard = (() => {
  let map = null;
  let chartInstance = null;

  function build() {
    return `
      <div class="area-screen">
        <div class="area-header">
          <div>
            <h2 class="section-title"><i data-lucide="bar-chart-2" style="width:24px;height:24px;margin-right:6px;display:inline-block;vertical-align:middle;"></i> Area-Wide Disease Dashboard</h2>
            <p style="font-size:0.78rem;color:var(--text-muted)">De-identified · k-anonymity enforced · Admin view only · Updated daily via n8n cron</p>
          </div>
          <div class="flex gap-3 items-center">
            <span style="font-size:0.75rem;color:var(--text-muted)">Last updated: Today 06:00 AM</span>
            <button class="btn btn-ghost btn-sm" onclick="AreaDashboard.refresh()">↻ Refresh</button>
          </div>
        </div>

        <!-- Outbreak Alert -->
        <div class="outbreak-banner">
          <span class="outbreak-banner-icon"><i data-lucide="siren" style="width:24px;height:24px;"></i></span>
          <div class="outbreak-banner-content">
            <div class="outbreak-banner-title">Cluster Alert — Tuberculosis, Milak Block</div>
            <div class="outbreak-banner-detail">8 suspected TB cases in 7 days (threshold: 5). District TB Officer notified via n8n workflow.</div>
          </div>
          <button class="btn btn-danger btn-sm" onclick="AreaDashboard.showOutbreakDetails()">View Details</button>
        </div>

        <!-- Stats Row -->
        <div class="area-stats-row">
          ${MOCK_DB.areaStats.topConditions.map(c => `
            <div class="area-stat-card">
              <div class="area-stat-icon">${c.icon}</div>
              <div class="area-stat-count">${c.count}</div>
              <div class="area-stat-label">${c.condition}</div>
              <div class="area-stat-change ${c.change>0?'up':c.change<0?'down':'flat'}">
                ${c.change>0?'↑':c.change<0?'↓':'—'} ${Math.abs(c.change)} this week
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Map + Charts Grid -->
        <div class="area-main-grid">
          <!-- Map -->
          <div class="map-container">
            <div id="disease-map"></div>
            <div class="map-overlay">
              <div class="map-legend">
                <div class="map-legend-title">Disease Clusters</div>
                <div class="map-legend-items">
                  <div class="map-legend-item"><div class="map-legend-dot" style="background:#ff4757"></div>Fever Cluster</div>
                  <div class="map-legend-item"><div class="map-legend-dot" style="background:#ffa502"></div>TB Suspected</div>
                  <div class="map-legend-item"><div class="map-legend-dot" style="background:#3d9de8"></div>Respiratory</div>
                  <div class="map-legend-item"><div class="map-legend-dot" style="background:#2ed573"></div>Skin Conditions</div>
                  <div class="map-legend-item"><div class="map-legend-dot" style="background:#ff6b35"></div>Diabetes</div>
                </div>
              </div>
              <div class="map-outbreak-alert"><i data-lucide="alert-triangle" style="width:14px;height:14px;margin-right:4px;display:inline-block;vertical-align:middle;"></i> TB Cluster — Milak Block</div>
            </div>
          </div>

          <!-- Trend Chart -->
          <div class="chart-card">
            <div class="chart-header">
              <div>
                <div class="chart-title">Weekly Disease Trends</div>
                <div class="chart-subtitle">Cases per disease category per week</div>
              </div>
              <div class="chart-period-tabs">
                <button class="chart-period-btn active" onclick="AreaDashboard.setPeriod('weekly',this)">Weekly</button>
                <button class="chart-period-btn" onclick="AreaDashboard.setPeriod('monthly',this)">Monthly</button>
              </div>
            </div>
            <div class="chart-canvas-wrapper">
              <canvas id="trendChart"></canvas>
            </div>
          </div>
        </div>

        <!-- Bottom row -->
        <div class="area-bottom-grid">
          <!-- Facility Table -->
          <div class="chart-card">
            <div class="chart-header">
              <div class="chart-title">Facility Comparison</div>
              <span style="font-size:0.72rem;color:var(--text-muted)">k-anonymity: cells &lt;5 suppressed</span>
            </div>
            <div class="facility-table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Facility</th>
                    <th>Total</th>
                    <th><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:var(--tier-red);margin-right:4px;"></span> Red</th>
                    <th><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:var(--tier-orange);margin-right:4px;"></span> Orange</th>
                    <th><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:var(--tier-yellow);margin-right:4px;"></span> Yellow</th>
                    <th><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:var(--tier-green);margin-right:4px;"></span> Green</th>
                  </tr>
                </thead>
                <tbody>
                  ${MOCK_DB.areaStats.facilities.map(f => `
                    <tr>
                      <td>${f.name}</td>
                      <td style="font-weight:700;">${f.cases}</td>
                      <td style="color:var(--tier-red);font-weight:600;">${f.red < 5 ? '<span class="suppressed">&lt;5</span>' : f.red}</td>
                      <td style="color:var(--tier-orange);font-weight:600;">${f.orange}</td>
                      <td style="color:var(--tier-yellow);font-weight:600;">${f.yellow}</td>
                      <td style="color:var(--tier-green);font-weight:600;">${f.green}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Top Conditions -->
          <div class="chart-card">
            <div class="chart-header">
              <div class="chart-title">Top Conditions This Week</div>
              <span class="badge badge-teal">Rampur District</span>
            </div>
            <div class="top-conditions">
              ${MOCK_DB.areaStats.topConditions.map((c, i) => `
                <div class="condition-row">
                  <span class="condition-rank">#${i+1}</span>
                  <span class="condition-icon">${c.icon}</span>
                  <span class="condition-name">${c.condition}</span>
                  <span class="condition-count">${c.count}</span>
                  <span class="condition-change ${c.change>0?'up':'down'}">${c.change>0?'↑':'↓'} ${Math.abs(c.change)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function initMap() {
    const mapEl = document.getElementById('disease-map');
    if (!mapEl || typeof L === 'undefined') return;

    if (map) { map.remove(); map = null; }

    map = L.map('disease-map', { zoomControl: true }).setView([28.81, 79.03], 11);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© CartoDB',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    const colors = {
      fever: '#ff4757', tb: '#ffa502', respiratory: '#3d9de8',
      skin: '#2ed573', diabetes: '#ff6b35'
    };

    MOCK_DB.areaStats.mapClusters.forEach(cluster => {
      const radius = cluster.count * 300;
      const color = colors[cluster.disease] || '#ffffff';

      L.circle([cluster.lat, cluster.lng], {
        color,
        fillColor: color,
        fillOpacity: cluster.severity === 'critical' ? 0.7 : 0.45,
        radius,
        weight: cluster.severity === 'critical' ? 2 : 1,
      }).addTo(map).bindPopup(`
        <div style="min-width:180px">
          <div style="font-weight:700;font-size:0.9rem;margin-bottom:4px;">${cluster.block}</div>
          <div style="font-size:0.8rem;color:#ccc;">Disease: <strong>${cluster.disease}</strong></div>
          <div style="font-size:0.8rem;color:#ccc;">Cases: <strong>${cluster.count}</strong></div>
          <div style="font-size:0.8rem;color:#ccc;">Severity: <strong style="color:${color}">${cluster.severity}</strong></div>
        </div>
      `);
    });
  }

  function initTrendChart() {
    const canvas = document.getElementById('trendChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (chartInstance) chartInstance.destroy();

    const data = MOCK_DB.areaStats.weekly;
    chartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map(d => d.week),
        datasets: [
          { label: 'Fever', data: data.map(d => d.fever), backgroundColor: 'rgba(255,71,87,0.7)', borderRadius: 4 },
          { label: 'Respiratory', data: data.map(d => d.respiratory), backgroundColor: 'rgba(61,157,232,0.7)', borderRadius: 4 },
          { label: 'TB (Sus.)', data: data.map(d => d.tb), backgroundColor: 'rgba(255,165,2,0.7)', borderRadius: 4 },
          { label: 'Skin', data: data.map(d => d.skin), backgroundColor: 'rgba(46,213,115,0.7)', borderRadius: 4 },
          { label: 'Diabetes', data: data.map(d => d.diabetes), backgroundColor: 'rgba(155,89,182,0.7)', borderRadius: 4 },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#9aa5c4', font: { size: 10 } } },
          tooltip: { backgroundColor: 'rgba(20,24,41,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }
        },
        scales: {
          x: { stacked: false, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5a6585', font: { size: 10 } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5a6585', font: { size: 10 } }, beginAtZero: true }
        }
      }
    });
  }

  function setPeriod(period, btn) {
    document.querySelectorAll('.chart-period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Re-render with different data in production
  }

  function refresh() {
    Notifications.info('Dashboard Refreshed', 'Area disease stats updated from Supabase (simulated).');
  }

  function showOutbreakDetails() {
    showModal(
      'TB Cluster · Milak Block',
      `
        <div style="display:flex;flex-direction:column;gap:var(--space-3);">
          <div class="alert alert-warning">8 suspected TB cases detected in 7 days. Threshold for this block is 5.</div>
          <div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.7;">
            n8n daily digest has notified the District TB Officer. Recommended actions: mobile sputum collection camp, GeneXpert prioritization, and contact tracing for household members.
          </div>
          <table class="data-table">
            <thead><tr><th>Signal</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>Suspected TB cases</td><td>8</td></tr>
              <tr><td>Blocks affected</td><td>Milak, Rampur Sadar</td></tr>
              <tr><td>Workflow</td><td>Area aggregation cron · Daily 06:00</td></tr>
            </tbody>
          </table>
        </div>
      `,
      null,
      null
    );
  }

  return { build, initMap, initTrendChart, setPeriod, refresh, showOutbreakDetails };
})();
