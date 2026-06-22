"""
Notifications router for Project Delta.
Handles in-app notifications, doubt resolutions, and course updates.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from database import get_db
from auth import decode_access_token
from models import User, Notification
from schemas import NotificationCreate, NotificationResponse, NotificationUpdate

router = APIRouter()

@router.post("/notifications", response_model=NotificationResponse)
def create_notification(
    notification_data: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(decode_access_token)
):
    """
    Create a new notification.
    Typically called by admin or system events.
    """
    # Verify recipient exists
    recipient = db.query(User).filter(User.id == notification_data.user_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="User not found")
    
    notification = Notification(
        user_id=notification_data.user_id,
        title=notification_data.title,
        message=notification_data.message,
        type=notification_data.type,
        link=notification_data.link,
        is_read=False
    )
    
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    return notification

@router.get("/notifications", response_model=List[NotificationResponse])
def get_my_notifications(
    skip: int = 0,
    limit: int = 20,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(decode_access_token)
):
    """
    Get current user's notifications.
    """
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    return notifications

@router.get("/notifications/count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(decode_access_token)
):
    """
    Get count of unread notifications for current user.
    """
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    return {"unread_count": count}

@router.put("/notifications/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(decode_access_token)
):
    """
    Mark a specific notification as read.
    """
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    notification.read_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(notification)
    
    return notification

@router.post("/notifications/read-all")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(decode_access_token)
):
    """
    Mark all notifications as read for current user.
    """
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({
        "is_read": True,
        "read_at": datetime.now(timezone.utc)
    })
    db.commit()
    
    return {"status": "success", "message": "All notifications marked as read"}

@router.delete("/notifications/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(decode_access_token)
):
    """
    Delete a specific notification.
    """
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notification)
    db.commit()
    
    return {"status": "success", "message": "Notification deleted"}

# System-triggered notifications
@router.post("/notifications/system/doubt-resolved")
def notify_doubt_resolved(
    user_id: int,
    doubt_id: int,
    resolver_name: str,
    db: Session = Depends(get_db)
):
    """
    System notification: doubt has been resolved.
    """
    notification = Notification(
        user_id=user_id,
        title="Doubt Resolved",
        message=f"Your doubt was resolved by {resolver_name}",
        type="doubt_resolved",
        link=f"/doubts/{doubt_id}",
        is_read=False
    )
    
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    return notification

@router.post("/notifications/system/class-starting")
def notify_class_starting(
    user_id: int,
    class_id: int,
    class_name: str,
    starts_in_minutes: int,
    db: Session = Depends(get_db)
):
    """
    System notification: class starting soon.
    """
    notification = Notification(
        user_id=user_id,
        title="Class Starting Soon",
        message=f"{class_name} starts in {starts_in_minutes} minutes",
        type="class_reminder",
        link=f"/classes/{class_id}",
        is_read=False
    )
    
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    return notification

@router.post("/notifications/system/test-available")
def notify_test_available(
    user_id: int,
    test_id: int,
    test_name: str,
    db: Session = Depends(get_db)
):
    """
    System notification: new test available.
    """
    notification = Notification(
        user_id=user_id,
        title="New Test Available",
        message=f"{test_name} is now available",
        type="test_available",
        link=f"/tests/{test_id}",
        is_read=False
    )
    
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    return notification
