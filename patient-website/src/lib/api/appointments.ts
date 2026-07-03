import { Appointment } from "../../context/AppContext";

export async function fetchAppointments(userId: string): Promise<Appointment[]> {
  // Return empty list by default (let context manage mock data)
  return Promise.resolve([]);
}

export async function bookAppointment(
  userId: string,
  doctorName: string,
  facilityName: string,
  priority: Appointment["priority"],
  reason: string
): Promise<Appointment> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: `apt-${Date.now()}`,
        doctorName,
        facilityName,
        date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        time: "10:00 AM",
        status: "pending",
        priority,
        reason,
      });
    }, 500);
  });
}
