"""Sync router — thin handler calling sync_service. CSRF protected."""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import SyncPayload, SyncResponse
from routers.auth import get_current_user
from services.sync_service import (
    apply_profile, apply_settings, apply_appearance,
    apply_notes, apply_doubts, apply_video_progress,
    apply_test_attempts, apply_components, build_sync_response,
)
from csrf import csrf_protect

router = APIRouter(prefix="/sync", tags=["sync"])


@router.post("", response_model=SyncResponse)
def sync(request: Request, payload: SyncPayload, user: User = Depends(get_current_user), db: Session = Depends(get_db), _ = Depends(csrf_protect)):
    """Push local state to server, return merged state."""

    if payload.profile:
        apply_profile(user, payload.profile, db)

    if payload.settings:
        apply_settings(user.id, payload.settings, db)

    if payload.appearance:
        apply_appearance(user.id, payload.appearance, db)

    if payload.notes is not None:
        apply_notes(user.id, payload.notes, db)

    if payload.doubts is not None:
        apply_doubts(user.id, payload.doubts, db)

    if payload.video_progress:
        apply_video_progress(user.id, payload.video_progress, db)

    if payload.test_attempts is not None:
        apply_test_attempts(user.id, payload.test_attempts, db)

    if payload.components is not None:
        apply_components(user.id, payload.components, db)

    db.commit()

    return build_sync_response(user, db)
