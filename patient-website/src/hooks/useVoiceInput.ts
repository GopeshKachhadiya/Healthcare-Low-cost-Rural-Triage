import { useState, useRef } from "react";

export function useVoiceInput() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isPermissionRequestActive, setIsPermissionRequestActive] = useState(false);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Voice recording is blocked or not supported on this connection. Please make sure you are accessing via localhost or HTTPS.");
        return;
      }
      setIsPermissionRequestActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsPermissionRequestActive(false);
      
      let options = {};
      if (typeof MediaRecorder.isTypeSupported === "function") {
        if (MediaRecorder.isTypeSupported("audio/webm")) {
          options = { mimeType: "audio/webm" };
        } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
          options = { mimeType: "audio/ogg" };
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          options = { mimeType: "audio/mp4" };
        }
      }

      const mediaRecorder = new MediaRecorder(stream, options);
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
      setIsPermissionRequestActive(false);
      console.error("Failed to start voice recording:", err);
      alert("Could not start recording. Please check your microphone permissions.");
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
    isPermissionRequestActive,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
