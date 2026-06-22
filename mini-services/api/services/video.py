"""
Video Streaming Service for Project Delta
Handles video upload, processing, and streaming via HLS
"""
import os
import uuid
import subprocess
import shutil
from typing import Optional, List
from fastapi import UploadFile, HTTPException
from pydantic import BaseModel

class VideoInfo(BaseModel):
    id: str
    title: str
    duration: float
    resolution: str
    status: str  # processing, ready, failed
    hls_url: str
    thumbnail_url: str

class VideoService:
    def __init__(self, upload_dir: str = "uploads/videos", hls_dir: str = "static/hls"):
        self.upload_dir = upload_dir
        self.hls_dir = hls_dir
        os.makedirs(upload_dir, exist_ok=True)
        os.makedirs(hls_dir, exist_ok=True)
    
    async def upload_video(self, file: UploadFile, title: str) -> VideoInfo:
        """Upload and start processing video"""
        video_id = str(uuid.uuid4())
        ext = file.filename.split(".")[-1] if "." in file.filename else "mp4"
        original_path = os.path.join(self.upload_dir, f"{video_id}.{ext}")
        
        # Save uploaded file
        with open(original_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get video info
        duration = await self._get_duration(original_path)
        resolution = await self._get_resolution(original_path)
        
        # Create video info
        video_info = VideoInfo(
            id=video_id,
            title=title,
            duration=duration,
            resolution=resolution,
            status="processing",
            hls_url=f"/static/hls/{video_id}/playlist.m3u8",
            thumbnail_url=f"/static/hls/{video_id}/thumbnail.jpg"
        )
        
        # Start background processing (in production, use Celery/RQ)
        # For now, process synchronously (should be async in prod)
        await self._process_video(original_path, video_id)
        
        return video_info
    
    async def _get_duration(self, file_path: str) -> float:
        """Get video duration using ffprobe"""
        try:
            cmd = [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                file_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            return float(result.stdout.strip())
        except Exception:
            return 0.0
    
    async def _get_resolution(self, file_path: str) -> str:
        """Get video resolution using ffprobe"""
        try:
            cmd = [
                "ffprobe", "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=width,height",
                "-of", "csv=s=x:p=0",
                file_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            return result.stdout.strip() or "unknown"
        except Exception:
            return "unknown"
    
    async def _process_video(self, input_path: str, video_id: str):
        """Convert video to HLS format with multiple resolutions"""
        hls_output_dir = os.path.join(self.hls_dir, video_id)
        os.makedirs(hls_output_dir, exist_ok=True)
        
        playlist_path = os.path.join(hls_output_dir, "playlist.m3u8")
        
        # FFmpeg command for HLS conversion with adaptive bitrate
        cmd = [
            "ffmpeg", "-i", input_path,
            "-preset", "fast",
            "-g", "48",
            "-sc_threshold", "0",
            "-s:v:0", "1920x1080", "-b:v:0", "5000k",
            "-s:v:1", "1280x720", "-b:v:1", "2800k",
            "-s:v:2", "854x480", "-b:v:2", "1400k",
            "-map", "0:v:0", "-map", "0:v:0", "-map", "0:v:0",
            "-c:v", "libx264",
            "-keyint_min", "48",
            "-hls_time", "4",
            "-hls_playlist_type", "vod",
            "-hls_segment_filename", os.path.join(hls_output_dir, "stream_%v_%03d.ts"),
            "-master_pl_name", "playlist.m3u8",
            "-f", "hls",
            playlist_path
        ]
        
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            
            # Generate thumbnail
            thumbnail_path = os.path.join(hls_output_dir, "thumbnail.jpg")
            thumb_cmd = [
                "ffmpeg", "-i", input_path,
                "-ss", "00:00:02",
                "-vframes", "1",
                "-q:v", "2",
                thumbnail_path
            ]
            subprocess.run(thumb_cmd, check=True, capture_output=True)
            
            # Update status to ready (in real app, update DB)
            print(f"Video {video_id} processed successfully")
            
        except subprocess.CalledProcessError as e:
            print(f"Video processing failed: {e.stderr.decode()}")
            raise HTTPException(status_code=500, detail="Video processing failed")
    
    def get_video(self, video_id: str) -> Optional[VideoInfo]:
        """Get video info by ID"""
        hls_dir = os.path.join(self.hls_dir, video_id)
        if not os.path.exists(hls_dir):
            return None
        
        # In real app, fetch from DB
        return VideoInfo(
            id=video_id,
            title="Sample Video",
            duration=0.0,
            resolution="1920x1080",
            status="ready",
            hls_url=f"/static/hls/{video_id}/playlist.m3u8",
            thumbnail_url=f"/static/hls/{video_id}/thumbnail.jpg"
        )
    
    def list_videos(self) -> List[VideoInfo]:
        """List all processed videos"""
        videos = []
        if not os.path.exists(self.hls_dir):
            return videos
        
        for video_id in os.listdir(self.hls_dir):
            video_path = os.path.join(self.hls_dir, video_id)
            if os.path.isdir(video_path):
                video = self.get_video(video_id)
                if video:
                    videos.append(video)
        
        return videos

# Singleton instance
video_service = VideoService()
