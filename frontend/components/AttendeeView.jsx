"use client";

import { useState, useEffect } from "react";
import { fetchMenu, submitPreorder, getRouting } from "@/lib/api";

/**
 * AttendeeView — Mobile-style pre-order UI with AI routing and menu.
 */

const LOCATION_OPTIONS = [
  { value: "Gate A (North)", label: "Gate A (North)" },
  { value: "Gate B (East)", label: "Gate B (East)" },
  { value: "Gate C (South)", label: "Gate C (South)" },
  { value: "Gate D (West)", label: "Gate D (West)" },
  { value: "Section North", label: "Section North" },
  { value: "Section East", label: "Section East" },
  { value: "Section South", label: "Section South" },
  { value: "Section West", label: "Section West" },
  { value: "Concession NE", label: "Food NE" },
  { value: "Concession SE", label: "Food SE" },
  { value: "Concession SW", label: "Food SW" },
  { value: "Concession NW", label: "Food NW" },
];

export default function AttendeeView({ minute = 60, waitTimes = [], densities = {} }) {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState({});
  const [routing, setRouting] = useState("");
  const [orderResult, setOrderResult] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [selectedZone, setSelectedZone] = useState("concession_1");
  const [myLocation, setMyLocation] = useState("Gate A (North)");

  // Load menu
  useEffect(() => {
    fetchMenu().then(setMenu).catch(() => {});
  }, []);

  // Get routing suggestion based on selected location
  const handleGetRouting = async () => {
    setLoadingRoute(true);
    try {
      const data = await getRouting(myLocation, minute);
      setRouting(data.suggestion);
    } catch {
      setRouting("Unable to get routing suggestion. Check backend connection.");
    } finally {
      setLoadingRoute(false);
    }
  };

  const addToCart = (itemId) => {
    setCart((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  };

  const removeFromCart = (itemId) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[itemId] > 1) next[itemId]--;
      else delete next[itemId];
      return next;
    });
  };

  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = menu.find((m) => m.id === id);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const handlePreorder = async () => {
    setLoadingOrder(true);
    const items = Object.entries(cart).map(([id, quantity]) => ({ id, quantity }));
    try {
      const result = await submitPreorder(items, selectedZone);
      setOrderResult(result);
      setCart({});
    } catch {
      setOrderResult({ status: "error" });
    } finally {
      setLoadingOrder(false);
    }
  };

  // Build wait time lookup
  const waitMap = {};
  waitTimes.forEach((w) => { waitMap[w.zone_id] = w; });

  return (
    <div className="space-y-4">
      {/* AI Routing */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <span className="text-lg">🧭</span> AI Navigator
          </h3>
          <button
            onClick={handleGetRouting}
            disabled={loadingRoute}
            className="text-xs px-3 py-1.5 rounded-lg gradient-accent text-white hover:opacity-90 disabled:opacity-50"
          >
            {loadingRoute ? "Thinking..." : "Get Route"}
          </button>
        </div>

        {/* Location selector */}
        <div className="mb-3">
          <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
            I&apos;m currently near
          </label>
          <select
            value={myLocation}
            onChange={(e) => { setMyLocation(e.target.value); setRouting(""); }}
            className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 appearance-none cursor-pointer"
          >
            {LOCATION_OPTIONS.map((loc) => (
              <option key={loc.value} value={loc.value}>
                📍 {loc.label}
              </option>
            ))}
          </select>
        </div>

        {routing ? (
          <p className="text-sm text-slate-300 leading-relaxed animate-fade-in-up">
            {routing}
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            Select your location and tap &quot;Get Route&quot; for an AI-powered suggestion
          </p>
        )}
      </div>

      {/* Concession Zone Selector */}
      <div className="glass-card p-4">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <span className="text-lg">📍</span> Pick-up Location
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {["concession_1", "concession_2", "concession_3", "concession_4"].map((zid) => {
            const w = waitMap[zid];
            const names = { concession_1: "Food NE", concession_2: "Food SE", concession_3: "Food SW", concession_4: "Food NW" };
            const isSelected = selectedZone === zid;
            return (
              <button
                key={zid}
                onClick={() => setSelectedZone(zid)}
                className={`p-2.5 rounded-xl text-left transition-all ${
                  isSelected
                    ? "bg-blue-600/20 border border-blue-500/40 text-white"
                    : "glass-card-sm text-slate-300 hover:text-white"
                }`}
              >
                <div className="text-xs font-semibold">{names[zid]}</div>
                {w && (
                  <div className="text-[10px] text-blue-400 mt-0.5">~{w.wait_minutes} min wait</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Menu */}
      <div className="glass-card p-4">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <span className="text-lg">🍽️</span> Menu
        </h3>
        <div className="space-y-2">
          {menu.map((item) => {
            const qty = cart[item.id] || 0;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between glass-card-sm p-2.5 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.emoji}</span>
                  <div>
                    <div className="text-sm font-medium text-white">{item.name}</div>
                    <div className="text-xs text-slate-400">${item.price.toFixed(2)} · {item.prep_time_min}min prep</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {qty > 0 && (
                    <>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-7 h-7 rounded-lg bg-slate-700/60 text-white text-sm hover:bg-slate-600 transition-colors flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="text-sm font-semibold text-white w-4 text-center">
                        {qty}
                      </span>
                    </>
                  )}
                  <button
                    onClick={() => addToCart(item.id)}
                    className="w-7 h-7 rounded-lg gradient-accent text-white text-sm hover:opacity-90 transition-opacity flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart footer */}
      {Object.keys(cart).length > 0 && (
        <div className="glass-card p-4 animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm text-slate-400">Order Total</div>
              <div className="text-xl font-bold text-white">${cartTotal.toFixed(2)}</div>
            </div>
            <div className="text-xs text-slate-500">
              {Object.values(cart).reduce((a, b) => a + b, 0)} items
            </div>
          </div>
          <button
            onClick={handlePreorder}
            disabled={loadingOrder}
            className="w-full py-3 rounded-xl gradient-accent text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loadingOrder ? "Placing Order..." : "🍔 Pre-Order Now — Skip the Line!"}
          </button>
        </div>
      )}

      {/* Order confirmation */}
      {orderResult && orderResult.status === "confirmed" && (
        <div className="glass-card p-4 border border-green-500/30 animate-fade-in-up">
          <div className="text-center">
            <div className="text-3xl mb-2">🎉</div>
            <h4 className="text-lg font-bold text-green-400">Order Confirmed!</h4>
            <p className="text-sm text-slate-400 mt-1">
              Order #{orderResult.order_id} · ${orderResult.total.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Pick up at your selected concession stand when ready
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
