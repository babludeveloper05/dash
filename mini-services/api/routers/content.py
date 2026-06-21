"""Content router — thin handlers calling content_service. All require auth."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import User
from routers.auth import get_current_user
from services.content_service import (
    get_subjects, get_chapters, get_videos, get_tests, get_questions,
    get_leaderboard, get_live_sessions,
)

router = APIRouter(prefix="/content", tags=["content"], dependencies=[Depends(get_current_user)])


@router.get("/subjects")
def list_subjects(db: Session = Depends(get_db)):
    subjects = get_subjects(db)
    return [{"id": s.id, "name": s.name, "icon": s.icon, "color": s.color} for s in subjects]


@router.get("/subjects/{subject_id}/chapters")
def list_chapters(subject_id: str, db: Session = Depends(get_db)):
    chapters = get_chapters(subject_id, db)
    return [{"id": c.id, "subjectId": c.subject_id, "number": c.number,
             "title": c.title, "topicCount": c.topic_count, "durationMin": c.duration_min} for c in chapters]


@router.get("/videos")
def list_videos(
    subject: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Returns paginated videos. Use limit + offset for pagination."""
    videos = get_videos(subject, db)
    total = len(videos)
    paginated = videos[offset:offset + limit]
    return {
        "items": [{"id": v.id, "chapterId": v.chapter_id, "subjectId": v.subject_id,
                   "number": v.number, "title": v.title, "instructor": v.instructor,
                   "durationSec": v.duration_sec} for v in paginated],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/tests")
def list_tests(subject: str | None = Query(None), type: str | None = Query(None), db: Session = Depends(get_db)):
    tests = get_tests(subject, type, db)
    return [{"id": t.id, "name": t.name, "type": t.type, "subject": t.subject,
             "questionCount": t.question_count, "durationMin": t.duration_min,
             "deadlineHours": t.deadline_hours, "difficulty": t.difficulty} for t in tests]


@router.get("/tests/{test_id}/questions")
def get_test_questions(test_id: str, db: Session = Depends(get_db)):
    questions = get_questions(test_id, db)
    return [{"id": q.id, "text": q.text, "options": q.options,
             "correctIndex": q.correct_index, "explanation": q.explanation, "subject": q.subject} for q in questions]
