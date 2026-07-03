export interface SymptomLog {
  symptoms: string;
  durationDays: number;
  severity: "mild" | "moderate" | "severe";
}

export async function logSymptoms(userId: string, data: SymptomLog): Promise<{ success: boolean; logId?: string; error?: string }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, logId: `symp-${Date.now()}` });
    }, 350);
  });
}
