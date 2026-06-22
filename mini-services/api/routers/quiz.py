"""
Quiz and Assessment Routes for Project Delta
Handles quiz creation, taking quizzes, and grading
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from pydantic import BaseModel
import sys
sys.path.append("..")
from auth_http import require_auth

router = APIRouter(prefix="/quiz", tags=["quiz"])

# Import quiz service
try:
    from services.quiz import quiz_service, Quiz, Question, QuizAttempt
except ImportError:
    quiz_service = None

class QuizCreate(BaseModel):
    title: str
    description: str
    course_id: str
    questions: List[Question] = []
    time_limit_minutes: int = None
    passing_score: float = 70.0

class AnswerSubmit(BaseModel):
    answers: Dict[str, Any]

@router.post("/create", response_model=dict)
async def create_quiz(
    quiz_data: QuizCreate,
    current_user: dict = Depends(require_auth)
):
    """Create a new quiz (instructor/admin only)"""
    if not quiz_service:
        raise HTTPException(status_code=501, detail="Quiz service not available")
    
    quiz = quiz_service.create_quiz(quiz_data.dict())
    return {
        "status": "success",
        "quiz": quiz.dict(),
        "message": "Quiz created successfully"
    }

@router.get("/{quiz_id}", response_model=dict)
async def get_quiz(quiz_id: str, current_user: dict = Depends(require_auth)):
    """Get quiz details"""
    if not quiz_service:
        raise HTTPException(status_code=501, detail="Quiz service not available")
    
    quiz = quiz_service.get_quiz(quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    return quiz.dict()

@router.post("/{quiz_id}/start", response_model=dict)
async def start_quiz(quiz_id: str, current_user: dict = Depends(require_auth)):
    """Start a new quiz attempt"""
    if not quiz_service:
        raise HTTPException(status_code=501, detail="Quiz service not available")
    
    try:
        attempt = quiz_service.start_attempt(quiz_id, current_user["id"])
        return {
            "status": "success",
            "attempt": attempt.dict(),
            "message": "Quiz attempt started"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/attempt/{attempt_id}/submit", response_model=dict)
async def submit_quiz(
    attempt_id: str,
    answers: AnswerSubmit,
    current_user: dict = Depends(require_auth)
):
    """Submit quiz answers"""
    if not quiz_service:
        raise HTTPException(status_code=501, detail="Quiz service not available")
    
    attempt = quiz_service.submit_answers(attempt_id, answers.answers)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    return {
        "status": "success",
        "attempt": attempt.dict(),
        "message": "Quiz submitted and graded"
    }

@router.get("/attempt/{attempt_id}", response_model=dict)
async def get_attempt(attempt_id: str, current_user: dict = Depends(require_auth)):
    """Get quiz attempt details"""
    if not quiz_service:
        raise HTTPException(status_code=501, detail="Quiz service not available")
    
    attempt = quiz_service.get_attempt(attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    # Don't show correct answers unless graded
    result = attempt.dict()
    if not attempt.is_graded:
        result.pop("score", None)
        result.pop("percentage", None)
    
    return result

@router.get("/my-attempts", response_model=List[dict])
async def get_my_attempts(
    quiz_id: str = None,
    current_user: dict = Depends(require_auth)
):
    """Get all attempts by current user"""
    if not quiz_service:
        return []
    
    attempts = quiz_service.get_user_attempts(current_user["id"], quiz_id)
    return [a.dict() for a in attempts]

@router.get("/{quiz_id}/stats", response_model=dict)
async def get_quiz_stats(quiz_id: str, current_user: dict = Depends(require_auth)):
    """Get quiz statistics (instructor/admin only)"""
    if not quiz_service:
        raise HTTPException(status_code=501, detail="Quiz service not available")
    
    stats = quiz_service.get_quiz_statistics(quiz_id)
    return stats
