import os
from .base import *

# Production environment
DEBUG = False

# Production Security Headers
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "True").lower() == "true"
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Production Email (Django 6 MAILERS configuration)
MAILERS = {
    "default": {
        "BACKEND": os.getenv(
            "EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend"
        ),
        "HOST": os.getenv("EMAIL_HOST", "smtp.sendgrid.net"),
        "PORT": int(os.getenv("EMAIL_PORT", "587")),
        "USE_TLS": os.getenv("EMAIL_USE_TLS", "True").lower() == "true",
        "USERNAME": os.getenv("EMAIL_HOST_USER", ""),
        "PASSWORD": os.getenv("EMAIL_HOST_PASSWORD", ""),
    }
}
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "noreply@galla.store")

# If Cloudinary credentials are provided, ensure storage uses Cloudinary
if os.getenv("CLOUDINARY_CLOUD_NAME"):
    STORAGES["default"] = {
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
    }
