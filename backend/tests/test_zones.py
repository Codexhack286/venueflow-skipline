"""
Unit tests for zone definitions.
Tests that zones are correctly defined with valid data.
"""

import pytest
from simulation.zones import get_zones, get_zone_by_id, get_zones_by_type, ZONES


class TestZoneDefinitions:
    """Test zone definition structure and validity."""

    def test_total_zones_count(self):
        """Should have exactly 12 zones."""
        zones = get_zones()
        assert len(zones) == 12

    def test_zone_structure(self):
        """Each zone should have required fields."""
        zones = get_zones()
        required_fields = {"id", "name", "type", "capacity", "x", "y", "width", "height"}

        for zone in zones:
            assert required_fields.issubset(zone.keys()), f"Zone {zone} missing fields"

    def test_zone_types_distribution(self):
        """Should have 4 gates, 4 concessions, 4 seating sections."""
        zones = get_zones()
        gates = [z for z in zones if z["type"] == "gate"]
        concessions = [z for z in zones if z["type"] == "concession"]
        seating = [z for z in zones if z["type"] == "seating"]

        assert len(gates) == 4, f"Expected 4 gates, got {len(gates)}"
        assert len(concessions) == 4, f"Expected 4 concessions, got {len(concessions)}"
        assert len(seating) == 4, f"Expected 4 seating, got {len(seating)}"

    def test_zone_capacities_positive(self):
        """All zones should have positive capacity."""
        zones = get_zones()

        for zone in zones:
            assert zone["capacity"] > 0, f"Zone {zone['id']} has non-positive capacity"

    def test_zone_dimensions_positive(self):
        """All zones should have positive width and height."""
        zones = get_zones()

        for zone in zones:
            assert zone["width"] > 0, f"Zone {zone['id']} has non-positive width"
            assert zone["height"] > 0, f"Zone {zone['id']} has non-positive height"

    def test_zone_coordinates_valid(self):
        """All zones should have valid x, y coordinates."""
        zones = get_zones()

        for zone in zones:
            assert isinstance(zone["x"], (int, float))
            assert isinstance(zone["y"], (int, float))
            assert zone["x"] >= 0
            assert zone["y"] >= 0

    def test_zone_ids_unique(self):
        """All zone IDs should be unique."""
        zones = get_zones()
        ids = [z["id"] for z in zones]
        assert len(ids) == len(set(ids)), "Duplicate zone IDs found"

    def test_zone_names_not_empty(self):
        """All zone names should be non-empty strings."""
        zones = get_zones()

        for zone in zones:
            assert isinstance(zone["name"], str)
            assert len(zone["name"]) > 0

    def test_get_zone_by_id_valid(self):
        """get_zone_by_id should return correct zone."""
        zones = get_zones()

        for zone in zones:
            result = get_zone_by_id(zone["id"])
            assert result is not None
            assert result["id"] == zone["id"]

    def test_get_zone_by_id_invalid(self):
        """get_zone_by_id should return None for invalid ID."""
        result = get_zone_by_id("nonexistent_zone")
        assert result is None

    def test_get_zones_by_type_gate(self):
        """get_zones_by_type should return gates correctly."""
        gates = get_zones_by_type("gate")
        assert len(gates) == 4
        assert all(z["type"] == "gate" for z in gates)

    def test_get_zones_by_type_concession(self):
        """get_zones_by_type should return concessions correctly."""
        concessions = get_zones_by_type("concession")
        assert len(concessions) == 4
        assert all(z["type"] == "concession" for z in concessions)

    def test_get_zones_by_type_seating(self):
        """get_zones_by_type should return seating sections correctly."""
        seating = get_zones_by_type("seating")
        assert len(seating) == 4
        assert all(z["type"] == "seating" for z in seating)

    def test_get_zones_by_type_invalid(self):
        """get_zones_by_type should return empty for invalid type."""
        result = get_zones_by_type("invalid_type")
        assert result == []

    def test_gate_capacity_ranges(self):
        """Gate capacities should be in expected range."""
        gates = get_zones_by_type("gate")
        for gate in gates:
            assert 1800 <= gate["capacity"] <= 2000

    def test_concession_capacity_ranges(self):
        """Concession capacities should be in expected range."""
        concessions = get_zones_by_type("concession")
        for conc in concessions:
            assert 450 <= conc["capacity"] <= 500

    def test_seating_capacity_ranges(self):
        """Seating capacities should be in expected range."""
        seating = get_zones_by_type("seating")
        for section in seating:
            assert 4500 <= section["capacity"] <= 5000
