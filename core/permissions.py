from rest_framework import permissions

class SharedPasswordPermission(permissions.BasePermission):
    """
    Custom permission to require a shared password header for unsafe methods.
    """

    def has_permission(self, request, view):
        # Safe methods (GET, HEAD, OPTIONS) are allowed publicly (Viewer role)
        if request.method in permissions.SAFE_METHODS:
            return True

        # Unsafe methods require the password header
        password = request.headers.get('X-Shared-Password')
        # Also check body if needed, but header is standard
        REQUIRED_PASSWORD = "05HozaifaIsTheBest05"

        return password == REQUIRED_PASSWORD
