import { useState } from "react";
import { useApp, Appointment } from "../context/AppContext";
import { bookAppointment } from "../lib/api/appointments";

export function useAppointments() {
  const { appointments, addAppointment, updateAppointmentStatus, user } = useApp();
  const [isBooking, setIsBooking] = useState(false);

  const activeAppointments = appointments.filter((a) =>
    ["pending", "accepted", "in_consultation"].includes(a.status)
  );

  const pastAppointments = appointments.filter((a) =>
    ["completed", "referred", "cancelled"].includes(a.status)
  );

  const bookNewAppointment = async (
    doctorName: string,
    facilityName: string,
    priority: Appointment["priority"],
    reason: string
  ) => {
    setIsBooking(true);
    try {
      const patientId = user?.phone || "+91 98765 43210";
      const apt = await bookAppointment(patientId, doctorName, facilityName, priority, reason);
      addAppointment({
        doctorName: apt.doctorName,
        facilityName: apt.facilityName,
        priority: apt.priority,
        reason: apt.reason,
      });
    } catch (error) {
      console.error("useAppointments hook failed to book appointment:", error);
    } finally {
      setIsBooking(false);
    }
  };

  return {
    appointments,
    activeAppointments,
    pastAppointments,
    addAppointment,
    bookNewAppointment,
    isBooking,
    updateAppointmentStatus,
  };
}
