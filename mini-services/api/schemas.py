"""
Pydantic schemas for API request/response validation.

These define the shape of JSON the API accepts and returns. They mirror the
SQLAlchemy models but strip internal fields (password_hash, etc.).
"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# --- Auth ---

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str = "New Learner"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"
    refresh_token: str | None = None

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    location: str = "Not set"
    bio: str = ""
    target_year: str = "2027"
    batch: str = ""
    exam_name: str = "My Goal"
    track: str = "Learner"
    subjects: list[str] = []

    class Config:
        from_attributes = True


# --- Sync (the offline→online push/pull) ---

class SyncPayload(BaseModel):
    """Full local state pushed by the client when online."""
    notes: list[dict] = []
    doubts: list[dict] = []
    video_progress: dict = {}      # {videoId: {fraction, completed}}
    test_attempts: list[dict] = []
    components: list[dict] = []
    settings: Optional[dict] = None
    appearance: Optional[dict] = None
    profile: Optional[dict] = None

class SyncResponse(BaseModel):
    """Merged state returned to the client after sync."""
    notes: list[dict] = []
    doubts: list[dict] = []
    video_progress: dict = {}
    test_attempts: list[dict] = []
    components: list[dict] = []
    settings: Optional[dict] = None
    appearance: Optional[dict] = None
    profile: Optional[dict] = None
    synced_at: str


# --- Notes ---

class NoteCreate(BaseModel):
    title: str = ""
    subject: str = ""
    content: str = ""
    tags: list[str] = []

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[list[str]] = None

class NoteOut(BaseModel):
    id: str
    title: str
    subject: str
    content: str
    tags: list[str] = []
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Doubts ---

class DoubtCreate(BaseModel):
    text: str
    subject: str = "General"

class DoubtOut(BaseModel):
    id: str
    text: str
    subject: str
    asker: str
    upvotes: int
    resolved: bool
    answers: list[dict] = []
    created_at: datetime

    class Config:
        from_attributes = True


Token.model_rebuild()


# --- Notifications ---

class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    type: str
    link: Optional[str] = None

class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None
    title: Optional[str] = None
    message: Optional[str] = None

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True
