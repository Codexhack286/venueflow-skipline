"""
VenueFlow + SkipLine — FastAPI Backend
All API routes for the crowd management and concession pre-ordering system.
"""

import json
import os
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from simulation.zones import get_zones
from simulation.engine import get_density
from simulation.anomaly_detector import detect_anomalies
from skipline.predictor import predict_surges
from skipline.notifier import generate_alerts
from skipline.wait_estimator import estimate_wait_times
from groq_agent.routing_agent import get_routing_suggestion
from groq_agent.ops_assistant import handle_staff_query

app = FastAPI(
    title="VenueFlow + SkipLine API",
    description="AI-powered crowd management & concession pre-ordering",
    version="1.0.0",
)

# CORS — allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Concession menu ────────────────────────────────────────────────────

MENU_ITEMS = [
    {"id": "burger", "name": "Classic Burger", "price": 8.99, "emoji": "🍔", "prep_time_min": 3},
    {"id": "hotdog", "name": "Stadium Hot Dog", "price": 5.49, "emoji": "🌭", "prep_time_min": 1},
    {"id": "nachos", "name": "Loaded Nachos", "price": 7.99, "emoji": "🧀", "prep_time_min": 2},
    {"id": "pizza", "name": "Pizza Slice", "price": 6.49, "emoji": "🍕", "prep_time_min": 2},
    {"id": "fries", "name": "Crispy Fries", "price": 4.99, "emoji": "🍟", "prep_time_min": 3},
    {"id": "soda", "name": "Soft Drink", "price": 3.99, "emoji": "🥤", "prep_time_min": 0.5},
    {"id": "beer", "name": "Draft Beer", "price": 9.99, "emoji": "🍺", "prep_time_min": 0.5},
    {"id": "pretzel", "name": "Soft Pretzel", "price": 5.99, "emoji": "🥨", "prep_time_min": 1},
]

# In-memory order store
orders = []


# ── Request models ─────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    minute: int = 60


class RoutingRequest(BaseModel):
    location: str = "main entrance"
    minute: int = 60


class PreorderRequest(BaseModel):
    items: list  # [{"id": "burger", "quantity": 2}, ...]
    concession_zone: str = "concession_1"


# ── Routes ─────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"name": "VenueFlow + SkipLine API", "status": "running"}


@app.get("/api/zones")
def api_zones():
    """Return all zone definitions."""
    return get_zones()


@app.get("/api/density")
def api_density(minute: int = Query(60, ge=0, le=239)):
    """Return current density for all zones at a given event minute."""
    return get_density(minute)


@app.get("/api/surge")
def api_surge(minute: int = Query(60, ge=0, le=239)):
    """Return surge predictions for upcoming minutes."""
    return predict_surges(minute)


@app.get("/api/alerts")
def api_alerts(minute: int = Query(60, ge=0, le=239)):
    """Return SkipLine push notification alerts."""
    return generate_alerts(minute)


@app.get("/api/wait-times")
def api_wait_times(minute: int = Query(60, ge=0, le=239)):
    """Return predicted wait times per concession zone."""
    densities = get_density(minute)
    return estimate_wait_times(densities)


@app.get("/api/anomalies")
def api_anomalies(minute: int = Query(60, ge=0, le=239)):
    """Return anomaly detection results."""
    densities = get_density(minute)
    return detect_anomalies(minute, densities)


@app.post("/api/chat")
def api_chat(req: ChatRequest):
    """Staff ops assistant with agentic tool calling."""
    response = handle_staff_query(req.message, req.minute)
    return {"response": response}


@app.post("/api/routing")
def api_routing(req: RoutingRequest):
    """Attendee routing suggestion."""
    densities = get_density(req.minute)
    suggestion = get_routing_suggestion(densities, req.location)
    return {"suggestion": suggestion}


@app.get("/api/cv-data")
def api_cv_data():
    """Return pre-baked YOLOv8 person counts."""
    cv_path = os.path.join(os.path.dirname(__file__), "cv_data", "sample_counts.json")
    with open(cv_path, "r") as f:
        return json.load(f)


@app.get("/api/menu")
def api_menu():
    """Return concession menu items."""
    return MENU_ITEMS


@app.post("/api/preorder")
def api_preorder(req: PreorderRequest):
    """Submit a pre-order."""
    order_items = []
    total = 0.0
    for item in req.items:
        menu_item = next((m for m in MENU_ITEMS if m["id"] == item.get("id")), None)
        if menu_item:
            qty = item.get("quantity", 1)
            order_items.append({**menu_item, "quantity": qty})
            total += menu_item["price"] * qty

    order = {
        "order_id": len(orders) + 1,
        "items": order_items,
        "total": round(total, 2),
        "concession_zone": req.concession_zone,
        "status": "confirmed",
    }
    orders.append(order)
    return order


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
