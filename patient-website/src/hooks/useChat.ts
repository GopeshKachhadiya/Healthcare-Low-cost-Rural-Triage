import { useApp } from "../context/AppContext";

export function useChat() {
  const { chatHistory, addChatMessage, addAppointment, clearChat } = useApp();

  const isRedFlagActive = chatHistory.some((m) => m.isRedFlag);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Send user message
    addChatMessage(text, "user");

    // Simulate network delay / RAG webhook call
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
            text: "Diabetes Mellitus is a metabolic disorder where the body cannot properly regulate glucose levels in the blood. Type 2 diabetes is common in adults and is managed by physical activity, healthy diet, and medications like Metformin.",
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
            text: "Paracetamol (Acetaminophen) is a mild analgesic (pain reliever) and antipyretic (fever reducer). Standard adult dosage is 500mg-650mg up to 4 times a day. Do not exceed 4000mg in 24 hours to avoid liver toxicity.",
            sources: [
              {
                title: "Indian National Formulary (INF 2021, p. 288)",
                content:
                  "Paracetamol safety profile, pediatric dosing guidelines, liver warning limits, and contraindications.",
              },
            ],
          },
          emergency: {
            text: "CRITICAL ALERT: Chest pain paired with breathlessness are clinical RED FLAGS indicating cardiac ischemia or severe respiratory failure. An emergency triage appointment with PHC On-call Medical Officer has been auto-escalated immediately.",
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
