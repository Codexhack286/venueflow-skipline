"""
Surge prediction engine for SkipLine.
Analyzes density trends using a sliding window and flags zones
that are likely to become overcrowded in the next 5-10 minutes.
"""

from simulation.engine import get_density_history, get_density
from simulation.zones import get_zones, get_zone_by_id
from config import (
    SURGE_HISTORY_WINDOW,
    SURGE_SLOPE_THRESHOLD,
    SURGE_DENSITY_THRESHOLD,
    SURGE_CONFIDENCE_CRITICAL_THRESHOLD,
)


def predict_surges(minute: int, seed: int = 42) -> list:
    """
    Predict which zones will surge in the next 5-10 minutes.

    Logic:
      1. Get density history for the last N minutes
      2. Calculate rate of increase (slope)
      3. Flag zones where: slope > SURGE_SLOPE_THRESHOLD AND current density > SURGE_DENSITY_THRESHOLD

    Args:
        minute: Current event minute.
        seed: Random seed for simulation.

    Returns:
        List of surge prediction dicts.
    """
    history = get_density_history(minute, window=SURGE_HISTORY_WINDOW, seed=seed)
    current = get_density(minute, seed=seed)
    zones = get_zones()
    surges = []

    for zone in zones:
        zid = zone["id"]
        values = history.get(zid, [])
        curr_density = current.get(zid, 0)

        if len(values) < 3:
            continue

        # Calculate trend (simple linear slope over window)
        n = len(values)
        x = list(range(n))
        x_mean = sum(x) / n
        y_mean = sum(values) / n
        numerator = sum((x[i] - x_mean) * (values[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        slope = numerator / denominator if denominator != 0 else 0

        # Surge condition: rising fast + already moderately crowded
        if slope > SURGE_SLOPE_THRESHOLD and curr_density > SURGE_DENSITY_THRESHOLD:
            # Confidence based on how strong the trend is
            confidence = min(1.0, (slope / 0.05) * (curr_density / 0.8))

            # Estimate minutes until 90% capacity
            if slope > 0:
                mins_to_90 = max(1, int((0.90 - curr_density) / slope))
            else:
                mins_to_90 = 99

            surges.append({
                "zone_id": zid,
                "zone_name": zone["name"],
                "zone_type": zone["type"],
                "current_density": round(curr_density, 3),
                "trend_slope": round(slope, 4),
                "confidence": round(confidence, 2),
                "estimated_minutes_to_peak": mins_to_90,
                "severity": "critical" if confidence > SURGE_CONFIDENCE_CRITICAL_THRESHOLD else "warning",
            })

    # Sort by confidence descending
    surges.sort(key=lambda s: s["confidence"], reverse=True)
    return surges
