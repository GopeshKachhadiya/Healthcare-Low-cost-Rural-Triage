import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Trash2,
  Heart,
  Loader2,
  FileText,
  ShieldAlert,
  Sparkles,
  CalendarCheck,
  ClipboardList,
  RefreshCw,
  Image as ImageIcon,
  X
} from "lucide-react";
import { usePeriodHealthChat, CLINIC_LIST } from "../hooks/usePeriodHealthChat";

// ── Suggested quick-start questions ─────────────────────────────────────────
const STARTER_QUESTIONS = [
  "My periods are very irregular and painful",
  "I haven't had my period for 2 months",
  "I have very heavy bleeding every cycle",
  "I have PCOD and my periods are delayed",
];

// ── Minimal markdown renderer ─────────────────────────────────────────────────
function RenderMarkdown({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {text.split("\n\n").map((block, bi) => {
        if (block.trim() === "---") {
          return <hr key={bi} className="border-rose-100 my-2" />;
        }
        const lines = block.split("\n");
        const isBullet = lines.some(
          (l) =>
            l.trim().startsWith("- ") ||
            l.trim().startsWith("• ") ||
            l.trim().startsWith("* ") ||
            /^\d+\.\s/.test(l.trim())
        );
        if (isBullet) {
          return (
            <ul key={bi} className="space-y-1 pl-1">
              {lines.map((line, li) => {
                const cleaned = line
                  .replace(/^[-•*]\s+/, "")
                  .replace(/^\d+\.\s+/, "");
                const isItem =
                  /^[-•*]\s/.test(line.trim()) || /^\d+\.\s/.test(line.trim());
                return isItem ? (
                  <li key={li} className="flex items-start gap-1.5">
                    <span className="text-rose-400 mt-0.5 shrink-0">•</span>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: cleaned
                          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\*(.+?)\*/g, "<em>$1</em>"),
                      }}
                    />
                  </li>
                ) : (
                  <p
                    key={li}
                    className="text-gray-700"
                    dangerouslySetInnerHTML={{
                      __html: line
                        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                        .replace(/\*(.+?)\*/g, "<em>$1</em>"),
                    }}
                  />
                );
              })}
            </ul>
          );
        }
        return (
          <p
            key={bi}
            dangerouslySetInnerHTML={{
              __html: block
                .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                .replace(/\*(.+?)\*/g, "<em>$1</em>")
                .replace(/\n/g, "<br/>"),
            }}
          />
        );
      })}
    </div>
  );
}

