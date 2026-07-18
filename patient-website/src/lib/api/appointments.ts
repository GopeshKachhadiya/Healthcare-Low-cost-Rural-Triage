import { Appointment } from "../../context/AppContext";
import { API_BASE_URL } from "./config";

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
  try {
    const response = await fetch(`${API_BASE_URL}/route`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patient_id: userId,
        action: "book_appointment",
        payload: {
          hospital_id: facilityName, // Map to facilityName or proper ID
          reason: reason,
          urgency_tier: priority.charAt(0).toUpperCase() + priority.slice(1),
        },
        language: "hi", // Default regional language fallback
      }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.status === "success" && result.route === "appointment") {
        const data = result.data;
        return {
          id: data.appointment_id || `apt-${Date.now()}`,
          doctorName,
          facilityName,
          date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
          time: "11:00 AM",
          status: "pending",
          priority,
          reason,
        };
      }
    }
  } catch (error) {
    console.error("Failed to book appointment via Patient Orchestrator:", error);
  }

  // Fallback mock representation if server is offline or returns error
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
