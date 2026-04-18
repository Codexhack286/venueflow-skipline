"""
Unit tests for wait time estimator module.
Tests that Little's Law calculations are correct and reasonable.
"""

import pytest
from skipline.wait_estimator import estimate_wait_times, SERVICE_RATE, QUEUE_FRACTION
from simulation.zones import get_zones_by_type, get_zones


class TestWaitTimeEstimation:
    """Test wait time estimation functionality."""

    def test_estimate_wait_times_returns_list(self):
        """Wait time estimation should return a list."""
        empty_densities = {zone["id"]: 0.0 for zone in get_zones()}
        result = estimate_wait_times(empty_densities)
        assert isinstance(result, list)

    def test_wait_time_structure(self):
        """Each wait time entry should have required fields."""
        empty_densities = {zone["id"]: 0.0 for zone in get_zones()}
        result = estimate_wait_times(empty_densities)

        for entry in result:
            assert "zone_id" in entry
            assert "zone_name" in entry
            assert "wait_minutes" in entry
            assert "queue_length" in entry
            assert "density" in entry

    def test_zero_density_zero_wait(self):
        """Zero density should mean zero wait time."""
        empty_densities = {zone["id"]: 0.0 for zone in get_zones()}
        result = estimate_wait_times(empty_densities)

        for entry in result:
            assert entry["wait_minutes"] == 0.0
            assert entry["queue_length"] == 0

    def test_wait_time_increases_with_density(self):
        """Higher density should lead to longer wait times."""
        zones = get_zones()
        
        # Create two density maps: one low, one high
        low_densities = {zone["id"]: 0.3 for zone in zones}
        high_densities = {zone["id"]: 0.7 for zone in zones}

        result_low = estimate_wait_times(low_densities)
        result_high = estimate_wait_times(high_densities)

        # Map results to zone IDs for comparison
        low_map = {r["zone_id"]: r["wait_minutes"] for r in result_low}
        high_map = {r["zone_id"]: r["wait_minutes"] for r in result_high}

        # All concession zones should have higher wait at 0.7 density than 0.3
        for zone_id in low_map:
            assert high_map[zone_id] > low_map[zone_id], f"Wait should increase with density for {zone_id}"

    def test_wait_time_non_negative(self):
        """Wait times should never be negative."""
        zones = get_zones()
        densities = {zone["id"]: 0.5 for zone in zones}
        result = estimate_wait_times(densities)

        for entry in result:
            assert entry["wait_minutes"] >= 0.0

    def test_queue_length_non_negative(self):
        """Queue length should never be negative."""
        zones = get_zones()
        densities = {zone["id"]: 0.8 for zone in zones}
        result = estimate_wait_times(densities)

        for entry in result:
            assert entry["queue_length"] >= 0

    def test_littles_law_manual_check(self):
        """Manually verify Little's Law calculation."""
        zones = get_zones()
        density = 0.6
        densities = {zone["id"]: density for zone in zones}
        result = estimate_wait_times(densities)

        # Pick first concession zone and verify math
        if result:
            entry = result[0]
            zone = next(z for z in zones if z["id"] == entry["zone_id"])
            capacity = zone["capacity"]

            # Expected queue length
            expected_queue = density * capacity * QUEUE_FRACTION
            assert abs(entry["queue_length"] - round(expected_queue)) <= 1  # Allow rounding diff

            # Expected wait time (Little's Law: W = L / λ)
            expected_wait = expected_queue / SERVICE_RATE
            expected_wait = round(expected_wait * 2) / 2  # Round to 0.5 mins
            assert abs(entry["wait_minutes"] - expected_wait) < 0.01

    def test_density_in_output(self):
        """Output should include the input density."""
        zones = get_zones()
        density = 0.45
        densities = {zone["id"]: density for zone in zones}
        result = estimate_wait_times(densities)

        for entry in result:
            assert abs(entry["density"] - density) < 0.001

    def test_concession_zones_only(self):
        """Output should only include concession zones."""
        zones = get_zones()
        densities = {zone["id"]: 0.5 for zone in zones}
        result = estimate_wait_times(densities)

        concessions = get_zones_by_type("concession")
        concession_ids = {z["id"] for z in concessions}

        result_ids = {r["zone_id"] for r in result}
        assert result_ids == concession_ids, "Should only include concession zones"

    def test_partial_density_input(self):
        """Function should handle missing zone IDs gracefully."""
        partial_densities = {"gate_1": 0.5}
        result = estimate_wait_times(partial_densities)
        assert isinstance(result, list)
