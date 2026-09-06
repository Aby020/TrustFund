"""Health check endpoint for Render's uptime/health monitoring.

Deliberately unauthenticated and free of DB/queries so a collapsed database
connection or a hung worker is still caught by the platform monitor — the probe
returns fast even under load.
"""
from django.http import JsonResponse


def health_check(request):
    return JsonResponse({'status': 'ok'})