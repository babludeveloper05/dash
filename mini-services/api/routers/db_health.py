"""
Database Health and Monitoring Router
Provides endpoints for checking database health, replicas, and performance metrics
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
import time

from database import get_db, engine
from models import User
from routers.auth import get_current_user
from services.read_replicas import db_config

router = APIRouter(prefix="/db", tags=["database", "monitoring"])

@router.get("/health")
async def database_health(db: Session = Depends(get_db)):
    """Check primary database health"""
    start_time = time.time()
    
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        latency_ms = (time.time() - start_time) * 1000
        
        return {
            "status": "healthy",
            "latency_ms": round(latency_ms, 2),
            "type": "primary"
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unhealthy: {str(e)}")

@router.get("/replicas/health")
async def replica_health(current_user: User = Depends(get_current_user)):
    """
    Check health of all database replicas (Admin only)
    Returns status of primary and all configured read replicas
    """
    # Only allow admin users
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    results = db_config.check_replica_health()
    
    healthy_count = sum(1 for r in results if r["healthy"])
    total_count = len(results)
    
    return {
        "summary": {
            "total": total_count,
            "healthy": healthy_count,
            "unhealthy": total_count - healthy_count,
            "all_healthy": healthy_count == total_count
        },
        "databases": results
    }

@router.get("/replicas/status")
async def replica_status(current_user: User = Depends(get_current_user)):
    """Get read replica configuration status (Admin only)"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return {
        "configured": db_config.is_replica_configured(),
        "primary_url": db_config.primary_url[:20] + "..." if db_config.primary_url else None,
        "replica_count": len(db_config.replica_urls),
        "replica_urls": [url[:20] + "..." for url in db_config.replica_urls]
    }

@router.get("/stats")
async def database_stats(db: Session = Depends(get_db)):
    """Get basic database statistics"""
    from sqlalchemy import text, func
    from models import User, CourseProgress, QuizAttempt, Note
    
    stats = {}
    
    # Count users
    try:
        user_count = db.query(func.count(User.id)).scalar()
        stats["users"] = user_count
    except:
        stats["users"] = 0
    
    # Count courses
    try:
        from models import Course
        course_count = db.query(func.count(Course.id)).scalar()
        stats["courses"] = course_count
    except:
        stats["courses"] = 0
    
    # Count notes
    try:
        note_count = db.query(func.count(Note.id)).scalar()
        stats["notes"] = note_count
    except:
        stats["notes"] = 0
    
    # Count quiz attempts
    try:
        attempt_count = db.query(func.count(QuizAttempt.id)).scalar()
        stats["quiz_attempts"] = attempt_count
    except:
        stats["quiz_attempts"] = 0
    
    # Database size (SQLite specific)
    try:
        import os
        db_path = engine.url.database
        if db_path and os.path.exists(db_path):
            size_bytes = os.path.getsize(db_path)
            stats["database_size_mb"] = round(size_bytes / (1024 * 1024), 2)
        else:
            stats["database_size_mb"] = None
    except:
        stats["database_size_mb"] = None
    
    return stats

@router.get("/pool/status")
async def connection_pool_status(current_user: User = Depends(get_current_user)):
    """Get connection pool status (Admin only)"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    pool = engine.pool
    
    return {
        "pool_size": pool.size() if hasattr(pool, 'size') else None,
        "checked_in": pool.checkedin() if hasattr(pool, 'checkedin') else None,
        "checked_out": pool.checkedout() if hasattr(pool, 'checkedout') else None,
        "overflow": pool.overflow() if hasattr(pool, 'overflow') else None,
        "invalid": pool.invalidatedcount() if hasattr(pool, 'invalidatedcount') else None
    }

@router.post("/replicas/test")
async def test_replica_read(current_user: User = Depends(get_current_user)):
    """Test read from a replica (Admin only)"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not db_config.is_replica_configured():
        return {
            "success": False,
            "message": "No read replicas configured",
            "fallback_to_primary": True
        }
    
    start_time = time.time()
    
    try:
        with db_config.read_session(use_replica=True) as session:
            from sqlalchemy import text
            result = session.execute(text("SELECT 1"))
            latency_ms = (time.time() - start_time) * 1000
            
            return {
                "success": True,
                "source": "replica",
                "latency_ms": round(latency_ms, 2),
                "result": "OK"
            }
    except Exception as e:
        return {
            "success": False,
            "source": "replica",
            "error": str(e),
            "fallback_to_primary": True
        }
