import { useApp, Appointment } from "../context/AppContext";

export function useAppointments() {
  const { appointments, addAppointment, updateAppointmentStatus } = useApp();

  const activeAppointments = appointments.filter((a) =>
    ["pending", "accepted", "in_consultation"].includes(a.status)
  );

  const pastAppointments = appointments.filter((a) =>
    ["completed", "referred", "cancelled"].includes(a.status)
  );

  return {
    appointments,
    activeAppointments,
    pastAppointments,
    addAppointment,
    updateAppointmentStatus,
  };
}
