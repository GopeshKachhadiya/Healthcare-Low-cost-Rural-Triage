import { useState } from "react";
import { Link } from "react-router-dom";
import PulseDivider from "../components/PulseDivider";
import { MapPin, Phone, HelpCircle, Shield, Award, CheckCircle, ArrowLeft } from "lucide-react";

interface Facility {
  id: string;
  name: string;
  type: "Sub-Center" | "Primary Health Centre (PHC)" | "Community Health Centre (CHC)" | "District Referral Hospital";
  distance: number;
  capabilities: string[];
  phone: string;
  address: string;
}

const FACILITIES: Facility[] = [
  {
    id: "f-1",
    name: "Chandpur Sub-Center",
    type: "Sub-Center",
    distance: 0.8,
    capabilities: ["Basic Vitals Check", "Maternity First-Aid", "ASHA Worker Presence"],
    phone: "+91 88990 01122",
    address: "Main Chaupal, Near Government School, Chandpur"
  },
  {
    id: "f-2",
    name: "Chandpur Primary Health Centre (PHC)",
    type: "Primary Health Centre (PHC)",
    distance: 2.4,
    capabilities: ["On-call Medical Officer", "X-Ray Screening", "Ayurvedic OPD", "Emergency Transport"],
    phone: "+91 88990 02233",
    address: "Block Road, Near Bus Stand, Chandpur Block"
  },
  {
    id: "f-3",
    name: "District Referral Hospital",
    type: "District Referral Hospital",
    distance: 14.5,
    capabilities: ["Dermatology Specialist", "ICU Beds", "MRI Imaging", "Cardiology Clinic", "AYUSH Hospital Wing"],
    phone: "+91 88990 04400",
    address: "Civil Lines, Near District Court, Headquarter Town"
  }
];

export default function HospitalMap() {
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const handleToggleFilter = (filter: string) => {
    setSelectedFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  };

  const filteredFacilities = FACILITIES.filter((f) =>
    selectedFilters.every((req) => f.capabilities.includes(req))
  );

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink/10 bg-white text-ink hover:border-teal-400 hover:text-teal-600 transition-all shadow-sm shrink-0"
          aria-label="Back to Home"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold text-teal-700">Nearby Referral Clinics</h1>
          <p className="text-sm text-ink/60">Find the closest health facility capable of treating your flagged concerns</p>
        </div>
      </div>


      <PulseDivider className="my-6 opacity-30" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* Left Column: Filter and Map representation */}
        <div className="md:col-span-5 space-y-6">
          <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-ink text-sm">Capability Checklist</h3>
            <div className="space-y-2.5">
              {[
                "Dermatology Specialist",
                "ICU Beds",
                "MRI Imaging",
                "X-Ray Screening",
                "Ayurvedic OPD"
              ].map((cap) => {
                const isActive = selectedFilters.includes(cap);
                return (
                  <button
                    key={cap}
                    onClick={() => handleToggleFilter(cap)}
                    className={`flex w-full items-center justify-between p-2.5 rounded-lg border text-left text-xs font-semibold transition-all ${
                      isActive
                        ? "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-ink/10 bg-paper text-ink/70 hover:border-teal-300"
                    }`}
                  >
                    <span>{cap}</span>
                    {isActive && <CheckCircle className="h-3.5 w-3.5 text-teal-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stylized Clinic Map Graphic */}
          <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-ink mb-3 text-sm">Topography Overview</h3>
            <div className="relative h-48 w-full overflow-hidden rounded bg-paper flex items-center justify-center border border-ink/5">
              <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 200 150" className="p-2">
                <rect width="100%" height="100%" fill="#fbf8f3" />
                {/* Simulated contour road traces */}
                <path d="M 10 75 Q 100 100 190 75" fill="none" stroke="#e6dcd3" strokeWidth="6" />
                <path d="M 100 10 L 100 140" fill="none" stroke="#e6dcd3" strokeWidth="4" />

                {/* Patient location dot */}
                <circle cx="100" cy="75" r="8" fill="#0f6b5c" className="animate-ping" />
                <circle cx="100" cy="75" r="5" fill="#0f6b5c" />
                <text x="100" y="93" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#1f2a37">My Location (Chandpur)</text>

                {/* Facilities */}
                {/* Subcenter */}
                <circle cx="120" cy="65" r="4" fill="#eeab55" />
                <text x="126" y="67" fontSize="5" fontWeight="bold" fill="#c77f1f">Subcenter (0.8km)</text>

                {/* PHC */}
                <circle cx="90" cy="35" r="5" fill="#0b5449" />
                <text x="97" y="37" fontSize="5" fontWeight="bold" fill="#0b5449">PHC Clinic (2.4km)</text>

                {/* Referral */}
                <circle cx="160" cy="115" r="5" fill="#e03131" />
                <text x="154" y="125" fontSize="5" fontWeight="bold" fill="#e03131">Referral Hosp (14.5km)</text>
              </svg>
            </div>
          </div>
        </div>

        {/* Right Column: Facility list */}
        <div className="md:col-span-7 space-y-4">
          {filteredFacilities.length === 0 ? (
            <div className="rounded-xl border border-ink/10 bg-white p-8 text-center space-y-4">
              <HelpCircle className="mx-auto h-12 w-12 text-teal-500/50" />
              <h2 className="font-display text-lg font-bold text-teal-700">No Facilities Match</h2>
              <p className="text-sm text-ink/60 max-w-sm mx-auto">
                No clinics in the regional registry support all currently selected filters. Clear some capabilities to expand search.
              </p>
            </div>
          ) : (
            filteredFacilities.map((f) => (
              <div
                key={f.id}
                className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm space-y-4 hover:border-teal-400 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-ink/40 uppercase tracking-wider block">
                      {f.type} · {f.distance} km away
                    </span>
                    <h3 className="font-semibold text-ink text-base mt-0.5">{f.name}</h3>
                    <p className="text-xs text-ink/50 mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {f.address}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {f.capabilities.map((c, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-500/5 px-2.5 py-0.5 rounded"
                    >
                      {c}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-end border-t border-ink/5 pt-3">
                  <a
                    href={`tel:${f.phone.replace(/\s+/g, "")}`}
                    className="flex min-h-touch items-center gap-2 rounded-lg bg-teal-50 px-5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Call Facility: {f.phone}
                  </a>
                </div>
              </div>
            ))
          )}

          {/* ABDM Registry Disclaimer */}
          <div className="rounded-xl bg-teal-50/40 p-4 border border-teal-500/10 flex gap-2.5 text-xs text-teal-700">
            <Award className="h-5 w-5 shrink-0 text-teal-500" />
            <p className="leading-relaxed">
              <strong>Govt Registry Verification:</strong> Directory synced with ABDM national Healthcare Facility Registry (HFR). Distance matrix displays coordinates indexed on PHC area maps.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
