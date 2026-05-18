"""
GoalFlow — AI Service
Groq API integration for goal suggestions, coaching, and analysis.
Uses llama-3.3-70b-versatile model.
"""

import json
import os
import re
import logging
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize Groq client (graceful if no key)
_client = None


def _get_client():
    global _client
    if _client is None and settings.GROQ_API_KEY:
        try:
            from groq import Groq
            _client = Groq(api_key=settings.GROQ_API_KEY)
        except Exception as e:
            logger.warning(f"Failed to initialize Groq client: {e}")
    return _client


def _parse_json_response(text: str) -> list | dict:
    """Extract JSON from LLM response text."""
    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Try extracting JSON from markdown code blocks
    match = re.search(r'```(?:json)?\s*\n?([\s\S]*?)\n?```', text)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    # Try finding array or object
    for start, end in [('[', ']'), ('{', '}')]:
        s = text.find(start)
        e = text.rfind(end)
        if s != -1 and e != -1:
            try:
                return json.loads(text[s:e+1])
            except json.JSONDecodeError:
                pass
    return []


async def suggest_goals(thrust_area: str, employee_role: str, department: str) -> list[dict]:
    """Generate 3 SMART goal suggestions for a thrust area."""
    client = _get_client()
    if not client:
        return _mock_goal_suggestions(thrust_area)

    prompt = f"""You are an expert HR consultant helping an employee set SMART goals.

Employee Department: {department}
Employee Role: {employee_role}
Thrust Area: {thrust_area}

Generate 3 specific, measurable, actionable goal suggestions for this thrust area.
Return ONLY a JSON array with objects having keys: title, description, uom_type, suggested_target, rationale, confidence_score.
uom_type must be one of: numeric_min, numeric_max, percentage_min, percentage_max, timeline, zero_based.
confidence_score should be a number between 0.7 and 0.99 reflecting how well the suggestion fits."""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )
        return _parse_json_response(response.choices[0].message.content)
    except Exception as e:
        logger.error(f"Groq API error: {e}")
        return _mock_goal_suggestions(thrust_area)


async def suggest_weightage(goals: list[dict]) -> list[dict]:
    """Suggest optimal weightage distribution for a set of goals."""
    client = _get_client()
    if not client:
        count = len(goals)
        base = 100 // count
        remainder = 100 - (base * count)
        return [{"title": g.get("title", ""), "suggested_weightage": base + (5 if i == 0 else 0)}
                for i, g in enumerate(goals)]

    goals_text = "\n".join([f"- {g.get('title', '')} (UoM: {g.get('uom_type', '')})" for g in goals])
    prompt = f"""Given these goals:
{goals_text}

Suggest optimal weightage distribution. Rules:
- Each weight must be >= 10 and <= 90
- Total must equal exactly 100
- Weight in multiples of 5

Return ONLY a JSON array with objects: title, suggested_weightage, rationale."""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        return _parse_json_response(response.choices[0].message.content)
    except Exception as e:
        logger.error(f"Groq API error: {e}")
        return []


async def coach_checkin(
    goal_title: str, uom_type: str, target: float, actual: float, quarter: str,
) -> str:
    """Give coaching insight for a check-in."""
    client = _get_client()

    # Compute achievement %
    if uom_type in ("numeric_min", "percentage_min"):
        pct = (actual / target * 100) if target else 0
    elif uom_type in ("numeric_max", "percentage_max"):
        pct = (target / actual * 100) if actual else 150
    else:
        pct = 100

    if not client:
        if pct >= 100:
            return f"Great work on '{goal_title}'! You've exceeded your target with {pct:.0f}% achievement. Keep this momentum going."
        elif pct >= 70:
            return f"Good progress on '{goal_title}' at {pct:.0f}%. You're on track — focus on closing the remaining gap next quarter."
        else:
            return f"'{goal_title}' is at {pct:.0f}%. Consider breaking this down into smaller milestones and seek support where needed."

    prompt = f"""Goal: {goal_title}
Quarter: {quarter}
Target: {target}, Actual: {actual}, UoM: {uom_type}
Achievement %: {pct:.1f}%

Provide a 2-3 sentence coaching insight for the employee:
- Acknowledge their progress
- Identify the gap or celebrate success
- Give one actionable suggestion for next quarter
Keep it encouraging and specific. No bullet points, just prose."""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Groq API error: {e}")
        return f"Progress on '{goal_title}': {pct:.0f}% of target achieved in {quarter}."


async def analyze_goal_sheet(goals: list[dict]) -> dict:
    """Analyze all goals for quality, SMART-ness, and return feedback."""
    client = _get_client()
    goals_text = "\n".join([
        f"- {g.get('title', '')} (Weight: {g.get('weightage', '')}%, UoM: {g.get('uom_type', '')})"
        for g in goals
    ])

    if not client:
        return {
            "overall_quality": "good",
            "feedback": "Your goals cover multiple areas. Ensure each goal has a clear, measurable target.",
            "suggestions": ["Add more specific descriptions", "Diversify UoM types"],
        }

    prompt = f"""Analyze this employee's goal sheet:
{goals_text}

Return JSON with:
- overall_quality: "excellent"|"good"|"needs_improvement"
- feedback: string (2-3 sentences overall assessment)
- goal_feedback: array of {{title, feedback}} for any goals needing improvement
- suggestions: array of strings (improvement tips)"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}],
        )
        return _parse_json_response(response.choices[0].message.content)
    except Exception as e:
        logger.error(f"Groq API error: {e}")
        return {"overall_quality": "good", "feedback": "Unable to analyze at this time."}


def _mock_goal_suggestions(thrust_area: str) -> list[dict]:
    """Fallback mock suggestions when Groq is unavailable."""
    templates = {
        "Revenue Growth": [
            {"title": "Increase quarterly revenue by 15%", "description": "Drive revenue growth through new client acquisition and upselling.", "uom_type": "percentage_min", "suggested_target": 15, "rationale": "Aligns with company growth targets", "confidence_score": 0.92},
            {"title": "Close 20 new enterprise deals", "description": "Target enterprise segment for high-value contracts.", "uom_type": "numeric_min", "suggested_target": 20, "rationale": "Enterprise deals have higher LTV", "confidence_score": 0.88},
            {"title": "Reduce sales cycle to 30 days", "description": "Streamline proposal and negotiation process.", "uom_type": "numeric_max", "suggested_target": 30, "rationale": "Faster cycles improve cash flow", "confidence_score": 0.85},
        ],
    }
    return templates.get(thrust_area, [
        {"title": f"Improve {thrust_area} metrics by 20%", "description": f"Drive measurable improvement in {thrust_area}.", "uom_type": "percentage_min", "suggested_target": 20, "rationale": "Standard improvement target", "confidence_score": 0.82},
        {"title": f"Complete {thrust_area} initiative by Q3", "description": f"Deliver key {thrust_area} project on schedule.", "uom_type": "timeline", "suggested_target": None, "rationale": "Timely delivery is critical", "confidence_score": 0.80},
        {"title": f"Zero incidents in {thrust_area}", "description": f"Maintain perfect record in {thrust_area} compliance.", "uom_type": "zero_based", "suggested_target": 0, "rationale": "Zero-tolerance policy", "confidence_score": 0.78},
    ])
