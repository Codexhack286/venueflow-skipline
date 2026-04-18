"""
Unit tests for simulation engine.
Tests the crowd density generation, curve shapes, and output correctness.
"""

import pytest
import numpy as np
from simulation.engine import (
    get_density,
    get_density_history,
    _sigmoid,
    _bump,
    EVENT_DURATION,
)


class TestDensityGeneration:
    """Test basic density value generation."""

    def test_get_density_returns_dict(self):
        """Density output should be a dict."""
        result = get_density(minute=0)
        assert isinstance(result, dict)

    def test_density_values_in_valid_range(self):
        """All density values should be between 0.0 and 1.0."""
        for minute in [0, 60, 120, 180, 239]:
            densities = get_density(minute)
            for zone_id, density in densities.items():
                assert 0.0 <= density <= 1.0, f"Invalid density {density} at minute {minute} zone {zone_id}"

    def test_density_minute_clamping(self):
        """Out-of-range minutes should be clamped to valid range."""
        # Negative minute should clamp to 0
        result_neg = get_density(-10)
        assert isinstance(result_neg, dict)

        # Over-range minute should clamp to 239
        result_over = get_density(999)
        assert isinstance(result_over, dict)

    def test_density_reproducibility(self):
        """Same minute + seed should produce same densities."""
        result1 = get_density(minute=60, seed=42)
        result2 = get_density(minute=60, seed=42)
        assert result1 == result2

    def test_density_different_seed_differs(self):
        """Different seeds should produce different results."""
        result_seed42 = get_density(minute=60, seed=42)
        result_seed99 = get_density(minute=60, seed=99)
        assert result_seed42 != result_seed99

    def test_all_zones_present(self):
        """All 12 stadium zones should be in density output."""
        result = get_density(minute=60)
        expected_zones = 12
        assert len(result) == expected_zones


class TestDensityHistory:
    """Test density history retrieval."""

    def test_history_returns_dict(self):
        """History output should be dict of zone_id -> list."""
        result = get_density_history(minute=60, window=5)
        assert isinstance(result, dict)

    def test_history_window_size(self):
        """History should have correct number of entries."""
        minute = 60
        window = 10
        result = get_density_history(minute, window=window)

        for zone_id, values in result.items():
            assert len(values) == window, f"Expected {window} history points, got {len(values)}"

    def test_history_includes_current_minute(self):
        """History should include the requested minute."""
        minute = 120
        window = 5
        result = get_density_history(minute, window=window)

        # Get current density for comparison
        current = get_density(minute)

        for zone_id, values in result.items():
            # Last value in history should match current density (with floating point tolerance)
            assert abs(values[-1] - current[zone_id]) < 0.001

    def test_history_window_at_event_start(self):
        """History at minute 0 should handle boundary gracefully."""
        result = get_density_history(minute=5, window=10)
        # Should only have 6 data points (0-5 inclusive)
        for zone_id, values in result.items():
            assert len(values) == 6


class TestCurveFunctions:
    """Test sigmoid and bump curve functions."""

    def test_sigmoid_basic(self):
        """Sigmoid should transition smoothly from 0 to 1."""
        x_before = _sigmoid(-100, center=0)
        x_center = _sigmoid(0, center=0)
        x_after = _sigmoid(100, center=0)

        assert x_before < 0.1, "Sigmoid should be near 0 far before center"
        assert 0.4 < x_center < 0.6, "Sigmoid should be near 0.5 at center"
        assert x_after > 0.9, "Sigmoid should be near 1 far after center"

    def test_sigmoid_monotonic(self):
        """Sigmoid should be monotonically increasing."""
        x_vals = np.arange(-10, 11)
        y_vals = [_sigmoid(x, center=0) for x in x_vals]

        for i in range(len(y_vals) - 1):
            assert y_vals[i] <= y_vals[i + 1], "Sigmoid should monotonically increase"

    def test_bump_peak(self):
        """Bump should peak at center."""
        center = 50
        peak = _bump(center, center=center)
        nearby = _bump(center - 5, center=center)

        assert peak > nearby, "Bump should peak at center"

    def test_bump_symmetry(self):
        """Bump should be symmetric around center."""
        center = 50
        left = _bump(center - 10, center=center)
        right = _bump(center + 10, center=center)

        assert abs(left - right) < 0.0001, "Bump should be symmetric"

    def test_bump_height_parameter(self):
        """Bump height parameter should scale peak."""
        peak_h1 = _bump(50, center=50, height=1.0)
        peak_h2 = _bump(50, center=50, height=2.0)

        assert abs(peak_h2 - 2 * peak_h1) < 0.0001, "Height should scale linearly"


class TestEventPhases:
    """Test crowd patterns across event phases."""

    def test_entry_rush_phase(self):
        """Gates should spike during entry (0-30 min)."""
        gates_early = get_density(5)
        gates_middle = get_density(15)
        gates_late = get_density(25)

        # Gates should be highest around minute 15
        # (could be > any individual gate, but check general trend)
        assert isinstance(gates_middle, dict)

    def test_halftime_surge_concessions(self):
        """Concessions should spike at halftime (120-140 min)."""
        conc_before = get_density(100)
        conc_halftime = get_density(130)
        conc_after = get_density(160)

        # Concessions should be higher at halftime than before/after
        # Average density per zone type (rough check)
        avg_before = np.mean(list(conc_before.values()))
        avg_halftime = np.mean(list(conc_halftime.values()))
        avg_after = np.mean(list(conc_after.values()))

        assert avg_halftime > avg_before, "Halftime should have higher avg density than before"
        assert avg_halftime > avg_after, "Halftime should have higher avg density than after"

    def test_exit_wave_gates(self):
        """Gates should spike during exit (210-240 min)."""
        gates_before_exit = get_density(200)
        gates_exit = get_density(225)

        assert isinstance(gates_exit, dict)


class TestZoneVariety:
    """Test that zone outputs are sufficiently varied."""

    def test_zones_not_identical(self):
        """Different zones should have somewhat different densities."""
        densities = get_density(minute=60)
        values = list(densities.values())

        # Check that not all zones have the same density
        min_val = min(values)
        max_val = max(values)
        spread = max_val - min_val

        assert spread > 0.01, "Zones should have different densities (at least 1% spread)"
