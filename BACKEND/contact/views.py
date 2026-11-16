import json
import logging

from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.mail import EmailMessage
from django.core.validators import validate_email
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .models import ContactMessage

logger = logging.getLogger(__name__)


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


@csrf_exempt
@require_POST
def contact_submit(request):
    # rate limit: max 5 messages per IP per hour
    ip = _client_ip(request)
    key = f"contact_rl:{ip}"
    cache.add(key, 0, 60 * 60)
    if cache.incr(key) > 5:
        return JsonResponse(
            {"error": "Too many messages. Please try again later."}, status=429
        )

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid request."}, status=400)

    # honeypot: real students never fill this hidden field
    if data.get("website"):
        return JsonResponse({"success": True}, status=201)

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    subject = (data.get("subject") or "").strip()
    message = (data.get("message") or "").strip()

    if not all([name, email, subject, message]):
        return JsonResponse({"error": "All fields are required."}, status=400)

    try:
        validate_email(email)
    except ValidationError:
        return JsonResponse({"error": "Invalid email address."}, status=400)

    if len(name) > 100 or len(subject) > 200 or len(message) > 2000:
        return JsonResponse({"error": "One of the fields is too long."}, status=400)

    # 1. save to database
    obj = ContactMessage.objects.create(
        name=name, email=email, subject=subject, message=message, ip_address=ip,
    )

    # 2. email admin / customer care (message is already saved if this fails)
    try:
        EmailMessage(
            subject=f"[Exam Pro] {subject}",
            body=f"From: {name} <{email}>\n\n{message}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[settings.CONTACT_RECEIVER_EMAIL],
            reply_to=[email],
        ).send()
    except Exception:
        logger.exception("Contact email failed for message id=%s", obj.id)

    return JsonResponse({"success": True, "id": obj.id}, status=201)