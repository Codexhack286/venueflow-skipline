"use client";

import { useState, useEffect } from "react";

/**
 * SkipLine Alert Panel — displays push-notification-style surge alerts.
 * New alerts slide in, auto-dismiss after 15 seconds with progress bar.
 */
export default function SkipLineAlert({ alerts = [], onPreOrder }) {
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [animatingOut, setAnimatingOut] = useState(new Set());

  // Auto-dismiss after 15 seconds
  useEffect(() => {
    if (alerts.length === 0) return;
    const timers = alerts.map((alert, i) => {
      const key = `${alert.zone_id}-${alert.title}`;
      if (dismissedIds.has(key)) return null;
      return setTimeout(() => {
        setAnimatingOut((prev) => new Set([...prev, key]));
        setTimeout(() => {
          setDismissedIds((prev) => new Set([...prev, key]));
          setAnimatingOut((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }, 300);
      }, 15000 + i * 1000);
    });
    return () => timers.forEach((t) => t && clearTimeout(t));
  }, [alerts]);

  // Reset dismissed when the actual set of alerts changes
  const alertKey = alerts.map((a) => `${a.zone_id}:${a.severity}`).join("|");
  useEffect(() => {
    setDismissedIds(new Set());
    setAnimatingOut(new Set());
  }, [alertKey]);

  const visibleAlerts = alerts.filter((a) => {
    const key = `${a.zone_id}-${a.title}`;
    return !dismissedIds.has(key);
  });

  if (visibleAlerts.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 py-8">
        <div className="text-3xl mb-2">✅</div>
        <p className="text-sm">No surge alerts right now</p>
        <p className="text-xs text-slate-600 mt-1">System monitoring active</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-y-auto h-full pr-1">
      {visibleAlerts.map((alert, i) => {
        const key = `${alert.zone_id}-${alert.title}`;
        const isOut = animatingOut.has(key);
        const isCritical = alert.severity === "critical";

        return (
          <div
            key={key}
            className={`glass-card-sm p-3 ${isOut ? "animate-slide-out" : "animate-slide-in"} ${
              isCritical ? "border-red-500/30" : "border-orange-500/20"
            }`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h4 className="text-sm font-semibold text-white leading-tight">
                {alert.title}
              </h4>
              <span
                className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isCritical
                    ? "bg-red-500/20 text-red-400"
                    : "bg-orange-500/20 text-orange-400"
                }`}
              >
                {isCritical ? "CRITICAL" : "WARNING"}
              </span>
            </div>

            {/* Body */}
            <p className="text-xs text-slate-400 leading-relaxed mb-2">
              {alert.body}
            </p>

            {/* CTA + confidence */}
            <div className="flex items-center justify-between">
              {alert.cta && (
                <button
                  onClick={() => onPreOrder && onPreOrder(alert.zone_id)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg gradient-accent text-white hover:opacity-90 transition-opacity"
                >
                  {alert.cta} →
                </button>
              )}
              <span className="text-[10px] text-slate-500">
                {Math.round(alert.confidence * 100)}% confidence
              </span>
            </div>

            {/* Progress bar (auto-dismiss timer) */}
            <div className="mt-2 h-0.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full progress-bar-anim"
                style={{
                  background: isCritical
                    ? "linear-gradient(90deg, #EF4444, #F97316)"
                    : "linear-gradient(90deg, #F97316, #EAB308)",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
