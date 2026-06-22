"""
Backup Router - API endpoints for database backup management
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from services.backup import backup_service
from routers.auth import get_current_user
from models import User

def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to check if user is admin"""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

router = APIRouter(prefix="/backups", tags=["backups"])

class BackupResponse(BaseModel):
    filename: str
    path: str
    size: int
    created: str
    compressed: bool

class BackupStats(BaseModel):
    total_backups: int
    total_size_mb: float
    compressed_count: int
    uncompressed_count: int
    oldest_backup: Optional[str]
    newest_backup: Optional[str]

class CreateBackupRequest(BaseModel):
    compressed: bool = True

class RestoreBackupRequest(BaseModel):
    backup_path: str

class CleanupRequest(BaseModel):
    keep_count: int = 5

@router.post("/create", response_model=dict)
async def create_backup(
    request: CreateBackupRequest,
    current_user: User = Depends(get_current_admin_user)
):
    """Create a new database backup (Admin only)"""
    try:
        backup_path = backup_service.create_backup(compressed=request.compressed)
        return {
            "success": True,
            "message": "Backup created successfully",
            "backup_path": backup_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list", response_model=List[BackupResponse])
async def list_backups(current_user: User = Depends(get_current_admin_user)):
    """List all available backups (Admin only)"""
    return backup_service.list_backups()

@router.post("/restore", response_model=dict)
async def restore_backup(
    request: RestoreBackupRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_admin_user)
):
    """Restore database from backup (Admin only)"""
    try:
        # Validate backup file exists
        backup_file = backup_service.backup_dir / request.backup_path
        if not backup_file.exists():
            # Try with full path
            backup_file = Path(request.backup_path)
            if not backup_file.exists():
                raise HTTPException(status_code=404, detail="Backup file not found")
        
        # Perform restoration
        success = backup_service.restore_backup(str(backup_file))
        
        if success:
            return {
                "success": True,
                "message": "Database restored successfully",
                "warning": "Application restart may be required"
            }
        else:
            raise HTTPException(status_code=500, detail="Restore failed")
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cleanup", response_model=dict)
async def cleanup_old_backups(
    request: CleanupRequest,
    current_user: User = Depends(get_current_admin_user)
):
    """Delete old backups, keeping only the most recent ones (Admin only)"""
    try:
        deleted = backup_service.delete_old_backups(keep_count=request.keep_count)
        return {
            "success": True,
            "message": f"Deleted {len(deleted)} old backups",
            "deleted_files": deleted
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats", response_model=BackupStats)
async def get_backup_stats(current_user: User = Depends(get_current_admin_user)):
    """Get backup statistics (Admin only)"""
    return backup_service.get_backup_stats()

@router.post("/schedule", response_model=dict)
async def schedule_auto_backup(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_admin_user)
):
    """
    Schedule automatic daily backups
    In production, this would integrate with cron or a task scheduler
    """
    # This is a placeholder - in production you'd use APScheduler or cron
    return {
        "success": True,
        "message": "Auto-backup scheduling configured (requires external scheduler)",
        "info": "Add to crontab: 0 2 * * * cd /path/to/api && python -c 'from services.backup import backup_service; backup_service.create_backup()'"
    }
