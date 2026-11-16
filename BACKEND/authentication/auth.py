"""
Token authentication and role permissions.

Your login views create tokens with RefreshToken() and put the user's details
in custom claims (email, name, role). They do not create Django users, so
simplejwt's default JWTAuthentication cannot be used (it looks the user up in
the Django database). This class verifies the token signature and expiry,
then builds a small user object from the claims.
"""

from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import BasePermission
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken


class TokenUser:
    """Lightweight stand-in for request.user, built from the JWT claims."""

    is_authenticated = True
    is_anonymous = False

    def __init__(self, payload):
        self.role = payload.get("role")
        self.email = payload.get("email", "")
        self.name = payload.get("name", "")
        self.username = payload.get("username", "")
        self.pk = self.email or self.username
        self.id = self.pk

    def __str__(self):
        return self.email or self.username or "user"


class MongoJWTAuthentication(BaseAuthentication):
    """Reads 'Authorization: Bearer <access token>'."""

    def authenticate(self, request):
        header = get_authorization_header(request).split()

        # No token sent: let the view's permission classes decide.
        if not header or header[0].lower() != b"bearer":
            return None

        if len(header) != 2:
            raise AuthenticationFailed("Invalid Authorization header.")

        try:
            token = AccessToken(header[1].decode())
        except (TokenError, UnicodeError):
            raise AuthenticationFailed("Invalid or expired token.")

        return (TokenUser(token.payload), token)

    def authenticate_header(self, request):
        # makes DRF answer 401 (not 403) when the token is missing/invalid
        return 'Bearer realm="api"'


# ==================================
# ROLE PERMISSIONS
# ==================================

def _role(request):
    return getattr(request.user, "role", None)


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return _role(request) == "student"


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return _role(request) == "admin"


class IsStudentOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return _role(request) in ("student", "admin")