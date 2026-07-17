import React, { createContext, useContext, useState, useEffect } from "react";

export type Tier = "green" | "yellow" | "orange" | "red";

export interface Scan {
  id: string;
  modality: "skin_photo";
  image: string; // Base64 or SVG URL
  heatmap: string; // Gradient overlay Base64 or SVG URL
  condition: string;
  confidence: number;
  tier: Tier;
  explanation: string;
  recommendation: string;
  recordedAt: string;
  summary?: string;
}

export interface Appointment {
  id: string;
  doctorName: string;
  facilityName: string;
  date: string;
  time: string;
  status: "pending" | "accepted" | "in_consultation" | "completed" | "referred" | "cancelled";
  priority: Tier;
  reason: string;
  prescription?: {
    medicines: { name: string; dosage: string; frequency: string; duration: string }[];
    notes: string;
  };
}

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  sources?: { title: string; content: string }[];
  isRedFlag?: boolean;
  audioBase64?: string;
}

interface UserProfile {
  name: string;
  role: "patient" | "doctor" | "nurse" | "admin";
  phone: string;
  dob: string;
  gender: string;
  village: string;
  abhaId?: string;
  preferredLanguage: string;
}

interface ConsentState {
  storage: boolean;
  sms: boolean;
  abdm: boolean;
}

