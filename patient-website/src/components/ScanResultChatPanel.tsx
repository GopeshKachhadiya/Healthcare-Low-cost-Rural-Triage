import React, { useState, useRef, useEffect } from "react";
import { Send, ShieldAlert, Calendar } from "lucide-react";
import { useScanChat } from "../hooks/useScanChat";
import { Link } from "react-router-dom";

export default function ScanResultChatPanel({ condition, summary }: { condition: string; summary: string }) {
  const { messages, sendMessage, isTyping } = useScanChat(condition, summary);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = () => {
    sendMessage(input);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-teal-50/20 border-l border-ink/10 relative">
      <div className="p-4 border-b border-ink/10 bg-white">
        <h3 className="font-semibold text-teal-700 text-lg">Condition Assistant</h3>
        <p className="text-xs text-ink/60 mt-1">Ask questions about your skin condition, remedies, or request a prescription.</p>
        
        {summary && (
          <details className="mt-3 bg-teal-50/50 rounded-lg border border-teal-100 text-xs text-ink/80">
            <summary className="font-semibold text-teal-700 p-3 cursor-pointer flex items-center gap-2 outline-none">
              <ShieldAlert className="h-3 w-3" />
              AI Diagnostic Summary (Click to expand)
            </summary>
            <div className="p-3 pt-0 max-h-32 overflow-y-auto">
              {summary}
            </div>
          </details>
        )}

        <Link 
          to="/appointments" 
          className="mt-3 w-full flex items-center justify-center gap-2 bg-teal-500 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-600 transition"
        >
          <Calendar className="h-4 w-4" />
          Book Appointment
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[90%] rounded-xl px-4 py-3 shadow-sm text-sm leading-relaxed ${
                msg.sender === "user"
                  ? "bg-teal-500 text-white"
                  : msg.isRedFlag
                  ? "bg-tier-red-bg border border-tier-red/20 text-ink"
                  : "bg-white border border-ink/10 text-ink"
              }`}
            >
              {msg.isRedFlag && (
                <div className="flex gap-2 text-tier-red font-semibold mb-2 text-xs items-center">
                  <ShieldAlert className="h-4 w-4" />
                  <span>EMERGENCY ESCALATED TO HOSPITAL PANEL</span>
                </div>
              )}
              <div 
                className="whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} 
              />
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-start">
            <div className="bg-white border border-ink/10 rounded-xl px-4 py-3 shadow-sm text-sm text-ink/50 italic animate-pulse">
              AI is typing...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-3 border-t border-ink/10 bg-white flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask a question..."
          className="flex-1 rounded-full border border-ink/15 bg-white px-4 py-2 text-sm focus:border-teal-500 focus:outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50 shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
