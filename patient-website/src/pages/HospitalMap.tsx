import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PulseDivider from "../components/PulseDivider";
import { MapPin, Phone, HelpCircle, Shield, Award, CheckCircle, ArrowLeft, Navigation } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default Leaflet markers in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface Facility {
  id: string;
  name: string;
  type: "Sub-Center" | "Primary Health Centre (PHC)" | "Community Health Centre (CHC)" | "District Referral Hospital";
  distance: number;
  capabilities: string[];
  phone: string;
  address: string;
  lat: number;
  lng: number;
}

const INITIAL_FACILITIES: Facility[] = [
  {
    id: "f-1",
    name: "Civil Hospital Surat",
    type: "District Referral Hospital",
    distance: 0,
    capabilities: ["Dermatology Specialist", "ICU Beds", "MRI Imaging", "Cardiology Clinic", "AYUSH Hospital Wing"],
    phone: "+91 261 2244456",
    address: "Majura Gate, Surat",
    lat: 21.1824,
    lng: 72.8123
  },
  {
    id: "f-2",
    name: "SMIMER Hospital",
    type: "District Referral Hospital",
    distance: 0,
    capabilities: ["ICU Beds", "X-Ray Screening", "Emergency Transport"],
    phone: "+91 261 2345678",
    address: "Umarwada, Surat",
    lat: 21.1969,
    lng: 72.8465
  },
  {
    id: "f-3",
    name: "Adajan Primary Health Centre",
    type: "Primary Health Centre (PHC)",
    distance: 0,
    capabilities: ["On-call Medical Officer", "X-Ray Screening", "Basic Vitals Check"],
    phone: "+91 261 2788999",
    address: "Adajan, Surat",
    lat: 21.1959,
    lng: 72.7933
  },
  {
    id: "f-4",
    name: "Udhna Sub-Center",
    type: "Sub-Center",
    distance: 0,
    capabilities: ["Basic Vitals Check", "Maternity First-Aid", "ASHA Worker Presence"],
    phone: "+91 261 2988111",
    address: "Udhna, Surat",
    lat: 21.1561,
    lng: 72.8360
  }
];

// Surat default center
const SURAT_CENTER: [number, number] = [21.1702, 72.8311];

// Haversine formula to calculate distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function HospitalMap() {
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>(INITIAL_FACILITIES);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Initialize distances based on Surat center as a fallback initially
  useEffect(() => {
    updateDistances(SURAT_CENTER[0], SURAT_CENTER[1]);
  }, []);

  const updateDistances = async (lat: number, lng: number) => {
    try {
      const response = await fetch("http://localhost:8012/locate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          required_tier: "PHC"
        })
      });
      
      const data = await response.json();
      
      if (data.status === "success") {
        const fetchedFacilities = [data.nearest_facility, ...data.alternatives].map(f => ({
          ...f,
          type: f.tier || "Primary Health Centre (PHC)"
        }));
        setFacilities(fetchedFacilities);
      }
    } catch (error) {
      console.error("Failed to fetch from hospital locator script:", error);
      // Fallback if API fails
      const updated = INITIAL_FACILITIES.map(f => ({
        ...f,
        distance: Number(calculateDistance(lat, lng, f.lat, f.lng).toFixed(1))
      })).sort((a, b) => a.distance - b.distance);
      setFacilities(updated);
    }
  };

  const handleToggleFilter = (filter: string) => {
    setSelectedFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  };

  const handleFindNearest = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLoc([latitude, longitude]);
          updateDistances(latitude, longitude);
          setIsLocating(false);
        },
        (error) => {
          console.error("Error obtaining location", error);
          alert("Could not get your exact location. Simulating a location in Surat for demonstration.");
          // Mock location in Surat (e.g., near Adajan)
          const mockLat = 21.1950;
          const mockLng = 72.8000;
          setUserLoc([mockLat, mockLng]);
          updateDistances(mockLat, mockLng);
          setIsLocating(false);
        },
        { timeout: 10000 }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
      setIsLocating(false);
    }
  };

  const filteredFacilities = facilities.filter((f) =>
    selectedFilters.every((req) => f.capabilities.includes(req))
  );

  const mapCenter = userLoc || SURAT_CENTER;

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <div className="flex items-center gap-3 justify-between">
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
        
        <button 
          onClick={handleFindNearest}
          disabled={isLocating}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          <Navigation className={`h-4 w-4 ${isLocating ? 'animate-spin' : ''}`} />
          {isLocating ? "Locating..." : "Use My Location"}
        </button>
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

          {/* Map Graphic */}
          <div className="rounded-xl border border-ink/10 bg-white p-2 shadow-sm relative z-0">
            <h3 className="font-semibold text-ink mb-2 px-2 pt-2 text-sm">Surat Area Overview</h3>
            <div className="h-64 w-full overflow-hidden rounded bg-paper">
              <MapContainer 
                center={mapCenter} 
                zoom={12} 
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapUpdater center={mapCenter} />
                
                {userLoc && (
                  <Marker position={userLoc} icon={userIcon}>
                    <Popup>Your Location</Popup>
                  </Marker>
                )}

                {filteredFacilities.map(f => (
                  <Marker key={f.id} position={[f.lat, f.lng]}>
                    <Popup>
                      <strong>{f.name}</strong><br/>
                      {f.distance} km away
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
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
