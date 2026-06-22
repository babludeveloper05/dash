"""
SMS 2FA Router - API endpoints for SMS-based Two-Factor Authentication
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import User
from routers.auth import get_current_user
from services.sms_2fa import sms_2fa_service

router = APIRouter(prefix="/auth/2fa", tags=["auth", "2fa"])

class SendOTPRequest(BaseModel):
    phone_number: str = Field(..., min_length=10, max_length=15)

class VerifyOTPRequest(BaseModel):
    phone_number: str
    otp: str = Field(..., min_length=6, max_length=6)

class ResendOTPRequest(BaseModel):
    phone_number: str

class OTPStatusResponse(BaseModel):
    exists: bool
    verified: Optional[bool] = None
    expired: Optional[bool] = None
    attempts_remaining: Optional[int] = None
    expires_in_seconds: Optional[float] = None

@router.post("/send-otp", response_model=dict)
async def send_otp(
    request: SendOTPRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send OTP to user's phone number for 2FA
    This should be called after login but before granting full access
    """
    try:
        otp = sms_2fa_service.create_otp(current_user.id, request.phone_number)
        
        # In production, integrate with SMS provider (Twilio, AWS SNS, etc.)
        # For now, OTP is logged to console
        
        return {
            "success": True,
            "message": "OTP sent successfully",
            "phone_number": request.phone_number[-4:].rjust(len(request.phone_number), '*'),
            "expires_in_minutes": 5
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {str(e)}")

@router.post("/verify-otp", response_model=dict)
async def verify_otp(
    request: VerifyOTPRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify OTP submitted by user
    Returns success if OTP is valid and not expired
    """
    success = sms_2fa_service.verify_otp(
        current_user.id,
        request.phone_number,
        request.otp
    )
    
    if success:
        # Mark user as 2FA verified in session/database
        # This is a placeholder - implement based on your session management
        return {
            "success": True,
            "message": "2FA verification successful",
            "verified": True
        }
    else:
        # Check status to provide helpful error message
        status = sms_2fa_service.get_otp_status(current_user.id, request.phone_number)
        
        if not status["exists"]:
            raise HTTPException(status_code=400, detail="No OTP found. Please request a new one.")
        elif status["expired"]:
            raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
        elif status["attempts_remaining"] == 0:
            raise HTTPException(status_code=400, detail="Maximum attempts exceeded. Please request a new OTP.")
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid OTP. {status['attempts_remaining']} attempts remaining."
            )

@router.post("/resend-otp", response_model=dict)
async def resend_otp(
    request: ResendOTPRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Resend OTP to user's phone number
    Can only be done if previous OTP hasn't been verified
    """
    status = sms_2fa_service.get_otp_status(current_user.id, request.phone_number)
    
    if status["exists"] and status.get("verified"):
        raise HTTPException(status_code=400, detail="OTP already verified. Cannot resend.")
    
    otp = sms_2fa_service.resend_otp(current_user.id, request.phone_number)
    
    if otp:
        return {
            "success": True,
            "message": "New OTP sent successfully",
            "phone_number": request.phone_number[-4:].rjust(len(request.phone_number), '*'),
            "expires_in_minutes": 5
        }
    else:
        # Create new OTP if none exists
        sms_2fa_service.create_otp(current_user.id, request.phone_number)
        return {
            "success": True,
            "message": "New OTP sent successfully",
            "phone_number": request.phone_number[-4:].rjust(len(request.phone_number), '*'),
            "expires_in_minutes": 5
        }

@router.get("/status", response_model=OTPStatusResponse)
async def get_otp_status(
    phone_number: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get current OTP status for a user
    Useful for UI to show countdown timer and attempt info
    """
    status = sms_2fa_service.get_otp_status(current_user.id, phone_number)
    
    if not status["exists"]:
        return OTPStatusResponse(exists=False)
    
    return OTPStatusResponse(
        exists=True,
        verified=status["verified"],
        expired=status["expired"],
        attempts_remaining=status["attempts_remaining"],
        expires_in_seconds=status["expires_in_seconds"]
    )

@router.post("/enable", response_model=dict)
async def enable_2fa(
    request: SendOTPRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Enable 2FA for user account
    Sends OTP and marks account as requiring 2FA on future logins
    """
    # Send OTP
    otp = sms_2fa_service.create_otp(current_user.id, request.phone_number)
    
    # In production, update user record to enable 2FA requirement
    # current_user.two_factor_enabled = True
    # current_user.phone_number = request.phone_number
    # db.commit()
    
    return {
        "success": True,
        "message": "2FA setup initiated. Please verify the OTP sent to your phone.",
        "phone_number": request.phone_number[-4:].rjust(len(request.phone_number), '*'),
        "next_step": "verify-otp"
    }

@router.post("/disable", response_model=dict)
async def disable_2fa(
    request: VerifyOTPRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disable 2FA for user account
    Requires OTP verification to confirm identity
    """
    # Verify OTP first
    success = sms_2fa_service.verify_otp(
        current_user.id,
        request.phone_number,
        request.otp
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="OTP verification failed")
    
    # In production, update user record to disable 2FA
    # current_user.two_factor_enabled = False
    # current_user.phone_number = None
    # db.commit()
    
    return {
        "success": True,
        "message": "2FA disabled successfully"
    }
