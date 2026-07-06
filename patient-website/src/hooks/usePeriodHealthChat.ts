import { useState, useCallback, useRef } from "react";

export type ChatPhase =
  | "NORMAL"          // standard Q&A flow
  | "AWAITING_REPORT" // waiting for user to paste their report text
  | "DONE";           // booking confirmed

export const CLINIC_LIST = [
  { name: "Chandpur Primary Health Centre", distance: "1.2 km", time: "09:00 AM – 05:00 PM" },
  { name: "Saraswati Women's Clinic", distance: "2.8 km", time: "10:00 AM – 07:00 PM" },
  { name: "District Referral Hospital – Gynae OPD", distance: "5.4 km", time: "08:00 AM – 02:00 PM" },
  { name: "Asha Maternity & Women's Care Centre", distance: "3.1 km", time: "09:30 AM – 06:00 PM" },
];

export interface PeriodMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isRedFlag?: boolean;
  isReport?: boolean;   // report analysis block
  isBooking?: boolean;  // final booking confirmation
  audioBase64?: string;
}

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function usePeriodHealthChat() {
  const [messages, setMessages] = useState<PeriodMessage[]>([]);
  const [phase, setPhase] = useState<ChatPhase>("NORMAL");
  const [isLoading, setIsLoading] = useState(false);
  const conversationHistory = useRef<OpenRouterMessage[]>([]);
  // Use a stable session/patient ID for the current chat session
  const sessionRef = useRef({
    patient_id: `patient-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    session_id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  });

  const addMessage = useCallback((msg: Omit<PeriodMessage, "id">) => {
    setMessages((prev) => [
      ...prev,
      { ...msg, id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
    ]);
  }, []);

  const callBackend = async (text: string) => {
    const hasGujarati = /[\u0A80-\u0AFF]/.test(text);
    const hasHindi    = /[\u0900-\u097F]/.test(text);
    const effectiveLang = hasGujarati ? "gu" : hasHindi ? "hi" : "en";

    const res = await fetch("http://localhost:8001/route", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patient_id: sessionRef.current.patient_id,
        session_id: sessionRef.current.session_id,
        action: "period_chat",
        payload: {
          text,
          history: conversationHistory.current,
        },
        language: effectiveLang,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }

    const data = await res.json();
    if (data.status !== "success") {
      throw new Error(data.message || "Failed to process chat");
    }

    return {
      reply: data.data?.data?.answer_text || "",
      isEmergency: data.data?.data?.urgency_banner || false,
      audioBase64: data.data?.data?.audio_base64 || "",
    };
  };

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      
      addMessage({ role: "user", content: text });
      
      setIsLoading(true);

      try {
        const { reply, isEmergency, audioBase64 } = await callBackend(text);

        // Check for specific backend responses to update local state
        const isAwaitingReport = reply.includes("Please type in the details from your report");
        const isBookingConfirm = /appointment has been successfully booked/i.test(reply);

        addMessage({
          role: "assistant",
          content: reply,
          isRedFlag: isEmergency,
          isBooking: isBookingConfirm,
          audioBase64: audioBase64,
        });

        conversationHistory.current.push({ role: "user", content: text });
        conversationHistory.current.push({ role: "assistant", content: reply });

        if (isAwaitingReport) {
          setPhase("AWAITING_REPORT");
        } else if (isBookingConfirm) {
          setPhase("DONE");
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        addMessage({
          role: "assistant",
          content: `⚠️ Sorry, something went wrong connecting to our assistant. Please try again. (${message})`,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, addMessage]
  );

  const submitReport = useCallback(
    async (reportText: string) => {
      if (!reportText.trim() || isLoading) return;
      
      addMessage({ role: "user", content: reportText, isReport: true });
      setIsLoading(true);

      try {
        const { reply, isEmergency, audioBase64 } = await callBackend(reportText);

        const isBookingConfirm = /appointment has been successfully booked/i.test(reply);

        addMessage({ 
          role: "assistant", 
          content: reply, 
          isReport: true,
          isRedFlag: isEmergency,
          isBooking: isBookingConfirm,
          audioBase64: audioBase64
        });

        conversationHistory.current.push({ role: "user", content: reportText });
        conversationHistory.current.push({ role: "assistant", content: reply });

        if (isBookingConfirm) {
          setPhase("DONE");
        } else {
          setPhase("NORMAL"); 
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        addMessage({
          role: "assistant",
          content: `⚠️ Could not process your report right now. Please continue without it. (${message})`,
        });
        setPhase("NORMAL");
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, addMessage]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    conversationHistory.current = [];
    sessionRef.current = {
      patient_id: `patient-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      session_id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    };
    setPhase("NORMAL");
  }, []);

  return {
    messages,
    phase,
    isLoading,
    sendMessage,
    submitReport,
    clearChat,
  };
}
