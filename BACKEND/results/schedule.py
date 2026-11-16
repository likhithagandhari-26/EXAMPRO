"""
Exam scheduling rules.

Exams store their schedule as:
    exam_date  "YYYY-MM-DD"            (older exams may hold other formats)
    exam_time  "HH:MM" or None         (optional start time, 24-hour)

Everything here works on naive *local* datetimes. Set TIME_ZONE in settings.py
(for example TIME_ZONE = "Asia/Kolkata") so "now" is the students' local time.
"""

import re
from datetime import date, datetime, time

from django.utils import timezone


# ---------------------------------------------------------------
# parsing
# ---------------------------------------------------------------
def _parse_date_text(text):
    text = text.strip()

    match = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})", text)          # 2026-12-01...
    if match:
        return _safe_date(int(match[1]), int(match[2]), int(match[3]))

    match = re.match(r"^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})", text)   # 01-12-2026
    if match:
        return _safe_date(int(match[3]), int(match[2]), int(match[1]))

    return None


def _safe_date(year, month, day):
    try:
        return date(year, month, day)
    except ValueError:
        return None


def parse_date(value):
    """Return a date from a date, datetime or text value, else None."""
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str) and value.strip():
        return _parse_date_text(value)
    return None


def parse_time(value):
    """Return a time from '9:30', '09:30', '09:30:00', '9:30 PM' (or a datetime), else None."""
    if isinstance(value, datetime):
        return value.time().replace(second=0, microsecond=0)
    if isinstance(value, time):
        return value.replace(second=0, microsecond=0)
    if not isinstance(value, str) or not value.strip():
        return None

    match = re.search(r"(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?", value)
    if not match:
        return None

    hour, minute, meridiem = int(match[1]), int(match[2]), match[3]

    if meridiem:
        meridiem = meridiem.lower()
        if hour == 12:
            hour = 0
        if meridiem == "pm":
            hour += 12

    if hour > 23 or minute > 59:
        return None
    return time(hour, minute)


def normalize_date(value):
    """'YYYY-MM-DD' if the value can be understood, otherwise the value unchanged."""
    parsed = parse_date(value)
    return parsed.isoformat() if parsed else value


def normalize_time(value):
    """'HH:MM' if the value can be understood, otherwise None."""
    parsed = parse_time(value)
    return parsed.strftime("%H:%M") if parsed else None


def split_exam_date(value):
    """
    Accepts a date, or a datetime-local style text ('2026-12-01T10:30').
    Returns (normalized_date, time_found_inside_or_None).
    """
    inside_time = None
    if isinstance(value, str) and re.search(r"[T ]\d{1,2}:\d{2}", value):
        inside_time = normalize_time(value.split("T")[-1] if "T" in value else value.split(" ")[-1])
    return normalize_date(value), inside_time


# ---------------------------------------------------------------
# schedule rules
# ---------------------------------------------------------------
def now_local():
    """Current local time as a naive datetime."""
    current = timezone.now()
    if timezone.is_aware(current):
        current = timezone.localtime(current)
    return current.replace(tzinfo=None)


def exam_start(exam):
    """Return (start_datetime, has_time). start_datetime is None if the exam has no date."""
    day = parse_date(exam.get("exam_date"))
    if day is None:
        return None, False

    start_time = parse_time(exam.get("exam_time"))
    if start_time is None:
        return datetime.combine(day, time.min), False

    return datetime.combine(day, start_time), True


def can_start(exam, now=None):
    """
    May a student open this exam now?
    No date set          -> yes (nothing to wait for)
    Date only            -> from the start of that day
    Date and time        -> from that time
    """
    now = now or now_local()
    start, has_time = exam_start(exam)

    if start is None:
        return True
    if has_time:
        return now >= start
    return now.date() >= start.date()


def schedule_status(exam, attempted, now=None):
    """completed | today | upcoming | missed | unscheduled"""
    if attempted:
        return "completed"

    now = now or now_local()
    start, _ = exam_start(exam)

    if start is None:
        return "unscheduled"
    if start.date() > now.date():
        return "upcoming"
    if start.date() == now.date():
        return "today"
    return "missed"


def starts_at_text(exam):
    """ISO text for the start: 'YYYY-MM-DDTHH:MM' with a time, 'YYYY-MM-DD' without."""
    start, has_time = exam_start(exam)
    if start is None:
        return None
    return start.strftime("%Y-%m-%dT%H:%M") if has_time else start.strftime("%Y-%m-%d")