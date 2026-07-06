import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  ChevronRight, Activity, X, User, Calendar, MapPin, Search, 
  AlertTriangle, CheckCircle, Pill, MessageSquare, Send, FileText, 
  Map, Upload, RefreshCw, Eye, AlertCircle, ArrowRight, ShieldCheck 
} from "lucide-react";
import { 
  MOCK_DB, getCasesByTier, formatTimeAgo, getPatient, 
  getVitals, getCVScreening, getHistory, getTierLabel 
} from "../../lib/hospitalData";
import { supabase } from "../../lib/supabaseClient";
import TierBadge from "../../components/TierBadge";
import PulseDivider from "../../components/PulseDivider";

export default function HospitalDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "queue";
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // --- Dynamic Dashboard States ---
  const [cases, setCases] = useState<any[]>(MOCK_DB.cases);
  const [patients, setPatients] = useState<any[]>(MOCK_DB.patients);
  const [vitals, setVitals] = useState<Record<string, any>>(MOCK_DB.vitals);
  const [histories, setHistories] = useState<Record<string, any[]>>(MOCK_DB.history);
  const [prescriptions, setPrescriptions] = useState<Record<string, any[]>>(MOCK_DB.prescriptions);
  
  // --- Feature States ---
  // 1. Tier Override Modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideTier, setOverrideTier] = useState<"green" | "yellow" | "orange" | "red">("green");
  const [overrideJustification, setOverrideJustification] = useState("");

  // 2. Referral Modal
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralFacility, setReferralFacility] = useState(MOCK_DB.facilities[2].id);
  const [referralDept, setReferralDept] = useState("Oncology");
  const [referralUrgency, setReferralUrgency] = useState<"routine" | "urgent" | "emergency">("urgent");
  const [referralReason, setReferralReason] = useState("");

  // 3. E-Prescription Pad
  const [showPrescriptionPad, setShowPrescriptionPad] = useState(false);
  const [prescribedMeds, setPrescribedMeds] = useState<any[]>([
    { name: "Azithromycin", dosage: "500mg", frequency: "once_daily", duration: "5 days", instructions: "Take after meals" }
  ]);
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [includeAyush, setIncludeAyush] = useState(false);
  const [selectedAyushCodes, setSelectedAyushCodes] = useState<string[]>([]);
  const [interactionWarning, setInteractionWarning] = useState<string | null>(null);

  // 4. Clinical RAG assistant
  const [ragQuery, setRagQuery] = useState("");
  const [ragHistory, setRagHistory] = useState<any[]>([]);
  const [isRagLoading, setIsRagLoading] = useState(false);

  // 5. Medical Imaging Upload & Simulated AI
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedModality, setSelectedModality] = useState<"mri" | "xray" | "ct">("mri");
  const [aiStatus, setAiStatus] = useState<"idle" | "preprocessing" | "segmenting" | "classifying" | "done">("idle");
  const [aiResult, setAiResult] = useState<any>(null);

  // --- Search state ---
  const [patientSearch, setPatientSearch] = useState("");

  // --- Real Supabase Data ---
  const [realChatMessages, setRealChatMessages] = useState<any[]>([]);
  const [realCareAdvice, setRealCareAdvice] = useState<any>(null);

  useEffect(() => {
    if (!selectedCaseId) return;
    
    // For demo purposes: fetch the most recent chat session's messages and insights
    const fetchRealData = async () => {
      try {
        const { data: sessions } = await supabase
          .from('chat_sessions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (sessions && sessions.length > 0) {
          const sessionId = sessions[0].id;
          const { data: msgs } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });
          if (msgs) setRealChatMessages(msgs);
          
          const { data: insights } = await supabase
            .from('agent_insights')
            .select('*')
            .eq('session_id', sessionId)
            .eq('insight_type', 'care_advice')
            .order('created_at', { ascending: false })
            .limit(1);
          if (insights && insights.length > 0) {
            setRealCareAdvice(insights[0].payload.advice);
          } else {
            setRealCareAdvice(null);
          }
        }
      } catch (err) {
        console.error("Failed to fetch real data:", err);
      }
    };
    fetchRealData();
  }, [selectedCaseId]);

  // Helpers
  const currentCase = cases.find(c => c.id === selectedCaseId);
  const currentPatient = currentCase ? patients.find(p => p.id === currentCase.patient_id) : null;
  const currentVitals = currentCase ? vitals[currentCase.patient_id] : null;
  const currentHistory = currentCase ? histories[currentCase.patient_id] || [] : [];
  const currentPrescriptions = currentCase ? prescriptions[currentCase.patient_id] || [] : [];

  // --- Handlers ---
  const handleAcceptCase = () => {
    if (!selectedCaseId) return;
    setCases(prev => prev.map(c => c.id === selectedCaseId ? { ...c, status: "in_consultation" } : c));
    alert("Case accepted and consultation initiated!");
  };

  const handleOpenOverride = () => {
    if (!currentCase) return;
    setOverrideTier(currentCase.tier);
    setOverrideJustification("");
    setShowOverrideModal(true);
  };

  const handleSaveOverride = () => {
    if (!selectedCaseId || !currentCase) return;
    
    // Update case tier
    setCases(prev => prev.map(c => c.id === selectedCaseId ? { ...c, tier: overrideTier } : c));
    
    // Update patient current tier
    setPatients(prev => prev.map(p => p.id === currentCase.patient_id ? { ...p, current_tier: overrideTier } : p));
    
    // Log in patient history
    const historyEntry = {
      id: `hist-override-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'triage_override',
      summary: `Triage Tier overridden to ${overrideTier.toUpperCase()} by Dr. Priya Sharma`,
      details: `Justification: ${overrideJustification}`,
    };
    setHistories(prev => ({
      ...prev,
      [currentCase.patient_id]: [historyEntry, ...(prev[currentCase.patient_id] || [])]
    }));

    setShowOverrideModal(false);
    alert(`Triage tier overridden to ${overrideTier.toUpperCase()} successfully.`);
  };

  const handleOpenReferral = () => {
    setReferralReason("");
    setShowReferralModal(true);
  };

  const handleSaveReferral = () => {
    if (!selectedCaseId || !currentCase) return;
    const targetFac = MOCK_DB.facilities.find(f => f.id === referralFacility);
    
    // Log referral
    const historyEntry = {
      id: `hist-referral-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'referral',
      summary: `Referred to ${targetFac?.name} (${referralDept})`,
      details: `Urgency: ${referralUrgency.toUpperCase()}. Reason: ${referralReason}`,
    };
    setHistories(prev => ({
      ...prev,
      [currentCase.patient_id]: [historyEntry, ...(prev[currentCase.patient_id] || [])]
    }));

    // Update case status to referred
    setCases(prev => prev.map(c => c.id === selectedCaseId ? { ...c, status: "referred" } : c));

    setShowReferralModal(false);
    setSelectedCaseId(null);
    alert(`Patient referred to ${targetFac?.name} successfully.`);
  };

  // Meds list interaction & interaction checks
  const handleMedChange = (index: number, field: string, value: string) => {
    const updated = [...prescribedMeds];
    updated[index][field] = value;
    setPrescribedMeds(updated);

    // Drug interaction check: Metformin + Ibuprofen
    const allMedNames = updated.map(m => m.name.toLowerCase());
    
    // Check if Ibuprofen is in the new prescription list, and Metformin is either in the list or patient's history/active prescriptions
    const hasIbuprofen = allMedNames.includes("ibuprofen");
    const hasMetformin = allMedNames.includes("metformin") || 
      (currentPatient?.known_conditions?.includes("type_2_diabetes") || false);

    if (hasIbuprofen && hasMetformin) {
      setInteractionWarning(
        "⚠️ Drug Interaction Alert: Metformin + Ibuprofen (Moderate Risk). NSAIDs may reduce renal clearance, increasing the risk of lactic acidosis. Consider using Paracetamol instead."
      );
    } else {
      setInteractionWarning(null);
    }
  };

  const handleAddMed = () => {
    setPrescribedMeds([...prescribedMeds, { name: "Paracetamol", dosage: "650mg", frequency: "thrice_daily", duration: "3 days", instructions: "Take for fever" }]);
  };

  const handleRemoveMed = (index: number) => {
    const updated = prescribedMeds.filter((_, i) => i !== index);
    setPrescribedMeds(updated);
    if (!updated.some(m => m.name.toLowerCase() === "ibuprofen")) {
      setInteractionWarning(null);
    }
  };

  const handleSavePrescription = () => {
    if (!selectedCaseId || !currentCase) return;

    // Create prescription object
    const newPrescription = {
      id: `presc-${Date.now()}`,
      doctor: "Dr. Priya Sharma",
      date: new Date().toISOString().split('T')[0],
      medications: prescribedMeds.map(m => `${m.name} ${m.dosage} (${m.frequency} for ${m.duration})`),
      ayush: includeAyush ? selectedAyushCodes.map(code => MOCK_DB.ayushFormulations.find(f => f.code === code)?.name).filter(Boolean) : [],
      notes: prescriptionNotes
    };

    setPrescriptions(prev => ({
      ...prev,
      [currentCase.patient_id]: [newPrescription, ...(prev[currentCase.patient_id] || [])]
    }));

    // Add to history
    const historyEntry = {
      id: `hist-presc-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'prescription',
      summary: `E-Prescription issued by Dr. Priya Sharma`,
      details: `${prescribedMeds.map(m => `${m.name} ${m.dosage}`).join(', ')}.${includeAyush ? ' Included AYUSH wellness advice.' : ''}`,
    };
    setHistories(prev => ({
      ...prev,
      [currentCase.patient_id]: [historyEntry, ...(prev[currentCase.patient_id] || [])]
    }));

    setShowPrescriptionPad(false);
    alert("E-Prescription logged and dispatched to patient via WhatsApp/SMS!");
  };

  // Clinical RAG Query Simulation
  const handleSendRagQuery = (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const queryText = customQuery || ragQuery;
    if (!queryText.trim()) return;

    setIsRagLoading(true);
    setRagQuery("");

    setTimeout(() => {
      // Look up in our simulated QA DB or return a default response
      const cleanKey = queryText.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
      let match = Object.entries(MOCK_DB.ragResponses as Record<string, any>).find(([k]) => cleanKey.includes(k) || k.includes(cleanKey));
      
      let answer = "";
      let sources: string[] = [];

      if (match) {
        answer = match[1].answer;
        sources = match[1].sources;
      } else {
        answer = `### Clinical Guidelines for: "${queryText}"\n\nBased on standard ICMR and WHO protocols for low-resource settings, we recommend:\n\n1. **Diagnostic Workup**: Confirm primary symptoms, assess vital stability (SpO₂ threshold >92%, Temp <38.5°C).\n2. **Triage Classification**: If symptoms persist or escalate, shift patient category to **Orange** or **Red**.\n3. **Therapeutic Protocol**: Initiate first-line symptomatic relief, or schedule immediate specialist teleconsult.\n\n*Consult local institutional guidelines for detailed dosage information.*`;
        sources = ["WHO Primary Care Guidelines 2024", "ICMR Rural Clinical Pathways"];
      }

      setRagHistory(prev => [...prev, { query: queryText, answer, sources }]);
      setIsRagLoading(false);
    }, 1000);
  };

  // Helper to create a dummy image to send to the backend
  const createDummyBlob = (): Blob => {
    const byteString = atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: "image/png" });
  };

  // Simulated & Live AI Imaging Analysis
  const handleUploadImage = async (modality: "mri" | "xray" | "ct") => {
    setSelectedModality(modality);
    setUploadedImage("upload-placeholder");
    setAiStatus("preprocessing");

    const fileBlob = createDummyBlob();
    const formData = new FormData();
    formData.append("file", fileBlob, "scan.png");

    let url = "";
    if (modality === "mri" || modality === "ct") {
      url = "http://localhost:8003/predict";
    } else {
      url = "http://localhost:8004/predict";
    }

    // Preprocessing step
    setTimeout(() => {
      setAiStatus("segmenting");
      
      // Segmentation step
      setTimeout(async () => {
        setAiStatus("classifying");
        
        try {
          const res = await fetch(url, {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            throw new Error(`Server returned ${res.status}: ${res.statusText}`);
          }

          const data = await res.json();
          setAiStatus("done");

          if (modality === "mri") {
            const condition = data.top_class || "Glioma";
            const isNoTumor = condition.toLowerCase() === "no tumor";
            setAiResult({
              type: isNoTumor ? "No Tumor Detected" : `${condition} (Brain Tumor)`,
              confidence: data.confidence || 0.85,
              volume: isNoTumor ? "0 cm³" : "18.4 cm³ (Estimated)",
              heatmapNote: isNoTumor ? "Clear scans. No abnormal enhancements observed." : `High localization weight for suspected ${condition} in temporal lobe.`,
              severity: isNoTumor ? "green" : (condition.toLowerCase() === "glioma" ? "red" : "orange")
            });
          } else if (modality === "xray") {
            const condition = data.top_class || "Pneumonia";
            const isNormal = condition.toLowerCase() === "normal";
            setAiResult({
              type: isNormal ? "Clear Chest Scan" : `${condition} Pathologies`,
              confidence: data.confidence || 0.85,
              volume: "N/A",
              heatmapNote: isNormal ? "Lungs are clear. No active consolidation." : `Consolidation weight indicates suspected ${condition} in lung zones.`,
              severity: isNormal ? "green" : (condition.toLowerCase() === "tuberculosis" ? "red" : "orange")
            });
          } else {
            // Cancer CT (CT also hits brain tumor model as fallback/demo)
            const condition = data.top_class || "Glioma";
            setAiResult({
              type: `Adenocarcinoma (${condition} classifier fallback)`,
              confidence: data.confidence || 0.79,
              volume: "2.8 cm³ nodule",
              heatmapNote: `Spiculated nodule detected. Classifier mapped to ${condition}.`,
              severity: "red"
            });
          }
        } catch (err) {
          console.error("Local ML Imaging service call failed:", err);
          setAiStatus("done");
          
          if (modality === "mri") {
            setAiResult({
              type: "Glioma (Brain Tumor - Fallback)",
              confidence: 0.86,
              volume: "18.4 cm³",
              heatmapNote: "High localization weight (T1-weighted Gd contrast enhancement) in the right temporal lobe. (Fallback - port 8003 offline)",
              severity: "red"
            });
          } else if (modality === "xray") {
            setAiResult({
              type: "Bilateral Pneumonia (Fallback)",
              confidence: 0.92,
              volume: "N/A",
              heatmapNote: "Consolidation patterns marked clearly in both lower lobes. (Fallback - port 8004 offline)",
              severity: "orange"
            });
          } else {
            setAiResult({
              type: "Adenocarcinoma (Lung - Fallback)",
              confidence: 0.79,
              volume: "2.8 cm³ nodule",
              heatmapNote: "Spiculated nodule detected in the upper left lung quadrant. (Fallback - port 8003 offline)",
              severity: "red"
            });
          }
        }
      }, 1000);
    }, 1000);
  };

  const handleConfirmAiResult = () => {
    if (!selectedCaseId || !currentCase || !aiResult) return;

    // Update case tier based on AI severity if needed
    setCases(prev => prev.map(c => c.id === selectedCaseId ? { ...c, tier: aiResult.severity, symptom_summary: `AI Confirmed: ${aiResult.type}. ${c.symptom_summary}` } : c));
    
    // Add to history
    const historyEntry = {
      id: `hist-ai-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'imaging',
      summary: `AI Imaging Result Confirmed: ${aiResult.type}`,
      details: `Confidence: ${Math.round(aiResult.confidence * 100)}%. ${aiResult.heatmapNote}`,
    };
    setHistories(prev => ({
      ...prev,
      [currentCase.patient_id]: [historyEntry, ...(prev[currentCase.patient_id] || [])]
    }));

    setUploadedImage(null);
    setAiStatus("idle");
    setAiResult(null);
    alert("AI Imaging findings confirmed and added to patient history!");
  };

  // Filtering views
  const filteredCases = cases.filter(c => c.status === "pending" || c.status === "in_consultation");
  const redCases = filteredCases.filter(c => c.tier === "red");
  const orangeCases = filteredCases.filter(c => c.tier === "orange");
  const yellowCases = filteredCases.filter(c => c.tier === "yellow");
  const greenCases = filteredCases.filter(c => c.tier === "green");

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) || 
    p.abha_id.toLowerCase().includes(patientSearch.toLowerCase())
  );

  // --- Sub-renderers ---
  const renderQueueItem = (caseData: any) => {
    const patient = patients.find(p => p.id === caseData.patient_id);
    const patientVitals = vitals[caseData.patient_id];
    return (
      <div 
        key={caseData.id} 
        onClick={() => setSelectedCaseId(caseData.id)}
        className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all hover:border-teal-400 hover:shadow-md mb-3 ${
          selectedCaseId === caseData.id ? 'border-teal-500 bg-teal-50/20' : 'border-ink/10 bg-white'
        }`}
      >
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1">
            <TierBadge tier={caseData.tier} size="md" />
            <span className="text-[10px] font-bold text-ink/40">{formatTimeAgo(caseData.created_at)}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-ink">{patient?.name}</h4>
              <span className="text-xs font-semibold text-ink/60">{patient?.age}{patient?.gender} · {patient?.abha_id}</span>
              {caseData.status === "in_consultation" && (
                <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold text-teal-700">In Consult</span>
              )}
            </div>
            <p className="mt-1 text-sm text-ink/70">{caseData.symptom_summary}</p>
            
            <div className="mt-2 flex gap-3 text-xs font-medium">
              <span className={`rounded px-1.5 py-0.5 ${patientVitals?.spo2 < 92 ? 'bg-tier-red-bg text-tier-red' : 'bg-ink/5 text-ink/60'}`}>
                SpO₂ {patientVitals?.spo2}%
              </span>
              <span className={`rounded px-1.5 py-0.5 ${patientVitals?.bp_sys > 140 ? 'bg-tier-yellow-bg text-tier-yellow' : 'bg-ink/5 text-ink/60'}`}>
                BP {patientVitals?.bp_sys}/{patientVitals?.bp_dia}
              </span>
              <span className="rounded bg-ink/5 px-1.5 py-0.5 text-ink/60">
                Temp {patientVitals?.temp}°C
              </span>
            </div>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-ink/30" />
      </div>
    );
  };

  const renderQueue = () => {
    return (
      <div className="animate-fade-in mx-auto max-w-4xl">
        <div className="mb-6 grid grid-cols-4 gap-4">
          <div className="rounded-xl border border-tier-red/20 bg-tier-red-bg p-4 shadow-sm text-center">
            <div className="text-2xl font-bold text-tier-red">{redCases.length}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-tier-red/70">Red / Critical</div>
          </div>
          <div className="rounded-xl border border-tier-orange/20 bg-tier-orange-bg p-4 shadow-sm text-center">
            <div className="text-2xl font-bold text-tier-orange">{orangeCases.length}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-tier-orange/70">Orange / Urgent</div>
          </div>
          <div className="rounded-xl border border-tier-yellow/20 bg-tier-yellow-bg p-4 shadow-sm text-center">
            <div className="text-2xl font-bold text-tier-yellow">{yellowCases.length}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-tier-yellow/70">Yellow / Priority</div>
          </div>
          <div className="rounded-xl border border-tier-green/20 bg-tier-green-bg p-4 shadow-sm text-center">
            <div className="text-2xl font-bold text-tier-green">{greenCases.length}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-tier-green/70">Green / Routine</div>
          </div>
        </div>

        <h3 className="mb-4 font-display text-lg font-bold text-ink flex items-center gap-2">
          <Activity className="h-5 w-5 text-teal-600" /> Live Triage Queue
        </h3>
        
        <div>
          {redCases.map(renderQueueItem)}
          {orangeCases.map(renderQueueItem)}
          {yellowCases.map(renderQueueItem)}
          {greenCases.map(renderQueueItem)}
        </div>
      </div>
    );
  };

  const renderPatients = () => {
    return (
      <div className="animate-fade-in mx-auto max-w-5xl rounded-xl border border-ink/10 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-ink/10 flex justify-between items-center bg-paper/50">
          <h3 className="font-display text-lg font-bold text-ink">Patient Registry</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/40" />
            <input 
              type="text" 
              placeholder="Search patients..." 
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="w-64 rounded-full border border-ink/20 bg-white py-1.5 pl-9 pr-4 text-sm focus:border-teal-500 focus:outline-none" 
            />
          </div>
        </div>
        <table className="w-full text-left text-sm text-ink/80">
          <thead className="bg-ink/5 text-xs uppercase text-ink/50">
            <tr>
              <th className="px-6 py-3">Patient Name</th>
              <th className="px-6 py-3">ABHA ID</th>
              <th className="px-6 py-3">Age/Gender</th>
              <th className="px-6 py-3">Village</th>
              <th className="px-6 py-3">Current Tier</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.map((p: any) => (
              <tr key={p.id} className="border-b border-ink/5 hover:bg-teal-50/50">
                <td className="px-6 py-4 font-bold text-ink">{p.name}</td>
                <td className="px-6 py-4 font-mono text-xs">{p.abha_id}</td>
                <td className="px-6 py-4">{p.age} {p.gender}</td>
                <td className="px-6 py-4">{p.village}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2 py-1 text-xs font-bold uppercase bg-tier-${p.current_tier}-bg text-tier-${p.current_tier}`}>
                    {p.current_tier}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };



  // --- Case Detail Slide-over ---
  const renderCaseDetail = () => {
    if (!selectedCaseId || !currentCase || !currentPatient) return null;
    
    const cvScreening = currentCase.cv_screening_id ? getCVScreening(currentCase.cv_screening_id) : null;

    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-ink/20 backdrop-blur-sm">
        <div className="w-full max-w-4xl bg-paper shadow-2xl overflow-y-auto h-full flex flex-col animate-slide-left">
          
          <div className="sticky top-0 bg-white p-5 flex items-center justify-between border-b border-ink/10 z-10">
            <div>
              <h2 className="text-xl font-bold text-ink">Case Details</h2>
              <p className="text-xs text-ink/60">Generated {formatTimeAgo(currentCase.created_at)}</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleOpenOverride}
                className="flex items-center gap-1 text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg hover:bg-teal-100 transition-colors border border-teal-200"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Override Tier
              </button>
              <button onClick={() => setSelectedCaseId(null)} className="rounded-full p-2 bg-ink/5 hover:bg-ink/10 text-ink/60 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Patient Header */}
            <div className="flex justify-between items-start bg-white p-4 rounded-xl border border-ink/10">
              <div className="flex gap-4">
                <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-700">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-ink">{currentPatient.name}</h3>
                  <p className="text-sm font-medium text-ink/60">{currentPatient.age}{currentPatient.gender} · ABHA: {currentPatient.abha_id}</p>
                  <p className="text-xs text-ink/50 mt-1 flex items-center gap-1"><MapPin className="h-3 w-3"/> {currentPatient.village} · <Calendar className="h-3 w-3"/> Registered {currentPatient.registered_at}</p>
                </div>
              </div>
              <TierBadge tier={currentCase.tier as any} size="md" />
            </div>

            {/* Vitals & Known Conditions */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-ink/10">
                <h4 className="text-xs font-bold uppercase text-ink/40 mb-3">Latest Vitals</h4>
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                  <div><span className="text-ink/50">SpO₂:</span> <span className={`font-bold ${currentVitals?.spo2 < 92 ? 'text-tier-red' : 'text-ink'}`}>{currentVitals?.spo2}%</span></div>
                  <div><span className="text-ink/50">BP:</span> <span className={`font-bold ${currentVitals?.bp_sys > 140 ? 'text-tier-yellow' : 'text-ink'}`}>{currentVitals?.bp_sys}/{currentVitals?.bp_dia}</span></div>
                  <div><span className="text-ink/50">HR:</span> <span className="font-bold text-ink">{currentVitals?.hr} bpm</span></div>
                  <div><span className="text-ink/50">Temp:</span> <span className={`font-bold ${currentVitals?.temp > 38 ? 'text-tier-orange' : 'text-ink'}`}>{currentVitals?.temp}°C</span></div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-ink/10">
                <h4 className="text-xs font-bold uppercase text-ink/40 mb-3">Medical History</h4>
                {currentPatient.known_conditions.length > 0 ? (
                  <ul className="list-disc pl-4 text-sm text-ink/80 space-y-1">
                    {currentPatient.known_conditions.map((cond: string) => <li key={cond} className="capitalize">{cond.replace(/_/g, ' ')}</li>)}
                  </ul>
                ) : <p className="text-sm text-ink/50">No prior conditions listed.</p>}
              </div>
            </div>

            {/* Main Layout Grid: Left for AI/Imaging and Right for Clinical Helper (RAG/Prescribe) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Diagnostics & Imaging */}
              <div className="space-y-6">
                {/* AI Insights from Patient Panel */}
                <div className="bg-white p-5 rounded-xl border border-ink/10 shadow-sm">
                  <h4 className="text-sm font-bold text-teal-700 flex items-center gap-2 mb-3">
                    <Activity className="h-4 w-4" /> Patient Screening Triage Note
                  </h4>
                  <p className="text-sm text-ink font-medium leading-relaxed bg-teal-50/50 p-3 rounded-lg">
                    {currentCase.symptom_summary}
                  </p>

                  {cvScreening && (
                    <div className="mt-4 border-t border-ink/10 pt-4">
                      <h5 className="text-xs font-bold text-ink/50 uppercase mb-2">Computer Vision Analysis ({cvScreening.modality})</h5>
                      
                      {cvScreening.ai_findings.top_class && (
                        <div className="mb-2">
                          <span className="text-lg font-bold text-ink">{cvScreening.ai_findings.top_class}</span>
                          <span className="ml-2 text-sm font-semibold text-teal-600">{Math.round(cvScreening.ai_findings.confidence * 100)}% Confidence</span>
                        </div>
                      )}

                      {cvScreening.ai_findings.heatmap_note && (
                        <div className="mt-2 text-sm text-ink/80 border-l-2 border-teal-400 pl-3 italic">
                          "Grad-CAM: {cvScreening.ai_findings.heatmap_note}"
                        </div>
                      )}
                      
                      {/* Heatmap Image */}
                      <div className="mt-4 flex gap-4">
                        <div className="flex-1 aspect-video bg-ink/15 rounded-lg flex items-center justify-center text-ink/40 text-xs font-bold border border-ink/20 relative overflow-hidden">
                          {cvScreening.modality === 'skin' ? (
                            <svg className="w-full h-full object-cover" viewBox="0 0 200 150">
                              <rect width="200" height="150" fill="#e2ccb8"/>
                              <circle cx="90" cy="70" r="27" fill="#ab4747" opacity="0.7"/>
                              <circle cx="105" cy="80" r="22" fill="#9e3d3d" opacity="0.8"/>
                            </svg>
                          ) : cvScreening.modality === 'brain_mri' ? (
                            <svg className="w-full h-full object-cover" viewBox="0 0 200 150">
                              <rect width="200" height="150" fill="#111827"/>
                              <ellipse cx="100" cy="75" rx="60" ry="50" fill="none" stroke="#4b5563" strokeWidth="3"/>
                              <path d="M 100,28 C 70,35 60,60 60,75 C 60,95 75,120 100,122 C 125,120 140,95 140,75 C 140,60 130,35 100,28 Z" fill="#374151" opacity="0.7"/>
                              <path d="M 80,75 Q 90,65 100,75 T 120,75" fill="none" stroke="#1f2937" strokeWidth="2"/>
                              <circle cx="90" cy="65" r="10" fill="#ef4444" opacity="0.6"/>
                            </svg>
                          ) : (
                            <svg className="w-full h-full object-cover" viewBox="0 0 200 150">
                              <rect width="200" height="150" fill="#1f2937"/>
                              <line x1="100" y1="10" x2="100" y2="140" stroke="#4b5563" strokeWidth="6" strokeDasharray="5,3"/>
                              <path d="M 75,30 C 50,40 50,110 75,115 Z" fill="#111827" opacity="0.8"/>
                              <path d="M 125,30 C 150,40 150,110 125,115 Z" fill="#111827" opacity="0.8"/>
                              <circle cx="65" cy="75" r="12" fill="#e5e7eb" opacity="0.6"/>
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 aspect-video bg-ink/10 rounded-lg flex items-center justify-center text-ink/40 text-xs font-bold border border-ink/20 relative overflow-hidden">
                          {cvScreening.modality === 'skin' ? (
                            <svg className="w-full h-full object-cover" viewBox="0 0 200 150">
                              <rect width="200" height="150" fill="#e2ccb8"/>
                              <circle cx="90" cy="70" r="27" fill="#ab4747" opacity="0.7"/>
                              <circle cx="105" cy="80" r="22" fill="#9e3d3d" opacity="0.8"/>
                              <circle cx="98" cy="75" r="35" fill="url(#heatGrad1)" opacity="0.6"/>
                              <defs>
                                <radialGradient id="heatGrad1">
                                  <stop offset="0%" stop-color="#ff0000"/>
                                  <stop offset="60%" stop-color="#ffff00"/>
                                  <stop offset="100%" stop-color="#00ff00" stop-opacity="0"/>
                                </radialGradient>
                              </defs>
                            </svg>
                          ) : cvScreening.modality === 'brain_mri' ? (
                            <svg className="w-full h-full object-cover" viewBox="0 0 200 150">
                              <rect width="200" height="150" fill="#111827"/>
                              <ellipse cx="100" cy="75" rx="60" ry="50" fill="none" stroke="#4b5563" strokeWidth="3"/>
                              <path d="M 100,28 C 70,35 60,60 60,75 C 60,95 75,120 100,122 C 125,120 140,95 140,75 C 140,60 130,35 100,28 Z" fill="#374151" opacity="0.7"/>
                              <path d="M 80,75 Q 90,65 100,75 T 120,75" fill="none" stroke="#1f2937" strokeWidth="2"/>
                              <circle cx="90" cy="65" r="10" fill="#ef4444" opacity="0.6"/>
                              <circle cx="90" cy="65" r="18" fill="url(#heatGrad1)" opacity="0.8"/>
                              <defs>
                                <radialGradient id="heatGrad1">
                                  <stop offset="0%" stop-color="#ff0000"/>
                                  <stop offset="60%" stop-color="#ffff00"/>
                                  <stop offset="100%" stop-color="#00ff00" stop-opacity="0"/>
                                </radialGradient>
                              </defs>
                            </svg>
                          ) : (
                            <svg className="w-full h-full object-cover" viewBox="0 0 200 150">
                              <rect width="200" height="150" fill="#1f2937"/>
                              <line x1="100" y1="10" x2="100" y2="140" stroke="#4b5563" strokeWidth="6" strokeDasharray="5,3"/>
                              <path d="M 75,30 C 50,40 50,110 75,115 Z" fill="#111827" opacity="0.8"/>
                              <path d="M 125,30 C 150,40 150,110 125,115 Z" fill="#111827" opacity="0.8"/>
                              <circle cx="65" cy="75" r="12" fill="#e5e7eb" opacity="0.6"/>
                              <circle cx="65" cy="75" r="20" fill="url(#heatGrad1)" opacity="0.7"/>
                              <defs>
                                <radialGradient id="heatGrad1">
                                  <stop offset="0%" stop-color="#ff0000"/>
                                  <stop offset="60%" stop-color="#ffff00"/>
                                  <stop offset="100%" stop-color="#00ff00" stop-opacity="0"/>
                                </radialGradient>
                              </defs>
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Medical Imaging Uploader (Hospital-Side Only) */}
                <div className="bg-white p-5 rounded-xl border border-ink/10 shadow-sm">
                  <h4 className="text-sm font-bold text-teal-700 flex items-center gap-2 mb-3">
                    <Upload className="h-4 w-4" /> Hospital Medical Imaging AI
                  </h4>
                  <p className="text-xs text-ink/60 mb-4">Upload and analyze MRI, X-ray or CT scans instantly via Hugging Face model endpoints.</p>
                  
                  {aiStatus === "idle" && (
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        onClick={() => handleUploadImage("mri")}
                        className="py-2.5 px-3 bg-teal-600 text-white rounded-lg font-bold text-xs hover:bg-teal-700 transition-colors flex flex-col items-center justify-center gap-1.5 shadow"
                      >
                        <Eye className="h-4 w-4" /> Run Brain MRI
                      </button>
                      <button 
                        onClick={() => handleUploadImage("xray")}
                        className="py-2.5 px-3 bg-teal-600 text-white rounded-lg font-bold text-xs hover:bg-teal-700 transition-colors flex flex-col items-center justify-center gap-1.5 shadow"
                      >
                        <Activity className="h-4 w-4" /> Run Chest X-ray
                      </button>
                      <button 
                        onClick={() => handleUploadImage("ct")}
                        className="py-2.5 px-3 bg-teal-600 text-white rounded-lg font-bold text-xs hover:bg-teal-700 transition-colors flex flex-col items-center justify-center gap-1.5 shadow"
                      >
                        <FileText className="h-4 w-4" /> Run Cancer CT
                      </button>
                    </div>
                  )}

                  {aiStatus !== "idle" && aiStatus !== "done" && (
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-teal-200 bg-teal-50/20 rounded-xl">
                      <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mb-3" />
                      <div className="text-sm font-bold text-ink uppercase tracking-wider">
                        {aiStatus === "preprocessing" && "Preprocessing (Modality Detection)..."}
                        {aiStatus === "segmenting" && "U-Net Image Segmentation..."}
                        {aiStatus === "classifying" && "Classifier Forward Pass..."}
                      </div>
                      <div className="text-xs text-ink/50 mt-1">Connecting to Hugging Face Spaces...</div>
                    </div>
                  )}

                  {aiStatus === "done" && aiResult && (
                    <div className="space-y-4">
                      <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-xs font-bold uppercase text-teal-700">Modality: {selectedModality.toUpperCase()}</div>
                            <div className="text-base font-extrabold text-ink mt-0.5">{aiResult.type}</div>
                          </div>
                          <span className="bg-teal-600 text-white font-bold text-xs px-2 py-0.5 rounded-full">
                            {Math.round(aiResult.confidence * 100)}% Conf.
                          </span>
                        </div>
                        <div className="text-xs text-ink/70 mt-2">
                          <span className="font-semibold">Explainability:</span> {aiResult.heatmapNote}
                        </div>
                        {aiResult.volume !== "N/A" && (
                          <div className="text-xs text-ink/70 mt-1">
                            <span className="font-semibold">Segmented Volume:</span> {aiResult.volume}
                          </div>
                        )}
                      </div>

                      {/* Display original & mock heatmap */}
                      <div className="flex gap-3">
                        <div className="flex-1 aspect-video bg-ink/10 rounded-lg flex items-center justify-center text-xs font-bold text-ink/40 border overflow-hidden">
                          {selectedModality === "mri" ? (
                            <svg className="w-full h-full object-cover" viewBox="0 0 200 150">
                              <rect width="200" height="150" fill="#111827"/>
                              <ellipse cx="100" cy="75" rx="60" ry="50" fill="none" stroke="#4b5563" strokeWidth="3"/>
                              <path d="M 100,28 C 70,35 60,60 60,75 C 60,95 75,120 100,122 C 125,120 140,95 140,75 C 140,60 130,35 100,28 Z" fill="#374151" opacity="0.7"/>
                              <path d="M 80,75 Q 90,65 100,75 T 120,75" fill="none" stroke="#1f2937" strokeWidth="2"/>
                              <circle cx="90" cy="65" r="10" fill="#ef4444" opacity="0.6"/>
                            </svg>
                          ) : (
                            <svg className="w-full h-full object-cover" viewBox="0 0 200 150">
                              <rect width="200" height="150" fill="#1f2937"/>
                              <line x1="100" y1="10" x2="100" y2="140" stroke="#4b5563" strokeWidth="6" strokeDasharray="5,3"/>
                              <path d="M 75,30 C 50,40 50,110 75,115 Z" fill="#111827" opacity="0.8"/>
                              <path d="M 125,30 C 150,40 150,110 125,115 Z" fill="#111827" opacity="0.8"/>
                              <circle cx="65" cy="75" r="12" fill="#e5e7eb" opacity="0.6"/>
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 aspect-video bg-ink/10 rounded-lg flex items-center justify-center text-xs font-bold text-ink/40 border relative overflow-hidden">
                          {selectedModality === "mri" ? (
                            <svg className="w-full h-full object-cover" viewBox="0 0 200 150">
                              <rect width="200" height="150" fill="#111827"/>
                              <ellipse cx="100" cy="75" rx="60" ry="50" fill="none" stroke="#4b5563" strokeWidth="3"/>
                              <path d="M 100,28 C 70,35 60,60 60,75 C 60,95 75,120 100,122 C 125,120 140,95 140,75 C 140,60 130,35 100,28 Z" fill="#374151" opacity="0.7"/>
                              <path d="M 80,75 Q 90,65 100,75 T 120,75" fill="none" stroke="#1f2937" strokeWidth="2"/>
                              <circle cx="90" cy="65" r="10" fill="#ef4444" opacity="0.6"/>
                              <circle cx="90" cy="65" r="18" fill="url(#heatGrad2)" opacity="0.8"/>
                              <defs>
                                <radialGradient id="heatGrad2">
                                  <stop offset="0%" stop-color="#ff0000"/>
                                  <stop offset="60%" stop-color="#ffff00"/>
                                  <stop offset="100%" stop-color="#00ff00" stop-opacity="0"/>
                                </radialGradient>
                              </defs>
                            </svg>
                          ) : (
                            <svg className="w-full h-full object-cover" viewBox="0 0 200 150">
                              <rect width="200" height="150" fill="#1f2937"/>
                              <line x1="100" y1="10" x2="100" y2="140" stroke="#4b5563" strokeWidth="6" strokeDasharray="5,3"/>
                              <path d="M 75,30 C 50,40 50,110 75,115 Z" fill="#111827" opacity="0.8"/>
                              <path d="M 125,30 C 150,40 150,110 125,115 Z" fill="#111827" opacity="0.8"/>
                              <circle cx="65" cy="75" r="12" fill="#e5e7eb" opacity="0.6"/>
                              <circle cx="65" cy="75" r="20" fill="url(#heatGrad2)" opacity="0.7"/>
                              <defs>
                                <radialGradient id="heatGrad2">
                                  <stop offset="0%" stop-color="#ff0000"/>
                                  <stop offset="60%" stop-color="#ffff00"/>
                                  <stop offset="100%" stop-color="#00ff00" stop-opacity="0"/>
                                </radialGradient>
                              </defs>
                            </svg>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={handleConfirmAiResult}
                          className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors shadow"
                        >
                          Confirm & Log findings
                        </button>
                        <button 
                          onClick={() => { setUploadedImage(null); setAiStatus("idle"); setAiResult(null); }}
                          className="px-3 py-2 border border-ink/10 hover:bg-ink/5 text-ink/60 font-bold text-xs rounded-lg transition-colors"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: E-Prescriptions & RAG Assistant */}
              <div className="space-y-6">
                
                {/* Real Chatbot Integration (Supabase) */}
                <div className="bg-white p-5 rounded-xl border border-ink/10 shadow-sm flex flex-col h-[380px]">
                  <h4 className="text-sm font-bold text-teal-700 flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4" /> Live Patient Chat History
                  </h4>
                  <div className="flex-1 overflow-y-auto mb-3 space-y-3 pr-1 text-xs">
                    {realChatMessages.length === 0 ? (
                      <div className="text-ink/50 text-center py-8">
                        No live chat history found in Supabase. Run the chatbot to generate data!
                      </div>
                    ) : (
                      realChatMessages.map((msg, idx) => (
                        <div key={idx} className={`space-y-1 ${msg.sender_type === 'user' ? 'text-right' : 'text-left'}`}>
                          <div className={`inline-block p-1.5 rounded text-[10px] font-bold ${msg.sender_type === 'user' ? 'bg-teal-600 text-white' : 'bg-ink/10 text-ink/80'}`}>
                            {msg.sender_type === 'user' ? 'Patient' : 'AI Assistant'}
                          </div>
                          <div className={`p-2.5 rounded-lg border text-ink leading-relaxed whitespace-pre-line text-left ${msg.sender_type === 'user' ? 'bg-teal-50 border-teal-200' : 'bg-white border-ink/10'}`}>
                            {msg.content}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* AI Care Advice */}
                {realCareAdvice && (
                  <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 shadow-sm">
                    <h4 className="text-sm font-bold text-amber-700 flex items-center gap-2 mb-3">
                      <ShieldCheck className="h-4 w-4" /> AI Care Advice (Precaution)
                    </h4>
                    <div className="text-xs text-amber-900 whitespace-pre-line leading-relaxed">
                      {realCareAdvice}
                    </div>
                  </div>
                )}

                {/* E-Prescription Trigger / Pad */}
                <div className="bg-white p-5 rounded-xl border border-ink/10 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-bold text-teal-700 flex items-center gap-2">
                      <Pill className="h-4 w-4" /> Prescription & Treatments
                    </h4>
                    {!showPrescriptionPad && (
                      <button 
                        onClick={() => {
                          setPrescribedMeds([
                            { name: "Azithromycin", dosage: "500mg", frequency: "once_daily", duration: "5 days", instructions: "Take after meals" }
                          ]);
                          setInteractionWarning(null);
                          setShowPrescriptionPad(true);
                        }}
                        className="py-1 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs transition-colors shadow"
                      >
                        + Issue E-Prescription
                      </button>
                    )}
                  </div>

                  {!showPrescriptionPad && (
                    <div className="space-y-3">
                      {currentPrescriptions.length === 0 ? (
                        <p className="text-xs text-ink/50 py-4 text-center">No active prescriptions issued yet.</p>
                      ) : (
                        currentPrescriptions.map((presc: any) => (
                          <div key={presc.id} className="p-3 bg-paper rounded-lg border border-ink/10 text-xs">
                            <div className="flex justify-between text-[10px] font-bold text-ink/50 mb-1.5">
                              <span>By: {presc.doctor}</span>
                              <span>Date: {presc.date}</span>
                            </div>
                            <ul className="list-disc pl-4 space-y-1 font-bold text-ink/80">
                              {presc.medications.map((m: string, i: number) => <li key={i}>{m}</li>)}
                            </ul>
                            {presc.ayush && presc.ayush.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-ink/5">
                                <span className="text-[10px] font-bold text-teal-700">AYUSH Complement:</span>
                                <div className="mt-0.5 text-[10px] text-ink/70 font-semibold">{presc.ayush.join(", ")}</div>
                              </div>
                            )}
                            {presc.notes && <p className="mt-2 text-[10px] italic text-ink/60">Notes: {presc.notes}</p>}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {showPrescriptionPad && (
                    <div className="space-y-4 border-t border-ink/5 pt-4">
                      {/* Drug Interaction Warn Banner */}
                      {interactionWarning && (
                        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs flex gap-2">
                          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                          <div>{interactionWarning}</div>
                        </div>
                      )}

                      {prescribedMeds.map((med, idx) => (
                        <div key={idx} className="space-y-2 p-3 bg-ink/5 rounded-lg border relative">
                          <button 
                            type="button"
                            onClick={() => handleRemoveMed(idx)}
                            className="absolute top-2 right-2 text-ink/40 hover:text-ink/80"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="block text-[10px] font-bold text-ink/60 uppercase">Medicine</label>
                              <select 
                                value={med.name} 
                                onChange={(e) => handleMedChange(idx, "name", e.target.value)}
                                className="w-full mt-1 rounded border border-ink/20 px-2 py-1 bg-white text-ink font-semibold"
                              >
                                <option value="Azithromycin">Azithromycin (Antibiotic)</option>
                                <option value="Ibuprofen">Ibuprofen (NSAID Painkiller)</option>
                                <option value="Metformin">Metformin (Diabetes)</option>
                                <option value="Paracetamol">Paracetamol (Antipyretic)</option>
                                <option value="Amlodipine">Amlodipine (Hypertension)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-ink/60 uppercase">Dosage</label>
                              <input 
                                type="text" 
                                value={med.dosage}
                                onChange={(e) => handleMedChange(idx, "dosage", e.target.value)}
                                className="w-full mt-1 rounded border border-ink/20 px-2 py-1 bg-white text-ink"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-ink/60 uppercase">Frequency</label>
                              <select 
                                value={med.frequency}
                                onChange={(e) => handleMedChange(idx, "frequency", e.target.value)}
                                className="w-full mt-1 rounded border border-ink/20 px-2 py-1 bg-white text-ink"
                              >
                                <option value="once_daily">Once Daily (OD)</option>
                                <option value="twice_daily">Twice Daily (BD)</option>
                                <option value="thrice_daily">Thrice Daily (TD)</option>
                                <option value="four_times_daily">Four times (QID)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-ink/60 uppercase">Duration</label>
                              <input 
                                type="text" 
                                value={med.duration}
                                onChange={(e) => handleMedChange(idx, "duration", e.target.value)}
                                className="w-full mt-1 rounded border border-ink/20 px-2 py-1 bg-white text-ink"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      <button 
                        type="button" 
                        onClick={handleAddMed}
                        className="w-full py-1.5 border border-dashed border-teal-500 text-teal-600 hover:bg-teal-50 text-xs font-bold rounded-lg transition-colors"
                      >
                        + Add Another Medicine
                      </button>

                      {/* AYUSH recommendations section */}
                      <div className="border-t border-ink/5 pt-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={includeAyush} 
                            onChange={(e) => setIncludeAyush(e.target.checked)}
                            className="rounded text-teal-600"
                          />
                          <span className="text-xs font-bold text-ink">Include Ministry of AYUSH Recommendations</span>
                        </label>

                        {includeAyush && (
                          <div className="mt-3 p-3 bg-teal-50/30 border border-teal-500/10 rounded-lg space-y-2 text-xs">
                            <span className="block text-[10px] font-bold text-teal-700 uppercase">Select Ayurvedic Formulations (NAMASTE Standard)</span>
                            {MOCK_DB.ayushFormulations.map((form: any) => (
                              <label key={form.code} className="flex items-start gap-2 cursor-pointer pb-2 border-b border-teal-500/5 last:border-0">
                                <input 
                                  type="checkbox"
                                  checked={selectedAyushCodes.includes(form.code)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedAyushCodes([...selectedAyushCodes, form.code]);
                                    } else {
                                      setSelectedAyushCodes(selectedAyushCodes.filter(c => c !== form.code));
                                    }
                                  }}
                                  className="mt-0.5 rounded text-teal-600"
                                />
                                <div>
                                  <div className="font-bold text-ink">{form.name} <span className="text-[9px] text-ink/40">({form.code})</span></div>
                                  <div className="text-[10px] text-ink/60">Indication: {form.indication}</div>
                                  <div className="text-[9px] text-teal-700 italic">Dose: {form.dose}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-ink/60 uppercase">Special Notes / Counselling Advice</label>
                        <textarea 
                          value={prescriptionNotes}
                          onChange={(e) => setPrescriptionNotes(e.target.value)}
                          placeholder="Complete the full course. Avoid OTC medication..."
                          className="w-full mt-1 rounded-lg border border-ink/20 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none bg-white text-ink h-16 resize-none"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={handleSavePrescription}
                          className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors shadow"
                        >
                          Submit Prescription
                        </button>
                        <button 
                          onClick={() => setShowPrescriptionPad(false)}
                          className="px-4 py-2.5 border border-ink/10 hover:bg-ink/5 text-ink/60 font-bold text-xs rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Longitudinal Medical History Log */}
            <div className="bg-white p-5 rounded-xl border border-ink/10 shadow-sm">
              <h4 className="text-sm font-bold text-ink flex items-center gap-2 mb-4">
                <FileText className="h-4.5 w-4.5 text-teal-600" /> Patient Longitudinal Clinical History
              </h4>
              <div className="space-y-4">
                {currentHistory.length === 0 ? (
                  <p className="text-xs text-ink/50 py-2">No past history recorded for this patient.</p>
                ) : (
                  currentHistory.map((item: any) => (
                    <div key={item.id} className="border-l-2 border-teal-500 pl-4 py-1 relative">
                      <div className="absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full bg-teal-500 border border-white"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-extrabold text-ink">{item.summary}</span>
                        <span className="text-[10px] font-bold text-ink/40">{item.date}</span>
                      </div>
                      <p className="text-xs text-ink/70 mt-1 leading-relaxed">{item.details}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Action Footer */}
            <div className="flex gap-3 pt-4 border-t border-ink/10">
              {currentCase.status === "pending" && (
                <button 
                  onClick={handleAcceptCase}
                  className="flex-1 py-3 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="h-5 w-5" /> Accept & Start Consult
                </button>
              )}
              <button 
                onClick={handleOpenReferral}
                className="flex-1 py-3 bg-white text-teal-700 border border-teal-200 font-bold rounded-lg hover:bg-teal-50 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowRight className="h-5 w-5" /> Refer to Specialty Hospital
              </button>
            </div>
          </div>
        </div>

        {/* Tier Override Modal */}
        {showOverrideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 border animate-scale-in">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display text-lg font-bold text-ink flex items-center gap-1.5">
                  <AlertCircle className="h-5 w-5 text-teal-600" /> Override Triage Tier
                </h3>
                <button onClick={() => setShowOverrideModal(false)} className="text-ink/40 hover:text-ink/80"><X className="h-5 w-5"/></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink/60 uppercase mb-2">Select Target Tier</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["green", "yellow", "orange", "red"] as const).map((tier) => (
                      <button 
                        key={tier}
                        type="button"
                        onClick={() => setOverrideTier(tier)}
                        className={`py-2 rounded-lg font-bold text-xs uppercase border transition-all ${
                          overrideTier === tier 
                            ? `border-tier-${tier} bg-tier-${tier}-bg text-tier-${tier} shadow-sm ring-1 ring-tier-${tier}`
                            : 'border-ink/10 bg-white text-ink/60 hover:bg-ink/5'
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink/60 uppercase mb-1.5">Clinical Justification (Required)</label>
                  <textarea 
                    value={overrideJustification}
                    onChange={(e) => setOverrideJustification(e.target.value)}
                    placeholder="Provide medical rationale for the triage modification..."
                    className="w-full rounded-lg border border-ink/20 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none bg-white text-ink h-24 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={handleSaveOverride}
                    disabled={!overrideJustification.trim()}
                    className="flex-1 py-2.5 bg-teal-600 text-white font-bold text-xs rounded-lg hover:bg-teal-700 transition-colors shadow disabled:opacity-55"
                  >
                    Confirm Override
                  </button>
                  <button 
                    onClick={() => setShowOverrideModal(false)}
                    className="px-4 py-2.5 border border-ink/10 hover:bg-ink/5 text-ink/60 font-bold text-xs rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Referral Modal */}
        {showReferralModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 border animate-scale-in">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display text-lg font-bold text-ink flex items-center gap-1.5">
                  <ArrowRight className="h-5 w-5 text-teal-600" /> Create Specialist Referral
                </h3>
                <button onClick={() => setShowReferralModal(false)} className="text-ink/40 hover:text-ink/80"><X className="h-5 w-5"/></button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-ink/60 uppercase">Target Facility</label>
                    <select 
                      value={referralFacility} 
                      onChange={(e) => setReferralFacility(e.target.value)}
                      className="w-full mt-1.5 rounded border border-ink/20 px-2.5 py-1.5 bg-white text-ink font-semibold"
                    >
                      {MOCK_DB.facilities.filter(f => f.id !== "fac-001").map(f => (
                        <option key={f.id} value={f.id}>{f.name} ({f.level})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-ink/60 uppercase">Department / Specialty</label>
                    <select 
                      value={referralDept} 
                      onChange={(e) => setReferralDept(e.target.value)}
                      className="w-full mt-1.5 rounded border border-ink/20 px-2.5 py-1.5 bg-white text-ink font-semibold"
                    >
                      <option value="Oncology">Oncology (Cancer)</option>
                      <option value="Neurosurgery">Neurosurgery (Brain)</option>
                      <option value="Pulmonology">Pulmonology (Respiratory)</option>
                      <option value="Dermatology">Dermatology (Skin)</option>
                      <option value="Cardiology">Cardiology (Heart)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink/60 uppercase mb-2">Urgency Tier</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["routine", "urgent", "emergency"] as const).map((tier) => (
                      <button 
                        key={tier}
                        type="button"
                        onClick={() => setReferralUrgency(tier)}
                        className={`py-2 rounded-lg font-bold text-xs uppercase border transition-all ${
                          referralUrgency === tier 
                            ? 'border-teal-500 bg-teal-50/20 text-teal-700 shadow-sm ring-1 ring-teal-500'
                            : 'border-ink/10 bg-white text-ink/60 hover:bg-ink/5'
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink/60 uppercase mb-1.5">Clinical Reason for Referral</label>
                  <textarea 
                    value={referralReason}
                    onChange={(e) => setReferralReason(e.target.value)}
                    placeholder="Glioma suspected on MRI slices. Urgent histopathological assessment and neurosurgical decompression recommended..."
                    className="w-full rounded-lg border border-ink/20 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none bg-white text-ink h-24 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={handleSaveReferral}
                    disabled={!referralReason.trim()}
                    className="flex-1 py-2.5 bg-teal-600 text-white font-bold text-xs rounded-lg hover:bg-teal-700 transition-colors shadow disabled:opacity-55"
                  >
                    Generate & Send Packet
                  </button>
                  <button 
                    onClick={() => setShowReferralModal(false)}
                    className="px-4 py-2.5 border border-ink/10 hover:bg-ink/5 text-ink/60 font-bold text-xs rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full bg-paper min-h-[calc(100vh-61px)] p-6">
      {activeTab === "queue" && renderQueue()}
      {activeTab === "patients" && renderPatients()}
      {renderCaseDetail()}
    </div>
  );
}
