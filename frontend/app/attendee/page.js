"use client";

import { useState, useEffect, useCallback } from "react";
import StadiumHeatmap from "@/components/StadiumHeatmap";
import SkipLineAlert from "@/components/SkipLineAlert";
import AttendeeView from "@/components/AttendeeView";
import {
  fetchDensity,
  fetchZones,
  fetchAlerts,
  fetchWaitTimes,
} from "@/lib/api";

const EVENT_DURATION = 240;

function formatTime(minute) {
  const eventStart = 18 * 60;
  const totalMin = eventStart + minute;
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

export default function AttendeePage() {
  const [minute, setMinute] = useState(60);
  const [densities, setDensities] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [waitTimes, setWaitTimes] = useState([]);
  const [zones, setZones] = useState([]);
  const [tab, setTab] = useState("order"); // order | map | alerts

  useEffect(() => {
    fetchZones().then(setZones).catch(() => {});
  }, []);

  const poll = useCallback(async (m) => {
    try {
      const [d, a, w] = await Promise.all([
        fetchDensity(m),
        fetchAlerts(m),
        fetchWaitTimes(m),
      ]);
      setDensities(d);
      setAlerts(a);
      setWaitTimes(w);
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    poll(minute);
    const interval = setInterval(() => poll(minute), 3000);
    return () => clearInterval(interval);
  }, [minute, poll]);

  // Auto-advance
  useEffect(() => {
    const interval = setInterval(() => {
      setMinute((prev) => (prev >= EVENT_DURATION - 1 ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto overflow-hidden">
      {/* Header */}
      <header className="shrink-0 px-4 py-3 flex items-center justify-between border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center text-sm font-bold text-white">
            V
          </div>
          <div>
            <h1 className="text-base font-bold text-white">VenueFlow</h1>
            <p className="text-[9px] text-slate-500 -mt-0.5">Fan Experience</p>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-mono">{formatTime(minute)}</div>
      </header>

      {/* Tab bar */}
      <div className="shrink-0 flex gap-1 px-3 pt-2">
        {[
          { key: "order", label: "🍔 Order", badge: null },
          { key: "map", label: "🗺️ Map", badge: null },
          { key: "alerts", label: "⚡ Alerts", badge: alerts.length || null },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
              tab === t.key
                ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                : "bg-slate-800/30 text-slate-500 hover:text-slate-300"
            }`}
          >
            {t.label}
            {t.badge && (
              <span className="w-4 h-4 rounded-full bg-red-500/80 text-white text-[9px] flex items-center justify-center">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === "order" && (
          <AttendeeView minute={minute} waitTimes={waitTimes} densities={densities} />
        )}

        {tab === "map" && (
          <div className="glass-card p-3 flex flex-col h-[600px] sm:h-auto">
            <h3 className="text-sm font-semibold text-white mb-2 shrink-0">Live Crowd Map</h3>
            <div className="flex-1 overflow-x-auto overflow-y-hidden rounded-xl bg-slate-900/40">
              <div className="min-w-[600px] h-full flex items-center justify-center p-4">
                <StadiumHeatmap
                  zones={zones}
                  densities={densities}
                  surges={[]}
                  waitTimes={waitTimes}
                  anomalies={[]}
                />
              </div>
            </div>
          </div>
        )}

        {tab === "alerts" && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              ⚡ Live SkipLine Alerts
            </h3>
            <SkipLineAlert alerts={alerts} />
          </div>
        )}
      </div>

      {/* Bottom nav hint */}
      <div className="shrink-0 px-4 py-2 text-center text-[10px] text-slate-600 border-t border-slate-800/30">
        <a href="/" className="hover:text-slate-400 transition-colors">
          ← Back to Dashboard
        </a>
      </div>
    </div>
  );
}
