from .models import set_current_company


class TenantMiddleware:
    """
    Reads company_id from the JWT payload (injected by CustomTokenObtainPairSerializer)
    and stores it in thread-local so TenantManager can auto-filter.
    Super Admins (is_super_admin=True in token) bypass isolation.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        company = None

        payload = self._jwt_payload(request)
        if payload:
            is_super_admin = payload.get("is_super_admin", False)
            if not is_super_admin:
                company_id = payload.get("company_id")
                if company_id:
                    try:
                        from apps.companies.models import Company
                        company = Company.objects.get(pk=company_id, is_active=True)
                    except Company.DoesNotExist:
                        pass

        set_current_company(company)
        response = self.get_response(request)
        set_current_company(None)
        return response

    def _jwt_payload(self, request):
        try:
            from rest_framework_simplejwt.authentication import JWTAuthentication

            jwt_auth = JWTAuthentication()
            header = jwt_auth.get_header(request)
            if not header:
                return None
            raw_token = jwt_auth.get_raw_token(header)
            if not raw_token:
                return None
            return jwt_auth.get_validated_token(raw_token).payload
        except Exception:
            return None
