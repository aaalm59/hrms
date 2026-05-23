from rest_framework.views import exception_handler
from rest_framework import status


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        response.data = {
            "success": False,
            "status_code": response.status_code,
            "errors": response.data,
            "message": _extract_message(response.data),
        }

    return response


def _extract_message(data):
    if isinstance(data, list):
        return data[0] if data else "An error occurred."
    if isinstance(data, dict):
        for val in data.values():
            return _extract_message(val)
    return str(data)
