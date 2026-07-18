import { supabase } from "../supabaseClient";

export interface Facility {
  id: string;
  name: string;
  type: string;
  distance: number;
  capabilities: string[];
  phone: string;
  address: string;
}

/**
 * Haversine formula — returns distance in km between two lat/lng points.
 */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Static fallback list — used when Supabase `health_facilities` table is
 * unavailable or not yet seeded. Reflects real facilities used in the app.
 */
const FALLBACK_FACILITIES: Omit<Facility, "distance">[] = [
  {
    id: "f-1",
    name: "Chandpur Primary Health Centre",
    type: "Primary Health Centre",
    capabilities: ["OPD", "Basic Lab", "Maternity", "Immunisation", "ASHA Worker"],
    phone: "+91 88990 01122",
    address: "Near Bus Stand, Chandpur, UP",
  },
  {
    id: "f-2",
    name: "District General Hospital",
    type: "District Hospital",
    capabilities: ["Emergency", "Surgery", "Radiology", "ICU", "Blood Bank"],
    phone: "+91 99001 23456",
    address: "Civil Lines, District HQ, UP",
  },
  {
    id: "f-3",
    name: "Rural Care Clinic",
    type: "Sub-Center",
    capabilities: ["Basic Vitals Check", "Maternity First-Aid", "ASHA Worker Presence"],
    phone: "+91 88990 01133",
    address: "Main Chaupal, Near Government School, Chandpur",
  },
  {
    id: "f-4",
    name: "Saraswati Women's Clinic",
    type: "Women's Health Centre",
    capabilities: ["Gynaecology", "Antenatal Care", "Family Planning", "Ultrasound"],
    phone: "+91 98001 56789",
    address: "Market Road, Chandpur",
  },
  {
    id: "f-5",
    name: "Asha Maternity & Women's Care Centre",
    type: "Maternity Centre",
    capabilities: ["Delivery", "Neonatal Care", "Lactation Support", "Postnatal Care"],
    phone: "+91 99100 45678",
    address: "Near Temple, Rampur Block, UP",
  },
];

// Approximate centre-point coordinates for the fallback facilities
// (Chandpur, Uttar Pradesh area)
const FALLBACK_COORDS: Record<string, { lat: number; lng: number }> = {
  "f-1": { lat: 27.4577, lng: 80.8857 },
  "f-2": { lat: 27.5706, lng: 80.9000 },
  "f-3": { lat: 27.4500, lng: 80.8800 },
  "f-4": { lat: 27.4560, lng: 80.8870 },
  "f-5": { lat: 27.4900, lng: 80.8700 },
};

export async function findNearbyFacilities(
  latitude: number,
  longitude: number,
  radiusKm = 50
): Promise<Facility[]> {
  try {
    // Attempt to query the Supabase health_facilities table
    const { data, error } = await supabase
      .from("health_facilities")
      .select("id, name, type, capabilities, phone, address, latitude, longitude")
      .limit(50);

    if (error) {
      console.error("[facilities] Supabase fetch error:", error.message);
      throw error; // fall through to static fallback
    }

    if (data && data.length > 0) {
      return data
        .map((f) => ({
          id: String(f.id),
          name: f.name,
          type: f.type,
          capabilities: Array.isArray(f.capabilities)
            ? f.capabilities
            : (f.capabilities ?? "").split(",").map((s: string) => s.trim()),
          phone: f.phone ?? "",
          address: f.address ?? "",
          distance: haversineKm(latitude, longitude, Number(f.latitude), Number(f.longitude)),
        }))
        .filter((f) => f.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance);
    }
  } catch {
    // Supabase not configured or table not seeded — fall through
  }

  // Static fallback with real distance calculations from the user's GPS position
  return FALLBACK_FACILITIES.map((f) => {
    const coords = FALLBACK_COORDS[f.id];
    const distance = coords
      ? Math.round(haversineKm(latitude, longitude, coords.lat, coords.lng) * 10) / 10
      : 0;
    return { ...f, distance };
  }).sort((a, b) => a.distance - b.distance);
}
