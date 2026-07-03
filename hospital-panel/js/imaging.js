// ============================================================
// ArogyaMitra Hospital Panel — Medical Imaging Module
// imaging.js — Upload, AI mock inference, viewer, CV results
// ============================================================

const ImagingModule = (() => {
  let currentModality = 'brain_mri';
  let analysisTimer = null;
  let currentResult = null;
  let currentPatientId = null;
  let zoom = 1;
  let fullscreenImg = null;

  const MODALITY_CONFIG = {
    brain_mri:    { label: 'Brain MRI',       icon: '<i data-lucide="brain" style="width:48px;height:48px;color:var(--text-secondary)"></i>', formats: 'DICOM, NIfTI, JPEG, PNG', accept: '.dcm,.nii,.jpg,.jpeg,.png' },
    chest_xray:   { label: 'Chest X-ray',      icon: '<i data-lucide="wind" style="width:48px;height:48px;color:var(--text-secondary)"></i>', formats: 'DICOM, JPEG, PNG',         accept: '.dcm,.jpg,.jpeg,.png' },
    cancer_screen:{ label: 'Cancer Screening', icon: '<i data-lucide="microscope" style="width:48px;height:48px;color:var(--text-secondary)"></i>', formats: 'DICOM, CT, JPEG, PNG',     accept: '.dcm,.jpg,.jpeg,.png,.tif' },
    skin_review:  { label: 'Skin Review',      icon: '<i data-lucide="stethoscope" style="width:48px;height:48px;color:var(--text-secondary)"></i>', formats: 'From Patient Panel',        accept: '' },
  };

  function buildImagingScreen() {
    const skinCases = MOCK_DB.cases.filter(c => {
      const cv = getCVScreening(c.cv_screening_id);
      return cv && cv.modality === 'skin' && !cv.reviewed;
    });

    return `
      <div class="imaging-screen">
        <div class="section-header">
          <div>
            <h2 class="section-title">Medical Imaging & AI Analysis</h2>
            <p style="font-size:0.78rem;color:var(--text-muted);">Upload MRI, X-ray, or CT scans for AI-assisted analysis</p>
          </div>
          <div class="flex gap-3 items-center">
            <span class="badge badge-info">Powered by Hugging Face Spaces</span>
            <span class="realtime-dot">Agents Active</span>
          </div>
        </div>

        <!-- Modality Tabs -->
        <div class="modality-tabs">
          <button class="modality-tab active" data-mod="brain_mri" onclick="ImagingModule.setModality('brain_mri', this)">
            <span class="modality-tab-icon"><i data-lucide="brain" style="width:14px;height:14px;"></i></span> Brain MRI
            <span class="modality-tab-count">1 pending</span>
          </button>
          <button class="modality-tab" data-mod="chest_xray" onclick="ImagingModule.setModality('chest_xray', this)">
            <span class="modality-tab-icon"><i data-lucide="wind" style="width:14px;height:14px;"></i></span> Chest X-ray
            <span class="modality-tab-count">1 pending</span>
          </button>
          <button class="modality-tab" data-mod="cancer_screen" onclick="ImagingModule.setModality('cancer_screen', this)">
            <span class="modality-tab-icon"><i data-lucide="microscope" style="width:14px;height:14px;"></i></span> Cancer Screening
          </button>
          <button class="modality-tab" data-mod="skin_review" onclick="ImagingModule.setModality('skin_review', this)">
            <span class="modality-tab-icon"><i data-lucide="stethoscope" style="width:14px;height:14px;"></i></span> Skin Review
            <span class="modality-tab-count">${skinCases.length} pending</span>
          </button>
        </div>

        <!-- Modality content -->
        <div id="imagingContent" style="flex:1;overflow-y:auto;"></div>
      </div>

      <!-- Fullscreen Viewer -->
      <div class="fullscreen-viewer" id="fullscreenViewer">
        <div class="fullscreen-toolbar">
          <div class="flex gap-3 items-center">
            <span id="fullscreenLabel" style="font-weight:700;"></span>
            <span class="wl-indicator" id="wlIndicator">W:400 L:40</span>
          </div>
          <div class="fullscreen-controls">
            <button class="zoom-btn" onclick="ImagingModule.zoomIn()">🔍+</button>
            <button class="zoom-btn" onclick="ImagingModule.zoomOut()">🔍-</button>
            <button class="zoom-btn" onclick="ImagingModule.resetZoom()">↺</button>
            <button class="zoom-btn" onclick="ImagingModule.closeFullscreen()" style="margin-left:8px;background:rgba(255,71,87,0.2);border-color:rgba(255,71,87,0.4);">✕ Close</button>
          </div>
        </div>
        <div class="fullscreen-main" id="fullscreenMain">
          <img class="fullscreen-img" id="fullscreenImg" alt="Medical scan" />
        </div>
      </div>
    `;
  }

  function setModality(mod, btn) {
    currentModality = mod;
    document.querySelectorAll('.modality-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderModalityContent();
  }

  function renderModalityContent() {
    const container = document.getElementById('imagingContent');
    if (!container) return;

    if (currentModality === 'skin_review') {
      container.innerHTML = buildSkinReviewView();
      setTimeout(() => drawSkinThumbnails(), 50);
      return;
    }

    // Check for existing pending result
    const pendingCV = getPendingCVByModality(currentModality);

    if (pendingCV) {
      container.innerHTML = buildResultPanel(currentModality, pendingCV);
      setTimeout(() => animateConfidenceBars(), 100);
    } else {
      container.innerHTML = buildUploadView();
    }
  }

  function getPendingCVByModality(mod) {
    for (const [id, cv] of Object.entries(MOCK_DB.cvScreenings)) {
      if (cv.modality === mod && !cv.reviewed) return cv;
    }
    return null;
  }

  function buildUploadView() {
    const config = MODALITY_CONFIG[currentModality] || MODALITY_CONFIG.brain_mri;
    return `
      <div style="display:flex;flex-direction:column;gap:var(--space-5);">
        <div class="upload-area" id="uploadArea"
             onclick="document.getElementById('fileInput').click()"
             ondragover="ImagingModule.onDragOver(event)"
             ondragleave="ImagingModule.onDragLeave(event)"
             ondrop="ImagingModule.onDrop(event)">
          <div class="upload-icon">${config.icon}</div>
          <div class="upload-title">Upload ${config.label}</div>
          <div class="upload-subtitle">Drag & drop or click to select your scan file</div>
          <div class="upload-formats">Supported: ${config.formats}</div>
          <input type="file" id="fileInput" class="upload-hidden" accept="${config.accept}"
                 onchange="ImagingModule.onFileSelected(event)" />
        </div>
        <div class="analysis-progress" id="analysisProgress">
          <div class="analysis-animation">
            <div class="analysis-ring"></div>
            <div class="analysis-icon">${config.icon}</div>
          </div>
          <div class="analysis-stage" id="analysisStage">Preprocessing image...</div>
          <div class="analysis-substage" id="analysisSubstage">Validating file format and image quality</div>
          <div class="analysis-progress-bar">
            <div class="analysis-progress-fill" id="analysisProgressFill" style="width:0%"></div>
          </div>
          <div class="analysis-steps" id="analysisSteps"></div>
        </div>
        <div class="safety-disclaimer">
          <i data-lucide="alert-triangle" style="width:14px;height:14px;display:inline-block;vertical-align:middle;"></i> <strong>Safety Notice:</strong> AI analysis is a screening aid only. All results require review by a qualified medical professional. Do not use as the sole basis for clinical decisions.
        </div>
      </div>
    `;
  }

  function onDragOver(e) {
    e.preventDefault();
    document.getElementById('uploadArea')?.classList.add('dragover');
  }

  function onDragLeave(e) {
    document.getElementById('uploadArea')?.classList.remove('dragover');
  }

  function onDrop(e) {
    e.preventDefault();
    document.getElementById('uploadArea')?.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) simulateAnalysis(file.name);
  }

  function onFileSelected(e) {
    const file = e.target.files[0];
    if (file) simulateAnalysis(file.name);
  }

  function simulateAnalysis(filename) {
    const uploadArea = document.getElementById('uploadArea');
    const progressEl = document.getElementById('analysisProgress');
    if (uploadArea) uploadArea.style.display = 'none';
    if (progressEl) progressEl.classList.add('active');

    const stages = getStagesForModality(currentModality);
    let stageIdx = 0;
    let progress = 0;

    const stepsHtml = stages.map((s, i) => `
      <div class="analysis-step" id="step-${i}">
        <div class="analysis-step-dot">${i + 1}</div>
        <span>${s.label}</span>
      </div>
    `).join('');
    const stepsEl = document.getElementById('analysisSteps');
    if (stepsEl) stepsEl.innerHTML = stepsHtml;

    document.getElementById('step-0')?.classList.add('active');

    const tick = () => {
      progress += Math.random() * 15 + 5;
      if (progress > 95) progress = 95;

      const fill = document.getElementById('analysisProgressFill');
      if (fill) fill.style.width = progress + '%';

      const stage = stages[Math.min(stageIdx, stages.length - 1)];
      const stageEl = document.getElementById('analysisStage');
      const subEl = document.getElementById('analysisSubstage');
      if (stageEl) stageEl.textContent = stage.label;
      if (subEl) subEl.textContent = stage.sub;

      const prevStep = document.getElementById(`step-${stageIdx - 1}`);
      if (prevStep) { prevStep.classList.remove('active'); prevStep.classList.add('done'); prevStep.querySelector('.analysis-step-dot').textContent = '✓'; }
      const curStep = document.getElementById(`step-${stageIdx}`);
      if (curStep) curStep.classList.add('active');

      stageIdx++;
      if (stageIdx < stages.length) {
        setTimeout(tick, 800 + Math.random() * 600);
      } else {
        setTimeout(() => showResult(), 600);
      }
    };

    setTimeout(tick, 400);
  }

  function getStagesForModality(mod) {
    const map = {
      brain_mri: [
        { label: 'Preprocessing MRI', sub: 'DICOM parsing, intensity normalization, slice extraction' },
        { label: 'Segmentation (Stage 1)', sub: 'U-Net segmenting tumor region from healthy brain tissue' },
        { label: 'Classification (Stage 2)', sub: 'ResNet50 classifying tumor type from segmented region' },
        { label: 'Generating Grad-CAM', sub: 'Computing gradient-weighted class activation heatmap' },
        { label: 'Fetching Clinical Context', sub: 'RAG retrieving relevant neuro-oncology guidelines' },
      ],
      chest_xray: [
        { label: 'Preprocessing X-ray', sub: 'CLAHE contrast enhancement, normalization' },
        { label: 'Multi-label Inference', sub: 'DenseNet-121 running independent sigmoid classification per condition' },
        { label: 'Generating Heatmaps', sub: 'Grad-CAM for each detected condition' },
        { label: 'TB Probability Check', sub: 'Specialized TB detection branch for sensitivity' },
        { label: 'Clinical Context Retrieval', sub: 'RAG fetching pneumonia/TB treatment guidelines' },
      ],
      cancer_screen: [
        { label: 'Modality Detection', sub: 'Auto-identifying scan type from image characteristics' },
        { label: 'Model Routing', sub: 'Selecting appropriate cancer screening model' },
        { label: 'Inference', sub: 'Running forward pass through cancer classification network' },
        { label: 'Explainability', sub: 'Generating saliency maps and uncertainty estimates' },
        { label: 'Severity Mapping', sub: 'Mapping confidence to clinical tier' },
      ],
    };
    return map[mod] || map.brain_mri;
  }

  function showResult() {
    const mockCV = generateMockResult(currentModality);
    currentResult = mockCV;
    const container = document.getElementById('imagingContent');
    if (container) {
      container.innerHTML = buildResultPanel(currentModality, mockCV);
      setTimeout(() => animateConfidenceBars(), 100);
    }
    Notifications.success('AI Analysis Complete', `${MODALITY_CONFIG[currentModality].label} analysis ready for review.`);
  }

  function generateMockResult(modality) {
    if (modality === 'brain_mri') return MOCK_DB.cvScreenings['cv-002'];
    if (modality === 'chest_xray') return MOCK_DB.cvScreenings['cv-003'];
    return {
      id: 'cv-mock',
      patient_id: 'pat-001',
      modality,
      uploaded_by: 'doctor',
      ai_findings: {
        top_class: 'Adenocarcinoma',
        confidence: 0.76,
        probabilities: [
          { label: 'Adenocarcinoma', confidence: 0.76 },
          { label: 'Squamous Cell', confidence: 0.14 },
          { label: 'Large Cell', confidence: 0.06 },
          { label: 'Normal', confidence: 0.04 },
        ],
        tier: 'orange',
        heatmap_note: 'Model attention focused on peripheral spiculated opacity with pleural tethering.',
      },
      reviewed: false,
    };
  }

  function buildResultPanel(modality, cv) {
    if (modality === 'brain_mri') return buildBrainMRIResult(cv);
    if (modality === 'chest_xray') return buildXrayResult(cv);
    return buildCancerResult(cv);
  }

  function buildBrainMRIResult(cv) {
    const f = cv.ai_findings;
    const cls = f.classification || {};
    const seg = f.segmentation || {};
    const tierClass = { red: 'red', orange: 'orange', yellow: 'yellow', green: 'green' }[f.tier] || 'orange';

    const probsHtml = (cls.probabilities || []).map((p, i) => `
      <div class="prob-row">
        <div class="prob-label-row">
          <span class="prob-label">${p.label}</span>
          <span class="prob-value">${Math.round(p.confidence * 100)}%</span>
        </div>
        <div class="prob-track">
          <div class="prob-fill ${i === 0 ? 'top' : i === 1 ? 'med' : 'low'}" data-width="${p.confidence * 100}" style="width:0%"></div>
        </div>
      </div>
    `).join('');

    return `
      <div class="result-panel active">
        <!-- Image Trio -->
        <div class="image-viewer-trio">
          <div class="image-viewer-item" onclick="ImagingModule.openFullscreen('original', 'Original MRI Slice')">
            <div class="image-viewer-label">Original MRI</div>
            <canvas class="image-canvas" id="mriCanvas1" width="300" height="300"></canvas>
            <span class="image-zoom-hint">🔍 Click to zoom</span>
          </div>
          <div class="image-viewer-item" onclick="ImagingModule.openFullscreen('seg', 'Segmentation Overlay')">
            <div class="image-viewer-label">Segmentation</div>
            <canvas class="image-canvas" id="mriCanvas2" width="300" height="300"></canvas>
            <span class="image-zoom-hint">🔍 Click to zoom</span>
          </div>
          <div class="image-viewer-item" onclick="ImagingModule.openFullscreen('gradcam', 'Grad-CAM Heatmap')">
            <div class="image-viewer-label">Grad-CAM</div>
            <canvas class="image-canvas" id="mriCanvas3" width="300" height="300"></canvas>
            <span class="image-zoom-hint">🔍 Click to zoom</span>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap;">
          <div class="overlay-legend flex gap-4" style="margin-top:0">
            <div class="legend-item"><div class="legend-dot et"></div>Enhancing Tumor</div>
            <div class="legend-item"><div class="legend-dot ed"></div>Edema</div>
            <div class="legend-item"><div class="legend-dot ncr"></div>Necrotic Core</div>
          </div>
          <div class="flex items-center gap-2" style="margin-left:auto">
            <label style="font-size:0.75rem;color:var(--text-muted)">Overlay opacity:</label>
            <input type="range" class="heatmap-slider" min="0" max="100" value="70" oninput="ImagingModule.updateOpacity(this.value)" />
          </div>
        </div>

        <!-- Results -->
        <div class="result-summary-card">
          <div class="result-finding">
            <div class="result-finding-header">
              <span class="finding-title">AI Classification</span>
              <span class="badge badge-${tierClass}">${getTierLabel(f.tier)}</span>
            </div>
            <div class="finding-diagnosis">
              ${cls.top_class || 'Glioma'} <span style="font-size:1rem;color:var(--text-secondary);font-weight:400">${Math.round((cls.confidence || 0.78) * 100)}% confidence</span>
            </div>
            <div class="finding-detail">${cls.grade_assessment || 'Features suggest high-grade characteristics.'}</div>

            <div class="tumor-info-box">
              <div class="tumor-metric">
                <div class="tumor-metric-label">Tumor Volume</div>
                <div class="tumor-metric-value">${seg.volume_cm3 || '18.4'} cm³</div>
              </div>
              <div class="tumor-metric">
                <div class="tumor-metric-label">Location</div>
                <div class="tumor-metric-value" style="font-size:0.85rem;">${seg.location || 'Left temporal lobe'}</div>
              </div>
            </div>

            <div style="margin-top:var(--space-3)">
              <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:6px;">Sub-regions detected:</div>
              <div class="subregion-chips">
                <span class="subregion-chip et">Enhancing Tumor</span>
                <span class="subregion-chip ed">Edema</span>
                <span class="subregion-chip ncr">Necrotic Core</span>
              </div>
            </div>
          </div>

          <div class="result-finding">
            <div class="result-finding-header">
              <span class="finding-title">Confidence Breakdown</span>
            </div>
            <div class="probabilities-list">
              ${probsHtml}
            </div>
            <div style="margin-top:var(--space-3);font-size:0.75rem;color:var(--text-muted);">
              📍 ${f.heatmap_note || ''}
            </div>
          </div>
        </div>

        <!-- RAG Clinical Context -->
        <div class="rag-context-panel">
          <div class="rag-context-header"><i data-lucide="bot" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"></i> RAG Clinical Context — Glioma Management</div>
          <div class="rag-context-body" id="ragContextBody">
            <span class="spinner"></span> Loading clinical guidelines...
          </div>
          <div class="rag-sources" id="ragSources"></div>
        </div>

        <!-- Doctor Actions -->
        <div class="doctor-action-bar">
          <span class="action-bar-label">Doctor Decision:</span>
          <button class="btn btn-success" onclick="ImagingModule.confirmFinding('${cv.id}')"><i data-lucide="check" style="width:14px;height:14px;margin-right:4px;"></i> Confirm Finding</button>
          <button class="btn btn-ghost" onclick="ImagingModule.overrideResult('${cv.id}')"><i data-lucide="refresh-cw" style="width:14px;height:14px;margin-right:4px;"></i> Override Assessment</button>
          <button class="btn btn-warning" onclick="App.navigate('referral')"><i data-lucide="hospital" style="width:14px;height:14px;margin-right:4px;"></i> Refer to Neurosurgeon</button>
          <button class="btn btn-ghost" onclick="App.navigate('teleconsult', '${cv.patient_id}')"><i data-lucide="message-circle" style="width:14px;height:14px;margin-right:4px;"></i> Discuss with Patient</button>
          <button class="btn btn-primary btn-sm" onclick="ImagingModule.downloadReport()"><i data-lucide="file-text" style="width:14px;height:14px;margin-right:4px;"></i> Download Report</button>
        </div>

        <div class="safety-disclaimer">
          <i data-lucide="alert-triangle" style="width:14px;height:14px;display:inline-block;vertical-align:middle;"></i> <strong>AI Screening Disclaimer:</strong> Definitive brain tumor diagnosis requires specialist review and histopathological confirmation. This AI result is a screening aid and should not be used as the sole basis for clinical decisions.
        </div>
      </div>
    `;
  }

  function buildXrayResult(cv) {
    const f = cv.ai_findings;
    const tierClass = f.overall_tier || 'orange';

    const findingsHtml = (f.findings || []).map(finding => {
      const prob = Math.round(finding.probability * 100);
      const significant = finding.probability > 0.5;
      const critical = finding.probability > 0.8;
      const isClear = finding.condition === 'Normal';

      return `
        <div class="xray-finding-item ${critical ? 'critical' : significant ? 'significant' : ''}">
          <span class="xray-finding-icon"><i data-lucide="${critical || significant ? 'alert-triangle' : 'check-circle'}" style="width:16px;height:16px;"></i></span>
          <div style="flex:1">
            <div class="flex items-center gap-2">
              <span class="xray-finding-name">${finding.condition}</span>
              ${finding.region ? `<span class="xray-finding-region">— ${finding.region}</span>` : ''}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="xray-finding-prob" style="color:${critical ? 'var(--tier-red)' : significant ? 'var(--tier-orange)' : 'var(--tier-green)'}">${prob}%</span>
            <div class="prob-track" style="width:80px">
              <div class="prob-fill ${critical ? 'top' : significant ? 'med' : 'low'}" data-width="${prob}" style="width:0%"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const tbHtml = f.tb_flag ? `
      <div class="tb-alert-box">
        <span style="font-size:1.5rem;"><i data-lucide="activity" style="width:24px;height:24px;"></i></span>
        <div>
          <div style="font-weight:700;color:var(--tier-yellow);margin-bottom:4px;">TB Screening Protocol Triggered</div>
          <div style="font-size:0.82rem;color:var(--text-secondary);">${f.tb_recommendation}</div>
          <div style="margin-top:var(--space-2);display:flex;gap:var(--space-2);">
            <button class="btn btn-sm btn-warning" onclick="Notifications.success('GeneXpert Ordered', 'Sputum GeneXpert order added to the referral and lab queue.')"><i data-lucide="file-text" style="width:14px;height:14px;margin-right:4px;"></i> Order Sputum GeneXpert</button>
            <button class="btn btn-sm btn-ghost" onclick="Notifications.info('NIKSHAY Notification', 'TB case registered in NIKSHAY surveillance system.')"><i data-lucide="wifi" style="width:14px;height:14px;margin-right:4px;"></i> Notify District TB Officer</button>
          </div>
        </div>
      </div>
    ` : '';

    return `
      <div class="result-panel active">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5);">
          <!-- X-ray image -->
          <div>
            <div class="image-viewer-item" style="aspect-ratio:auto;min-height:300px;" onclick="ImagingModule.openFullscreen('xray','Chest X-ray with Heatmap')">
              <div class="image-viewer-label">X-ray + Heatmap Overlay</div>
              <canvas class="image-canvas" id="xrayCanvas" width="400" height="400"></canvas>
              <span class="image-zoom-hint">🔍 Click to zoom</span>
            </div>
          </div>

          <!-- Findings -->
          <div>
            <div class="result-finding" style="height:100%;">
              <div class="result-finding-header">
                <span class="finding-title">Multi-label Findings</span>
                <span class="badge badge-${tierClass}">${getTierLabel(tierClass)}</span>
              </div>
              <div class="xray-findings-list">${findingsHtml}</div>
            </div>
          </div>
        </div>

        ${tbHtml}

        <!-- RAG Context -->
        <div class="rag-context-panel">
          <div class="rag-context-header"><i data-lucide="bot" style="width:14px;height:14px;margin-right:4px;display:inline-block;vertical-align:middle;"></i> RAG Clinical Context — Pneumonia Management</div>
          <div class="rag-context-body" id="ragContextBody">Loading guidelines...</div>
          <div class="rag-sources" id="ragSources"></div>
        </div>

        <!-- Actions -->
        <div class="doctor-action-bar">
          <span class="action-bar-label">Doctor Decision:</span>
          <button class="btn btn-success" onclick="ImagingModule.confirmFinding('${cv.id}')"><i data-lucide="check" style="width:14px;height:14px;margin-right:4px;"></i> Confirm</button>
          <button class="btn btn-ghost" onclick="ImagingModule.overrideResult('${cv.id}')"><i data-lucide="refresh-cw" style="width:14px;height:14px;margin-right:4px;"></i> Override</button>
          <button class="btn btn-primary" onclick="App.navigate('prescribe', '${cv.patient_id}')"><i data-lucide="pill" style="width:14px;height:14px;margin-right:4px;"></i> Write Prescription</button>
          <button class="btn btn-warning" onclick="App.navigate('referral')"><i data-lucide="hospital" style="width:14px;height:14px;margin-right:4px;"></i> Refer</button>
        </div>
        <div class="safety-disclaimer"><i data-lucide="alert-triangle" style="width:14px;height:14px;display:inline-block;vertical-align:middle;"></i> AI-generated findings require clinical correlation. Results may vary by image quality and patient positioning.</div>
      </div>
    `;
  }

  function buildCancerResult(cv) {
    const f = cv.ai_findings;
    const prob = Math.round((f.confidence || 0) * 100);

    const probsHtml = (f.probabilities || []).map((p, i) => `
      <div class="prob-row">
        <div class="prob-label-row">
          <span class="prob-label">${p.label}</span>
          <span class="prob-value">${Math.round(p.confidence * 100)}%</span>
        </div>
        <div class="prob-track">
          <div class="prob-fill ${i === 0 ? 'top' : i === 1 ? 'med' : 'low'}" data-width="${p.confidence * 100}" style="width:0%"></div>
        </div>
      </div>
    `).join('');

    return `
      <div class="result-panel active">
        <div class="result-summary-card">
          <div class="result-finding">
            <div class="result-finding-header">
              <span class="finding-title">Cancer Screening Result</span>
              <span class="badge badge-orange">🟠 ORANGE</span>
            </div>
            <div class="finding-diagnosis">${f.top_class} <span style="font-size:0.95rem;color:var(--text-secondary)">${prob}%</span></div>
            <div class="finding-detail">Moderate-confidence suspicious finding. Specialist review recommended.</div>
            <div class="probabilities-list">${probsHtml}</div>
          </div>
          <div class="result-finding">
            <div class="result-finding-header"><span class="finding-title">Heatmap</span></div>
            <canvas class="image-canvas" id="cancerCanvas" width="300" height="300"></canvas>
            <p style="font-size:0.75rem;color:var(--text-muted);margin-top:var(--space-2)">📍 ${f.heatmap_note}</p>
          </div>
        </div>
        <div class="doctor-action-bar">
          <span class="action-bar-label">Doctor Decision:</span>
          <button class="btn btn-success" onclick="ImagingModule.confirmFinding('${cv.id}')"><i data-lucide="check" style="width:14px;height:14px;margin-right:4px;"></i> Confirm</button>
          <button class="btn btn-ghost" onclick="ImagingModule.overrideResult('${cv.id}')"><i data-lucide="refresh-cw" style="width:14px;height:14px;margin-right:4px;"></i> Override</button>
          <button class="btn btn-warning" onclick="App.navigate('referral')"><i data-lucide="hospital" style="width:14px;height:14px;margin-right:4px;"></i> Refer to Oncologist</button>
        </div>
        <div class="safety-disclaimer"><i data-lucide="alert-triangle" style="width:14px;height:14px;display:inline-block;vertical-align:middle;"></i> Cancer screening AI is not a diagnostic tool. Histopathological confirmation is required for definitive diagnosis.</div>
      </div>
    `;
  }

  function buildSkinReviewView() {
    const skinCVs = Object.values(MOCK_DB.cvScreenings).filter(cv => cv.modality === 'skin');

    const cardsHtml = skinCVs.map(cv => {
      const patient = getPatient(cv.patient_id);
      const f = cv.ai_findings;
      if (!patient) return '';

      const tierClass = f.tier || 'yellow';
      const prob = Math.round(f.confidence * 100);

      return `
        <div class="card cursor-pointer" onclick="ImagingModule.openSkinDetail('${cv.id}')">
          <div class="card-header">
            <div>
              <div style="font-weight:700;">${patient.name}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${patient.gender}/${patient.age} · ${patient.village}</div>
            </div>
            <span class="badge badge-${tierClass}">${getTierLabel(tierClass)}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-3)">
            <div>
              <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:4px">AI Classification</div>
              <div style="font-weight:700;">${f.top_class}</div>
              <div style="font-size:0.8rem;color:var(--text-secondary)">${prob}% confidence</div>
            </div>
            <div>
              <canvas width="100" height="100" style="width:100%;aspect-ratio:1;background:#111;border-radius:8px;" id="skinThumb-${cv.id}"></canvas>
            </div>
          </div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:var(--space-3)">📍 ${f.heatmap_note}</div>
          <div class="flex gap-2">
            <button class="btn btn-sm btn-success" onclick="event.stopPropagation();ImagingModule.confirmSkin('${cv.id}')"><i data-lucide="check" style="width:14px;height:14px;margin-right:4px;"></i> Confirm AI Result</button>
            <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();ImagingModule.overrideSkin('${cv.id}')"><i data-lucide="refresh-cw" style="width:14px;height:14px;margin-right:4px;"></i> Override</button>
            <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();ImagingModule.requestClearer('${cv.id}')"><i data-lucide="camera" style="width:14px;height:14px;margin-right:4px;"></i> Request Clearer Photo</button>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div>
        <div class="alert alert-info" style="margin-bottom:var(--space-4)">
          <i data-lucide="info" style="width:14px;height:14px;margin-right:4px;display:inline-block;vertical-align:middle;"></i> These skin screenings were performed by patients using the Patient Panel on-device CV model. Your review serves as the safety net for false positives/negatives.
        </div>
        <div class="grid-2" id="skinReviewCards">${cardsHtml || '<div class="empty-state"><div class="empty-icon"><i data-lucide="microscope" style="width:32px;height:32px;"></i></div><div class="empty-title">No pending skin reviews</div></div>'}</div>
      </div>
    `;
  }

  function confirmFinding(cvId) {
    const cv = MOCK_DB.cvScreenings[cvId];
    if (cv) {
      cv.reviewed = true;
      cv.doctor_agrees_with_ai = true;
    }
    Notifications.success('Finding Confirmed', 'Your assessment has been logged and added to patient history.');
    setTimeout(() => renderModalityContent(), 500);
  }

  function overrideResult(cvId) {
    const reason = prompt('Please enter the clinical reason for overriding the AI assessment:');
    if (!reason) return;
    const cv = MOCK_DB.cvScreenings[cvId];
    if (cv) { cv.reviewed = true; cv.doctor_agrees_with_ai = false; cv.doctor_assessment = reason; }
    CaseQueue.addAuditEntry({ type: 'override', cvId, reason, doctor: MOCK_DB.currentDoctor.name });
    Notifications.warning('Assessment Override Logged', 'Your clinical judgment has been recorded with the stated reason.');
    setTimeout(() => renderModalityContent(), 500);
  }

  function confirmSkin(cvId) { confirmFinding(cvId); renderModalityContent(); }
  function overrideSkin(cvId) { overrideResult(cvId); renderModalityContent(); }
  function requestClearer(cvId) {
    Notifications.info('Photo Request Sent', 'Patient will receive a WhatsApp message asking for a clearer photo of the lesion.');
  }

  function openSkinDetail(cvId) {
    const cv = MOCK_DB.cvScreenings[cvId];
    const patient = getPatient(cv?.patient_id);
    if (!cv || !patient) {
      Notifications.error('Skin Review Unavailable', 'The selected screening record could not be found.');
      return;
    }

    const f = cv.ai_findings;
    const probabilities = (f.probabilities || []).map(p => `
      <div class="prob-row">
        <div class="prob-label-row">
          <span class="prob-label">${p.label}</span>
          <span class="prob-value">${Math.round(p.confidence * 100)}%</span>
        </div>
        <div class="prob-track">
          <div class="prob-fill ${p.confidence > 0.75 ? 'top' : p.confidence > 0.35 ? 'med' : 'low'}" style="width:${p.confidence * 100}%"></div>
        </div>
      </div>
    `).join('');

    showModal(
      `Skin Screening Review · ${patient.name}`,
      `
        <div class="skin-review-grid" style="grid-template-columns:220px 1fr;align-items:start;">
          <div>
            <canvas id="skinDetailCanvas" width="220" height="220" style="width:100%;aspect-ratio:1;background:#111;border-radius:8px;border:1px solid var(--surface-border);"></canvas>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:var(--space-2);">Patient panel CV capture · ${formatTimeAgo(cv.created_at)}</div>
          </div>
          <div>
            <div class="flex items-center gap-2" style="margin-bottom:var(--space-3);">
              <span class="badge badge-${f.tier}">${getTierLabel(f.tier)}</span>
              <span style="font-size:0.82rem;color:var(--text-secondary);">${patient.gender}/${patient.age} · ${patient.village}</span>
            </div>
            <div class="finding-diagnosis" style="font-size:1.2rem;">${f.top_class} <span style="font-size:0.9rem;color:var(--text-secondary);font-weight:500">${Math.round(f.confidence * 100)}%</span></div>
            <div class="finding-detail">${f.heatmap_note || 'No heatmap note available.'}</div>
            <div class="probabilities-list">${probabilities}</div>
            <div class="doctor-action-bar" style="margin-top:var(--space-4);padding:var(--space-3);">
              <button class="btn btn-success btn-sm" onclick="ImagingModule.confirmSkin('${cv.id}');document.querySelector('.modal-backdrop')?.remove()"><i data-lucide="check" style="width:14px;height:14px;margin-right:4px;"></i> Confirm AI Result</button>
              <button class="btn btn-ghost btn-sm" onclick="ImagingModule.overrideSkin('${cv.id}');document.querySelector('.modal-backdrop')?.remove()"><i data-lucide="refresh-cw" style="width:14px;height:14px;margin-right:4px;"></i> Override</button>
              <button class="btn btn-ghost btn-sm" onclick="ImagingModule.requestClearer('${cv.id}')"><i data-lucide="camera" style="width:14px;height:14px;margin-right:4px;"></i> Request Clearer Photo</button>
              <button class="btn btn-primary btn-sm" onclick="App.navigate('case-detail','${MOCK_DB.cases.find(c => c.cv_screening_id === cv.id)?.id || MOCK_DB.cases[0].id}');document.querySelector('.modal-backdrop')?.remove()"><i data-lucide="folder-open" style="width:14px;height:14px;margin-right:4px;"></i> Open Case</button>
            </div>
          </div>
        </div>
      `,
      null,
      null
    );

    setTimeout(() => drawSkinCanvas(document.getElementById('skinDetailCanvas'), f.tier), 20);
  }

  function downloadReport() {
    Notifications.success('Report Downloaded', 'Imaging report PDF has been generated and saved.');
  }

  function animateConfidenceBars() {
    document.querySelectorAll('.prob-fill, .confidence-fill').forEach(el => {
      const w = el.dataset.width;
      if (w) el.style.width = w + '%';
    });
    // Draw canvases
    drawMockMRI();
    drawMockXray();
    // Load RAG context
    loadRAGContext();
  }

  function drawMockMRI() {
    const drawBrainMRI = (canvasId, variant) => {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height;

      // Dark background
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, w, h);

      // Brain outline
      ctx.beginPath();
      ctx.ellipse(w/2, h/2, w*0.38, h*0.44, 0, 0, Math.PI*2);
      ctx.fillStyle = variant === 'original' ? '#2a2040' : '#1a1a2e';
      ctx.fill();

      // Gray matter
      ctx.beginPath();
      ctx.ellipse(w/2, h/2, w*0.34, h*0.40, 0, 0, Math.PI*2);
      ctx.fillStyle = variant === 'original' ? '#4a3a6a' : '#262640';
      ctx.fill();

      // White matter
      ctx.beginPath();
      ctx.ellipse(w/2, h/2, w*0.24, h*0.30, 0, 0, Math.PI*2);
      ctx.fillStyle = variant === 'original' ? '#6a5a8a' : '#303060';
      ctx.fill();

      if (variant === 'seg') {
        // Tumor region - enhancing (red)
        ctx.beginPath();
        ctx.ellipse(w*0.38, h*0.42, w*0.09, h*0.08, 0.3, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,71,87,0.7)';
        ctx.fill();

        // Edema (blue)
        ctx.beginPath();
        ctx.ellipse(w*0.38, h*0.42, w*0.14, h*0.13, 0.3, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(61,157,232,0.35)';
        ctx.fill();

        // Necrotic core (yellow/orange)
        ctx.beginPath();
        ctx.ellipse(w*0.37, h*0.41, w*0.04, h*0.035, 0.2, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,165,2,0.8)';
        ctx.fill();
      }

      if (variant === 'gradcam') {
        // Heat gradient overlay
        const radGrad = ctx.createRadialGradient(w*0.38, h*0.42, 5, w*0.38, h*0.42, w*0.18);
        radGrad.addColorStop(0, 'rgba(255,71,87,0.9)');
        radGrad.addColorStop(0.3, 'rgba(255,165,2,0.6)');
        radGrad.addColorStop(0.6, 'rgba(255,255,0,0.3)');
        radGrad.addColorStop(1, 'rgba(0,0,255,0)');
        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // Anatomical detail lines
      ctx.strokeStyle = variant === 'original' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.moveTo(w*0.15, h*(0.15 + i*0.06));
        ctx.bezierCurveTo(w*0.3, h*(0.12 + i*0.06), w*0.7, h*(0.12 + i*0.06), w*0.85, h*(0.15 + i*0.06));
        ctx.stroke();
      }
    };

    drawBrainMRI('mriCanvas1', 'original');
    drawBrainMRI('mriCanvas2', 'seg');
    drawBrainMRI('mriCanvas3', 'gradcam');

    // X-ray canvas
    const xrayCanvas = document.getElementById('xrayCanvas');
    if (xrayCanvas) drawMockXray(xrayCanvas);
    const cancerCanvas = document.getElementById('cancerCanvas');
    if (cancerCanvas) drawCancerCanvas(cancerCanvas);
  }

  function drawMockXray(canvas) {
    if (!canvas) canvas = document.getElementById('xrayCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;

    ctx.fillStyle = '#020204';
    ctx.fillRect(0, 0, w, h);

    // Chest outline
    ctx.beginPath();
    ctx.ellipse(w/2, h*0.55, w*0.44, h*0.42, 0, 0, Math.PI*2);
    ctx.fillStyle = '#1a1a2a';
    ctx.fill();

    // Lungs
    ctx.beginPath();
    ctx.ellipse(w*0.35, h*0.52, w*0.18, h*0.32, -0.1, 0, Math.PI*2);
    ctx.fillStyle = '#2a2a3a';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(w*0.65, h*0.52, w*0.18, h*0.32, 0.1, 0, Math.PI*2);
    ctx.fillStyle = '#2a2a3a';
    ctx.fill();

    // Spine
    ctx.fillStyle = '#888';
    ctx.fillRect(w/2-4, h*0.1, 8, h*0.8);

    // Ribs
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(w/2, h*(0.25 + i*0.07), w*0.32, -Math.PI*0.7, -Math.PI*0.3);
      ctx.strokeStyle = 'rgba(180,180,180,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w/2, h*(0.25 + i*0.07), w*0.32, -Math.PI*0.7, -Math.PI*0.3);
      ctx.arc(w/2, h*(0.25 + i*0.07), w*0.32, Math.PI*0.3, Math.PI*0.7, true);
      ctx.strokeStyle = 'rgba(180,180,180,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Pneumonia infiltrate — right lower lobe
    const radGrad = ctx.createRadialGradient(w*0.68, h*0.68, 5, w*0.68, h*0.68, w*0.15);
    radGrad.addColorStop(0, 'rgba(255,165,2,0.5)');
    radGrad.addColorStop(0.5, 'rgba(255,107,53,0.25)');
    radGrad.addColorStop(1, 'rgba(255,71,87,0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, w, h);

    // Heart
    ctx.beginPath();
    ctx.ellipse(w*0.44, h*0.52, w*0.09, h*0.12, -0.2, 0, Math.PI*2);
    ctx.fillStyle = '#3a3050';
    ctx.fill();
  }

  function drawCancerCanvas(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = '#020204';
    ctx.fillRect(0, 0, w, h);

    ctx.beginPath();
    ctx.ellipse(w/2, h*0.55, w*0.42, h*0.40, 0, 0, Math.PI*2);
    ctx.fillStyle = '#1a1a2a';
    ctx.fill();

    // Nodule
    ctx.beginPath();
    ctx.ellipse(w*0.6, h*0.38, w*0.07, h*0.06, 0.3, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();

    const radGrad = ctx.createRadialGradient(w*0.6, h*0.38, 5, w*0.6, h*0.38, w*0.15);
    radGrad.addColorStop(0, 'rgba(255,71,87,0.8)');
    radGrad.addColorStop(0.4, 'rgba(255,165,2,0.4)');
    radGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, w, h);
  }

  function drawSkinThumbnails() {
    Object.values(MOCK_DB.cvScreenings)
      .filter(cv => cv.modality === 'skin')
      .forEach(cv => drawSkinCanvas(document.getElementById(`skinThumb-${cv.id}`), cv.ai_findings.tier));
  }

  function drawSkinCanvas(canvas, tier = 'yellow') {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const tone = tier === 'red' ? '#8b5f4a' : '#9a6d57';

    ctx.fillStyle = '#1b1210';
    ctx.fillRect(0, 0, w, h);
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w * 0.42, h * 0.38, -0.25, 0, Math.PI * 2);
    ctx.fillStyle = tone;
    ctx.fill();

    const grad = ctx.createRadialGradient(w * 0.52, h * 0.48, 3, w * 0.52, h * 0.48, w * 0.2);
    grad.addColorStop(0, tier === 'red' ? 'rgba(50,18,18,0.95)' : 'rgba(170,80,55,0.9)');
    grad.addColorStop(0.45, tier === 'red' ? 'rgba(80,28,35,0.75)' : 'rgba(220,110,70,0.45)');
    grad.addColorStop(1, 'rgba(255,180,80,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = tier === 'red' ? 'rgba(255,71,87,0.9)' : 'rgba(255,165,2,0.75)';
    ctx.lineWidth = Math.max(2, w * 0.015);
    ctx.beginPath();
    ctx.ellipse(w * 0.52, h * 0.48, w * 0.13, h * 0.09, 0.35, 0, Math.PI * 2);
    ctx.stroke();
  }

  function loadRAGContext() {
    const bodyEl = document.getElementById('ragContextBody');
    const sourcesEl = document.getElementById('ragSources');
    if (!bodyEl) return;

    const key = currentModality === 'brain_mri' ? 'glioma management' : 'pneumonia treatment';
    const response = MOCK_DB.ragResponses[key];

    if (!response) {
      bodyEl.textContent = 'RAG assistant unavailable. Try again shortly.';
      return;
    }

    setTimeout(() => {
      bodyEl.innerHTML = response.answer
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');

      if (sourcesEl) {
        sourcesEl.innerHTML = response.sources.map(s =>
          `<span class="rag-source-pill">📚 ${s}</span>`
        ).join('');
      }
    }, 800);
  }

  function openFullscreen(type, label) {
    const viewer = document.getElementById('fullscreenViewer');
    const img = document.getElementById('fullscreenImg');
    const labelEl = document.getElementById('fullscreenLabel');
    if (!viewer || !img) return;

    // Convert canvas to data URL
    const canvasMap = { original: 'mriCanvas1', seg: 'mriCanvas2', gradcam: 'mriCanvas3', xray: 'xrayCanvas' };
    const canvasId = canvasMap[type];
    const canvas = document.getElementById(canvasId);
    if (canvas) {
      img.src = canvas.toDataURL();
    }

    if (labelEl) labelEl.textContent = label;
    viewer.classList.add('active');
    zoom = 1;
    img.style.transform = `scale(${zoom})`;
  }

  function closeFullscreen() {
    document.getElementById('fullscreenViewer')?.classList.remove('active');
  }

  function zoomIn() {
    zoom = Math.min(zoom * 1.25, 5);
    const img = document.getElementById('fullscreenImg');
    if (img) img.style.transform = `scale(${zoom})`;
  }

  function zoomOut() {
    zoom = Math.max(zoom / 1.25, 0.3);
    const img = document.getElementById('fullscreenImg');
    if (img) img.style.transform = `scale(${zoom})`;
  }

  function resetZoom() {
    zoom = 1;
    const img = document.getElementById('fullscreenImg');
    if (img) img.style.transform = `scale(${zoom})`;
  }

  function updateOpacity(val) { /* overlay opacity for canvas compositing */ }

  return {
    buildImagingScreen, setModality, renderModalityContent,
    onDragOver, onDragLeave, onDrop, onFileSelected,
    confirmFinding, overrideResult, confirmSkin, overrideSkin, requestClearer,
    openSkinDetail, downloadReport, animateConfidenceBars, openFullscreen, closeFullscreen,
    zoomIn, zoomOut, resetZoom, updateOpacity, drawMockMRI, drawMockXray
  };
})();
