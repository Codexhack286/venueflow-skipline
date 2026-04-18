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
  const [showProductionModal, setShowProductionModal] = useState(false);

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
        <button
          onClick={() => setShowProductionModal(true)}
          className="text-[9px] px-2 py-1 rounded-full bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-600/50 transition-colors"
          title="Learn how this works in production"
        >
          🔬 Production Ready
        </button>
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

      {/* Production Ready Modal */}
      {showProductionModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">🔬 Production Ready Architecture</h2>
              <button
                onClick={() => setShowProductionModal(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-300">
              <div>
                <h3 className="font-semibold text-white mb-2">🎯 Current Demo</h3>
                <p className="text-[12px]">
                  This is running on <strong>simulated crowd data</strong> using NumPy-based event modeling. The system is fully functional but uses mathematical models instead of real sensor data.
                </p>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <h3 className="font-semibold text-white mb-2">📡 Production Data Sources</h3>
                <div className="space-y-2 text-[12px]">
                  <div>
                    <strong>CCTV + Edge AI (YOLOv8):</strong>
                    <p className="text-slate-400">NVIDIA Jetson devices at each stadium zone entrance running real-time person detection. Replaces: density simulation</p>
                  </div>
                  <div>
                    <strong>WiFi/BLE Triangulation:</strong>
                    <p className="text-slate-400">Passive smartphone tracking for zone-level density without requiring active apps. Replaces: gate/seating density estimation</p>
                  </div>
                  <div>
                    <strong>Smart Turnstiles:</strong>
                    <p className="text-slate-400">Exact in/out counts at all gates. Replaces: entry/exit surge prediction</p>
                  </div>
                  <div>
                    <strong>POS Integration:</strong>
                    <p className="text-slate-400">Real-time concession order data from stadium vendors. Replaces: Little's Law wait time estimation</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <h3 className="font-semibold text-white mb-2">✅ What Would Stay the Same</h3>
                <ul className="text-[12px] space-y-1 text-slate-400">
                  <li>✓ ML Anomaly Detection (Isolation Forest)</li>
                  <li>✓ Surge Prediction (sliding-window trend analysis)</li>
                  <li>✓ Agentic LLM ops assistant (Groq function calling)</li>
                  <li>✓ Pre-order & SkipLine flow</li>
                  <li>✓ Real-time heatmap visualization</li>
                  <li>✓ Smart routing with live data</li>
                </ul>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <h3 className="font-semibold text-white mb-2">🏗️ System Advantage</h3>
                <p className="text-[12px] text-slate-400">
                  The backend is <strong>data-source agnostic</strong>. To switch from simulation to real sensors, only the density input module needs to change. All downstream logic (ML, surge prediction, LLM reasoning) remains identical.
                </p>
              </div>

              <button
                onClick={() => setShowProductionModal(false)}
                className="w-full mt-4 py-2 rounded-lg bg-blue-600/30 text-blue-300 hover:bg-blue-600/40 font-semibold transition-colors text-[12px]"
              >
                Got it, impressive! 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
