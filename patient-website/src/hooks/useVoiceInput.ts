import { useState, useRef } from "react";

export function useVoiceInput() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start voice recording:", err);
      alert("Please grant microphone permission to record audio.");
    }
  };

  const stopRecording = (language: string = "hi", uploadUrl?: string): Promise<string> => {
    setIsRecording(false);
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) {
        resolve("");
        return;
      }

      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });

          // Stop all audio tracks to release the microphone resource
          mediaRecorder.stream.getTracks().forEach((track) => track.stop());

          if (!uploadUrl) {
            resolve("मेरे सीने में दर्द है और सांस लेने में तकलीफ है / I have chest pain and breathlessness");
            return;
          }

          const formData = new FormData();
          formData.append("file", audioBlob, "audio.webm");

          const res = await fetch(`${uploadUrl}?language=${language}`, {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            throw new Error(`Failed to transcribe: ${res.statusText}`);
          }

          const data = await res.json();
          if (data.status === "success" && data.transcript) {
            resolve(data.transcript);
          } else {
            resolve("");
          }
        } catch (err) {
          console.error("Transcribing audio failed:", err);
          resolve("");
        }
      };

      mediaRecorder.stop();
    });
  };

  const cancelRecording = () => {
    setIsRecording(false);
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder) {
      mediaRecorder.onstop = null;
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
    chunksRef.current = [];
  };

  return {
    isRecording,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
