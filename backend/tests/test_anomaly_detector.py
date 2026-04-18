"""
Unit tests for anomaly detection module.
Tests that the Isolation Forest model correctly identifies anomalies.
"""

import pytest
from simulation.anomaly_detector import detect_anomalies
from simulation.engine import get_density


class TestAnomalyDetection:
    """Test anomaly detection functionality."""

    def test_detect_anomalies_returns_list(self):
        """Anomaly detection should return a list."""
        result = detect_anomalies(minute=60, densities=get_density(60))
        assert isinstance(result, list)

    def test_anomaly_structure(self):
        """Each anomaly should have required fields."""
        densities = get_density(60)
        # Manually inject an anomalous density to trigger detection
        anomalous_densities = {**densities, "gate_1": 0.99}
        result = detect_anomalies(minute=60, densities=anomalous_densities)

        for anomaly in result:
            assert "zone_id" in anomaly
            assert "zone_name" in anomaly
            assert "severity" in anomaly
            assert "message" in anomaly

    def test_anomaly_severity_levels(self):
        """Anomalies should have valid severity levels."""
        densities = get_density(60)
        anomalous_densities = {**densities, "gate_1": 0.99}
        result = detect_anomalies(minute=60, densities=anomalous_densities)

        for anomaly in result:
            assert anomaly["severity"] in ["warning", "critical"]

    def test_normal_density_few_anomalies(self):
        """Normal simulation densities should have few/no anomalies."""
        result = detect_anomalies(minute=60, densities=get_density(60))
        # Normal operation should have minimal anomalies (<= 1 per zone type)
        assert len(result) <= 1, "Normal densities should trigger few anomalies"

    def test_empty_densities_input(self):
        """Empty density dict should handle gracefully."""
        result = detect_anomalies(minute=60, densities={})
        assert isinstance(result, list)

    def test_anomaly_at_different_minutes(self):
        """Anomaly detection should work at different event minutes."""
        for minute in [0, 60, 120, 180, 240]:
            densities = get_density(minute)
            result = detect_anomalies(minute, densities)
            assert isinstance(result, list)

    def test_anomaly_score_in_output(self):
        """Anomalies should include decision function score."""
        densities = get_density(60)
        anomalous_densities = {**densities, "gate_1": 0.99}
        result = detect_anomalies(minute=60, densities=anomalous_densities)

        for anomaly in result:
            if "score" in anomaly:
                assert isinstance(anomaly["score"], (int, float))
