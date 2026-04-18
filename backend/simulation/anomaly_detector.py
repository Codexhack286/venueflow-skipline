"""
Anomaly Detection using Isolation Forest.
Detects unusual crowd density patterns that deviate from expected event flow.
Lightweight implementation — trains on the simulation's own "normal" patterns,
then flags zones whose current reading is anomalous for the current event phase.
"""

import os
import warnings
import numpy as np

# Force strict single-threaded execution to prevent Render container OOM crashes
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

# Suppress noisy sklearn parallel warnings in production logs
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")

from sklearn.ensemble import IsolationForest
from simulation.engine import get_density, EVENT_DURATION
from simulation.zones import get_zones
from config import (
    ANOMALY_CONTAMINATION,
    ANOMALY_N_ESTIMATORS,
    ANOMALY_CRITICAL_THRESHOLD,
    ANOMALY_TRAINING_INTERVAL,
)


def _build_training_data():
    """
    Build training matrix from the simulation engine's normal output.
    Each row = one zone's density at one minute. Features = [minute, density].
    We train per zone-type so each type has its own baseline.
    """
    zones = get_zones()
    data_by_type = {"gate": [], "concession": [], "seating": []}

    for minute in range(0, EVENT_DURATION, ANOMALY_TRAINING_INTERVAL):
        densities = get_density(minute, seed=42)
        for zone in zones:
            data_by_type[zone["type"]].append(
                [minute, densities[zone["id"]]]
            )

    return {
        ztype: np.array(rows) for ztype, rows in data_by_type.items()
    }


# Pre-train models (one per zone type)
_TRAINING_DATA = _build_training_data()
_MODELS = {}
for _ztype, _data in _TRAINING_DATA.items():
    _model = IsolationForest(
        contamination=ANOMALY_CONTAMINATION,
        random_state=42,
        n_estimators=ANOMALY_N_ESTIMATORS,
        n_jobs=1,  # Force single thread to prevent Render container crash
    )
    _model.fit(_data)
    _MODELS[_ztype] = _model


def detect_anomalies(minute: int, densities: dict) -> list:
    """
    Check current zone densities for anomalies.

    Args:
        minute: Current event minute.
        densities: Dict of {zone_id: density_value}.

    Returns:
        List of anomaly dicts: {zone_id, zone_name, severity, message}.
    """
    zones = get_zones()
    anomalies = []

    for zone in zones:
        zid = zone["id"]
        density = densities.get(zid, 0)
        model = _MODELS.get(zone["type"])
        if model is None:
            continue

        sample = np.array([[minute, density]])
        score = model.decision_function(sample)[0]
        prediction = model.predict(sample)[0]

        if prediction == -1:  # anomaly
            severity = "critical" if score < ANOMALY_CRITICAL_THRESHOLD else "warning"
            anomalies.append({
                "zone_id": zid,
                "zone_name": zone["name"],
                "severity": severity,
                "score": round(float(score), 3),
                "message": (
                    f"Unusual density ({density:.0%}) detected at {zone['name']}. "
                    f"This deviates from expected patterns for minute {minute}."
                ),
            })

    return anomalies
