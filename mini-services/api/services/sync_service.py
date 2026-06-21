"""Sync service — the offline-first push/pull business logic.

Handles writing the user's full local state to the DB (push) and building
the merged response (pull). All user text is sanitized before storing.
"""
from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from datetime import datetime, timezone

from models import (
    User, UserSettings, UserAppearance, Note, Doubt, DoubtAnswer,
    VideoProgress, TestAttempt, DashboardComponent,
)
from security import sanitize_text, sanitize_dict


def apply_profile(user: User, profile_data: dict, db: Session) -> None:
    """Apply sanitized profile data to the user."""
    safe = sanitize_dict(profile_data, ['name', 'location', 'bio', 'batch', 'exam_name', 'track'])
    for key, val in safe.items():
        if hasattr(user, key) and val is not None:
            setattr(user, key, val)
    db.add(user)


def apply_settings(user_id: str, settings_data: dict, db: Session) -> None:
    """Apply settings (creates if doesn't exist)."""
    settings = db.execute(select(UserSettings).where(UserSettings.user_id == user_id)).scalar_one_or_none()
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.add(settings)
    for key in ("enabled_tabs", "notifications", "daily_goal_hours",
                 "custom_countdown_date", "countdown_label", "hours_today", "streak"):
        if key in settings_data:
            setattr(settings, key, settings_data[key])
    db.add(settings)


def apply_appearance(user_id: str, appearance_data: dict, db: Session) -> None:
    """Apply appearance prefs."""
    appearance = db.execute(select(UserAppearance).where(UserAppearance.user_id == user_id)).scalar_one_or_none()
    if not appearance:
        appearance = UserAppearance(user_id=user_id)
        db.add(appearance)
    for key in ("accent_hue", "density", "glass"):
        if key in appearance_data:
            setattr(appearance, key, appearance_data[key])
    db.add(appearance)


def apply_notes(user_id: str, notes_data: list, db: Session) -> None:
    """Replace all notes for this user with sanitized versions."""
    db.execute(delete(Note).where(Note.user_id == user_id))
    for n in notes_data:
        db.add(Note(
            user_id=user_id,
            title=sanitize_text(n.get("title", ""), 200),
            subject=sanitize_text(n.get("subject", ""), 100),
            content=sanitize_text(n.get("content", ""), 50000),
            tags=n.get("tags", []),
            updated_at=datetime.fromtimestamp(n.get("updatedAt", 0) / 1000, tz=timezone.utc) if n.get("updatedAt") else datetime.now(timezone.utc),
        ))


def apply_doubts(user_id: str, doubts_data: list, db: Session) -> None:
    """Replace all doubts + answers for this user."""
    db.execute(delete(Doubt).where(Doubt.user_id == user_id))
    for d in doubts_data:
        doubt = Doubt(
            user_id=user_id,
            text=sanitize_text(d.get("text", ""), 2000),
            subject=sanitize_text(d.get("subject", ""), 100),
            asker=sanitize_text(d.get("asker", "You"), 100),
            upvotes=d.get("upvotes", 0),
            resolved=d.get("resolved", False),
        )
        db.add(doubt)
        db.flush()
        for a in d.get("answers", []):
            db.add(DoubtAnswer(
                doubt_id=doubt.id,
                author=sanitize_text(a.get("author", ""), 100),
                role=a.get("role", "AI Tutor"),
                text=sanitize_text(a.get("text", ""), 5000),
                helpful=a.get("helpful", 0),
                pending=a.get("pending", False),
                error=a.get("error", False),
            ))


def apply_video_progress(user_id: str, vp_data: dict, db: Session) -> None:
    """Replace all video progress for this user."""
    db.execute(delete(VideoProgress).where(VideoProgress.user_id == user_id))
    for vid, prog in vp_data.items():
        db.add(VideoProgress(
            user_id=user_id,
            video_id=vid,
            fraction=prog.get("fraction", 0),
            completed=prog.get("completed", False),
        ))


