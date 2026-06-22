"""
Notification Service for Project Delta
Handles in-app notifications, email notifications, and push notifications
"""
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

class NotificationType(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    COURSE_UPDATE = "course_update"
    ASSIGNMENT_DUE = "assignment_due"
    QUIZ_RESULT = "quiz_result"
    MESSAGE = "message"

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    notification_type: NotificationType = NotificationType.INFO
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    action_url: Optional[str] = None
    metadata: Dict[str, Any] = {}

class NotificationService:
    def __init__(self):
        self.notifications: Dict[str, Notification] = {}
        self.user_notifications: Dict[str, List[str]] = {}  # user_id -> [notification_ids]
    
    def create_notification(
        self,
        user_id: str,
        title: str,
        message: str,
        notification_type: NotificationType = NotificationType.INFO,
        action_url: Optional[str] = None,
        metadata: Dict[str, Any] = None
    ) -> Notification:
        """Create a new notification"""
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            action_url=action_url,
            metadata=metadata or {}
        )
        
        self.notifications[notification.id] = notification
        
        if user_id not in self.user_notifications:
            self.user_notifications[user_id] = []
        
        self.user_notifications[user_id].append(notification.id)
        
        return notification
    
    def get_notification(self, notification_id: str) -> Optional[Notification]:
        """Get notification by ID"""
        return self.notifications.get(notification_id)
    
    def get_user_notifications(
        self,
        user_id: str,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0
    ) -> List[Notification]:
        """Get notifications for a user"""
        if user_id not in self.user_notifications:
            return []
        
        notification_ids = self.user_notifications[user_id]
        notifications = [
            self.notifications[nid]
            for nid in notification_ids
            if nid in self.notifications
        ]
        
        if unread_only:
            notifications = [n for n in notifications if not n.is_read]
        
        # Sort by created_at descending
        notifications.sort(key=lambda x: x.created_at, reverse=True)
        
        # Apply pagination
        return notifications[offset:offset + limit]
    
    def mark_as_read(self, notification_id: str) -> bool:
        """Mark a notification as read"""
        if notification_id not in self.notifications:
            return False
        
        self.notifications[notification_id].is_read = True
        return True
    
    def mark_all_as_read(self, user_id: str) -> int:
        """Mark all notifications for a user as read"""
        count = 0
        if user_id in self.user_notifications:
            for nid in self.user_notifications[user_id]:
                if nid in self.notifications and not self.notifications[nid].is_read:
                    self.notifications[nid].is_read = True
                    count += 1
        return count
    
    def delete_notification(self, notification_id: str) -> bool:
        """Delete a notification"""
        if notification_id not in self.notifications:
            return False
        
        notification = self.notifications[notification_id]
        user_id = notification.user_id
        
        if user_id in self.user_notifications:
            self.user_notifications[user_id].remove(notification_id)
        
        del self.notifications[notification_id]
        return True
    
    def get_unread_count(self, user_id: str) -> int:
        """Get count of unread notifications for a user"""
        if user_id not in self.user_notifications:
            return 0
        
        return sum(
            1 for nid in self.user_notifications[user_id]
            if nid in self.notifications and not self.notifications[nid].is_read
        )
    
    # Convenience methods for common notification types
    def notify_course_update(self, user_id: str, course_name: str, update_message: str):
        """Send course update notification"""
        return self.create_notification(
            user_id=user_id,
            title="Course Update",
            message=f"{course_name}: {update_message}",
            notification_type=NotificationType.COURSE_UPDATE,
            metadata={"course_name": course_name}
        )
    
    def notify_assignment_due(self, user_id: str, assignment_name: str, due_date: str):
        """Send assignment due reminder"""
        return self.create_notification(
            user_id=user_id,
            title="Assignment Due Soon",
            message=f"{assignment_name} is due on {due_date}",
            notification_type=NotificationType.ASSIGNMENT_DUE,
            metadata={"assignment_name": assignment_name, "due_date": due_date}
        )
    
    def notify_quiz_result(self, user_id: str, quiz_name: str, score: float, passed: bool):
        """Send quiz result notification"""
        result_msg = f"passed with {score}%" if passed else f"scored {score}%"
        return self.create_notification(
            user_id=user_id,
            title="Quiz Result",
            message=f"{quiz_name}: You {result_msg}",
            notification_type=NotificationType.QUIZ_RESULT,
            metadata={"quiz_name": quiz_name, "score": score, "passed": passed}
        )

# Singleton instance
notification_service = NotificationService()
