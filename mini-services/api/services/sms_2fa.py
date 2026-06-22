"""
SMS 2FA Service - Two-Factor Authentication via SMS
Provides OTP generation, verification, and management
"""
import random
import string
from datetime import datetime, timedelta
from typing import Optional, Dict
from pydantic import BaseModel
import hashlib

class OTPRecord(BaseModel):
    user_id: int
    otp: str
    created_at: datetime
    expires_at: datetime
    attempts: int = 0
    verified: bool = False

class SMS2FAService:
    def __init__(self):
        # In-memory store for OTPs (in production, use Redis or database)
        self.otp_store: Dict[str, OTPRecord] = {}
        self.otp_length = 6
        self.expiry_minutes = 5
        self.max_attempts = 3
    
    def generate_otp(self) -> str:
        """Generate a random 6-digit OTP"""
        return ''.join(random.choices(string.digits, k=self.otp_length))
    
    def create_otp(self, user_id: int, phone_number: str) -> str:
        """Create a new OTP for a user"""
        otp = self.generate_otp()
        now = datetime.now()
        
        # Store OTP with phone number as key (in production, use user_id)
        key = f"{user_id}:{phone_number}"
        self.otp_store[key] = OTPRecord(
            user_id=user_id,
            otp=otp,
            created_at=now,
            expires_at=now + timedelta(minutes=self.expiry_minutes),
            attempts=0
        )
        
        # In production, send SMS here via Twilio/AWS SNS/etc.
        # For now, we'll just return the OTP (logging it for development)
        print(f"[SMS 2FA] OTP for {phone_number}: {otp}")
        
        return otp
    
    def verify_otp(self, user_id: int, phone_number: str, otp: str) -> bool:
        """Verify an OTP"""
        key = f"{user_id}:{phone_number}"
        
        if key not in self.otp_store:
            return False
        
        record = self.otp_store[key]
        
        # Check if already verified
        if record.verified:
            return False
        
        # Check if expired
        if datetime.now() > record.expires_at:
            del self.otp_store[key]
            return False
        
        # Check attempts
        if record.attempts >= self.max_attempts:
            del self.otp_store[key]
            return False
        
        # Verify OTP
        record.attempts += 1
        if record.otp == otp:
            record.verified = True
            return True
        
        return False
    
    def resend_otp(self, user_id: int, phone_number: str) -> Optional[str]:
        """Resend OTP (creates a new one)"""
        key = f"{user_id}:{phone_number}"
        
        # Can only resend if previous OTP exists and hasn't been verified
        if key in self.otp_store:
            record = self.otp_store[key]
            if record.verified:
                return None
        
        # Create new OTP
        return self.create_otp(user_id, phone_number)
    
    def cleanup_expired(self):
        """Remove expired OTPs"""
        now = datetime.now()
        expired_keys = [
            key for key, record in self.otp_store.items()
            if now > record.expires_at
        ]
        
        for key in expired_keys:
            del self.otp_store[key]
    
    def get_otp_status(self, user_id: int, phone_number: str) -> Dict:
        """Get status of OTP for a user"""
        key = f"{user_id}:{phone_number}"
        
        if key not in self.otp_store:
            return {"exists": False}
        
        record = self.otp_store[key]
        now = datetime.now()
        
        return {
            "exists": True,
            "verified": record.verified,
            "expired": now > record.expires_at,
            "attempts_remaining": max(0, self.max_attempts - record.attempts),
            "expires_in_seconds": max(0, (record.expires_at - now).total_seconds())
        }

# Global instance
sms_2fa_service = SMS2FAService()
