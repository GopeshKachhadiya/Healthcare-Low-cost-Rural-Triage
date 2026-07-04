import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Send, Volume2, ShieldAlert, Sparkles, Trash2, ArrowLeft } from "lucide-react";
import PulseDivider from "../components/PulseDivider";
import VoiceInputButton from "../components/VoiceInputButton";
import SourcesPanel from "../components/SourcesPanel";
import { useChat } from "../hooks/useChat";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { useTranslation } from "../hooks/useTranslation";

const STANDARD_QUESTIONS = [
  { text: "What is diabetes? / मधुमेह क्या है?", intent: "disease" },
  { text: "What is paracetamol used for? / पैरासिटामोल क्या काम आती है?", intent: "medicine" },
  { text: "I have chest pain and severe breathlessness / मेरे सीने में दर्द है", intent: "emergency" }
];

export default function Chat() {
  const { chatHistory, sendMessage, clearChat } = useChat();
  const { isRecording, startRecording, stopRecording } = useVoiceInput();
  const { t } = useTranslation();
  const [inputText, setInputText] = useState("");
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    sendMessage(text);
    setInputText("");
  };

  const handleMicClick = async () => {
    if (isRecording) {
      if (timerRef.current) clearTimeout(timerRef.current);
      const text = await stopRecording();
      if (text) sendMessage(text);
    } else {
      startRecording();
      timerRef.current = setTimeout(async () => {
        const text = await stopRecording();
        if (text) sendMessage(text);
      }, 3000);
    }
  };

  const togglePlayAudio = (msgId: string) => {
    if (playingAudioId === msgId) {
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(msgId);
      // Simulate audio ending after 4s
      setTimeout(() => {
        setPlayingAudioId((prev) => (prev === msgId ? null : prev));
      }, 4000);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-6 flex flex-col h-[calc(100vh-140px)]">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-ink/10">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink/10 bg-white text-ink hover:border-teal-400 hover:text-teal-600 transition-all shadow-sm"
            aria-label="Back to Home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-teal-700 flex items-center gap-2">
              <MessageCircle className="h-6 w-6" />
              {t("chat.title")}
            </h1>
            <p className="text-xs text-ink/50 mt-0.5">
              RAG-grounded support in regional languages. All answers cited.
            </p>
          </div>
        </div>
        {chatHistory.length > 0 && (
          <button
            onClick={clearChat}
            className="p-2 text-ink/50 hover:text-tier-red transition-colors"
            title="Clear Chat history"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Message history */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {chatHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto space-y-5">
            <div className="h-14 w-14 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-lg font-bold text-teal-700">Start a Conversation</h2>
              <p className="text-sm text-ink/60">
                Describe your symptoms by voice or text. Answers are drawn strictly from WHO & ICMR guidelines.
              </p>
            </div>
            <div className="w-full space-y-2 text-left">
              <p className="text-xs font-semibold text-ink/40 uppercase tracking-wider">Try asking:</p>
              {STANDARD_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q.text)}
                  className="w-full p-3 text-left text-xs font-medium rounded-lg border border-ink/10 bg-white hover:border-teal-400 hover:bg-teal-50/20 text-ink/80 transition-all flex items-center justify-between"
                >
                  <span>{q.text}</span>
                  <Send className="h-3 w-3 text-teal-500 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          chatHistory.map((msg) => {
            const isUser = msg.sender === "user";
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 shadow-sm text-sm leading-relaxed ${
                    isUser
                      ? "bg-teal-500 text-white font-medium"
                      : msg.isRedFlag
                      ? "bg-tier-red-bg border border-tier-red/20 text-ink"
                      : "bg-white border border-ink/10 text-ink"
                  }`}
                >
                  {msg.isRedFlag && (
                    <div className="flex gap-2 text-tier-red font-semibold mb-2 text-xs items-center">
                      <ShieldAlert className="h-4 w-4" />
                      <span>CRITICAL DETECTED</span>
                    </div>
                  )}
                  <p>{msg.text}</p>

                  {/* Bot helper actions (audio check) */}
                  {!isUser && (
                    <div className="mt-3 pt-2.5 border-t border-ink/5 flex items-center justify-between gap-4">
                      <button
                        onClick={() => togglePlayAudio(msg.id)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold ${
                          playingAudioId === msg.id
                            ? "bg-teal-500 text-white"
                            : "bg-teal-50 text-teal-700 hover:bg-teal-100"
                        } transition-colors`}
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                        {playingAudioId === msg.id ? "Playing Voice..." : "Listen / सुनें"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Collapsible Sources Panel */}
                {!isUser && msg.sources && msg.sources.length > 0 && (
                  <SourcesPanel sources={msg.sources} className="w-[85%] mt-1.5 shadow-sm" />
                )}

                <span className="text-[10px] text-ink/40 px-1">{msg.timestamp}</span>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input panel */}
      <div className="pt-3 border-t border-ink/10 bg-paper">
        {isRecording && (
          <div className="mb-3 rounded-lg bg-tier-red-bg p-3 border border-tier-red/10 flex items-center justify-between text-xs text-tier-red animate-pulse">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-tier-red block" />
              Recording voice translation to English (ASR via Bhashini)...
            </span>
            <button
              onClick={() => {
                if (timerRef.current) clearTimeout(timerRef.current);
                stopRecording("");
              }}
              className="font-semibold underline uppercase text-tier-red"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex gap-2 items-center">
          <VoiceInputButton
            isRecording={isRecording}
            onClick={handleMicClick}
            disabled={inputText.trim() !== ""}
          />

          <input
            type="text"
            placeholder={
              isRecording
                ? t("chat.recording")
                : t("chat.placeholder")
            }
            disabled={isRecording}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend(inputText)}
            className="flex-1 rounded-full border border-ink/15 bg-white px-5 py-3 text-sm text-ink focus:border-teal-500 focus:outline-none"
          />

          <button
            type="button"
            disabled={!inputText.trim() || isRecording}
            onClick={() => handleSend(inputText)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-500 text-white hover:bg-teal-600 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

