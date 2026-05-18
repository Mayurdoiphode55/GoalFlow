"""
GoalFlow — AI Router
/ai/suggest-goal, /ai/suggest-weightage, /ai/coach-checkin, /ai/analyze-goals
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import Optional

from app.models.user import User
from app.core.dependencies import get_current_user
from app.services import ai_service

router = APIRouter()


class SuggestGoalRequest(BaseModel):
    thrust_area: str
    employee_role: Optional[str] = "employee"
    department: Optional[str] = "General"


class SuggestWeightageRequest(BaseModel):
    goals: list[dict]


class CoachCheckinRequest(BaseModel):
    goal_title: str
    uom_type: str
    target: float
    actual: float
    quarter: str = Field(..., pattern="^(Q1|Q2|Q3|Q4)$")


class AnalyzeGoalsRequest(BaseModel):
    goals: list[dict]


@router.post("/suggest-goal")
async def suggest_goal(
    data: SuggestGoalRequest,
    current_user: User = Depends(get_current_user),
):
    """AI-powered goal suggestions for a thrust area."""
    suggestions = await ai_service.suggest_goals(
        data.thrust_area, data.employee_role, data.department
    )
    return {"suggestions": suggestions}


@router.post("/suggest-weightage")
async def suggest_weightage(
    data: SuggestWeightageRequest,
    current_user: User = Depends(get_current_user),
):
    """AI-powered optimal weightage distribution."""
    result = await ai_service.suggest_weightage(data.goals)
    return {"distribution": result}


@router.post("/coach-checkin")
async def coach_checkin(
    data: CoachCheckinRequest,
    current_user: User = Depends(get_current_user),
):
    """AI coaching insight for a check-in."""
    insight = await ai_service.coach_checkin(
        data.goal_title, data.uom_type, data.target, data.actual, data.quarter
    )
    return {"insight": insight}


@router.post("/analyze-goals")
async def analyze_goals(
    data: AnalyzeGoalsRequest,
    current_user: User = Depends(get_current_user),
):
    """AI analysis of a goal sheet for quality and SMART-ness."""
    analysis = await ai_service.analyze_goal_sheet(data.goals)
    return {"analysis": analysis}
