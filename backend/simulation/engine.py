"""
Crowd density simulation engine.
Generates realistic per-zone density values over a 240-minute (4-hour) event.

Patterns modeled:
  - Entry rush (0-30 min): Gates spike to 85-95%
  - Pre-game settle (30-60 min): Gates drop, seating fills
  - First half (60-120 min): Steady state, moderate concessions
  - Halftime surge (120-140 min): Concessions spike 90%+, seating partially empties
  - Second half (140-210 min): Concessions drop, seating refills
  - Exit wave (210-240 min): Gates spike, everything drops
"""

import numpy as np
from simulation.zones import get_zones
from config import EVENT_DURATION, DENSITY_NOISE_STD, ZONE_OFFSET_RANGE

# Pre-compute density curves for each zone type at each minute
# Using smooth sigmoid-like transitions between phases

def _sigmoid(x, center, steepness=0.3):
    """Smooth sigmoid transition."""
    return 1.0 / (1.0 + np.exp(-steepness * (x - center)))


def _bump(x, center, width, height=1.0):
    """Gaussian bump centered at `center` with given width and height."""
    return height * np.exp(-0.5 * ((x - center) / width) ** 2)


def _generate_base_curves():
    """
    Generate base density curves (0.0 to 1.0) for each zone type.
    Returns dict of {zone_type: np.array of shape (EVENT_DURATION,)}.
    """
    t = np.arange(EVENT_DURATION, dtype=float)
    curves = {}

    # --- Gates ---
    # Entry rush peaks at ~15 min, exit rush peaks at ~225 min
    gate_entry = _bump(t, center=15, width=12, height=0.92)
    gate_exit = _bump(t, center=225, width=12, height=0.88)
    gate_baseline = 0.08  # small trickle throughout
    curves["gate"] = np.clip(gate_entry + gate_exit + gate_baseline, 0, 1.0)

    # --- Seating ---
    # Fills up 20-60 min, stays high, partial empty at halftime, refills, empties at end
    seat_fill = _sigmoid(t, center=30, steepness=0.15) * 0.85
    seat_halftime_dip = _bump(t, center=130, width=8, height=0.25)
    seat_exit = _sigmoid(t, center=215, steepness=0.2) * 0.80
    curves["seating"] = np.clip(seat_fill - seat_halftime_dip - seat_exit + 0.05, 0, 1.0)

    # --- Concessions ---
    # Moderate pre-game, huge halftime spike, smaller second-half activity
    conc_pregame = _bump(t, center=50, width=15, height=0.35)
    conc_halftime = _bump(t, center=130, width=10, height=0.93)
    conc_second = _bump(t, center=175, width=20, height=0.30)
    conc_baseline = 0.10
    curves["concession"] = np.clip(
        conc_pregame + conc_halftime + conc_second + conc_baseline, 0, 1.0
    )

    return curves


# Cache the base curves (computed once)
_BASE_CURVES = _generate_base_curves()


def get_density(minute: int, seed: int = 42) -> dict:
    """
    Get density values for all zones at a given event minute.

    Args:
        minute: Event minute (0-239).
        seed: Random seed for reproducible noise.

    Returns:
        Dict mapping zone_id -> density (float 0.0-1.0).
    """
    minute = max(0, min(minute, EVENT_DURATION - 1))
    rng = np.random.RandomState(seed + minute)

    zones = get_zones()
    densities = {}

    for zone in zones:
        zone_type = zone["type"]
        base = float(_BASE_CURVES[zone_type][minute])

        # Add per-zone variation so not all gates/concessions are identical
        zone_offset = hash(zone["id"]) % 100 / 1000.0 - ZONE_OFFSET_RANGE
        noise = rng.normal(0, DENSITY_NOISE_STD)

        density = np.clip(base + zone_offset + noise, 0.0, 1.0)
        densities[zone["id"]] = round(float(density), 4)

    return densities


def get_density_history(minute: int, window: int = 10, seed: int = 42) -> dict:
    """
    Get density history for the last `window` minutes up to `minute`.
    Returns dict of {zone_id: [density_values]}.
    """
    start = max(0, minute - window + 1)
    zones = get_zones()
    history = {z["id"]: [] for z in zones}

    for m in range(start, minute + 1):
        densities = get_density(m, seed)
        for zone_id, val in densities.items():
            history[zone_id].append(val)

    return history
