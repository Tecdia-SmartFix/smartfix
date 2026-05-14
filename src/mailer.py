"""
src/mailer.py — outbound email via Resend.

Two callers today:
  • src/api.py  POST /auth/request-link → send_magic_link(email, token)
  • src/api.py  POST /query (alert path) → send_alert(emails, alert)

Design notes:
  - Single-shot, fire-and-forget. Callers should wrap calls in try/except
    so a transient Resend outage never breaks the originating HTTP request.
  - From-address defaults to Resend's onboarding sandbox so unverified
    accounts can still send emails to ANY recipient inbox. Set MAIL_FROM
    in .env to override (after you verify a domain on Resend's dashboard).
  - HTML bodies are kept simple and inlined-style so they render on Gmail
    / Outlook without external CSS.
"""

from __future__ import annotations

import os
import logging
from datetime import datetime, timezone
from typing import Iterable

import resend

log = logging.getLogger("smartfix.mailer")

# Resend's SDK reads its API key from the module-level attribute.
# We re-set on each call so picking up a fresh .env mid-process works.
def _ensure_api_key() -> bool:
    key = os.environ.get("RESEND_API_KEY", "").strip()
    if not key:
        log.warning("RESEND_API_KEY is not set — email sending disabled")
        return False
    resend.api_key = key
    return True


def _from_addr() -> str:
    # Resend's sandbox from-address works for any recipient. Override with
    # MAIL_FROM once you verify a real domain in the Resend dashboard.
    return os.environ.get("MAIL_FROM", "Tecdia SmartFix <onboarding@resend.dev>")


def _app_base_url() -> str:
    return os.environ.get("APP_BASE_URL", "http://localhost:5173").rstrip("/")


# ---------------------------------------------------------------------------
# Magic-link sign-in email
# ---------------------------------------------------------------------------

_MAGIC_LINK_HTML = """\
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f8fc;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;color:#1a1a2e;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:18px;border:1px solid #d6e8f5;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#89CFF3 0%,#A0E9FF 50%,#89CFF3 100%);padding:36px 32px;">
      <div style="font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#0a3a5e;opacity:0.7;">Tecdia SmartFix</div>
      <div style="font-size:28px;font-weight:800;color:#0a3a5e;margin-top:6px;line-height:1.2;">Your admin sign-in link</div>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#1a1a2e;">
        Click the button below to sign in to the SmartFix admin dashboard.
      </p>
      <p style="margin:24px 0;">
        <a href="{url}"
           style="display:inline-block;background:#00A9FF;color:#ffffff;font-weight:700;
                  text-decoration:none;padding:14px 28px;border-radius:12px;font-size:15px;
                  box-shadow:0 4px 14px rgba(0,169,255,0.35);">
          Sign in to SmartFix
        </a>
      </p>
      <p style="margin:0 0 6px;font-size:12px;color:#1a1a2e;opacity:0.6;line-height:1.55;">
        Or paste this link into your browser:
      </p>
      <p style="margin:0 0 24px;font-size:12px;color:#0066aa;word-break:break-all;line-height:1.55;">
        {url}
      </p>
      <div style="border-top:1px solid #e8eef3;padding-top:18px;margin-top:18px;
                  font-size:12px;color:#1a1a2e;opacity:0.55;line-height:1.6;">
        This link expires in <strong>15 minutes</strong> and can only be used once.<br>
        If you didn't request this, you can safely ignore this email.
      </div>
    </div>
  </div>
</body>
</html>
"""


def send_magic_link(to_email: str, token: str) -> None:
    """Email a one-time sign-in link. Raises on send failure.

    The link points at `<APP_BASE_URL>/auth/verify?token=<token>`. In dev the
    Vite proxy forwards `/auth/*` to the FastAPI backend, so the same URL
    works for both the user's browser and the backend's verify handler.
    """
    if not _ensure_api_key():
        raise RuntimeError("RESEND_API_KEY not configured")

    url = f"{_app_base_url()}/auth/verify?token={token}"
    resend.Emails.send({
        "from":    _from_addr(),
        "to":      [to_email],
        "subject": "Your SmartFix admin sign-in link",
        "html":    _MAGIC_LINK_HTML.format(url=url),
    })
    log.info("magic-link sent to %s", to_email)


