"""
GoalFlow — Email Service (Brevo)
Sends branded HTML email notifications via Brevo (formerly Sendinblue) API.
Gracefully degrades if API key is not configured.
"""

import logging
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _get_brevo_client():
    """Initialize Brevo API client."""
    if not settings.BREVO_API_KEY:
        return None
    try:
        import sib_api_v3_sdk
        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key['api-key'] = settings.BREVO_API_KEY
        return sib_api_v3_sdk.TransactionalEmailsApi(
            sib_api_v3_sdk.ApiClient(configuration)
        )
    except Exception as e:
        logger.warning(f"Failed to initialize Brevo client: {e}")
        return None


def _email_template(title: str, body: str, cta_text: str = "Open GoalFlow", cta_url: str = "") -> str:
    """Generate branded HTML email template."""
    if not cta_url:
        cta_url = settings.FRONTEND_URL

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
  <tr><td style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:28px;letter-spacing:-0.5px;">GoalFlow</h1>
    <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">Align. Track. Achieve.</p>
  </td></tr>
  <tr><td style="padding:32px;">
    <h2 style="color:#1a1a2e;margin:0 0 16px;font-size:20px;">{title}</h2>
    <p style="color:#4a4a68;font-size:15px;line-height:1.6;margin:0 0 24px;">{body}</p>
    <a href="{cta_url}" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">{cta_text}</a>
  </td></tr>
  <tr><td style="padding:16px 32px;border-top:1px solid #eee;text-align:center;">
    <p style="color:#999;font-size:12px;margin:0;">GoalFlow Portal — Goal Setting & Tracking Platform</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>"""


async def send_email(to_email: str, to_name: str, subject: str, html_content: str) -> bool:
    """Send an email via Brevo. Returns True on success."""
    client = _get_brevo_client()
    if not client:
        logger.info(f"[EMAIL SKIPPED] To: {to_email} | Subject: {subject}")
        return False

    try:
        import sib_api_v3_sdk
        email = sib_api_v3_sdk.SendSmtpEmail(
            sender={"name": settings.FROM_NAME, "email": settings.FROM_EMAIL},
            to=[{"email": to_email, "name": to_name}],
            subject=subject,
            html_content=html_content,
        )
        client.send_transac_email(email)
        logger.info(f"[EMAIL SENT] To: {to_email} | Subject: {subject}")
        return True
    except Exception as e:
        logger.error(f"[EMAIL FAILED] To: {to_email} | Error: {e}")
        return False


# ─── Pre-built Email Triggers ────────────────────────────────────────────

async def notify_goal_submitted(manager_email: str, manager_name: str, employee_name: str):
    html = _email_template(
        "Goal Sheet Submitted",
        f"<strong>{employee_name}</strong> has submitted their goals for your review. "
        f"Please review and approve or return for rework.",
        "Review Goals",
        f"{settings.FRONTEND_URL}/manager/team",
    )
    await send_email(manager_email, manager_name, f"GoalFlow: {employee_name} submitted goals", html)


async def notify_goal_approved(employee_email: str, employee_name: str, manager_name: str):
    html = _email_template(
        "Goals Approved! 🎉",
        f"Your goals have been approved by <strong>{manager_name}</strong>. "
        f"Your goal sheet is now locked. Focus on execution!",
        "View My Goals",
        f"{settings.FRONTEND_URL}/my-goals",
    )
    await send_email(employee_email, employee_name, f"GoalFlow: Goals approved by {manager_name}", html)


async def notify_goal_returned(employee_email: str, employee_name: str, manager_name: str, reason: str):
    html = _email_template(
        "Goals Returned for Rework",
        f"Your goals were returned by <strong>{manager_name}</strong>.<br><br>"
        f"<strong>Reason:</strong> {reason}<br><br>"
        f"Please revise and resubmit.",
        "Edit My Goals",
        f"{settings.FRONTEND_URL}/my-goals",
    )
    await send_email(employee_email, employee_name, f"GoalFlow: Goals returned — action needed", html)


async def notify_checkin_reminder(employee_email: str, employee_name: str, quarter: str):
    html = _email_template(
        f"{quarter} Check-in Window Open",
        f"The {quarter} check-in window is now open. Please log in and update your progress "
        f"for all your goals. The window will close at the end of the month.",
        "Update Check-in",
        f"{settings.FRONTEND_URL}/checkins/{quarter}",
    )
    await send_email(employee_email, employee_name, f"GoalFlow: {quarter} check-in reminder", html)


async def notify_escalation(
    target_email: str, target_name: str,
    employee_name: str, action: str, days: int,
):
    html = _email_template(
        "Escalation Alert ⚠️",
        f"<strong>Action Required:</strong> {employee_name} has not {action} within {days} days. "
        f"Please follow up to ensure timely completion.",
        "View Dashboard",
        f"{settings.FRONTEND_URL}/admin/completion",
    )
    await send_email(target_email, target_name, f"GoalFlow: Escalation — {employee_name}", html)
