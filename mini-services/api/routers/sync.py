"""
Sync router — the offline→online push/pull endpoint.

When the client comes online, it POSTs its full local state (notes, doubts,
progress, components, settings, appearance, profile). The server:
  1. Writes/updates each entity for the user (last-write-wins).
  2. Returns the merged state (server's version of everything).

This is a simple full-state sync — no delta tracking, no conflict resolution.
For a study app where each user owns their data, this is sufficient. The
client's local Zustand store remains the offline source of truth; the server
is the online backup + sharing layer.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from datetime import datetime, timezone

from database import get_db
from models import (
    User, UserSettings, UserAppearance, Note, Doubt, DoubtAnswer,
    VideoProgress, TestAttempt, DashboardComponent,
)
from schemas import SyncPayload, SyncResponse
from routers.auth import get_current_user
from security import sanitize_text, sanitize_dict

router = APIRouter(prefix="/sync", tags=["sync"])


@router.post("", response_model=SyncResponse)
def sync(payload: SyncPayload, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Push local state to server, return merged state."""

    # --- Profile ---
    if payload.profile:
        # Sanitize profile text fields to prevent stored XSS
        safe_profile = sanitize_dict(
            payload.profile,
            ['name', 'location', 'bio', 'batch', 'exam_name', 'track'],
        )
        for key, val in safe_profile.items():
            if hasattr(user, key) and val is not None:
                setattr(user, key, val)
        db.add(user)

    # --- Settings ---
    if payload.settings:
        settings = db.execute(select(UserSettings).where(UserSettings.user_id == user.id)).scalar_one_or_none()
        if not settings:
            settings = UserSettings(user_id=user.id)
            db.add(settings)
        for key in ("enabled_tabs", "notifications", "daily_goal_hours",
                     "custom_countdown_date", "countdown_label", "hours_today", "streak"):
            if key in payload.settings:
                setattr(settings, key, payload.settings[key])
        db.add(settings)

    # --- Appearance ---
    if payload.appearance:
        appearance = db.execute(select(UserAppearance).where(UserAppearance.user_id == user.id)).scalar_one_or_none()
        if not appearance:
            appearance = UserAppearance(user_id=user.id)
            db.add(appearance)
        for key in ("accent_hue", "density", "glass"):
            if key in payload.appearance:
                setattr(appearance, key, payload.appearance[key])
        db.add(appearance)

    # --- Notes (replace all for this user) ---
    if payload.notes is not None:
        db.execute(delete(Note).where(Note.user_id == user.id))
        for n in payload.notes:
            db.add(Note(
                user_id=user.id,
                title=sanitize_text(n.get("title", ""), 200),
                subject=sanitize_text(n.get("subject", ""), 100),
                content=sanitize_text(n.get("content", ""), 50000),
                tags=n.get("tags", []),
                updated_at=datetime.fromtimestamp(n.get("updatedAt", 0) / 1000, tz=timezone.utc) if n.get("updatedAt") else datetime.now(timezone.utc),
            ))

    # --- Doubts + answers ---
    if payload.doubts is not None:
        db.execute(delete(Doubt).where(Doubt.user_id == user.id))
        for d in payload.doubts:
            doubt = Doubt(
                user_id=user.id,
                text=sanitize_text(d.get("text", ""), 2000),
                subject=sanitize_text(d.get("subject", ""), 100),
                asker=d.get("asker", "You"),
                upvotes=d.get("upvotes", 0),
                resolved=d.get("resolved", False),
            )
            db.add(doubt)
            db.flush()  # get doubt.id
            for a in d.get("answers", []):
                db.add(DoubtAnswer(
                    doubt_id=doubt.id,
                    author=a.get("author", ""),
                    role=a.get("role", "AI Tutor"),
                    text=sanitize_text(a.get("text", ""), 5000),
                    helpful=a.get("helpful", 0),
                    pending=a.get("pending", False),
                    error=a.get("error", False),
                ))

    # --- Video progress ---
    if payload.video_progress:
        db.execute(delete(VideoProgress).where(VideoProgress.user_id == user.id))
        for vid, prog in payload.video_progress.items():
            db.add(VideoProgress(
                user_id=user.id,
                video_id=vid,
                fraction=prog.get("fraction", 0),
                completed=prog.get("completed", False),
            ))

    # --- Test attempts ---
    if payload.test_attempts is not None:
        db.execute(delete(TestAttempt).where(TestAttempt.user_id == user.id))
        for t in payload.test_attempts:
            db.add(TestAttempt(
                user_id=user.id,
                test_id=t.get("testId"),
                name=t.get("name", ""),
                type=t.get("type", ""),
                subject=t.get("subject", ""),
                score=t.get("score", 0),
                total=t.get("total", 0),
                time_taken=t.get("timeTaken", 0),
                trend=t.get("trend", 0),
            ))

    # --- Dashboard components ---
    if payload.components is not None:
        db.execute(delete(DashboardComponent).where(DashboardComponent.user_id == user.id))
        for c in payload.components:
            db.add(DashboardComponent(
                id=c.get("id", f"comp-{datetime.now().timestamp()}"),
                user_id=user.id,
                type=c.get("type", ""),
                x=c.get("x", 0),
                y=c.get("y", 0),
                w=c.get("w", 260),
                h=c.get("h", 220),
                z=c.get("z", 1),
            ))

    db.commit()

    # --- Return merged state ---
    return _build_sync_response(user, db)


