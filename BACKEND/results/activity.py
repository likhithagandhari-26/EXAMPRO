"""
Student activity log (feeds the History page).

Each document in the "activities" collection is one event:

{
    "student_id":       "12",
    "student_email":    "harshitha@example.com",
    "exam_id":          "6a8ff89ec3ee6d003df6da99",
    "exam_title":       "DBMS",
    "subject":          "Database management system",
    "activity_type":    "started" | "resumed" | "submitted" | "auto_submitted"
                        | "interrupted" | "missed",
    "activity_at":      datetime (UTC),
    "duration_seconds": int | None,
    "description":      str,
    "status":           "In Progress" | "Completed" | ...
}
"""

import logging
from datetime import datetime, timezone as dt_timezone

from exams.mongodb import results_collection

logger = logging.getLogger(__name__)

# Uses the same database as results, so no extra connection settings are needed.
activities_collection = results_collection.database["activities"]

FINISHED_TYPES = ("submitted", "auto_submitted")

# Opening the attempt page twice within this many seconds counts as one event
# (page refreshes should not flood the history with "resumed" entries).
RESUME_DEBOUNCE_SECONDS = 30


def _now():
    return datetime.now(dt_timezone.utc)


def _aware(value):
    """Mongo returns naive UTC datetimes; make them timezone-aware."""
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=dt_timezone.utc)
    return value


def _safe_seconds(value):
    try:
        seconds = int(float(value))
        return seconds if seconds >= 0 else None
    except (TypeError, ValueError):
        return None


def log_activity(
    student_id,
    student_email,
    exam_id,
    exam_title,
    subject,
    activity_type,
    duration_seconds=None,
    description="",
    activity_at=None,
):
    """
    Save one activity event. Never raises: a logging problem must not
    break loading or submitting an exam.
    """
    try:
        if activity_type in FINISHED_TYPES:
            status = "Completed"
        elif activity_type in ("interrupted", "missed"):
            status = activity_type.capitalize()
        else:
            status = "In Progress"

        activities_collection.insert_one({
            "student_id": student_id,
            "student_email": student_email,
            "exam_id": str(exam_id),
            "exam_title": exam_title or "Exam",
            "subject": subject or "General",
            "activity_type": activity_type,
            "activity_at": activity_at or _now(),
            "duration_seconds": _safe_seconds(duration_seconds),
            "description": description,
            "status": status,
        })
    except Exception:
        logger.exception("Could not log activity")


def log_attempt_open(student_id, student_email, exam):
    """
    Called when a student opens the exam attempt page.

    - first time, or after a finished attempt -> "started"
    - while an attempt is still open          -> "resumed"
      (ignored if it happens within RESUME_DEBOUNCE_SECONDS of the last event)
    """
    try:
        exam_id = str(exam["_id"])

        last = activities_collection.find_one(
            {"student_id": student_id, "exam_id": exam_id},
            sort=[("activity_at", -1)],
        )

        if last is None or last.get("activity_type") in FINISHED_TYPES:
            activity_type = "started"
            description = "Exam attempt started."
        else:
            age = (_now() - _aware(last["activity_at"])).total_seconds()
            if age < RESUME_DEBOUNCE_SECONDS:
                return
            activity_type = "resumed"
            description = "Exam attempt resumed."

        log_activity(
            student_id=student_id,
            student_email=student_email,
            exam_id=exam_id,
            exam_title=exam.get("title"),
            subject=exam.get("subject"),
            activity_type=activity_type,
            description=description,
        )
    except Exception:
        logger.exception("Could not log attempt open")


def backfill_submissions(student_id):
    """
    Create "submitted" events for results saved before the activity log
    existed, so History matches Results. Safe to call repeatedly.
    """
    try:
        done = {
            a["exam_id"]
            for a in activities_collection.find(
                {"student_id": student_id, "activity_type": {"$in": list(FINISHED_TYPES)}},
                {"exam_id": 1},
            )
        }

        for r in results_collection.find({"student_id": student_id}):
            exam_id = str(r.get("exam_id", ""))
            if not exam_id or exam_id in done:
                continue

            log_activity(
                student_id=student_id,
                student_email=r.get("student_email"),
                exam_id=exam_id,
                exam_title=r.get("exam_title"),
                subject=r.get("subject"),
                activity_type="submitted",
                duration_seconds=r.get("time_taken_seconds"),
                description="Exam submitted.",
                activity_at=r.get("submitted_at"),
            )
    except Exception:
        logger.exception("Could not backfill submissions")