import { useState } from "react";

export function useVoiceInput() {
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = () => {
    setIsRecording(true);
  };

  const stopRecording = (mockTranscription = "मेरे सीने में दर्द है और सांस लेने में तकलीफ है / I have chest pain and breathlessness"): Promise<string> => {
    setIsRecording(false);
    return new Promise((resolve) => {
      // Simulate transcription delay
      setTimeout(() => {
        resolve(mockTranscription);
      }, 500);
    });
  };

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}
