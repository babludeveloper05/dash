"""Doubts + leaderboard + live sessions read endpoints. All require auth."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from database import get_db
from models import LeaderboardEntry, LiveSession
from routers.auth import get_current_user

router = APIRouter(prefix="/community", tags=["community"], dependencies=[Depends(get_current_user)])


@router.get("/leaderboard")
def leaderboard(limit: int = 1000, db: Session = Depends(get_db)):
    rows = db.execute(
        select(LeaderboardEntry).order_by(LeaderboardEntry.rank.asc()).limit(limit)
    ).scalars().all()
    return [{
        "id": r.id, "name": r.name, "score": r.score,
        "streak": r.streak, "change": r.change, "batch": r.batch, "rank": r.rank,
    } for r in rows]


@router.get("/live")
def live_sessions(db: Session = Depends(get_db)):
    rows = db.execute(select(LiveSession)).scalars().all()
    return [{
        "id": r.id, "subject": r.subject, "topic": r.topic,
        "instructor": r.instructor, "viewers": r.viewers, "isLive": r.is_live,
    } for r in rows]
