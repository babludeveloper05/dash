"""
SQLAlchemy models for all Project Delta entities.

These mirror the app's Zustand store + mock-data shapes. The same schema
works for SQLite (dev/offline) and PostgreSQL (production) — just swap
DATABASE_URL.

Offline-first note: the Next.js client keeps a local copy in Zustand
(localStorage). When online, it syncs to these tables via the /sync endpoint.
Last-write-wins per entity; conflicts are rare since each user owns their data.
"""
import uuid
import json
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON,
)
from sqlalchemy.orm import relationship
from database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


# --- Auth & profile ---------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=True)  # nullable for OAuth users
    name = Column(String, nullable=False, default="New Learner")
    location = Column(String, default="Not set")
    bio = Column(Text, default="")
    target_year = Column(String, default="2027")
    batch = Column(String, default="")
    exam_name = Column(String, default="My Goal")
    track = Column(String, default="Learner")
    subjects = Column(JSON, default=list)  # ["Physics", "Algorithms", ...]
    is_verified = Column(Boolean, default=False, index=True)  # Email verification status
    reset_token = Column(String, nullable=True, index=True)  # Password reset token
    reset_token_expires = Column(DateTime, nullable=True)  # Token expiration
    verification_token = Column(String, nullable=True, index=True)  # Email verification token
    failed_login_attempts = Column(Integer, default=0)  # Account lockout protection
    locked_until = Column(DateTime, nullable=True)  # Lockout expiration
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    # relations
    settings = relationship("UserSettings", uselist=False, back_populates="user", cascade="all, delete-orphan")
    appearance = relationship("UserAppearance", uselist=False, back_populates="user", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="user", cascade="all, delete-orphan")
    doubts = relationship("Doubt", back_populates="user", cascade="all, delete-orphan")
    video_progress = relationship("VideoProgress", back_populates="user", cascade="all, delete-orphan")
    test_attempts = relationship("TestAttempt", back_populates="user", cascade="all, delete-orphan")
    components = relationship("DashboardComponent", back_populates="user", cascade="all, delete-orphan")


class UserSettings(Base):
    """Per-user settings: enabled tabs, notifications, daily goal, countdown."""
    __tablename__ = "user_settings"

    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    enabled_tabs = Column(JSON, default=list)  # ["home", "library", ...]
    notifications = Column(JSON, default=lambda: {"live": True, "tests": True, "streak": True, "weekly": False})
    daily_goal_hours = Column(Integer, default=6)
    custom_countdown_date = Column(String, default="2027-01-24")
    countdown_label = Column(String, default="Exam Day")
    hours_today = Column(Float, default=0)
    streak = Column(Integer, default=0)

    user = relationship("User", back_populates="settings")


class UserAppearance(Base):
    """Per-user appearance: accent hue, density, glass strength."""
    __tablename__ = "user_appearance"

    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    accent_hue = Column(Integer, default=62)
    density = Column(String, default="comfortable")  # comfortable | compact
    glass = Column(String, default="strong")  # subtle | medium | strong

    user = relationship("User", back_populates="appearance")


# --- Content (shared, read-only for learners) -------------------------------

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(String, primary_key=True)  # "physics", "cs", etc.
    name = Column(String, nullable=False)
    icon = Column(String, default="BookOpen")
    color = Column(String, default="oklch(0.74 0.135 62)")

    chapters = relationship("Chapter", back_populates="subject", cascade="all, delete-orphan")


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(String, primary_key=True, default=_uuid)
    subject_id = Column(String, ForeignKey("subjects.id"), nullable=False, index=True)
    number = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    topic_count = Column(Integer, default=5)
    duration_min = Column(Integer, default=120)

    subject = relationship("Subject", back_populates="chapters")
    videos = relationship("Video", back_populates="chapter", cascade="all, delete-orphan")


class Video(Base):
    __tablename__ = "videos"

    id = Column(String, primary_key=True, default=_uuid)
    chapter_id = Column(String, ForeignKey("chapters.id"), nullable=False, index=True)
    subject_id = Column(String, ForeignKey("subjects.id"), nullable=False, index=True)
    number = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    instructor = Column(String, default="")
    duration_sec = Column(Integer, nullable=False)

    chapter = relationship("Chapter", back_populates="videos")
    subject = relationship("Subject")


class Test(Base):
    __tablename__ = "tests"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # JEE Main, Chapter Test, etc.
    subject = Column(String, nullable=False)
    question_count = Column(Integer, default=30)
    duration_min = Column(Integer, default=120)
    deadline_hours = Column(Integer, nullable=True)
    difficulty = Column(String, default="Moderate")


