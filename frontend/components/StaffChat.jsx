"use client";

import { useState, useRef, useEffect } from "react";
import { sendChat } from "@/lib/api";

/**
 * Staff Chat — LLM ops assistant with quick action buttons.
 * Sends queries to the agentic tool-calling backend.
 */

const QUICK_ACTIONS = [
  { label: "📊 Crowd status", query: "What's the current crowd status across all zones?" },
  { label: "⚡ Surge check", query: "Are any surges predicted in the next 10 minutes?" },
  { label: "⏱️ Wait times", query: "What are the current concession wait times?" },
  { label: "⚠️ Anomalies", query: "Are there any anomalies or security concerns detected?" },
];

export default function StaffChat({ minute = 60 }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "👋 I'm VenueFlow Ops Assistant. I can query live sensor data, check surge predictions, estimate wait times, and flag anomalies. Ask me anything about venue operations!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (query) => {
    const userMessage = query || input.trim();
    if (!userMessage) return;

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      const data = await sendChat(userMessage, minute);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Unable to reach the backend. Make sure the FastAPI server is running on port 8000.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1 min-h-0">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600/30 text-blue-100 rounded-br-md"
                  : "glass-card-sm text-slate-200 rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start animate-fade-in-up">
            <div className="glass-card-sm rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5">
              <span className="w-2 h-2 bg-slate-400 rounded-full typing-dot" />
              <span className="w-2 h-2 bg-slate-400 rounded-full typing-dot" />
              <span className="w-2 h-2 bg-slate-400 rounded-full typing-dot" />
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => handleSend(action.query)}
            disabled={loading}
            className="text-[10px] px-2 py-1 rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white transition-colors disabled:opacity-40"
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && handleSend()}
          placeholder="Ask about venue operations..."
          disabled={loading}
          className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 rounded-xl gradient-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
