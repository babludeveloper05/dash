"""
Email service for password reset and verification.
Uses FastAPI-Mail with SMTP configuration.
Supports both development (console backend) and production (SMTP).
"""
import os
from typing import Optional
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr


# Email configuration
MAIL_USERNAME = os.environ.get("MAIL_USERNAME", "")
MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD", "")
MAIL_FROM = os.environ.get("MAIL_FROM", "noreply@projectdelta.dev")
MAIL_PORT = int(os.environ.get("MAIL_PORT", "587"))
MAIL_SERVER = os.environ.get("MAIL_SERVER", "smtp.gmail.com")
MAIL_TLS = os.environ.get("MAIL_TLS", "true").lower() == "true"
MAIL_SSL = os.environ.get("MAIL_SSL", "false").lower() == "true"
USE_CREDENTIALS = bool(MAIL_USERNAME and MAIL_PASSWORD)

# For development: if no SMTP creds, use fake backend
conf = ConnectionConfig(
    MAIL_USERNAME=MAIL_USERNAME,
    MAIL_PASSWORD=MAIL_PASSWORD,
    MAIL_FROM=MAIL_FROM,
    MAIL_PORT=MAIL_PORT,
    MAIL_SERVER=MAIL_SERVER,
    MAIL_STARTTLS=MAIL_TLS,
    MAIL_SSL_TLS=MAIL_SSL,
    USE_CREDENTIALS=USE_CREDENTIALS,
    # In dev without credentials, emails are printed to console
    SUPPRESS_SEND=not USE_CREDENTIALS,
)

fm = FastMail(conf)


async def send_password_reset_email(email: str, username: str, reset_token: str, frontend_url: str):
    """Send password reset email with secure token link."""
    reset_link = f"{frontend_url}/auth/reset-password?token={reset_token}"
    
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4F46E5;">Password Reset Request</h2>
            <p>Hello {username},</p>
            <p>We received a request to reset your password for your Project Delta account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}" 
                   style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Reset Password
                </a>
            </div>
            <p>Or copy this link to your browser:</p>
            <p style="word-break: break-all; color: #4F46E5;">{reset_link}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 14px;">
                This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.
            </p>
            <p style="color: #999; font-size: 12px;">
                Project Delta Team<br>
                Do not reply to this email.
            </p>
        </div>
    </body>
    </html>
    """
    
    message = MessageSchema(
        subject="🔐 Reset Your Project Delta Password",
        recipients=[email],
        body=html,
        subtype=MessageType.html
    )
    
    await fm.send_message(message)
    return True


async def send_verification_email(email: str, username: str, verification_token: str, frontend_url: str):
    """Send email verification link."""
    verification_link = f"{frontend_url}/auth/verify-email?token={verification_token}"
    
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #10B981;">Verify Your Email</h2>
            <p>Welcome to Project Delta, {username}!</p>
            <p>Please verify your email address to activate your account.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{verification_link}" 
                   style="background-color: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Verify Email
                </a>
            </div>
            <p>Or copy this link to your browser:</p>
            <p style="word-break: break-all; color: #10B981;">{verification_link}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 14px;">
                This link expires in 24 hours.
            </p>
            <p style="color: #999; font-size: 12px;">
                Project Delta Team<br>
                Do not reply to this email.
            </p>
        </div>
    </body>
    </html>
    """
    
    message = MessageSchema(
        subject="✅ Verify Your Project Delta Email",
        recipients=[email],
        body=html,
        subtype=MessageType.html
    )
    
    await fm.send_message(message)
    return True


async def send_welcome_email(email: str, username: str):
    """Send welcome email after successful registration."""
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4F46E5;">Welcome to Project Delta! 🎉</h2>
            <p>Hi {username},</p>
            <p>Your account has been successfully created. You're now ready to start your learning journey!</p>
            <h3>Getting Started:</h3>
            <ul>
                <li>📚 Browse our course library</li>
                <li>🎯 Set up your personalized dashboard</li>
                <li>🤖 Ask AI doubts anytime</li>
                <li>📝 Take practice tests</li>
            </ul>
            <p style="text-align: center; margin: 30px 0;">
                <a href="{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}" 
                   style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Go to Dashboard
                </a>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
                Project Delta Team<br>
                Empowering your learning journey.
            </p>
        </div>
    </body>
    </html>
    """
    
    message = MessageSchema(
        subject="🎉 Welcome to Project Delta!",
        recipients=[email],
        body=html,
        subtype=MessageType.html
    )
    
    await fm.send_message(message)
    return True
