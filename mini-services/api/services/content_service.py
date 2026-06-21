"""Content service — subjects, chapters, videos, tests, questions.

Business logic for reading content from the DB. Routers call these functions
and serialize the results.
"""
from sqlalchemy.orm import Session
from sqlalchemy import select

from models import Subject, Chapter, Video, Test, Question


def get_subjects(db: Session) -> list[Subject]:
    return db.execute(select(Subject)).scalars().all()


def get_chapters(subject_id: str, db: Session) -> list[Chapter]:
    return db.execute(
        select(Chapter).where(Chapter.subject_id == subject_id).order_by(Chapter.number)
    ).scalars().all()


def get_videos(subject: str | None, limit: int, offset: int, db: Session) -> tuple[list[Video], int]:
    """Returns (videos, total_count) with optional subject filter + pagination."""
    q = select(Video)
    if subject and subject != "all":
        q = q.where(Video.subject_id == subject)
    from sqlalchemy import func
    total = db.execute(select(func.count()).select_from(q.subquery())).scalar() or 0
    videos = db.execute(q.order_by(Video.number).offset(offset).limit(limit)).scalars().all()
    return videos, total


def get_tests(subject: str | None, type: str | None, limit: int, offset: int, db: Session) -> tuple[list[Test], int]:
    """Returns (tests, total_count) with optional subject/type filter + pagination."""
    q = select(Test)
    if subject and subject != "All":
        q = q.where(Test.subject == subject)
    if type and type != "All":
        q = q.where(Test.type == type)
    from sqlalchemy import func
    total = db.execute(select(func.count()).select_from(q.subquery())).scalar() or 0
    tests = db.execute(q.offset(offset).limit(limit)).scalars().all()
    return tests, total


def get_questions(test_id: str, db: Session) -> list[Question]:
    return db.execute(
        select(Question).where(Question.test_id == test_id)
    ).scalars().all()


def get_leaderboard(limit: int, offset: int, db: Session) -> tuple[list, int]:
    """Returns (entries, total_count) for paginated leaderboard."""
    from models import LeaderboardEntry
    from sqlalchemy import func, select as sel
    entries = db.execute(
        sel(LeaderboardEntry).order_by(LeaderboardEntry.rank.asc()).offset(offset).limit(limit)
    ).scalars().all()
    total = db.execute(sel(func.count(LeaderboardEntry.id))).scalar() or 0
    return entries, total


def get_live_sessions(db: Session) -> list:
    from models import LiveSession
    return db.execute(select(LiveSession)).scalars().all()
