"use client";

import { useState, useRef, useEffect } from "react";
import { sendChat } from "@/lib/api";

/**
 * Staff Chat — LLM ops assistant with quick action buttons.
 * Sends queries to the agentic tool-calling backend.
 * Renders LLM responses with basic markdown formatting.
 */

const QUICK_ACTIONS = [
  { label: "📊 Crowd status", query: "What's the current crowd status across all zones?" },
  { label: "⚡ Surge check", query: "Are any surges predicted in the next 10 minutes?" },
  { label: "⏱️ Wait times", query: "What are the current concession wait times?" },
  { label: "⚠️ Anomalies", query: "Are there any anomalies or security concerns detected?" },
];

/**
 * Lightweight markdown-to-JSX renderer for LLM responses.
 * Handles: **bold**, bullet points, numbered lists, newlines, and `code`.
 */
function FormattedMessage({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    // Skip empty lines but add spacing
    if (!trimmed) {
      elements.push(<div key={`sp-${lineIdx}`} className="h-1.5" />);
      return;
    }

    // Detect bullet points (-, *, •)
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)/);
    // Detect numbered list (1. 2. etc.)
    const numberMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);

    let content;
    let wrapperClass = "";

    if (bulletMatch) {
      content = bulletMatch[1];
      wrapperClass = "flex items-start gap-1.5 ml-1";
      elements.push(
        <div key={lineIdx} className={wrapperClass}>
          <span className="text-blue-400 mt-0.5 shrink-0 text-[10px]">●</span>
          <span>{renderInline(content)}</span>
        </div>
      );
      return;
    }

    if (numberMatch) {
      content = numberMatch[2];
      wrapperClass = "flex items-start gap-1.5 ml-1";
      elements.push(
        <div key={lineIdx} className={wrapperClass}>
          <span className="text-blue-400 font-semibold shrink-0 text-[11px] min-w-[16px]">
            {numberMatch[1]}.
          </span>
          <span>{renderInline(content)}</span>
        </div>
      );
      return;
    }

    // Regular line
    elements.push(<div key={lineIdx}>{renderInline(trimmed)}</div>);
  });

  return <div className="space-y-0.5">{elements}</div>;
}

/**
 * Renders inline markdown: **bold**, `code`, and plain text.
 */
function renderInline(text) {
  const parts = [];
  // Match **bold**, `code`, or plain text segments
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Plain text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // **bold**
      parts.push(
        <strong key={match.index} className="font-semibold text-white">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // `code`
      parts.push(
        <code
          key={match.index}
          className="px-1 py-0.5 rounded bg-slate-700/60 text-blue-300 text-[11px] font-mono"
        >
          {match[3]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining plain text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

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
    if (!userMessage || loading) return;

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
          content: "⚠️ Unable to reach the backend. Make sure the FastAPI server is running on port 8000 and your GROQ_API_KEY is set.",
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
                  : "glass-card-sm text-slate-300 rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" ? (
                <FormattedMessage text={msg.content} />
              ) : (
                msg.content
              )}
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
