"""
Routing agent — generates natural language navigation suggestions for attendees.
Takes current zone densities and suggests the fastest route.
"""

from groq_agent.client import chat


def get_routing_suggestion(densities: dict, attendee_location: str = "main entrance") -> str:
    """
    Generate a natural language routing suggestion.

    Args:
        densities: Current {zone_id: density} dict.
        attendee_location: Where the attendee is now.

    Returns:
        Natural language suggestion string.
    """
    # Build context about current state
    density_summary = "\n".join(
        f"  - {zid}: {d:.0%} full" for zid, d in sorted(densities.items(), key=lambda x: x[1])
    )

    messages = [
        {
            "role": "system",
            "content": (
                "You are a friendly stadium assistant helping attendees navigate efficiently. "
                "Be concise (2-3 sentences), helpful, and mention specific zone names. "
                "Suggest the least crowded options. Use a warm, conversational tone."
            ),
        },
        {
            "role": "user",
            "content": (
                f"I'm currently near {attendee_location}. Where should I go?\n\n"
                f"Current zone densities:\n{density_summary}"
            ),
        },
    ]

    return chat(messages, temperature=0.7, max_tokens=200)
