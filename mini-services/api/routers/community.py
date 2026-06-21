"""Community router — thin handlers calling content_service. All require auth."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user
from services.content_service import get_leaderboard, get_live_sessions

router = APIRouter(prefix="/community", tags=["community"], dependencies=[Depends(get_current_user)])


@router.get("/leaderboard")
def leaderboard(limit: int = 1000, db: Session = Depends(get_db)):
    entries = get_leaderboard(limit, db)
    return [{"id": e.id, "name": e.name, "score": e.score,
             "streak": e.streak, "change": e.change, "batch": e.batch, "rank": e.rank} for e in entries]


@router.get("/live")
def live_sessions(db: Session = Depends(get_db)):
    sessions = get_live_sessions(db)
    return [{"id": s.id, "subject": s.subject, "topic": s.topic,
             "instructor": s.instructor, "viewers": s.viewers, "isLive": s.is_live} for s in sessions]
