import logging

from bson import ObjectId
from bson.errors import InvalidId

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from authentication.auth import IsAdminRole, IsStudentOrAdmin

from results.mongo import attempted_exam_ids
from results.activity import log_attempt_open
from results.schedule import (
    can_start,
    exam_start,
    normalize_date,
    normalize_time,
    now_local,
    split_exam_date,
)

from .mongodb import exams_collection

logger = logging.getLogger(__name__)

BAD_ID = {"error": "Invalid Exam ID"}
NOT_FOUND = {"error": "Exam not found"}

TEXT_FIELDS = ["title", "subject", "exam_date", "status", "instructions"]
# exam_time ("HH:MM", optional) is handled separately so it can be validated
BOOL_FIELDS = [
    "negative_marking",
    "shuffle_questions",
    "shuffle_options",
    "show_results",
    "ai_proctoring",
]


# ==================================
# HELPERS
# ==================================

def _oid(value):
    """Turn a string into an ObjectId, or None if it is not valid."""
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        return None


def _is_admin(request):
    return getattr(request.user, "role", None) == "admin"


def _to_int(value):
    """'' / None / 'null' -> None, otherwise int (ValueError if not a number)."""
    if value in (None, "", "null"):
        return None
    return int(value)


def _safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _valid_answer(value):
    answer = str(value or "").strip().upper()
    return answer if answer in ("A", "B", "C", "D") else None


def _sync_totals(exam_oid):
    """Recalculate total_questions and total_marks from the questions."""
    exam = exams_collection.find_one({"_id": exam_oid}, {"questions": 1})
    if not exam:
        return

    questions = exam.get("questions", [])

    exams_collection.update_one(
        {"_id": exam_oid},
        {"$set": {
            "total_questions": len(questions),
            "total_marks": sum(_safe_int(q.get("marks"), 1) for q in questions),
        }}
    )


def sync_all_totals():
    """One-off: fix total_questions / total_marks on existing exams."""
    count = 0
    for exam in exams_collection.find({}, {"_id": 1}):
        _sync_totals(exam["_id"])
        count += 1
    return count


def _public_questions(exam):
    """Questions WITHOUT correct_answer, safe to send to students."""
    return [
        {
            "question_id": q.get("question_id"),
            "question": q.get("question"),
            "options": [
                q.get("option_a", ""),
                q.get("option_b", ""),
                q.get("option_c", ""),
                q.get("option_d", ""),
            ],
            "marks": q.get("marks", 1),
        }
        for q in exam.get("questions", [])
    ]


def _exam_summary(exam):
    """What a student sees in the exam list: no questions, no answers."""
    questions = exam.get("questions", [])

    total_marks = exam.get("total_marks")
    if total_marks is None:
        total_marks = sum(_safe_int(q.get("marks"), 1) for q in questions)

    return {
        "_id": str(exam["_id"]),
        "title": exam.get("title"),
        "subject": exam.get("subject"),
        "exam_date": exam.get("exam_date"),
        "exam_time": exam.get("exam_time"),
        "duration": exam.get("duration"),
        "total_marks": total_marks,
        "total_questions": len(questions),
        "status": exam.get("status"),
    }


# ==================================
# CREATE EXAM  (admin)
# ==================================

