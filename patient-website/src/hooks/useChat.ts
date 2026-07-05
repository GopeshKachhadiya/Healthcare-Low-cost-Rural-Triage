import { useApp } from "../context/AppContext";

export function useChat() {
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
      const response = await fetch("http://127.0.0.1:9000/route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient_id: user?.phone || "+91 98765 43210",
          action: "chat",
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
                title: "Emergency Protocol (Agent S1)",
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
            reason: `Auto-escalation from Chatbot emergency trigger: ${text}`,
          });
          return;
        }

        if (result.status === "success" && result.route === "rag_chat") {
          const ragData = result.data.data;
          const formattedSources = (ragData.citations || []).map((source: string) => ({
            title: source,
            content: "Retrieved guideline passage from RAG corpus.",
          }));

          addChatMessage(
            ragData.answer_text,
            "bot",
            formattedSources,
            ragData.urgency_banner
          );

          if (ragData.urgency_banner) {
            addAppointment({
              doctorName: "Dr. Alok Sharma (PHC Medical Officer)",
              facilityName: "Chandpur Primary Health Centre",
              priority: "orange",
              reason: `Auto-escalation from Chatbot symptom trigger: ${text}`,
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
        let selectedIntent = "disease";
        const lower = text.toLowerCase();

        if (lower.includes("paracetamol") || lower.includes("medicine")) {
          selectedIntent = "medicine";
        } else if (
          lower.includes("chest") ||
          lower.includes("pain") ||
          lower.includes("breath") ||
          lower.includes("सीने")
        ) {
          selectedIntent = "emergency";
        }

        const answers: Record<
          string,
          { text: string; sources: { title: string; content: string }[]; isRed?: boolean }
        > = {
          disease: {
            text: `⚠️ Our medical assistant is temporarily unavailable. Please try again in a moment, or call your nearest health center directly.`,
            sources: [
              {
                title: "ICMR Standard Guidelines (Endocrine Section, p. 14)",
                content:
                  "Type 2 Diabetes mellitus standard care protocol, dosage charts, and lifestyle modification counseling rules.",
              },
              {
                title: "WHO Essential Medicines Registry",
                content: "Metformin 500mg therapeutic classification and first-line prescription indications.",
              },
            ],
          },
          medicine: {
            text: `⚠️ Our medical assistant is temporarily unavailable. Please try again in a moment, or call your nearest health center directly.`,
            sources: [
              {
                title: "Indian National Formulary (INF 2021, p. 288)",
                content:
                  "Paracetamol safety profile, pediatric dosing guidelines, liver warning limits, and contraindications.",
              },
            ],
          },
          emergency: {
            text: `🚨 CRITICAL: Your symptoms may require emergency care. Please call 108 (Ambulance) or go to your nearest hospital immediately.`,
            sources: [
              {
                title: "WHO Emergency Triage Assessment & Treatment (ETAT)",
                content: "Immediate life-threat protocols for chest pain, respiratory distress, and stroke signs.",
              },
            ],
            isRed: true,
          },
        };

        const answer = answers[selectedIntent];

        // Add bot response
        addChatMessage(answer.text, "bot", answer.sources, answer.isRed);

        // Auto-escalate appointment if red flag is triggered
        if (answer.isRed) {
          addAppointment({
            doctorName: "Dr. Alok Sharma (PHC Medical Officer)",
            facilityName: "Chandpur Primary Health Centre",
            priority: "red",
            reason: `Auto-escalation from Chatbot symptom trigger: ${text}`,
          });
        }
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