def apply_test_attempts(user_id: str, attempts_data: list, db: Session) -> None:
    """Replace all test attempts for this user."""
    db.execute(delete(TestAttempt).where(TestAttempt.user_id == user_id))
    for t in attempts_data:
        db.add(TestAttempt(
            user_id=user_id,
            test_id=t.get("testId"),
            name=sanitize_text(t.get("name", ""), 200),
            type=t.get("type", ""),
            subject=sanitize_text(t.get("subject", ""), 100),
            score=t.get("score", 0),
            total=t.get("total", 0),
            time_taken=t.get("timeTaken", 0),
            trend=t.get("trend", 0),
        ))


def apply_components(user_id: str, components_data: list, db: Session) -> None:
    """Replace all dashboard components for this user."""
    db.execute(delete(DashboardComponent).where(DashboardComponent.user_id == user_id))
    for c in components_data:
        db.add(DashboardComponent(
            id=c.get("id", f"comp-{datetime.now().timestamp()}"),
            user_id=user_id,
            type=c.get("type", ""),
            x=c.get("x", 0),
            y=c.get("y", 0),
            w=c.get("w", 260),
            h=c.get("h", 220),
            z=c.get("z", 1),
        ))


def build_sync_response(user: User, db: Session) -> dict:
    """Read the user's full state from the DB and return it as a dict."""
    notes = db.execute(select(Note).where(Note.user_id == user.id)).scalars().all()
    doubts = db.execute(select(Doubt).where(Doubt.user_id == user.id)).scalars().all()
    vp_rows = db.execute(select(VideoProgress).where(VideoProgress.user_id == user.id)).scalars().all()
    attempts = db.execute(select(TestAttempt).where(TestAttempt.user_id == user.id)).scalars().all()
    components = db.execute(select(DashboardComponent).where(DashboardComponent.user_id == user.id)).scalars().all()
    settings = db.execute(select(UserSettings).where(UserSettings.user_id == user.id)).scalar_one_or_none()
    appearance = db.execute(select(UserAppearance).where(UserAppearance.user_id == user.id)).scalar_one_or_none()

    return {
        "notes": [{
            "id": n.id, "title": n.title, "subject": n.subject,
            "content": n.content, "tags": n.tags or [],
            "updatedAt": int(n.updated_at.timestamp() * 1000) if n.updated_at else 0,
        } for n in notes],
        "doubts": [{
            "id": d.id, "text": d.text, "subject": d.subject,
            "asker": d.asker, "upvotes": d.upvotes, "resolved": d.resolved,
            "answers": [{
                "id": a.id, "author": a.author, "role": a.role,
                "text": a.text, "helpful": a.helpful,
                "pending": a.pending, "error": a.error,
            } for a in d.answers],
        } for d in doubts],
        "video_progress": {vp.video_id: {"fraction": vp.fraction, "completed": vp.completed} for vp in vp_rows},
        "test_attempts": [{
            "id": t.id, "name": t.name, "type": t.type, "subject": t.subject,
            "score": t.score, "total": t.total, "timeTaken": t.time_taken, "trend": t.trend,
        } for t in attempts],
        "components": [{
            "id": c.id, "type": c.type, "x": c.x, "y": c.y, "w": c.w, "h": c.h, "z": c.z,
        } for c in components],
        "settings": {
            "enabled_tabs": settings.enabled_tabs if settings else [],
            "notifications": settings.notifications if settings else {},
            "daily_goal_hours": settings.daily_goal_hours if settings else 6,
            "custom_countdown_date": settings.custom_countdown_date if settings else "",
            "countdown_label": settings.countdown_label if settings else "",
            "hours_today": settings.hours_today if settings else 0,
            "streak": settings.streak if settings else 0,
        } if settings else None,
        "appearance": {
            "accent_hue": appearance.accent_hue if appearance else 62,
            "density": appearance.density if appearance else "comfortable",
            "glass": appearance.glass if appearance else "strong",
        } if appearance else None,
        "profile": {
            "name": user.name, "location": user.location, "bio": user.bio,
            "target_year": user.target_year, "batch": user.batch,
            "exam_name": user.exam_name, "track": user.track, "subjects": user.subjects or [],
        },
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }
