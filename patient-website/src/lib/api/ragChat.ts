export interface Citation {
  title: string;
  content: string;
}

export interface ChatBotResponse {
  answer: string;
  citations: Citation[];
  isRedFlag: boolean;
}

export async function askAnvayaRAG(query: string, language: string): Promise<ChatBotResponse> {
  // Simulates querying vector DB index using n8n orchestrator
  return new Promise((resolve) => {
    setTimeout(() => {
      const lower = query.toLowerCase();
      if (lower.includes("chest") || lower.includes("pain") || lower.includes("breath") || lower.includes("सीने")) {
        resolve({
          answer: "CRITICAL: Chest pain paired with breathlessness are cardiac RED FLAGS. Contact emergency transport immediately.",
          citations: [{ title: "WHO Emergency Care Manual", content: "Cardiopulmonary distress protocols." }],
          isRedFlag: true,
        });
      } else {
        resolve({
          answer: `Here is the guideline information for: "${query}". Managing this requires healthy habits, standard clinical evaluation, and localized care.`,
          citations: [{ title: "ICMR Clinical Protocols", content: "General health wellness recommendations." }],
          isRedFlag: false,
        });
      }
    }, 900);
  });
}
