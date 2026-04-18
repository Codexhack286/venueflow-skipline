"""
Zone definitions for the stadium simulation.
Defines 12 zones: 4 gates, 4 concession stands, 4 seating sections.
Each zone has an ID, name, type, capacity, and SVG coordinates for rendering.
"""

ZONES = [
    # Gates (entrances/exits) - positioned at cardinal points of the oval
    {
        "id": "gate_a",
        "name": "Gate A (North)",
        "type": "gate",
        "capacity": 2000,
        "x": 400,
        "y": 50,
        "width": 80,
        "height": 40,
    },
    {
        "id": "gate_b",
        "name": "Gate B (East)",
        "type": "gate",
        "capacity": 2000,
        "x": 720,
        "y": 250,
        "width": 40,
        "height": 80,
    },
    {
        "id": "gate_c",
        "name": "Gate C (South)",
        "type": "gate",
        "capacity": 1800,
        "x": 400,
        "y": 470,
        "width": 80,
        "height": 40,
    },
    {
        "id": "gate_d",
        "name": "Gate D (West)",
        "type": "gate",
        "capacity": 1800,
        "x": 80,
        "y": 250,
        "width": 40,
        "height": 80,
    },
    # Concession stands - positioned inside the stadium perimeter
    {
        "id": "concession_1",
        "name": "Concession NE",
        "type": "concession",
        "capacity": 500,
        "x": 580,
        "y": 120,
        "width": 70,
        "height": 50,
    },
    {
        "id": "concession_2",
        "name": "Concession SE",
        "type": "concession",
        "capacity": 500,
        "x": 580,
        "y": 390,
        "width": 70,
        "height": 50,
    },
    {
        "id": "concession_3",
        "name": "Concession SW",
        "type": "concession",
        "capacity": 450,
        "x": 190,
        "y": 390,
        "width": 70,
        "height": 50,
    },
    {
        "id": "concession_4",
        "name": "Concession NW",
        "type": "concession",
        "capacity": 450,
        "x": 190,
        "y": 120,
        "width": 70,
        "height": 50,
    },
    # Seating sections - large arc areas
    {
        "id": "section_north",
        "name": "Section North",
        "type": "seating",
        "capacity": 5000,
        "x": 280,
        "y": 100,
        "width": 280,
        "height": 80,
    },
    {
        "id": "section_east",
        "name": "Section East",
        "type": "seating",
        "capacity": 4500,
        "x": 600,
        "y": 200,
        "width": 80,
        "height": 160,
    },
    {
        "id": "section_south",
        "name": "Section South",
        "type": "seating",
        "capacity": 5000,
        "x": 280,
        "y": 380,
        "width": 280,
        "height": 80,
    },
    {
        "id": "section_west",
        "name": "Section West",
        "type": "seating",
        "capacity": 4500,
        "x": 160,
        "y": 200,
        "width": 80,
        "height": 160,
    },
]


def get_zones():
    """Return all zone definitions."""
    return ZONES


def get_zone_by_id(zone_id: str):
    """Look up a single zone by its ID."""
    for zone in ZONES:
        if zone["id"] == zone_id:
            return zone
    return None


def get_zones_by_type(zone_type: str):
    """Return all zones of a given type (gate, concession, seating)."""
    return [z for z in ZONES if z["type"] == zone_type]