# ---------------------------------------------------------------------------
# Alert notification email
# ---------------------------------------------------------------------------

_SEVERITY_LABELS = {
    1: ("Informational",     "#16a34a"),  # green
    2: ("Minor",              "#ca8a04"),  # amber
    3: ("Degraded",           "#ea580c"),  # orange
    4: ("Production Impact",  "#dc2626"),  # red
    5: ("Safety Risk",        "#991b1b"),  # darker red
}


def _render_alert_html(alert: dict) -> str:
    sev = alert.get("severity_level", 1)
    label, color = _SEVERITY_LABELS.get(sev, _SEVERITY_LABELS[1])
    machine_id = alert.get("machine_id", "unknown")
    score      = alert.get("score", 0)
    sig        = alert.get("machine_significance", 0)
    question   = alert.get("question", "")
    answer     = alert.get("answer_excerpt", "")
    notified_at = alert.get("notified_at") or datetime.now(timezone.utc).isoformat()

    return f"""\
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f8fc;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;color:#1a1a2e;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:18px;
              border:1px solid #d6e8f5;overflow:hidden;">
    <div style="background:{color};padding:24px 28px;color:#ffffff;">
      <div style="font-size:11px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;
                  opacity:0.85;">🚨 Alert fired</div>
      <div style="font-size:24px;font-weight:800;margin-top:4px;line-height:1.2;">
        Severity {sev} — {label}
      </div>
      <div style="font-size:13px;opacity:0.9;margin-top:6px;">
        {machine_id} · score {score}/{sig*5 if sig else 25}
      </div>
    </div>
    <div style="padding:24px 28px;">
      <div style="font-size:11px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;
                  color:#1a1a2e;opacity:0.55;margin-bottom:6px;">Worker asked</div>
      <p style="margin:0 0 22px;font-size:15px;line-height:1.55;color:#1a1a2e;">
        {question}
      </p>

      <div style="font-size:11px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;
                  color:#1a1a2e;opacity:0.55;margin-bottom:6px;">AI answered</div>
      <div style="background:#f4f8fc;border-left:3px solid {color};padding:14px 16px;
                  border-radius:6px;font-size:14px;line-height:1.55;color:#1a1a2e;">
        {answer}
      </div>

      <div style="margin-top:24px;font-size:11px;color:#1a1a2e;opacity:0.5;">
        Fired at {notified_at}
      </div>
    </div>
    <div style="background:#f4f8fc;padding:14px 28px;font-size:11px;color:#1a1a2e;opacity:0.55;
                border-top:1px solid #e8eef3;">
      You are receiving this because you are an admin on Tecdia SmartFix.
      Review the full history at <a href="{_app_base_url()}/admin"
        style="color:#00A9FF;text-decoration:none;">{_app_base_url()}/admin</a>.
    </div>
  </div>
</body>
</html>
"""


def send_alert(to_emails: Iterable[str], alert: dict) -> None:
    """Email an alert record to every admin in `to_emails`. Raises on failure.

    `alert` is the same dict appended to `_alerts` in src/api.py — fields:
      alert_id, machine_id, score, severity_level, machine_significance,
      question, answer_excerpt, notified_at.
    """
    recipients = [e for e in to_emails if e]
    if not recipients:
        log.info("no alert recipients configured; skipping send")
        return
    if not _ensure_api_key():
        raise RuntimeError("RESEND_API_KEY not configured")

    sev = alert.get("severity_level", 1)
    label, _ = _SEVERITY_LABELS.get(sev, _SEVERITY_LABELS[1])
    machine_id = alert.get("machine_id", "unknown")

    resend.Emails.send({
        "from":    _from_addr(),
        "to":      recipients,
        "subject": f"🚨 SmartFix alert — {machine_id} severity {sev} ({label})",
        "html":    _render_alert_html(alert),
    })
    log.info("alert email sent to %s for %s sev=%s", recipients, machine_id, sev)
