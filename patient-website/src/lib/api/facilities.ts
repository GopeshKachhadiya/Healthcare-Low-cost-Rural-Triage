export interface Facility {
  id: string;
  name: string;
  type: string;
  distance: number;
  capabilities: string[];
  phone: string;
  address: string;
}

export async function findNearbyFacilities(latitude: number, longitude: number): Promise<Facility[]> {
  // Simulates geo postgis query returning nearest clinic nodes
  return Promise.resolve([
    {
      id: "f-1",
      name: "Chandpur Sub-Center",
      type: "Sub-Center",
      distance: 0.8,
      capabilities: ["Basic Vitals Check", "Maternity First-Aid", "ASHA Worker Presence"],
      phone: "+91 88990 01122",
      address: "Main Chaupal, Near Government School, Chandpur",
    },
  ]);
}
