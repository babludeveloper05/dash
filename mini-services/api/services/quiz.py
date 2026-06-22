"""
Quiz and Assessment Service for Project Delta
Handles quiz creation, taking quizzes, and grading
"""
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    question_type: str  # multiple_choice, true_false, short_answer, essay
    options: Optional[List[str]] = None
    correct_answer: Any
    points: int = 1
    explanation: Optional[str] = None

class Quiz(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    course_id: str
    questions: List[Question] = []
    time_limit_minutes: Optional[int] = None
    passing_score: float = 70.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_published: bool = False

class QuizAttempt(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quiz_id: str
    user_id: str
    answers: Dict[str, Any] = {}  # question_id -> answer
    score: float = 0.0
    max_score: float = 0.0
    percentage: float = 0.0
    started_at: datetime = Field(default_factory=datetime.utcnow)
    submitted_at: Optional[datetime] = None
    is_graded: bool = False

class QuizService:
    def __init__(self):
        self.quizzes: Dict[str, Quiz] = {}
        self.attempts: Dict[str, QuizAttempt] = {}
    
    def create_quiz(self, quiz_data: dict) -> Quiz:
        """Create a new quiz"""
        quiz = Quiz(**quiz_data)
        self.quizzes[quiz.id] = quiz
        return quiz
    
    def get_quiz(self, quiz_id: str) -> Optional[Quiz]:
        """Get quiz by ID"""
        return self.quizzes.get(quiz_id)
    
    def update_quiz(self, quiz_id: str, updates: dict) -> Optional[Quiz]:
        """Update quiz details"""
        if quiz_id not in self.quizzes:
            return None
        
        quiz = self.quizzes[quiz_id]
        for key, value in updates.items():
            if hasattr(quiz, key):
                setattr(quiz, key, value)
        
        return quiz
    
    def delete_quiz(self, quiz_id: str) -> bool:
        """Delete a quiz"""
        if quiz_id in self.quizzes:
            del self.quizzes[quiz_id]
            return True
        return False
    
    def publish_quiz(self, quiz_id: str) -> Optional[Quiz]:
        """Publish a quiz"""
        if quiz_id not in self.quizzes:
            return None
        
        self.quizzes[quiz_id].is_published = True
        return self.quizzes[quiz_id]
    
    def start_attempt(self, quiz_id: str, user_id: str) -> Optional[QuizAttempt]:
        """Start a new quiz attempt"""
        if quiz_id not in self.quizzes:
            return None
        
        quiz = self.quizzes[quiz_id]
        if not quiz.is_published:
            raise ValueError("Quiz is not published")
        
        attempt = QuizAttempt(
            quiz_id=quiz_id,
            user_id=user_id,
            max_score=sum(q.points for q in quiz.questions)
        )
        
        self.attempts[attempt.id] = attempt
        return attempt
    
    def submit_answers(self, attempt_id: str, answers: Dict[str, Any]) -> Optional[QuizAttempt]:
        """Submit answers for a quiz attempt"""
        if attempt_id not in self.attempts:
            return None
        
        attempt = self.attempts[attempt_id]
        attempt.answers = answers
        attempt.submitted_at = datetime.utcnow()
        
        # Auto-grade if all questions are auto-gradable
        self.grade_attempt(attempt_id)
        
        return attempt
    
    def grade_attempt(self, attempt_id: str) -> Optional[QuizAttempt]:
        """Grade a quiz attempt"""
        if attempt_id not in self.attempts:
            return None
        
        attempt = self.attempts[attempt_id]
        quiz = self.quizzes.get(attempt.quiz_id)
        
        if not quiz:
            return None
        
        earned_points = 0.0
        
        for question in quiz.questions:
            user_answer = attempt.answers.get(question.id)
            
            if question.question_type in ["multiple_choice", "true_false"]:
                if user_answer == question.correct_answer:
                    earned_points += question.points
            elif question.question_type == "short_answer":
                # Simple string comparison (case-insensitive)
                if str(user_answer).strip().lower() == str(question.correct_answer).strip().lower():
                    earned_points += question.points
            # Essay questions require manual grading
            
        attempt.score = earned_points
        attempt.percentage = (earned_points / attempt.max_score * 100) if attempt.max_score > 0 else 0
        attempt.is_graded = True
        
        return attempt
    
    def get_attempt(self, attempt_id: str) -> Optional[QuizAttempt]:
        """Get attempt by ID"""
        return self.attempts.get(attempt_id)
    
    def get_user_attempts(self, user_id: str, quiz_id: Optional[str] = None) -> List[QuizAttempt]:
        """Get all attempts by a user"""
        attempts = [a for a in self.attempts.values() if a.user_id == user_id]
        
        if quiz_id:
            attempts = [a for a in attempts if a.quiz_id == quiz_id]
        
        return sorted(attempts, key=lambda x: x.submitted_at or x.started_at, reverse=True)
    
    def get_quiz_statistics(self, quiz_id: str) -> Dict[str, Any]:
        """Get statistics for a quiz"""
        attempts = [a for a in self.attempts.values() if a.quiz_id == quiz_id and a.is_graded]
        
        if not attempts:
            return {
                "total_attempts": 0,
                "average_score": 0,
                "pass_rate": 0,
                "highest_score": 0,
                "lowest_score": 0
            }
        
        scores = [a.percentage for a in attempts]
        passed = sum(1 for a in attempts if a.percentage >= self.quizzes[quiz_id].passing_score)
        
        return {
            "total_attempts": len(attempts),
            "average_score": sum(scores) / len(scores),
            "pass_rate": (passed / len(attempts)) * 100,
            "highest_score": max(scores),
            "lowest_score": min(scores)
        }

# Singleton instance
quiz_service = QuizService()