def _build_sync_response(user: User, db: Session) -> SyncResponse:
    """Read the user's full state from the DB and return it."""
    notes = db.execute(select(Note).where(Note.user_id == user.id)).scalars().all()
    doubts = db.execute(select(Doubt).where(Doubt.user_id == user.id)).scalars().all()
    vp_rows = db.execute(select(VideoProgress).where(VideoProgress.user_id == user.id)).scalars().all()
    attempts = db.execute(select(TestAttempt).where(TestAttempt.user_id == user.id)).scalars().all()
    components = db.execute(select(DashboardComponent).where(DashboardComponent.user_id == user.id)).scalars().all()
    settings = db.execute(select(UserSettings).where(UserSettings.user_id == user.id)).scalar_one_or_none()
    appearance = db.execute(select(UserAppearance).where(UserAppearance.user_id == user.id)).scalar_one_or_none()

    return SyncResponse(
        notes=[{
            "id": n.id, "title": n.title, "subject": n.subject,
            "content": n.content, "tags": n.tags or [],
            "updatedAt": int(n.updated_at.timestamp() * 1000) if n.updated_at else 0,
        } for n in notes],
        doubts=[{
            "id": d.id, "text": d.text, "subject": d.subject,
            "asker": d.asker, "upvotes": d.upvotes, "resolved": d.resolved,
            "answers": [{
                "id": a.id, "author": a.author, "role": a.role,
                "text": a.text, "helpful": a.helpful,
                "pending": a.pending, "error": a.error,
            } for a in d.answers],
        } for d in doubts],
        video_progress={vp.video_id: {"fraction": vp.fraction, "completed": vp.completed} for vp in vp_rows},
        test_attempts=[{
            "id": t.id, "name": t.name, "type": t.type, "subject": t.subject,
            "score": t.score, "total": t.total, "timeTaken": t.time_taken, "trend": t.trend,
        } for t in attempts],
        components=[{
            "id": c.id, "type": c.type, "x": c.x, "y": c.y, "w": c.w, "h": c.h, "z": c.z,
        } for c in components],
        settings={
            "enabled_tabs": settings.enabled_tabs if settings else [],
            "notifications": settings.notifications if settings else {},
            "daily_goal_hours": settings.daily_goal_hours if settings else 6,
            "custom_countdown_date": settings.custom_countdown_date if settings else "",
            "countdown_label": settings.countdown_label if settings else "",
            "hours_today": settings.hours_today if settings else 0,
            "streak": settings.streak if settings else 0,
        } if settings else None,
        appearance={
            "accent_hue": appearance.accent_hue if appearance else 62,
            "density": appearance.density if appearance else "comfortable",
            "glass": appearance.glass if appearance else "strong",
        } if appearance else None,
        profile={
            "name": user.name, "location": user.location, "bio": user.bio,
            "target_year": user.target_year, "batch": user.batch,
            "exam_name": user.exam_name, "track": user.track, "subjects": user.subjects or [],
        },
        synced_at=datetime.now(timezone.utc).isoformat(),
    )
