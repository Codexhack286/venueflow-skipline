"""
Predictive wait time estimator using Little's Law.

Little's Law: L = λ * W
  - L = average number of people in queue (proxy: density * capacity)
  - λ = arrival rate (service throughput, people per minute)
  - W = average wait time

Rearranged: W = L / λ

We use density as a proxy for queue occupancy and assume a fixed
service rate per concession stand.
"""

from simulation.zones import get_zones_by_type
from config import SERVICE_RATE, QUEUE_FRACTION


def estimate_wait_times(densities: dict) -> list:
    """
    Estimate wait times for all concession zones.

    Args:
        densities: Dict of {zone_id: density (0-1)}.

    Returns:
        List of {zone_id, zone_name, wait_minutes, queue_length, density}.
    """
    concessions = get_zones_by_type("concession")
    results = []

    for zone in concessions:
        zid = zone["id"]
        density = densities.get(zid, 0)
        capacity = zone["capacity"]

        # Estimated queue length (~30% of zone occupants are actively queuing)
        queue_length = density * capacity * QUEUE_FRACTION

        # Little's Law: W = L / λ
        wait_minutes = queue_length / SERVICE_RATE if SERVICE_RATE > 0 else 0

        # Round to nearest 0.5 min
        wait_minutes = round(wait_minutes * 2) / 2

        results.append({
            "zone_id": zid,
            "zone_name": zone["name"],
            "wait_minutes": wait_minutes,
            "queue_length": int(queue_length),
            "density": round(density, 3),
        })

    return results
