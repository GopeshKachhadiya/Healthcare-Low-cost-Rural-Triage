import { useState, useCallback } from "react";
import { useApp } from "../context/AppContext";

export type Message = {
  id: string;
  sender: "user" | "bot";
  text: string;
  isRedFlag?: boolean;
};

export function useScanChat(condition: string, summary: string) {
  const { addAppointment, user } = useApp();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      sender: "bot",
      text: `**Introductory Summary:**\n${summary}\n\nI am your AI assistant specialized in skin conditions. You can ask me about prevention, remedies, or request a medical prescription (which will be subject to doctor approval).`,
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const newUserMsg: Message = { id: Date.now().toString(), sender: "user", text };
      setMessages((prev) => [...prev, newUserMsg]);
      setIsTyping(true);

      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), sender: "bot", text: "Error: Groq API key is missing." },
        ]);
        setIsTyping(false);
        return;
      }

      // Detect if user text contains emergency keywords (basic heuristic)
      const isEmergency = /emergency|severe|bleeding|breath|pain|die|urgent/i.test(text);

      const systemPrompt = `You are an AI specialized in skin conditions. The user has been diagnosed with ${condition}. 
Patient Profile: Name is ${user?.name || "Unknown"}, Date of Birth is ${user?.dob || "Unknown"}.
The user is located in the village of ${user?.village || "an unknown location"}. When providing remedies or suggesting doctors/hospitals, please take their location into account and suggest the best suitable facilities nearby.
Your task is to ONLY answer questions regarding this skin condition, how to prevent it, and what remedies to use. 
If the user asks to create a medical prescription, you may draft one but you MUST explicitly append: "\n\n[PENDING DOCTOR APPROVAL]" and ensure you fill in the Patient Information (Name, Age, Location) using their actual profile details. 
If the user's message indicates a severe emergency or red flag, start your response with "RED_FLAG:" so I can parse it.
Do NOT answer questions about general knowledge, programming, or other unrelated topics. Keep responses empathetic but concise.`;

      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              { role: "system", content: systemPrompt },
              ...messages.slice(1).map((m) => ({
                role: m.sender === "user" ? "user" : "assistant",
                content: m.text,
              })),
              { role: "user", content: text },
            ],
            temperature: 0.3,
            max_tokens: 250,
          }),
        });

        const data = await response.json();
        let replyText = data.choices?.[0]?.message?.content || "Sorry, I couldn't process that.";
        let isRedFlag = isEmergency;

        if (replyText.startsWith("RED_FLAG:")) {
          isRedFlag = true;
          replyText = replyText.replace("RED_FLAG:", "").trim();
        }

        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), sender: "bot", text: replyText, isRedFlag },
        ]);

        if (isRedFlag) {
          addAppointment({
            doctorName: "Dr. Alok Sharma (On-call Specialist)",
            facilityName: "Emergency Hospital Panel",
            priority: "red",
            reason: `Urgent request forwarded from side-panel chat regarding: ${condition}`,
          });
        }
      } catch (err) {
        console.error("Groq API error:", err);
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), sender: "bot", text: "Network error communicating with AI." },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [condition, messages, addAppointment]
  );

  return { messages, sendMessage, isTyping };
}
