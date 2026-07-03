import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronRight, Activity, X, User, Calendar, MapPin, Search } from "lucide-react";
import { MOCK_DB, getCasesByTier, formatTimeAgo, getPatient, getVitals, getCVScreening, getHistory } from "../../lib/hospitalData";
import TierBadge from "../../components/TierBadge";
import PulseDivider from "../../components/PulseDivider";
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function HospitalDashboard() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "queue";
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // -- Queue Tab --
  const renderQueueItem = (caseData: any) => {
    const patient = getPatient(caseData.patient_id);
    const vitals = getVitals(caseData.patient_id);
    return (
      <div 
        key={caseData.id} 
        onClick={() => setSelectedCaseId(caseData.id)}
        className="flex cursor-pointer items-center justify-between rounded-xl border border-ink/10 bg-white p-4 transition-all hover:border-teal-400 hover:shadow-md mb-3"
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
            </div>
            <p className="mt-1 text-sm text-ink/70">{caseData.symptom_summary}</p>
            
            <div className="mt-2 flex gap-3 text-xs font-medium">
              <span className={`rounded px-1.5 py-0.5 ${vitals?.spo2 < 92 ? 'bg-tier-red-bg text-tier-red' : 'bg-ink/5 text-ink/60'}`}>
                SpO₂ {vitals?.spo2}%
              </span>
              <span className={`rounded px-1.5 py-0.5 ${vitals?.bp_sys > 140 ? 'bg-tier-yellow-bg text-tier-yellow' : 'bg-ink/5 text-ink/60'}`}>
                BP {vitals?.bp_sys}/{vitals?.bp_dia}
              </span>
            </div>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-ink/30" />
      </div>
    );
  };

  const renderQueue = () => {
    const redCases = getCasesByTier("red");
    const orangeCases = getCasesByTier("orange");
    const yellowCases = getCasesByTier("yellow");
    const greenCases = getCasesByTier("green");

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

  // -- Patients List Tab --
  const renderPatients = () => {
    return (
      <div className="animate-fade-in mx-auto max-w-5xl rounded-xl border border-ink/10 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-ink/10 flex justify-between items-center bg-paper/50">
          <h3 className="font-display text-lg font-bold text-ink">Patient Registry</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/40" />
            <input type="text" placeholder="Search patients..." className="w-64 rounded-full border border-ink/20 bg-white py-1.5 pl-9 pr-4 text-sm focus:border-teal-500 focus:outline-none" />
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
            {MOCK_DB.patients.map((p: any) => (
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

  // -- Disease Map Tab --
  const renderMap = () => {
    const center: [number, number] = [28.81, 79.03]; // Rampur
    return (
      <div className="animate-fade-in mx-auto max-w-5xl h-[600px] rounded-xl border border-ink/10 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-ink/10 bg-paper/50">
          <h3 className="font-display text-lg font-bold text-ink">Regional Disease Surveillance</h3>
          <p className="text-xs text-ink/60">Live geographical clustering of reported cases in the last 7 days.</p>
        </div>
        <div className="flex-1 relative z-0">
          <MapContainer center={center} zoom={11} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {MOCK_DB.areaStats.mapClusters.map((cluster: any, idx: number) => {
              const color = cluster.severity === 'critical' ? '#EF4444' : cluster.severity === 'high' ? '#F97316' : '#EAB308';
              return (
                <CircleMarker 
                  key={idx} 
                  center={[cluster.lat, cluster.lng]} 
                  radius={cluster.count * 1.5}
                  pathOptions={{ fillColor: color, color: color, fillOpacity: 0.5 }}
                >
                  <Popup>
                    <div className="text-sm font-bold">{cluster.block}</div>
                    <div className="text-xs capitalize">{cluster.disease}: {cluster.count} cases</div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    );
  };

  // -- Case Detail Slide-over --
  const renderCaseDetail = () => {
    if (!selectedCaseId) return null;
    const caseData = MOCK_DB.cases.find((c: any) => c.id === selectedCaseId);
    if (!caseData) return null;
    
    const patient = getPatient(caseData.patient_id);
    const vitals = getVitals(caseData.patient_id);
    const cvScreening = caseData.cv_screening_id ? getCVScreening(caseData.cv_screening_id) : null;
    const history = getHistory(caseData.patient_id);

    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-ink/20 backdrop-blur-sm">
        <div className="w-full max-w-2xl bg-paper shadow-2xl overflow-y-auto h-full flex flex-col animate-slide-left">
          
          <div className="sticky top-0 bg-white p-5 flex items-center justify-between border-b border-ink/10 z-10">
            <div>
              <h2 className="text-xl font-bold text-ink">Case Details</h2>
              <p className="text-xs text-ink/60">Generated {formatTimeAgo(caseData.created_at)}</p>
            </div>
            <button onClick={() => setSelectedCaseId(null)} className="rounded-full p-2 bg-ink/5 hover:bg-ink/10 text-ink/60 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Patient Header */}
            <div className="flex justify-between items-start bg-white p-4 rounded-xl border border-ink/10">
              <div className="flex gap-4">
                <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-700">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-ink">{patient?.name}</h3>
                  <p className="text-sm font-medium text-ink/60">{patient?.age}{patient?.gender} · ABHA: {patient?.abha_id}</p>
                  <p className="text-xs text-ink/50 mt-1 flex items-center gap-1"><MapPin className="h-3 w-3"/> {patient?.village} · <Calendar className="h-3 w-3"/> Registered {patient?.registered_at}</p>
                </div>
              </div>
              <TierBadge tier={caseData.tier as any} size="md" />
            </div>

            {/* Vitals & Known Conditions */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-ink/10">
                <h4 className="text-xs font-bold uppercase text-ink/40 mb-3">Latest Vitals</h4>
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                  <div><span className="text-ink/50">SpO₂:</span> <span className={`font-bold ${vitals?.spo2 < 92 ? 'text-tier-red' : 'text-ink'}`}>{vitals?.spo2}%</span></div>
                  <div><span className="text-ink/50">BP:</span> <span className={`font-bold ${vitals?.bp_sys > 140 ? 'text-tier-yellow' : 'text-ink'}`}>{vitals?.bp_sys}/{vitals?.bp_dia}</span></div>
                  <div><span className="text-ink/50">HR:</span> <span className="font-bold text-ink">{vitals?.hr} bpm</span></div>
                  <div><span className="text-ink/50">Temp:</span> <span className={`font-bold ${vitals?.temp > 38 ? 'text-tier-orange' : 'text-ink'}`}>{vitals?.temp}°C</span></div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-ink/10">
                <h4 className="text-xs font-bold uppercase text-ink/40 mb-3">Medical History</h4>
                {(patient?.known_conditions?.length ?? 0) > 0 ? (
                  <ul className="list-disc pl-4 text-sm text-ink/80 space-y-1">
                    {patient?.known_conditions?.map((cond: string) => <li key={cond} className="capitalize">{cond.replace(/_/g, ' ')}</li>)}
                  </ul>
                ) : <p className="text-sm text-ink/50">No prior conditions listed.</p>}
              </div>
            </div>

            {/* AI Insights (CV or Chatbot) */}
            <div className="bg-white p-5 rounded-xl border border-ink/10 shadow-sm">
              <h4 className="text-sm font-bold text-teal-700 flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4" /> AI Diagnostics & Recommendations
              </h4>
              <p className="text-sm text-ink font-medium leading-relaxed bg-teal-50/50 p-3 rounded-lg">
                {caseData.symptom_summary}
              </p>

              {cvScreening && (
                <div className="mt-4 border-t border-ink/10 pt-4">
                  <h5 className="text-xs font-bold text-ink/50 uppercase mb-2">Computer Vision Analysis ({cvScreening.modality})</h5>
                  
                  {cvScreening.ai_findings.top_class && (
                    <div className="mb-4">
                      <span className="text-lg font-bold text-ink">{cvScreening.ai_findings.top_class}</span>
                      <span className="ml-2 text-sm font-semibold text-teal-600">{Math.round(cvScreening.ai_findings.confidence * 100)}% Confidence</span>
                    </div>
                  )}

                  {cvScreening.ai_findings.heatmap_note && (
                    <div className="mt-3 text-sm text-ink/80 border-l-2 border-teal-400 pl-3 italic">
                      "Grad-CAM Note: {cvScreening.ai_findings.heatmap_note}"
                    </div>
                  )}
                  
                  {/* Mocked Heatmap Image */}
                  <div className="mt-4 flex gap-4">
                    <div className="flex-1 aspect-video bg-ink/10 rounded-lg flex items-center justify-center text-ink/40 text-xs font-bold border border-ink/20">
                      Original Image
                    </div>
                    <div className="flex-1 aspect-video bg-ink/10 rounded-lg flex items-center justify-center text-ink/40 text-xs font-bold border border-ink/20 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-red-500/30 to-yellow-500/40 mix-blend-multiply"></div>
                      AI Heatmap
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button className="flex-1 py-3 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-colors shadow-md">
                Accept Case
              </button>
              <button className="flex-1 py-3 bg-white text-teal-700 border border-teal-200 font-bold rounded-lg hover:bg-teal-50 transition-colors">
                Refer to District
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-paper min-h-[calc(100vh-61px)] p-6">
      {activeTab === "queue" && renderQueue()}
      {activeTab === "patients" && renderPatients()}
      {activeTab === "map" && renderMap()}
      {renderCaseDetail()}
    </div>
  );
}
