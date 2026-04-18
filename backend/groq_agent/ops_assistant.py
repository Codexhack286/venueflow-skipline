"""
Ops assistant with Agentic Tool Calling.
The LLM decides which venue data tools to invoke based on the staff question.
Uses Groq function calling with llama-3.3-70b.
"""

import json
from groq_agent.client import chat, chat_with_tools
from simulation.engine import get_density
from simulation.anomaly_detector import detect_anomalies
from skipline.predictor import predict_surges
from skipline.wait_estimator import estimate_wait_times

# ── Tool definitions for Groq function calling ──────────────────────────

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_zone_density",
            "description": "Get the current crowd density for all stadium zones. Returns density as a percentage for each zone.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_surge_predictions",
            "description": "Get predictions for which zones are about to experience crowd surges in the next 5-10 minutes.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_wait_times",
            "description": "Get estimated wait times in minutes for all concession stands.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_anomalies",
            "description": "Detect anomalous or unusual crowd patterns that may indicate security concerns.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
]

# ── Tool execution ──────────────────────────────────────────────────────

def _execute_tool(tool_name: str, minute: int) -> str:
    """Execute a tool call and return the result as a JSON string."""
    densities = get_density(minute)

    if tool_name == "get_zone_density":
        # Format as readable percentages
        result = {zid: f"{d:.0%}" for zid, d in densities.items()}
    elif tool_name == "get_surge_predictions":
        result = predict_surges(minute)
    elif tool_name == "get_wait_times":
        result = estimate_wait_times(densities)
    elif tool_name == "get_anomalies":
        result = detect_anomalies(minute, densities)
    else:
        result = {"error": f"Unknown tool: {tool_name}"}

    return json.dumps(result, indent=2)


# ── Main assistant entry point ──────────────────────────────────────────

SYSTEM_PROMPT = """You are VenueFlow Ops Assistant — an AI analyst for stadium operations staff.
You have access to live venue monitoring tools. Use them to answer questions accurately.
Be concise, data-driven, and actionable. Format numbers clearly.
If you see concerning patterns, proactively flag them.
Always call at least one tool to get current data before answering."""


def handle_staff_query(query: str, minute: int) -> str:
    """
    Handle a staff query using agentic tool calling.

    The LLM decides which tools to call based on the question,
    receives the results, and synthesizes a response.

    Falls back to simple context injection if tool calling is unavailable.
    """
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"[Current event time: minute {minute}/240]\n\n{query}"},
    ]

    # Try agentic tool calling first
    response = chat_with_tools(messages, TOOLS)

    if response is not None:
        msg = response.choices[0].message

        # Check if the model wants to call tools
        if msg.tool_calls:
            # Add the assistant's tool-calling message
            messages.append({
                "role": "assistant",
                "content": msg.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in msg.tool_calls
                ],
            })

            # Execute each tool and add results
            for tc in msg.tool_calls:
                result = _execute_tool(tc.function.name, minute)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                })

            # Get final response with tool results
            final = chat(messages, temperature=0.5, max_tokens=512)
            return final

        # Model answered directly without tools
        return msg.content or "No response generated."

    # ── Fallback: simple context injection ──────────────────────────────
    densities = get_density(minute)
    density_str = "\n".join(f"  {zid}: {d:.0%}" for zid, d in densities.items())
    surges = predict_surges(minute)
    surge_str = json.dumps(surges, indent=2) if surges else "No surges predicted."

    fallback_messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"[Minute {minute}/240]\n"
                f"Current densities:\n{density_str}\n\n"
                f"Surge predictions:\n{surge_str}\n\n"
                f"Staff question: {query}"
            ),
        },
    ]
    return chat(fallback_messages, temperature=0.5, max_tokens=512)
