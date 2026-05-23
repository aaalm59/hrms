from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """JWT payload includes company_id and role for multi-tenant routing."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        token["full_name"] = user.get_full_name()
        token["is_super_admin"] = user.is_super_admin
        token["company_id"] = user.company_id
        token["company_name"] = user.company.name if user.company else None
        token["roles"] = list(user.roles.values_list("role__name", flat=True))
        return token


class UserSerializer(serializers.ModelSerializer):
    primary_role = serializers.ReadOnlyField()
    company_name = serializers.CharField(source="company.name", read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "username", "first_name", "last_name",
            "phone", "avatar", "status", "is_super_admin",
            "company", "company_name", "primary_role",
            "is_mfa_enabled", "date_joined",
        ]
        read_only_fields = ["id", "is_super_admin", "date_joined"]


class CreateCompanyUserSerializer(serializers.ModelSerializer):
    """Super Admin creates a company admin user."""
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "phone", "company", "password"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.username = validated_data["email"]
        user.set_password(password)
        user.save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8)
