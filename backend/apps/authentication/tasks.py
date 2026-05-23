from celery import shared_task
from django.core.mail import send_mail
from django.contrib.auth import get_user_model

User = get_user_model()


@shared_task(name="auth.send_password_reset_email")
def send_password_reset_email(email: str):
    try:
        user = User.objects.get(email=email)
        send_mail(
            subject="Reset your HRMS password",
            message="Use the link below to reset your password.",
            from_email=None,
            recipient_list=[user.email],
        )
    except User.DoesNotExist:
        pass


@shared_task(name="auth.send_welcome_email")
def send_welcome_email(user_id: int):
    try:
        user = User.objects.get(pk=user_id)
        send_mail(
            subject=f"Welcome to {user.company.name} HRMS",
            message=f"Hi {user.first_name}, your account has been created.",
            from_email=None,
            recipient_list=[user.email],
        )
    except User.DoesNotExist:
        pass
