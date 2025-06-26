from typing import List, Dict, Any
from app.core.config import settings
# import aiosmtplib # For async SMTP, if using direct SMTP
# from email.mime.text import MIMEText
# from email.mime.multipart import MIMEMultipart

# Placeholder for a more robust email sending mechanism, possibly using a background task queue.

async def send_email(
    recipient_email: str,
    subject: str,
    html_content: str,
    # text_content: Optional[str] = None # For multipart emails
) -> bool:
    """
    Sends an email.
    This is a basic placeholder. A real implementation would use SMTP or an email API.
    """
    if not settings.SMTP_HOST or not settings.EMAILS_FROM_EMAIL:
        print(f"SMTP not configured. Email not sent to {recipient_email} with subject: {subject}")
        print(f"HTML Content:\n{html_content}")
        return False

    # message = MIMEMultipart("alternative")
    # message["Subject"] = subject
    # message["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    # message["To"] = recipient_email

    # if text_content:
    #     message.attach(MIMEText(text_content, "plain"))
    # message.attach(MIMEText(html_content, "html"))

    try:
        # Example with aiosmtplib (requires proper setup and error handling)
        # await aiosmtplib.send(
        #     message,
        #     hostname=settings.SMTP_HOST,
        #     port=settings.SMTP_PORT,
        #     username=settings.SMTP_USER,
        #     password=settings.SMTP_PASSWORD,
        #     use_tls=True # Or start_tls based on server config
        # )
        print(f"Simulating email sent to {recipient_email} with subject: {subject}")
        print(f"HTML Content:\n{html_content}") # For debugging in dev
        return True
    except Exception as e:
        print(f"Error sending email: {e}") # Replace with proper logging
        return False


async def send_verification_email_task(email_to: str, verification_token: str):
    """Sends email verification link."""
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - Verify your email"
    # TODO: Use a proper frontend URL from settings
    verification_link = f"http://localhost:3000/verify-email?token={verification_token}"

    html_content = f"""
    <html>
    <body>
        <p>Hi,</p>
        <p>Thanks for registering for {project_name}. Please verify your email address by clicking the link below:</p>
        <p><a href="{verification_link}">{verification_link}</a></p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Thanks,<br/>The {project_name} Team</p>
    </body>
    </html>
    """
    await send_email(recipient_email=email_to, subject=subject, html_content=html_content)


async def send_password_reset_email_task(email_to: str, reset_token: str):
    """Sends password reset link."""
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - Reset your password"
    # TODO: Use a proper frontend URL from settings
    reset_link = f"http://localhost:3000/reset-password?token={reset_token}"

    html_content = f"""
    <html>
    <body>
        <p>Hi,</p>
        <p>You requested a password reset for your {project_name} account. Click the link below to reset your password:</p>
        <p><a href="{reset_link}">{reset_link}</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
        <p>Thanks,<br/>The {project_name} Team</p>
    </body>
    </html>
    """
    await send_email(recipient_email=email_to, subject=subject, html_content=html_content)


async def send_mfa_code_email_task(email_to: str, mfa_code: str):
    """Sends MFA code via email (if email is used as an MFA factor)."""
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - Your Two-Factor Authentication Code"

    html_content = f"""
    <html>
    <body>
        <p>Hi,</p>
        <p>Your two-factor authentication code for {project_name} is: <strong>{mfa_code}</strong></p>
        <p>This code will expire in a few minutes.</p>
        <p>If you did not request this, please ignore this email or contact support.</p>
        <p>Thanks,<br/>The {project_name} Team</p>
    </body>
    </html>
    """
    await send_email(recipient_email=email_to, subject=subject, html_content=html_content)
