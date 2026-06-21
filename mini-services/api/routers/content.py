"""Content router — read-only endpoints for subjects, chapters, videos, tests, questions.
All endpoints require authentication."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from database import get_db
from models import Subject, Chapter, Video, Test, Question, User
from routers.auth import get_current_user

router = APIRouter(prefix="/content", tags=["content"], dependencies=[Depends(get_current_user)])


@router.get("/subjects")
def list_subjects(db: Session = Depends(get_db)):
    rows = db.execute(select(Subject)).scalars().all()
    return [{"id": s.id, "name": s.name, "icon": s.icon, "color": s.color} for s in rows]


@router.get("/subjects/{subject_id}/chapters")
def list_chapters(subject_id: str, db: Session = Depends(get_db)):
    rows = db.execute(
        select(Chapter).where(Chapter.subject_id == subject_id).order_by(Chapter.number)
    ).scalars().all()
    return [{"id": c.id, "subjectId": c.subject_id, "number": c.number,
             "title": c.title, "topicCount": c.topic_count, "durationMin": c.duration_min} for c in rows]


@router.get("/videos")
def list_videos(
    subject: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = select(Video)
    if subject and subject != "all":
        q = q.where(Video.subject_id == subject)
    rows = db.execute(q.order_by(Video.number)).scalars().all()
    return [{"id": v.id, "chapterId": v.chapter_id, "subjectId": v.subject_id,
             "number": v.number, "title": v.title, "instructor": v.instructor,
             "durationSec": v.duration_sec} for v in rows]


@router.get("/tests")
def list_tests(
    subject: str | None = Query(None),
    type: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = select(Test)
    if subject and subject != "All":
        q = q.where(Test.subject == subject)
    if type and type != "All":
        q = q.where(Test.type == type)
    rows = db.execute(q).scalars().all()
    return [{"id": t.id, "name": t.name, "type": t.type, "subject": t.subject,
             "questionCount": t.question_count, "durationMin": t.duration_min,
             "deadlineHours": t.deadline_hours, "difficulty": t.difficulty} for t in rows]


@router.get("/tests/{test_id}/questions")
def get_test_questions(test_id: str, db: Session = Depends(get_db)):
    rows = db.execute(select(Question).where(Question.test_id == test_id)).scalars().all()
    return [{"id": q.id, "text": q.text, "options": q.options,
             "correctIndex": q.correct_index, "explanation": q.explanation, "subject": q.subject} for q in rows]
