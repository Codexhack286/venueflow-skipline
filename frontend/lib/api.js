/**
 * API client for VenueFlow + SkipLine backend.
 * All functions call the FastAPI backend.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchJSON(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function postJSON(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ── Data endpoints ──────────────────────────────────────────────────

export function fetchZones() {
  return fetchJSON("/api/zones");
}

export function fetchDensity(minute) {
  return fetchJSON(`/api/density?minute=${minute}`);
}

export function fetchSurge(minute) {
  return fetchJSON(`/api/surge?minute=${minute}`);
}

export function fetchAlerts(minute) {
  return fetchJSON(`/api/alerts?minute=${minute}`);
}

export function fetchWaitTimes(minute) {
  return fetchJSON(`/api/wait-times?minute=${minute}`);
}

export function fetchAnomalies(minute) {
  return fetchJSON(`/api/anomalies?minute=${minute}`);
}

export function fetchCVData() {
  return fetchJSON("/api/cv-data");
}

export function fetchMenu() {
  return fetchJSON("/api/menu");
}

// ── Action endpoints ────────────────────────────────────────────────

export function sendChat(message, minute) {
  return postJSON("/api/chat", { message, minute });
}

export function getRouting(location, minute) {
  return postJSON("/api/routing", { location, minute });
}

export function submitPreorder(items, concessionZone) {
  return postJSON("/api/preorder", { items, concession_zone: concessionZone });
}
