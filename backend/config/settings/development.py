from .base import *  # noqa

DEBUG = True
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Use dummy throttling in dev so Redis connection error doesn't break API
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []  # noqa
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {}  # noqa

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django.db.backends": {"level": "WARNING"},
    },
}
