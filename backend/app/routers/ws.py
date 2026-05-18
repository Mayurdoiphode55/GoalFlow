"""
GoalFlow — WebSocket Router
Real-time dashboard updates for admin connections.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Dict
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections for real-time dashboard updates."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"[WS] Connected: {user_id} (total: {len(self.active_connections)})")

    def disconnect(self, user_id: str):
        self.active_connections.pop(user_id, None)
        logger.info(f"[WS] Disconnected: {user_id} (total: {len(self.active_connections)})")

    async def broadcast(self, data: dict):
        """Broadcast a message to all connected clients."""
        disconnected = []
        for user_id, ws in self.active_connections.items():
            try:
                await ws.send_json(data)
            except Exception:
                disconnected.append(user_id)
        for uid in disconnected:
            self.disconnect(uid)

    async def broadcast_to_admins(self, data: dict):
        """Broadcast to all connected admin clients."""
        await self.broadcast(data)  # All WS clients are assumed admin for now

    @property
    def connection_count(self):
        return len(self.active_connections)


# Singleton connection manager — imported by services to broadcast events
ws_manager = ConnectionManager()


@router.websocket("/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    """
    WebSocket endpoint for real-time admin dashboard.
    Events broadcasted:
    - checkin_submitted
    - goal_submitted
    - goal_approved
    - escalation_triggered
    """
    # Extract user_id from query params (simplified auth for WS)
    user_id = websocket.query_params.get("user_id", "anonymous")

    await ws_manager.connect(websocket, user_id)
    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to GoalFlow real-time dashboard",
            "active_connections": ws_manager.connection_count,
        })

        # Keep connection alive, listen for client messages
        while True:
            data = await websocket.receive_text()
            # Handle ping/pong
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id)
    except Exception as e:
        logger.error(f"[WS] Error for {user_id}: {e}")
        ws_manager.disconnect(user_id)


# ─── Helper functions to broadcast events from services ───────────────────

async def broadcast_checkin_submitted(employee_name: str, quarter: str, goal_title: str):
    await ws_manager.broadcast_to_admins({
        "type": "checkin_submitted",
        "employee_name": employee_name,
        "quarter": quarter,
        "goal_title": goal_title,
    })


async def broadcast_goal_submitted(employee_name: str):
    await ws_manager.broadcast_to_admins({
        "type": "goal_submitted",
        "employee_name": employee_name,
    })


async def broadcast_goal_approved(employee_name: str, approver_name: str):
    await ws_manager.broadcast_to_admins({
        "type": "goal_approved",
        "employee_name": employee_name,
        "approver_name": approver_name,
    })
