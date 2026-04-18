"""
Configuration constants for VenueFlow + SkipLine backend.
Centralized configuration for easy tuning and deployment across different venues.
"""

# ============================================================================
# SIMULATION ENGINE CONFIGURATION
# ============================================================================

# Total event duration in minutes (4-hour sporting event)
EVENT_DURATION = 240

# Noise level for density values (±standard deviation)
DENSITY_NOISE_STD = 0.03

# Zone-specific density offset range (±)
ZONE_OFFSET_RANGE = 0.05

# ============================================================================
# SURGE PREDICTION CONFIGURATION
# ============================================================================

# Density history window for trend analysis (minutes)
SURGE_HISTORY_WINDOW = 5

# Minimum slope (density change per minute) to trigger surge condition
SURGE_SLOPE_THRESHOLD = 0.02

# Minimum current density to trigger surge condition
SURGE_DENSITY_THRESHOLD = 0.55

# Confidence score boundaries
SURGE_CONFIDENCE_CRITICAL_THRESHOLD = 0.7  # >= this = "critical", else "warning"

# ============================================================================
# WAIT TIME ESTIMATION (LITTLE'S LAW)
# ============================================================================

# Average service rate: customers served per minute per multi-register counter
SERVICE_RATE = 12.0

# Fraction of zone occupants actively queuing vs. browsing/eating
QUEUE_FRACTION = 0.30

# ============================================================================
# ANOMALY DETECTION (ISOLATION FOREST)
# ============================================================================

# Expected contamination rate in training data (proportion of anomalies)
ANOMALY_CONTAMINATION = 0.05

# Number of trees in Isolation Forest
ANOMALY_N_ESTIMATORS = 50

# Decision function threshold for severity classification
ANOMALY_CRITICAL_THRESHOLD = -0.2  # score < this = "critical", else "warning"

# Training data sampling interval (every N minutes)
ANOMALY_TRAINING_INTERVAL = 2

# ============================================================================
# ALERT / NOTIFIER CONFIGURATION
# ============================================================================

# Alert severity levels
ALERT_SEVERITY_LEVELS = ["info", "warning", "critical"]

# Default alert auto-dismiss timeout (milliseconds, frontend)
ALERT_AUTO_DISMISS_MS = 5000

# ============================================================================
# API POLLING CONFIGURATION
# ============================================================================

# Frontend polling interval (seconds) — balance between responsiveness and backend load
POLLING_INTERVAL_SECONDS = 3

# ============================================================================
# VENUE PROFILE (Customizable per venue type)
# ============================================================================

# Stadium capacity (total attendees)
VENUE_CAPACITY = 40000

# Venue type: "stadium", "arena", "festival"
VENUE_TYPE = "stadium"

# ============================================================================
# GROQ LLM CONFIGURATION
# ============================================================================

# Model to use for agentic operations
GROQ_MODEL = "llama-3.3-70b-versatile"

# Maximum tokens for LLM response
GROQ_MAX_TOKENS = 1024

# Temperature for LLM (0-1, higher = more creative)
GROQ_TEMPERATURE = 0.7

# Timeout for Groq API calls (seconds)
GROQ_TIMEOUT = 30
