"""
SkipLine notification generator.
Converts surge predictions into push-notification-style alerts.
"""

from skipline.predictor import predict_surges


def generate_alerts(minute: int, seed: int = 42) -> list:
    """
    Generate push-notification-style alerts from surge predictions.

    Returns list of alert dicts with: title, body, zone_id, severity, cta.
    """
    surges = predict_surges(minute, seed=seed)
    alerts = []

    for surge in surges:
        zone_name = surge["zone_name"]
        density_pct = int(surge["current_density"] * 100)
        mins = surge["estimated_minutes_to_peak"]

        if surge["zone_type"] == "concession":
            title = f"🍔 SkipLine: {zone_name} getting busy!"
            body = (
                f"{zone_name} is at {density_pct}% capacity and rising. "
                f"Expected to peak in ~{mins} min. Pre-order now to skip the line!"
            )
            cta = "Pre-Order Now"
        elif surge["zone_type"] == "gate":
            title = f"🚪 Crowd Alert: {zone_name}"
            body = (
                f"{zone_name} is at {density_pct}% capacity. "
                f"Consider using an alternate gate for faster entry."
            )
            cta = "View Alternate Routes"
        else:
            title = f"📢 {zone_name} filling up"
            body = (
                f"{zone_name} is at {density_pct}% capacity and rising fast."
            )
            cta = None

        alerts.append({
            "title": title,
            "body": body,
            "zone_id": surge["zone_id"],
            "zone_name": zone_name,
            "severity": surge["severity"],
            "confidence": surge["confidence"],
            "cta": cta,
            "minutes_to_peak": mins,
        })

    return alerts
