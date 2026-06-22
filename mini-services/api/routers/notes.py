"""Notes CRUD router. CSRF protected."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import select
import uuid

from database import get_db
from models import Note, User
from schemas import NoteCreate, NoteUpdate, NoteOut
from routers.auth import get_current_user
from security import sanitize_dict
from csrf import csrf_protect

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("", response_model=list[NoteOut])
def list_notes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.execute(select(Note).where(Note.user_id == user.id).order_by(Note.updated_at.desc())).scalars().all()


@router.post("", response_model=NoteOut)
def create_note(request: Request, body: NoteCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db), _ = Depends(csrf_protect)):
    # Sanitize user input to prevent stored XSS
    safe = sanitize_dict(body.model_dump(), ['title', 'content', 'subject'])
    note = Note(user_id=user.id, **safe)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.put("/{note_id}", response_model=NoteOut)
def update_note(request: Request, note_id: str, body: NoteUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db), _ = Depends(csrf_protect)):
    note = db.execute(select(Note).where(Note.id == note_id, Note.user_id == user.id)).scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    # Sanitize user input
    update_data = body.model_dump(exclude_unset=True)
    safe = sanitize_dict(update_data, ['title', 'content', 'subject'])
    for key, val in safe.items():
        setattr(note, key, val)
    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}")
def delete_note(request: Request, note_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db), _ = Depends(csrf_protect)):
    note = db.execute(select(Note).where(Note.id == note_id, Note.user_id == user.id)).scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
    return {"ok": True}