// ── Clinic picker (shown as suggestion chips in report phase) ────────────────
function ClinicChips({ onSelect }: { onSelect: (name: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {CLINIC_LIST.map((c, i) => (
        <button
          key={c.name}
          onClick={() => onSelect(`${i + 1}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors"
        >
          <CalendarCheck className="h-3 w-3" />
          {i + 1}. {c.name}
        </button>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PeriodHealthChat() {
  const { messages, phase, isLoading, sendMessage, submitReport, clearChat } =
    usePeriodHealthChat();
  const [inputText, setInputText] = useState("");
  const [showClinicChips, setShowClinicChips] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    label: string;
    confidence: number;
    infected: boolean;
    summary: string;
    flag: string;
    status: string;
  } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Show clinic chips after final report appears
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (
      last?.role === "assistant" &&
      /Nearest Available Hospitals/i.test(last.content)
    ) {
      setShowClinicChips(true);
    } else if (
      last?.role === "assistant" &&
      /successfully booked/i.test(last.content)
    ) {
      setShowClinicChips(false);
    }
  }, [messages]);

  // Auto-greet on first load
  useEffect(() => {
    if (messages.length === 0) {
      // Trigger greeting on mount
      setTimeout(() => {
        sendMessage("Hello, I need help with my menstrual health.");
      }, 600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text && !selectedImage) return;
    setInputText("");
    const imgToSend = selectedImage;
    setSelectedImage(null);
    setShowClinicChips(false);
    
    if (phase === "AWAITING_REPORT") {
      submitReport(text, imgToSend || undefined);
    } else {
      sendMessage(text, imgToSend || undefined);
    }
    inputRef.current?.focus();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setScanResult(null); // reset previous result
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeScan = async () => {
    if (!selectedImage || isScanning) return;
    setIsScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("http://localhost:8001/scan-ultrasound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: selectedImage }),
      });
      const data = await res.json();
      setScanResult(data);
    } catch (err) {
      setScanResult({
        label: "Error",
        confidence: 0,
        infected: false,
        summary: "Could not connect to the YOLO server. Please make sure the backend is running.",
        flag: "unclear",
        status: "error",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleClinicSelect = (val: string) => {
    setShowClinicChips(false);
    sendMessage(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 border-b border-rose-100/80 bg-white/70 backdrop-blur-md px-5 py-3 shadow-sm">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-100 bg-white text-rose-400 hover:border-rose-300 hover:text-rose-600 transition-all shadow-sm"
              aria-label="Back to Home"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            {/* Logo / brand */}
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-md shadow-rose-200">
                <Heart className="h-5 w-5" />
              </span>
              <div>
                <h1 className="font-bold text-lg leading-tight text-gray-800">
                  Period Health Bot
                </h1>
                <p className="text-[10px] text-rose-400 leading-none font-medium">
                  Powered by AI · Not a doctor · Confidential
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Phase badge */}
            {phase === "AWAITING_REPORT" && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold">
                <FileText className="h-3 w-3" />
                Paste Report
              </span>
            )}
            {phase === "DONE" && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-[11px] font-semibold">
                <CalendarCheck className="h-3 w-3" />
                Booked!
              </span>
            )}

            {messages.length > 1 && (
              <button
                onClick={clearChat}
                className="p-2 text-gray-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50"
                title="Clear conversation"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Disclaimer ribbon ─────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-rose-500/5 border-b border-rose-100 px-5 py-1.5 text-center">
        <p className="text-[11px] text-rose-600/80 font-medium">
          🌸 This chatbot collects your symptoms to help you prepare for a doctor's visit. It does{" "}
          <strong>not</strong> diagnose or prescribe. For emergencies call{" "}
          <strong>108</strong>.
        </p>
      </div>

      {/* ── Main Layout with Side Panel ────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* ── Left Column: Chat Area ────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 relative">
          
          {/* ── Chat history ────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
            <div className="mx-auto max-w-3xl space-y-4">

          {/* Empty state with starters */}
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-6 py-10">
              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white shadow-xl shadow-rose-200">
                  <Heart className="h-10 w-10" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-rose-500 items-center justify-center">
                    <Sparkles className="h-3 w-3 text-white" />
                  </span>
                </span>
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-gray-800">
                  Period Health Assistant
                </h2>
                <p className="text-sm text-gray-500 max-w-xs">
                  I'll guide you through a gentle intake, one question at a
                  time. Everything is confidential.
                </p>
              </div>
              <div className="w-full max-w-md space-y-2 text-left">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest text-center">
                  Or pick a concern to get started:
                </p>
                {STARTER_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="w-full p-3 text-left text-sm font-medium rounded-xl border border-rose-100 bg-white/80 hover:border-rose-300 hover:bg-rose-50 text-gray-700 transition-all flex items-center justify-between group"
                  >
                    <span>{q}</span>
                    <Send className="h-3.5 w-3.5 text-rose-300 group-hover:text-rose-500 shrink-0 ml-2 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                {/* Bot avatar */}
                {!isUser && (
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white mr-2.5 mt-1 shadow-sm shadow-rose-200">
                    <Heart className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] ${isUser ? "max-w-[70%]" : "max-w-[85%]"}`}
                >
                  {/* Red flag banner */}
                  {msg.isRedFlag && (
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      URGENT — SEEK IMMEDIATE MEDICAL ATTENTION
                    </div>
                  )}

                  {/* Report badge */}
                  {msg.isReport && !isUser && (
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-100 rounded-lg px-3 py-1.5">
                      <ClipboardList className="h-3.5 w-3.5" />
                      Report Analysis Included
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 shadow-sm text-sm leading-relaxed ${isUser
                        ? "bg-gradient-to-br from-rose-500 to-pink-500 text-white rounded-tr-sm"
                        : msg.isRedFlag
                          ? "bg-red-50 border border-red-200 text-gray-800 rounded-tl-sm"
                          : msg.isBooking
                            ? "bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 text-gray-800 rounded-tl-sm"
                            : msg.isReport
                              ? "bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 text-gray-800 rounded-tl-sm"
                              : "bg-white/90 border border-rose-100 text-gray-800 rounded-tl-sm"
                      }`}
                  >
                    {isUser ? (
                      <div className="flex flex-col gap-2">
                        {msg.imageUrl && (
                          <img src={msg.imageUrl} alt="Uploaded report" className="max-w-[200px] rounded-lg" />
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ) : (
                      <RenderMarkdown text={msg.content} />
                    )}
                  </div>

                  {/* Booking celebration */}
                  {msg.isBooking && (
                    <div className="mt-2 text-center text-xs text-green-600 font-medium animate-bounce">
                      🎉 Appointment confirmed!
                    </div>
                  )}

                  {/* Clinic chips under the final report */}
                  {!isUser &&
                    showClinicChips &&
                    msg === messages[messages.length - 1] && (
                      <ClinicChips onSelect={handleClinicSelect} />
                    )}
                </div>
              </div>
            );
          })}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white mr-2.5 mt-1 shadow-sm shadow-rose-200">
                <Heart className="h-4 w-4" />
              </div>
              <div className="bg-white/90 border border-rose-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-rose-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs font-medium text-gray-500">
                    {phase === "AWAITING_REPORT"
                      ? "Analysing your report…"
                      : "Thinking…"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* ── Input area ────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-rose-100 bg-white/80 backdrop-blur-md px-4 py-3">
        <div className="mx-auto max-w-3xl">
          {/* Phase hint */}
          <div className="flex gap-2 items-end">
            <input
              ref={inputRef}
              id="period-chat-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || phase === "DONE"}
              placeholder={
                phase === "AWAITING_REPORT"
                  ? "Paste hormone values or upload ultrasound image..."
                  : phase === "DONE"
                    ? "Appointment booked — start a new chat to ask more"
                    : "Type your response…"
              }
              className="flex-1 rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            />
            <button
              id="period-chat-send"
              type="button"
              disabled={!inputText.trim() || isLoading || phase === "DONE"}
              onClick={handleSend}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200 hover:shadow-rose-300 hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
        </div> {/* End Left Column */}

        {/* ── Right Column: Side Panel ──────────────────────────────────────── */}
        <div className="w-80 border-l border-rose-100 bg-white/60 backdrop-blur-md flex flex-col shadow-[-4px_0_15px_rgba(0,0,0,0.02)] z-10">
          <div className="p-5 border-b border-rose-100 bg-gradient-to-br from-rose-50/50 to-white">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-rose-500" />
              Ultrasound Analysis
            </h2>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Upload your ultrasound image for AI-powered PCOS detection.
            </p>
          </div>
          
          <div className="p-5 flex-1 overflow-y-auto">
            {phase === "AWAITING_REPORT" && (
              <div className="mb-4 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                <FileText className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  The assistant is ready for your report. You can <strong>upload an image here</strong> or paste text in the chat.
                </span>
              </div>
            )}
            
            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${selectedImage ? 'border-rose-200 bg-rose-50' : 'border-gray-200 hover:border-rose-300 hover:bg-rose-50/50 bg-gray-50'}`}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
                
                {selectedImage ? (
                  <div className="space-y-3 w-full">
                    <div className="relative inline-block w-full">
                      <img src={selectedImage} alt="Preview" className="w-full h-auto max-h-48 object-contain rounded-xl border border-rose-200 shadow-sm bg-white" />
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImage(null);
                        }}
                        className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 shadow-md hover:bg-red-500 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs font-medium text-rose-600">Image selected</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto text-rose-400">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Click to upload image</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={analyzeScan}
                disabled={!selectedImage || isScanning || phase === "DONE"}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-md shadow-rose-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isScanning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isScanning ? "Analyzing..." : "Analyze Ultrasound"}
              </button>

              {/* Scan Result */}
              {scanResult && (
                <div className={`rounded-2xl border p-4 space-y-3 text-sm ${
                  scanResult.flag === "abnormal"
                    ? "bg-red-50 border-red-200"
                    : scanResult.flag === "normal"
                    ? "bg-green-50 border-green-200"
                    : "bg-amber-50 border-amber-200"
                }`}>
                  {/* Result badge */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      scanResult.flag === "abnormal"
                        ? "bg-red-100 text-red-700"
                        : scanResult.flag === "normal"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {scanResult.flag === "abnormal" ? "⚠️ PCOS Detected" : scanResult.flag === "normal" ? "✅ No PCOS Detected" : "❓ Unclear"}
                    </span>
                    {scanResult.confidence > 0 && (
                      <span className="text-xs text-gray-500 font-medium">{scanResult.confidence}% confidence</span>
                    )}
                  </div>

                  {/* AI label */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">AI Detection</p>
                    <p className="font-semibold text-gray-800">{scanResult.label}</p>
                  </div>

                  {/* Summary */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Analysis</p>
                    <p className="text-gray-700 leading-relaxed text-xs">{scanResult.summary}</p>
                  </div>

                  <p className="text-[10px] text-gray-400 italic">This AI result is for guidance only. A certified doctor must confirm the diagnosis.</p>
                </div>
              )}
              
              {phase === "DONE" && (
                <div className="flex flex-col gap-2 mt-6">
                  <div className="flex items-center justify-between gap-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
                    <span className="flex items-start gap-1.5">
                      <CalendarCheck className="h-4 w-4 shrink-0" />
                      <span>Your appointment is confirmed. Have a safe visit!</span>
                    </span>
                  </div>
                  <button
                    onClick={clearChat}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-green-700 hover:bg-green-50 rounded-xl transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Start over
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
