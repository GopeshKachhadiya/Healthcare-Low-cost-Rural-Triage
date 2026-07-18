import { useApp } from "../context/AppContext";
import { API_BASE_URL } from "../lib/api/config";

export function usePeriodChat() {
  const { chatHistory, addChatMessage, addAppointment, clearChat, user } = useApp();

  const isRedFlagActive = chatHistory.some((m) => m.isRedFlag);

  const sendMessage = async (text: string, condition?: string) => {
    if (!text.trim()) return;

    // Send user message
    addChatMessage(text, "user");

    let fetchErrorMsg = "";
    // Auto-detect language from what the user actually typed
    // If they type in Gujarati/Hindi script → regional language; otherwise → English
    const hasGujarati = /[\u0A80-\u0AFF]/.test(text);
    const hasHindi    = /[\u0900-\u097F]/.test(text);
    const effectiveLang = hasGujarati ? "gu" : hasHindi ? "hi" : "en";

    try {
      const response = await fetch(`${API_BASE_URL}/route`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient_id: user?.phone || "+91 98765 43210",
          action: "period_chat",
          payload: { 
            text,
            condition,
            history: chatHistory.map(m => ({
              role: m.sender === "bot" ? "assistant" : "user",
              content: m.text
            }))
          },
          language: effectiveLang,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        if (result.status === "emergency") {
          addChatMessage(
            result.message,
            "bot",
            [
              {
                title: "Emergency Protocol",
                content: result.action_taken || "Immediate escalation to nearest PHC on-call team.",
              },
            ],
            true
          );

          // Auto-escalate appointment
          addAppointment({
            doctorName: "Dr. Alok Sharma (PHC Medical Officer)",
            facilityName: "Chandpur Primary Health Centre",
            priority: "red",
            reason: `Auto-escalation from Period Chatbot emergency trigger: ${text}`,
          });
          return;
        }

        if (result.status === "success" && result.route === "period_chat") {
          const ragData = result.data.data;
          
          addChatMessage(
            ragData.answer_text,
            "bot",
            [],
            ragData.urgency_banner
          );

          if (ragData.urgency_banner) {
            addAppointment({
              doctorName: "Dr. Alok Sharma (PHC Medical Officer)",
              facilityName: "Chandpur Primary Health Centre",
              priority: "orange",
              reason: `Auto-escalation from Period Chatbot symptom trigger: ${text}`,
            });
          }
          return;
        }

        fetchErrorMsg = `Result Mismatch: ${JSON.stringify(result)}`;
      } else {
         fetchErrorMsg = `Backend returned HTTP ${response.status}`;
      }
    } catch (err: any) {
      console.error("Failed to query Patient Orchestrator backend:", err);
      fetchErrorMsg = err.message || "Network Error";
    }

    // Fallback to local simulation if backend fails/is offline
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        addChatMessage("⚠️ Our medical assistant is temporarily unavailable. Please try again in a moment.", "bot");
        resolve();
      }, 1000);
    });
  };

  return {
    chatHistory,
    sendMessage,
    clearChat,
    isRedFlagActive,
  };
}
