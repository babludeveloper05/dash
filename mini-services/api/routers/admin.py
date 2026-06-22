"""
Admin Panel Routes for Project Delta
Provides administrative endpoints for user management, content moderation, and analytics
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from pydantic import BaseModel

# Import auth dependencies
import sys
sys.path.append("..")
from auth_http import require_auth

router = APIRouter(prefix="/admin", tags=["admin"])

class UserSummary(BaseModel):
    id: str
    email: str
    is_active: bool
    is_admin: bool
    created_at: str

class CourseSummary(BaseModel):
    id: str
    title: str
    instructor_id: str
    student_count: int
    is_published: bool

class SystemStats(BaseModel):
    total_users: int
    active_users: int
    total_courses: int
    total_videos: int
    storage_used_mb: float

# Mock data stores (replace with DB queries)
users_db = {}
courses_db = {}
analytics_db = {}

@router.get("/stats", response_model=SystemStats)
async def get_system_stats(current_user: dict = Depends(require_auth)):
    """Get system-wide statistics (admin only)"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # In real app, query database for actual stats
    return SystemStats(
        total_users=len(users_db),
        active_users=sum(1 for u in users_db.values() if u.get("is_active", False)),
        total_courses=len(courses_db),
        total_videos=0,  # Query video service
        storage_used_mb=0.0  # Calculate from file storage
    )

@router.get("/users", response_model=List[UserSummary])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    current_user: dict = Depends(require_auth)
):
    """List all users with pagination and search (admin only)"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Filter users
    filtered_users = list(users_db.values())
    
    if search:
        search_lower = search.lower()
        filtered_users = [
            u for u in filtered_users
            if search_lower in u.get("email", "").lower()
        ]
    
    # Paginate
    paginated = filtered_users[skip:skip + limit]
    
    return [
        UserSummary(
            id=u["id"],
            email=u["email"],
            is_active=u.get("is_active", True),
            is_admin=u.get("is_admin", False),
            created_at=u.get("created_at", "")
        )
        for u in paginated
    ]

@router.get("/users/{user_id}")
async def get_user_details(user_id: str, current_user: dict = Depends(require_auth)):
    """Get detailed user information (admin only)"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    return users_db[user_id]

@router.put("/users/{user_id}/toggle-active")
async def toggle_user_active(user_id: str, current_user: dict = Depends(require_auth)):
    """Toggle user active status (admin only)"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    users_db[user_id]["is_active"] = not users_db[user_id].get("is_active", True)
    
    return {"message": f"User {user_id} active status toggled"}

@router.put("/users/{user_id}/toggle-admin")
async def toggle_user_admin(user_id: str, current_user: dict = Depends(require_auth)):
    """Toggle user admin status (admin only)"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent removing own admin status
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot remove your own admin status")
    
    users_db[user_id]["is_admin"] = not users_db[user_id].get("is_admin", False)
    
    return {"message": f"User {user_id} admin status toggled"}

@router.get("/courses", response_model=List[CourseSummary])
async def list_courses(
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    current_user: dict = Depends(require_auth)
):
    """List all courses with pagination and search (admin only)"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Filter courses
    filtered_courses = list(courses_db.values())
    
    if search:
        search_lower = search.lower()
        filtered_courses = [
            c for c in filtered_courses
            if search_lower in c.get("title", "").lower()
        ]
    
    # Paginate
    paginated = filtered_courses[skip:skip + limit]
    
    return [
        CourseSummary(
            id=c["id"],
            title=c["title"],
            instructor_id=c["instructor_id"],
            student_count=c.get("student_count", 0),
            is_published=c.get("is_published", False)
        )
        for c in paginated
    ]

@router.delete("/courses/{course_id}")
async def delete_course(course_id: str, current_user: dict = Depends(require_auth)):
    """Delete a course (admin only)"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if course_id not in courses_db:
        raise HTTPException(status_code=404, detail="Course not found")
    
    del courses_db[course_id]
    
    return {"message": f"Course {course_id} deleted"}

@router.get("/analytics/overview")
async def get_analytics_overview(current_user: dict = Depends(require_auth)):
    """Get analytics overview (admin only)"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Mock analytics data
    return {
        "daily_active_users": [10, 15, 12, 18, 20, 25, 22],
        "new_registrations": [2, 3, 1, 4, 2, 5, 3],
        "course_completions": [1, 0, 2, 1, 3, 2, 1],
        "quiz_attempts": [5, 8, 6, 10, 12, 15, 11]
    }

@router.get("/analytics/users")
async def get_user_analytics(current_user: dict = Depends(require_auth)):
    """Get detailed user analytics (admin only)"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return {
        "total_users": len(users_db),
        "active_last_7_days": 0,
        "active_last_30_days": 0,
        "new_this_month": 0,
        "retention_rate": 0.0
    }

@router.get("/analytics/courses")
async def get_course_analytics(current_user: dict = Depends(require_auth)):
    """Get detailed course analytics (admin only)"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return {
        "total_courses": len(courses_db),
        "published_courses": sum(1 for c in courses_db.values() if c.get("is_published")),
        "average_enrollment": 0.0,
        "completion_rate": 0.0
    }