@api_view(["POST"])
@permission_classes([IsAdminRole])
def create_exam(request):

    data = request.data

    title = (data.get("title") or "").strip()
    if not title:
        return Response(
            {"success": False, "message": "Title is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        duration = _to_int(data.get("duration"))
    except ValueError:
        return Response(
            {"success": False, "message": "Duration must be a number"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Store the date as YYYY-MM-DD and the start time as HH:MM. A combined value
    # such as "2026-12-01T10:30" is split into both.
    exam_date, time_in_date = split_exam_date(data.get("exam_date"))
    exam_time = normalize_time(data.get("exam_time")) or time_in_date

    exam = {
        "title": title,
        "subject": (data.get("subject") or "").strip(),
        "exam_date": exam_date,
        "exam_time": exam_time,
        "duration": duration,
        # totals are calculated from the questions
        "total_marks": 0,
        "total_questions": 0,
        "instructions": data.get("instructions", ""),
        "status": data.get("status", "Draft"),

        "negative_marking": data.get("negative_marking", False),
        "shuffle_questions": data.get("shuffle_questions", False),
        "shuffle_options": data.get("shuffle_options", False),
        "show_results": data.get("show_results", True),
        "ai_proctoring": data.get("ai_proctoring", False),

        "questions": []
    }

    result = exams_collection.insert_one(exam)

    return Response({
        "success": True,
        "message": "Exam created successfully",
        "exam_id": str(result.inserted_id)
    })


# ==================================
# GET ALL EXAMS
# admin   -> every exam, full details (as before)
# student -> Published exams only, no questions, no answers,
# plus "attempted" = true once this student has submitted the exam
# ==================================

@api_view(["GET"])
@permission_classes([IsStudentOrAdmin])
def get_exams(request):

    if _is_admin(request):

        exams = []

        for exam in exams_collection.find():
            exam["_id"] = str(exam["_id"])
            exams.append(exam)

        return Response(exams)

    # Results are saved with a lower-cased email, so look it up the same way.
    done = set(attempted_exam_ids((getattr(request.user, "email", "") or "").strip().lower()))
    exams = []

    for exam in exams_collection.find({"status": "Published"}):
        summary = _exam_summary(exam)
        summary["attempted"] = summary["_id"] in done
        exams.append(summary)

    return Response(exams)


# ==================================
# GET SINGLE EXAM  (questions without answers)
# ==================================

@api_view(["GET"])
@permission_classes([IsStudentOrAdmin])
def get_exam(request, exam_id):

    oid = _oid(exam_id)
    if oid is None:
        return Response(BAD_ID, status=status.HTTP_400_BAD_REQUEST)

    exam = exams_collection.find_one({"_id": oid})

    # students can only open Published exams
    if not exam or (not _is_admin(request) and exam.get("status") != "Published"):
        return Response(NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

    return Response({
        "_id": str(exam["_id"]),
        "title": exam.get("title"),
        "subject": exam.get("subject"),
        "duration": exam.get("duration"),
        "total_marks": exam.get("total_marks"),
        "total_questions": len(exam.get("questions", [])),
        "exam_date": exam.get("exam_date"),
        "exam_time": exam.get("exam_time"),
        "status": exam.get("status"),
        "instructions": exam.get("instructions"),
        # settings, so the admin edit form can show what was saved
        "negative_marking": exam.get("negative_marking", False),
        "shuffle_questions": exam.get("shuffle_questions", False),
        "shuffle_options": exam.get("shuffle_options", False),
        "show_results": exam.get("show_results", True),
        "ai_proctoring": exam.get("ai_proctoring", False),
        "questions": _public_questions(exam),
    })


# ==================================
# GET EXAM FOR ATTEMPT
# ==================================

@api_view(["GET"])
@permission_classes([IsStudentOrAdmin])
def get_exam_for_attempt(request, exam_id):

    oid = _oid(exam_id)
    if oid is None:
        return Response(BAD_ID, status=status.HTTP_400_BAD_REQUEST)

    exam = exams_collection.find_one({"_id": oid})

    if not exam or (not _is_admin(request) and exam.get("status") != "Published"):
        return Response(NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

    # Students cannot open an exam before its scheduled date / time.
    if not _is_admin(request) and not can_start(exam, now_local()):
        start, has_time = exam_start(exam)
        return Response(
            {
                "error": "This exam is not available yet",
                "available_from": start.strftime("%Y-%m-%dT%H:%M") if has_time
                                  else start.strftime("%Y-%m-%d"),
            },
            status=status.HTTP_403_FORBIDDEN
        )

    # Record "started" / "resumed" for the student's History page (not for admin previews).
    if not _is_admin(request):
        log_attempt_open(
            str(request.user.pk),
            (getattr(request.user, "email", "") or "").strip().lower() or None,
            exam,
        )

    return Response({
        "exam_id": str(exam["_id"]),
        "title": exam.get("title"),
        "subject": exam.get("subject"),
        "duration": exam.get("duration"),
        "instructions": exam.get("instructions"),
        "questions": _public_questions(exam),
    })


# ==================================
# UPDATE EXAM  (admin)
# ==================================

@api_view(["PUT"])
@permission_classes([IsAdminRole])
def update_exam(request, exam_id):

    oid = _oid(exam_id)
    if oid is None:
        return Response(BAD_ID, status=status.HTTP_400_BAD_REQUEST)

    update_data = {}

    for field in TEXT_FIELDS:
        if field in request.data:
            update_data[field] = request.data[field]

    for field in BOOL_FIELDS:
        if field in request.data:
            update_data[field] = request.data[field]

    if "exam_date" in update_data:
        exam_date, time_in_date = split_exam_date(update_data["exam_date"])
        update_data["exam_date"] = exam_date
        if time_in_date and "exam_time" not in request.data:
            update_data["exam_time"] = time_in_date

    if "exam_time" in request.data:
        update_data["exam_time"] = normalize_time(request.data["exam_time"])

    if "duration" in request.data:
        try:
            update_data["duration"] = _to_int(request.data["duration"])
        except ValueError:
            return Response(
                {"error": "Duration must be a number"},
                status=status.HTTP_400_BAD_REQUEST
            )

    # total_questions / total_marks are calculated from the questions,
    # so they are not accepted here.

    if not update_data:
        return Response(
            {"error": "No fields provided for update"},
            status=status.HTTP_400_BAD_REQUEST
        )

    result = exams_collection.update_one({"_id": oid}, {"$set": update_data})

    if result.matched_count == 0:
        return Response(NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

    return Response({"message": "Exam Updated Successfully"})


# ==================================
# DELETE EXAM  (admin)
# ==================================

@api_view(["DELETE"])
@permission_classes([IsAdminRole])
def delete_exam(request, exam_id):

    oid = _oid(exam_id)
    if oid is None:
        return Response(BAD_ID, status=status.HTTP_400_BAD_REQUEST)

    result = exams_collection.delete_one({"_id": oid})

    if result.deleted_count == 0:
        return Response(NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

    return Response({"message": "Exam Deleted Successfully"})


# ==================================
# ADD QUESTION  (admin)
# ==================================

@api_view(["POST"])
@permission_classes([IsAdminRole])
def add_question(request, exam_id):

    oid = _oid(exam_id)
    if oid is None:
        return Response(BAD_ID, status=status.HTTP_400_BAD_REQUEST)

    if not exams_collection.find_one({"_id": oid}, {"_id": 1}):
        return Response(NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

    required = [
        "question", "option_a", "option_b",
        "option_c", "option_d", "correct_answer",
    ]
    missing = [f for f in required if not str(request.data.get(f) or "").strip()]

    if missing:
        return Response(
            {"error": f"Missing fields: {', '.join(missing)}"},
            status=status.HTTP_400_BAD_REQUEST
        )

    correct = _valid_answer(request.data.get("correct_answer"))
    if correct is None:
        return Response(
            {"error": "correct_answer must be A, B, C or D"},
            status=status.HTTP_400_BAD_REQUEST
        )

    marks = _safe_int(request.data.get("marks"), 1)
    if marks < 1:
        return Response(
            {"error": "Marks must be at least 1"},
            status=status.HTTP_400_BAD_REQUEST
        )

    question = {
        "question_id": str(ObjectId()),
        "question": request.data.get("question"),
        "option_a": request.data.get("option_a"),
        "option_b": request.data.get("option_b"),
        "option_c": request.data.get("option_c"),
        "option_d": request.data.get("option_d"),
        "correct_answer": correct,
        "marks": marks,
    }

    exams_collection.update_one({"_id": oid}, {"$push": {"questions": question}})
    _sync_totals(oid)

    return Response(
        {"message": "Question Added Successfully", "question": question},
        status=status.HTTP_201_CREATED
    )


# ==================================
# GET QUESTIONS  (admin: includes correct answers)
# ==================================

@api_view(["GET"])
@permission_classes([IsAdminRole])
def get_questions(request, exam_id):

    oid = _oid(exam_id)
    if oid is None:
        return Response(BAD_ID, status=status.HTTP_400_BAD_REQUEST)

    exam = exams_collection.find_one({"_id": oid})

    if not exam:
        return Response(NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

    return Response(exam.get("questions", []))


# ==================================
# UPDATE QUESTION  (admin)
# Only the fields you send are changed.
# ==================================

@api_view(["PUT"])
@permission_classes([IsAdminRole])
def update_question(request, exam_id, question_id):

    oid = _oid(exam_id)
    if oid is None:
        return Response(BAD_ID, status=status.HTTP_400_BAD_REQUEST)

    set_data = {}

    for key in ["question", "option_a", "option_b", "option_c", "option_d"]:
        if key in request.data:
            set_data[f"questions.$.{key}"] = request.data[key]

    if "correct_answer" in request.data:
        correct = _valid_answer(request.data["correct_answer"])
        if correct is None:
            return Response(
                {"error": "correct_answer must be A, B, C or D"},
                status=status.HTTP_400_BAD_REQUEST
            )
        set_data["questions.$.correct_answer"] = correct

    if "marks" in request.data:
        marks = _safe_int(request.data["marks"], 0)
        if marks < 1:
            return Response(
                {"error": "Marks must be at least 1"},
                status=status.HTTP_400_BAD_REQUEST
            )
        set_data["questions.$.marks"] = marks

    if not set_data:
        return Response(
            {"error": "No fields provided for update"},
            status=status.HTTP_400_BAD_REQUEST
        )

    result = exams_collection.update_one(
        {"_id": oid, "questions.question_id": question_id},
        {"$set": set_data}
    )

    if result.matched_count == 0:
        return Response(
            {"error": "Question not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    _sync_totals(oid)

    return Response({"message": "Question Updated Successfully"})


# ==================================
# DELETE QUESTION  (admin)
# ==================================

@api_view(["DELETE"])
@permission_classes([IsAdminRole])
def delete_question(request, exam_id, question_id):

    oid = _oid(exam_id)
    if oid is None:
        return Response(BAD_ID, status=status.HTTP_400_BAD_REQUEST)

    result = exams_collection.update_one(
        {"_id": oid},
        {"$pull": {"questions": {"question_id": question_id}}}
    )

    if result.modified_count == 0:
        return Response(
            {"error": "Question not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    _sync_totals(oid)

    return Response({"message": "Question Deleted Successfully"})


# ==================================
# PUBLISH EXAM  (admin)
# ==================================

@api_view(["PUT"])
@permission_classes([IsAdminRole])
def publish_exam(request, exam_id):

    oid = _oid(exam_id)
    if oid is None:
        return Response(BAD_ID, status=status.HTTP_400_BAD_REQUEST)

    exam = exams_collection.find_one({"_id": oid}, {"questions": 1})

    if not exam:
        return Response(NOT_FOUND, status=status.HTTP_404_NOT_FOUND)

    if not exam.get("questions"):
        return Response(
            {"error": "Add at least one question before publishing."},
            status=status.HTTP_400_BAD_REQUEST
        )

    exams_collection.update_one({"_id": oid}, {"$set": {"status": "Published"}})
    _sync_totals(oid)

    return Response({"message": "Exam Published Successfully"})