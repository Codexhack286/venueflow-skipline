"""
Groq API wrapper for LLM calls.
Uses llama-3.3-70b-versatile model.
Gracefully handles missing API key.
"""

import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
MODEL = "llama-3.3-70b-versatile"

_client = None


def _get_client():
    """Lazy-init the Groq client."""
    global _client
    if _client is not None:
        return _client
    if not GROQ_API_KEY:
        return None
    try:
        from groq import Groq
        _client = Groq(api_key=GROQ_API_KEY)
        return _client
    except Exception:
        return None


def chat(messages: list, temperature: float = 0.7, max_tokens: int = 512) -> str:
    """
    Send a chat completion request to Groq.

    Args:
        messages: List of {"role": ..., "content": ...} message dicts.
        temperature: Sampling temperature.
        max_tokens: Max response tokens.

    Returns:
        Response text string, or fallback message.
    """
    client = _get_client()
    if client is None:
        return _fallback_response(messages)

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"[LLM unavailable: {str(e)}] " + _fallback_response(messages)


def chat_with_tools(messages: list, tools: list, temperature: float = 0.7, max_tokens: int = 512):
    """
    Send a chat completion with function/tool definitions for agentic calling.

    Returns the full response object so the caller can inspect tool_calls.
    Returns None if client is unavailable.
    """
    client = _get_client()
    if client is None:
        return None

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=tools,
            tool_choice="auto",
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response
    except Exception:
        return None


def _fallback_response(messages: list) -> str:
    """Generate a simple fallback when Groq is unavailable."""
    last_msg = messages[-1]["content"] if messages else ""
    return (
        "I'm currently operating in offline mode (no API key configured). "
        f"Based on your query about '{last_msg[:80]}...', I'd recommend checking "
        "the live heatmap for real-time zone density data. Set GROQ_API_KEY in "
        "your .env file to enable full AI responses."
    )