class Question(Base):
    __tablename__ = "questions"

    id = Column(String, primary_key=True, default=_uuid)
    test_id = Column(String, ForeignKey("tests.id"), nullable=False, index=True)
    text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)  # ["A", "B", "C", "D"]
    correct_index = Column(Integer, nullable=False)
    explanation = Column(Text, default="")
    subject = Column(String, default="")


# --- User data (owned, syncs offline→online) --------------------------------

class Note(Base):
    __tablename__ = "notes"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, default="")
    subject = Column(String, default="")
    content = Column(Text, default="")
    tags = Column(JSON, default=list)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    user = relationship("User", back_populates="notes")


class Doubt(Base):
    __tablename__ = "doubts"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    text = Column(Text, nullable=False)
    subject = Column(String, default="General")
    asker = Column(String, default="You")
    upvotes = Column(Integer, default=0)
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_now)

    user = relationship("User", back_populates="doubts")
    answers = relationship("DoubtAnswer", back_populates="doubt", cascade="all, delete-orphan")


class DoubtAnswer(Base):
    __tablename__ = "doubt_answers"

    id = Column(String, primary_key=True, default=_uuid)
    doubt_id = Column(String, ForeignKey("doubts.id"), nullable=False, index=True)
    author = Column(String, default="Delta AI Tutor")
    role = Column(String, default="AI Tutor")  # AI Tutor | Faculty | Student
    text = Column(Text, default="")
    helpful = Column(Integer, default=0)
    pending = Column(Boolean, default=False)
    error = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_now)

    doubt = relationship("Doubt", back_populates="answers")


class VideoProgress(Base):
    __tablename__ = "video_progress"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    video_id = Column(String, nullable=False, index=True)
    fraction = Column(Float, default=0)
    completed = Column(Boolean, default=False)

    user = relationship("User", back_populates="video_progress")


class TestAttempt(Base):
    __tablename__ = "test_attempts"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    test_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    type = Column(String, default="")
    subject = Column(String, default="")
    score = Column(Integer, default=0)
    total = Column(Integer, default=0)
    time_taken = Column(Integer, default=0)
    trend = Column(Integer, default=0)
    created_at = Column(DateTime, default=_now)

    user = relationship("User", back_populates="test_attempts")


# --- Dashboard layout -------------------------------------------------------

class DashboardComponent(Base):
    """Dashboard component positions (the free-form canvas layout).

    Composite PK (user_id, id) — the client-defined widget IDs (e.g.
    "w-greeting") are shared across users, so the user_id must be part of
    the key to avoid conflicts when multiple users sync the same default
    widget set.
    """
    __tablename__ = "dashboard_components"

    id = Column(String, primary_key=True)  # "w-greeting" etc. (client-defined)
    user_id = Column(String, ForeignKey("users.id"), primary_key=True, nullable=False)
    type = Column(String, nullable=False)
    x = Column(Integer, default=0)
    y = Column(Integer, default=0)
    w = Column(Integer, default=260)
    h = Column(Integer, default=220)
    z = Column(Integer, default=1)

    user = relationship("User", back_populates="components")


# --- Community / shared -----------------------------------------------------

class LeaderboardEntry(Base):
    __tablename__ = "leaderboard_entries"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)  # nullable for mock entries
    name = Column(String, nullable=False)
    score = Column(Integer, default=0)
    streak = Column(Integer, default=0)
    change = Column(Integer, default=0)
    batch = Column(String, default="")
    rank = Column(Integer, default=0)


class LiveSession(Base):
    __tablename__ = "live_sessions"

    id = Column(String, primary_key=True, default=_uuid)
    subject = Column(String, nullable=False)
    topic = Column(String, nullable=False)
    instructor = Column(String, default="")
    starts_at = Column(DateTime, nullable=True)
    viewers = Column(Integer, default=0)
    is_live = Column(Boolean, default=False)


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(String, default="")
    category = Column(String, default="Special")
    rarity = Column(String, default="Common")
    icon = Column(String, default="Award")
    earned = Column(Boolean, default=False)
    earned_at = Column(String, nullable=True)
    progress = Column(Float, default=0)


# --- Notifications ----------------------------------------------------------

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String, nullable=False, index=True)  # doubt_resolved, class_reminder, test_available, etc.
    link = Column(String, nullable=True)  # Deep link to related content
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=_now, index=True)
    read_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="notifications")


# Add back-populates to User model
User.notifications = relationship("Notification", order_by=Notification.created_at.desc(), back_populates="user")