interface AppContextProps {
  user: UserProfile | null;
  consent: ConsentState;
  scans: Scan[];
  appointments: Appointment[];
  chatHistory: ChatMessage[];
  login: (phone: string, name?: string, role?: UserProfile["role"]) => void;
  logout: () => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  updateConsent: (consent: Partial<ConsentState>) => void;
  addScan: (scan: Omit<Scan, "id" | "recordedAt">) => string;
  addAppointment: (appointment: Omit<Appointment, "id" | "status" | "date" | "time">) => string;
  updateAppointmentStatus: (id: string, status: Appointment["status"]) => void;
  addChatMessage: (text: string, sender: "user" | "bot", sources?: ChatMessage["sources"], isRedFlag?: boolean, audioBase64?: string) => void;
  clearChat: () => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("am_user");
    return saved ? JSON.parse(saved) : {
      name: "Ramesh Kumar",
      role: "patient",
      phone: "+91 98765 43210",
      dob: "1988-06-15",
      gender: "Male",
      village: "Chandpur",
      abhaId: "14-8890-4321-7756",
      preferredLanguage: "en",
    };
  });

  const [consent, setConsent] = useState<ConsentState>(() => {
    const saved = localStorage.getItem("am_consent");
    return saved ? JSON.parse(saved) : { storage: true, sms: true, abdm: false };
  });

  const [scans, setScans] = useState<Scan[]>(() => {
    const saved = localStorage.getItem("am_scans");
    return saved ? JSON.parse(saved) : [
      {
        id: "scan-1",
        modality: "skin_photo",
        image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23e0c3a8'/><circle cx='200' cy='150' r='50' fill='%23a23a3a' opacity='0.7'/><ellipse cx='210' cy='140' rx='30' ry='20' fill='%238c2c2c' opacity='0.8'/></svg>",
        heatmap: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23111' opacity='0.3'/><circle cx='200' cy='150' r='80' fill='url(%23g)'/><defs><radialGradient id='g'><stop offset='0%' stop-color='%23ff0000' stop-opacity='0.9'/><stop offset='50%' stop-color='%23ffff00' stop-opacity='0.6'/><stop offset='100%' stop-color='%2300ff00' stop-opacity='0'/></defs></svg>",
        condition: "Eczema / Dermatitis",
        confidence: 0.87,
        tier: "green",
        explanation: "Eczema is a skin condition that causes dry, red, itchy, and bumpy patches. It is very common, non-contagious, and manageable with daily moisturizing and avoidance of triggers.",
        recommendation: "Apply an emollient cream multiple times a day. Avoid harsh soaps and washing detergents. If itching persists, consult a pharmacist or local health worker.",
        recordedAt: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
      }
    ];
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem("am_appointments");
    return saved ? JSON.parse(saved) : [
      {
        id: "apt-1",
        doctorName: "Dr. Alok Sharma (PHC Medical Officer)",
        facilityName: "Chandpur Primary Health Centre",
        date: new Date(Date.now() + 86400000).toISOString().split("T")[0], // Tomorrow
        time: "10:30 AM",
        status: "accepted",
        priority: "yellow",
        reason: "Follow-up check for chronic hypertension and mild cough.",
      },
      {
        id: "apt-2",
        doctorName: "Dr. Neha Patel (Dermatology Specialist)",
        facilityName: "District Referral Hospital",
        date: new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0], // 3 days ago
        time: "02:00 PM",
        status: "completed",
        priority: "orange",
        reason: "Severe skin rash check on left leg.",
        prescription: {
          medicines: [
            { name: "Clobetasol Propionate Ointment 0.05%", dosage: "Thin layer", frequency: "Twice daily", duration: "7 Days" },
            { name: "Cetirizine 10mg", dosage: "1 Tablet", frequency: "Once daily (Bedtime)", duration: "10 Days" }
          ],
          notes: "Keep the area dry. Avoid scrubbing the skin. Follow up if itching does not decrease in 3 days."
        }
      }
    ];
  });

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("am_chat");
    return saved ? JSON.parse(saved) : [];
  });

  // Sync to local storage
  useEffect(() => {
    if (user) localStorage.setItem("am_user", JSON.stringify(user));
    else localStorage.removeItem("am_user");
  }, [user]);

  useEffect(() => {
    localStorage.setItem("am_consent", JSON.stringify(consent));
  }, [consent]);

  useEffect(() => {
    localStorage.setItem("am_scans", JSON.stringify(scans));
  }, [scans]);

  useEffect(() => {
    localStorage.setItem("am_appointments", JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem("am_chat", JSON.stringify(chatHistory));
  }, [chatHistory]);

  const login = (phone: string, name?: string, role: UserProfile["role"] = "patient") => {
    setUser({
      name: name || "Ramesh Kumar",
      role: role,
      phone: phone,
      dob: "1988-06-15",
      gender: "Male",
      village: "Chandpur",
      abhaId: "14-8890-4321-7756",
      preferredLanguage: "en",
    });
  };

  const logout = () => {
    localStorage.removeItem("am_user");
    setUser(null);
    window.location.href = "/";
  };

  const updateProfile = (profile: Partial<UserProfile>) => {
    setUser((prev) => (prev ? { ...prev, ...profile } : null));
  };

  const updateConsent = (newConsent: Partial<ConsentState>) => {
    setConsent((prev) => ({ ...prev, ...newConsent }));
  };

  const addScan = (newScan: Omit<Scan, "id" | "recordedAt">) => {
    const id = `scan-${Date.now()}`;
    const scan: Scan = {
      ...newScan,
      id,
      recordedAt: new Date().toISOString(),
    };
    setScans((prev) => [scan, ...prev]);
    return id;
  };

  const addAppointment = (newApt: Omit<Appointment, "id" | "status" | "date" | "time">) => {
    const id = `apt-${Date.now()}`;
    const apt: Appointment = {
      ...newApt,
      id,
      date: new Date(Date.now() + 86400000).toISOString().split("T")[0], // default: tomorrow
      time: "11:00 AM", // default time slot
      status: "pending",
    };
    setAppointments((prev) => [apt, ...prev]);
    return id;
  };

  const updateAppointmentStatus = (id: string, status: Appointment["status"]) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, status } : apt))
    );
  };

  const addChatMessage = (
    text: string,
    sender: "user" | "bot",
    sources?: ChatMessage["sources"],
    isRedFlag?: boolean,
    audioBase64?: string
  ) => {
    setChatHistory((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender,
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sources,
        isRedFlag,
        audioBase64,
      },
    ]);
  };

  const clearChat = () => {
    setChatHistory([]);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        consent,
        scans,
        appointments,
        chatHistory,
        login,
        logout,
        updateProfile,
        updateConsent,
        addScan,
        addAppointment,
        updateAppointmentStatus,
        addChatMessage,
        clearChat,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppContextProvider");
  }
  return context;
}
