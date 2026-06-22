"""
Video Streaming Routes for Project Delta
Handles video upload, listing, and streaming
"""
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from typing import List
import sys
sys.path.append("..")
from auth_http import require_auth

router = APIRouter(prefix="/videos", tags=["videos"])

# Import video service
try:
    from services.video import video_service, VideoInfo
except ImportError:
    video_service = None

@router.post("/upload", response_model=dict)
async def upload_video(
    file: UploadFile = File(...),
    title: str = Form(...),
    current_user: dict = Depends(require_auth)
):
    """Upload a new video (requires authentication)"""
    if not video_service:
        raise HTTPException(status_code=501, detail="Video service not available")
    
    try:
        video_info = await video_service.upload_video(file, title)
        return {
            "status": "success",
            "video": video_info.dict(),
            "message": "Video uploaded and processing started"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/", response_model=List[dict])
async def list_videos(current_user: dict = Depends(require_auth)):
    """List all available videos"""
    if not video_service:
        return []
    
    videos = video_service.list_videos()
    return [v.dict() for v in videos]

@router.get("/{video_id}", response_model=dict)
async def get_video(video_id: str, current_user: dict = Depends(require_auth)):
    """Get specific video details"""
    if not video_service:
        raise HTTPException(status_code=501, detail="Video service not available")
    
    video = video_service.get_video(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    return video.dict()
