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


def get_videos(subject: str | None, db: Session) -> list[Video]:
    q = select(Video)
    if subject and subject != "all":
        q = q.where(Video.subject_id == subject)
    return db.execute(q.order_by(Video.number)).scalars().all()


def get_tests(subject: str | None, type: str | None, db: Session) -> list[Test]:
    q = select(Test)
    if subject and subject != "All":
        q = q.where(Test.subject == subject)
    if type and type != "All":
        q = q.where(Test.type == type)
    return db.execute(q).scalars().all()


def get_questions(test_id: str, db: Session) -> list[Question]:
    return db.execute(
        select(Question).where(Question.test_id == test_id)
    ).scalars().all()


def get_leaderboard(limit: int, db: Session) -> list:
    from models import LeaderboardEntry
    return db.execute(
        select(LeaderboardEntry).order_by(LeaderboardEntry.rank.asc()).limit(limit)
    ).scalars().all()


def get_live_sessions(db: Session) -> list:
    from models import LiveSession
    return db.execute(select(LiveSession)).scalars().all()
