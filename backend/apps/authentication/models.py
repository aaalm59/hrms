from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        SUSPENDED = "suspended", "Suspended"

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    # Multi-tenant: null for Super Admin, set for company users
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="users",
        db_index=True,
    )
    is_super_admin = models.BooleanField(default=False)

    # MFA
    is_mfa_enabled = models.BooleanField(default=False)
    mfa_secret = models.CharField(max_length=32, blank=True)

    # Security tracking
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    last_login_device = models.CharField(max_length=255, blank=True)
    failed_login_attempts = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "auth_users"
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return self.email

    def has_role(self, role_name: str) -> bool:
        return self.roles.filter(role__name=role_name).exists()

    @property
    def primary_role(self):
        user_role = self.roles.select_related("role").first()
        return user_role.role.name if user_role else None


class OTPVerification(models.Model):
    class Purpose(models.TextChoices):
        LOGIN = "login", "Login"
        FORGOT_PASSWORD = "forgot_password", "Forgot Password"
        MFA_SETUP = "mfa_setup", "MFA Setup"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="otps")
    otp = models.CharField(max_length=6)
    purpose = models.CharField(max_length=30, choices=Purpose.choices)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "auth_otp_verifications"
