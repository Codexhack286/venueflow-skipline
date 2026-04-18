"use client";

import { useState, useEffect, useCallback } from "react";
import StadiumHeatmap from "@/components/StadiumHeatmap";
import SkipLineAlert from "@/components/SkipLineAlert";
import StaffChat from "@/components/StaffChat";
import {
  fetchDensity,
  fetchZones,
  fetchSurge,
  fetchAlerts,
  fetchWaitTimes,
  fetchAnomalies,
} from "@/lib/api";

const EVENT_DURATION = 240;

function formatTime(minute) {
  const eventStart = 18 * 60; // 6:00 PM
  const totalMin = eventStart + minute;
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

function getPhaseLabel(minute) {
  if (minute < 30) return "Entry Rush";
  if (minute < 60) return "Pre-Game";
  if (minute < 120) return "First Half";
  if (minute < 140) return "Halftime";
  if (minute < 210) return "Second Half";
  return "Exit Wave";
}

function getPhaseColor(minute) {
  if (minute < 30) return "#F97316";
  if (minute < 60) return "#EAB308";
  if (minute < 120) return "#22C55E";
  if (minute < 140) return "#EF4444";
  if (minute < 210) return "#22C55E";
  return "#F97316";
}

export default function DashboardPage() {
  const [minute, setMinute] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [zones, setZones] = useState([]);
  const [densities, setDensities] = useState({});
  const [surges, setSurges] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [waitTimes, setWaitTimes] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [connected, setConnected] = useState(false);

  // Load zones once
  useEffect(() => {
    fetchZones().then((z) => { setZones(z); setConnected(true); }).catch(() => setConnected(false));
  }, []);

  // Poll backend every 3 seconds
  const pollData = useCallback(async (m) => {
    try {
      const [d, s, a, w, an] = await Promise.all([
        fetchDensity(m),
        fetchSurge(m),
        fetchAlerts(m),
        fetchWaitTimes(m),
        fetchAnomalies(m),
      ]);
      setDensities(d);
      setSurges(s);
      setAlerts(a);
      setWaitTimes(w);
      setAnomalies(an);
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    pollData(minute);
    const interval = setInterval(() => pollData(minute), 3000);
    return () => clearInterval(interval);
  }, [minute, pollData]);

  // Auto-advance time
  useEffect(() => {
    localStorage.setItem("venueflow_minute", minute);
    if (!playing) return;
    const interval = setInterval(() => {
      setMinute((prev) => (prev >= EVENT_DURATION - 1 ? 0 : prev + 1));
    }, 1000 / speed);
    return () => clearInterval(interval);
  }, [playing, speed, minute]);

  // Stats
  const avgDensity = Object.values(densities).length
    ? Object.values(densities).reduce((a, b) => a + b, 0) / Object.values(densities).length
    : 0;
  const totalWait = waitTimes.reduce((sum, w) => sum + w.wait_minutes, 0);
  const avgWait = waitTimes.length ? totalWait / waitTimes.length : 0;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 pb-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="shrink-0 px-4 py-3 flex items-center justify-between border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-accent flex items-center justify-center text-lg font-bold text-white">
            V
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              VenueFlow<span className="text-blue-400"> + </span>
              <span className="text-emerald-400">SkipLine</span>
            </h1>
            <p className="text-[10px] text-slate-500 -mt-0.5">AI Crowd Management Dashboard</p>
          </div>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs ${connected ? "text-green-400" : "text-red-400"}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"} ${connected ? "animate-pulse" : ""}`} />
            {connected ? "Live" : "Offline"}
          </div>
          <a
            href="/attendee"
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
          >
            📱 Attendee View
          </a>
        </div>
      </header>

      {/* ── Event Timeline Controls ────────────────────────────── */}
      <div className="shrink-0 px-4 py-3 glass-card-sm mx-3 mt-2 rounded-xl flex flex-col md:flex-row md:items-center gap-4">
        {/* Play/Pause */}
        <button
          onClick={() => setPlaying(!playing)}
          className="w-9 h-9 rounded-lg bg-slate-700/50 text-white hover:bg-slate-600/50 flex items-center justify-center transition-colors text-lg"
        >
          {playing ? "⏸" : "▶️"}
        </button>

        {/* Speed */}
        <div className="flex items-center gap-1">
          {[1, 2, 5].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`text-[10px] px-2 py-1 rounded-md transition-colors ${
                speed === s
                  ? "bg-blue-600/30 text-blue-300"
                  : "bg-slate-800/30 text-slate-500 hover:text-slate-300"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Timeline slider */}
        <div className="flex-1 flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono w-14">{formatTime(minute)}</span>
          <input
            type="range"
            min={0}
            max={EVENT_DURATION - 1}
            value={minute}
            onChange={(e) => setMinute(Number(e.target.value))}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3B82F6 ${(minute / EVENT_DURATION) * 100}%, #334155 ${(minute / EVENT_DURATION) * 100}%)`,
            }}
          />
          <span className="text-xs text-slate-500 font-mono w-20">
            Min {minute}/{EVENT_DURATION}
          </span>
        </div>

        {/* Phase badge */}
        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={{
            background: getPhaseColor(minute) + "20",
            color: getPhaseColor(minute),
          }}
        >
          {getPhaseLabel(minute)}
        </span>
      </div>

      {/* ── Stats Bar ──────────────────────────────────────────── */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2 px-3 mt-2">
        {[
          { label: "Avg Density", value: `${Math.round(avgDensity * 100)}%`, color: getPhaseColor(minute) },
          { label: "Active Surges", value: surges.length, color: surges.length > 0 ? "#EF4444" : "#22C55E" },
          { label: "Avg Wait", value: `${avgWait.toFixed(1)}m`, color: avgWait > 10 ? "#F97316" : "#3B82F6" },
          { label: "Anomalies", value: anomalies.length, color: anomalies.length > 0 ? "#EF4444" : "#22C55E" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card-sm px-3 py-2 rounded-xl text-center">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{stat.label}</div>
            <div className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ── Main Content ───────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-3 p-3 lg:min-h-0">
        {/* Left: Heatmap (3 cols) */}
        <div className="lg:col-span-3 glass-card p-4 flex flex-col min-h-[400px] lg:min-h-0">
          <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2 shrink-0">
            <span>🏟️</span> Live Stadium Heatmap
            {anomalies.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 animate-pulse">
                {anomalies.length} anomal{anomalies.length === 1 ? "y" : "ies"}
              </span>
            )}
          </h2>
          <div className="flex-1 flex items-center justify-center min-h-0">
            <StadiumHeatmap
              zones={zones}
              densities={densities}
              surges={surges}
              waitTimes={waitTimes}
              anomalies={anomalies}
            />
          </div>
        </div>

        {/* Right: Alerts + Chat (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {/* Alerts */}
          <div className="glass-card p-4 flex flex-col min-h-[300px] lg:h-[45%]">
            <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2 shrink-0">
              <span>⚡</span> SkipLine Alerts
              {alerts.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                  {alerts.length} active
                </span>
              )}
            </h2>
            <div className="flex-1 overflow-hidden">
              <SkipLineAlert
                alerts={alerts}
                onPreOrder={() => window.open("/attendee", "_blank")}
              />
            </div>
          </div>

          {/* Chat */}
          <div className="glass-card p-4 flex flex-col min-h-[400px] lg:flex-1">
            <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2 shrink-0">
              <span>🤖</span> Ops Assistant
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                Agentic AI
              </span>
            </h2>
            <div className="flex-1 min-h-0">
              <StaffChat minute={minute} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
