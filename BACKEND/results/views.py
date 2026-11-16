from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone

from exams.mongodb import exams_collection, results_collection
from .activity import (
    activities_collection,
    backfill_submissions,
    log_activity,
)


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------
def get_student_id(request):
    """Return the logged-in student's id as a string, or None."""
    user = getattr(request, "user", None)
    if user is not None and user.is_authenticated:
        return str(user.pk)
    return None


def get_student_email(request):
    """Return the logged-in student's email (lower-cased), or None."""
    user = getattr(request, "user", None)
    if user is not None and user.is_authenticated:
        email = getattr(user, "email", None)
        return email.strip().lower() if email else None
    return None


def _option_texts(options):
    """Turn an options list (strings or dicts) into a list of plain strings."""
    texts = []
    for opt in options or []:
        if isinstance(opt, dict):
            opt = (
                opt.get("text") or opt.get("option")
                or opt.get("label") or opt.get("value") or ""
            )
        texts.append(str(opt).strip())
    return texts


def _resolve_answer(value, options):
    """
    Reduce an answer to comparable text.
    - exact option text            -> that text
    - a single letter (A, B, C...) -> the option at that position
    - anything else                -> the value itself
    """
    text = str(value).strip()
    texts = _option_texts(options)

    for opt in texts:
        if opt.lower() == text.lower():
            return opt.lower()

    if len(text) == 1 and text.isalpha() and texts:
        position = ord(text.upper()) - ord("A")
        if 0 <= position < len(texts):
            return texts[position].lower()

    return text.lower()


def answer_label(value, options):
    """Readable form of an answer, e.g. 'B. Normalization'. Blank if unanswered."""
    if value is None or str(value).strip() == "":
        return ""
    text = str(value).strip()
    texts = _option_texts(options)

    for index, opt in enumerate(texts):
        if opt.lower() == text.lower():
            return f"{chr(65 + index)}. {opt}"

    if len(text) == 1 and text.isalpha() and texts:
        index = ord(text.upper()) - ord("A")
        if 0 <= index < len(texts):
            return f"{text.upper()}. {texts[index]}"

    return text


def answers_match(selected, correct, options=None):
    """True if the student's answer equals the correct answer in any common format."""
    if str(selected).strip().lower() == str(correct).strip().lower():
        return True
    return _resolve_answer(selected, options) == _resolve_answer(correct, options)


def serialize_result(doc, include_questions=False):
    """Convert a Mongo result document into a JSON-safe dict."""
    out = dict(doc)
    out["result_id"] = str(out.pop("_id"))
    out.pop("student_id", None)
    out.pop("student_email", None)
    if not include_questions:
        out.pop("questions", None)
    if hasattr(out.get("submitted_at"), "isoformat"):
        out["submitted_at"] = out["submitted_at"].isoformat() + "Z"
    return out


def serialize_activity(doc):
    """Convert an activity document into a JSON-safe dict."""
    out = dict(doc)
    out["activity_id"] = str(out.pop("_id"))
    out.pop("student_id", None)
    out.pop("student_email", None)
    if hasattr(out.get("activity_at"), "isoformat"):
        out["activity_at"] = out["activity_at"].isoformat() + "Z"
    return out


# ---------------------------------------------------------------------
# Save a single answer (unchanged)
# ---------------------------------------------------------------------
@api_view(["POST"])
def save_answer(request, exam_id):

    question_id = request.data.get("question_id")
    answer = request.data.get("answer")

    return Response({
        "success": True,
        "message": "Answer saved successfully",
        "exam_id": exam_id,
        "question_id": question_id,
        "answer": answer
    })


# ---------------------------------------------------------------------
# Submit exam: grade it, SAVE the result, return it
# ---------------------------------------------------------------------
@api_view(["POST"])
def submit_exam(request, exam_id):

    student_id = get_student_id(request)
    if student_id is None:
        return Response(
            {
                "success": False,
                "message": "Authentication required to submit an exam"
            },
            status=401
        )

    answers = request.data.get("answers", {}) or {}

    try:
        exam = exams_collection.find_one({"_id": ObjectId(exam_id)})
    except (InvalidId, TypeError):
        exam = None

    if not exam:
        return Response(
            {
                "success": False,
                "message": "Exam not found"
            },
            status=404
        )

    questions = exam.get("questions", [])

    correct_answers = 0
    wrong_answers = 0
    unanswered_questions = 0

    question_review = []

    for index, question in enumerate(questions):

        question_id = str(
            question.get("question_id")
            or question.get("_id")
            or index
        )

        selected_answer = answers.get(question_id)

        correct_answer = (
            question.get("correct_answer")
            or question.get("answer")
            or ""
        )

        is_correct = False

        # Exams store choices as option_a..option_d (correct_answer is a letter),
        # so build the options list from those for letter <-> text matching.
        options = question.get("options") or [
            question.get("option_a", ""),
            question.get("option_b", ""),
            question.get("option_c", ""),
            question.get("option_d", ""),
        ]

        if selected_answer is None or selected_answer == "":
            unanswered_questions += 1

        elif answers_match(selected_answer, correct_answer, options):
            correct_answers += 1
            is_correct = True

        else:
            wrong_answers += 1

        question_review.append({
            "question_text": question.get(
                "question_text",
                question.get("question", "")
            ),
            "selected_answer": selected_answer,
            "correct_answer": correct_answer,
            "selected_label": answer_label(selected_answer, options),
            "correct_label": answer_label(correct_answer, options),
            "options": options,
            "is_correct": is_correct
        })

    total_questions = len(questions)
    score = correct_answers
    total_marks = total_questions

    percentage = (
        round((score / total_marks) * 100, 2)
        if total_marks > 0
        else 0
    )

    if percentage >= 90:
        grade = "A+"
    elif percentage >= 80:
        grade = "A"
    elif percentage >= 70:
        grade = "B+"
    elif percentage >= 60:
        grade = "B"
    elif percentage >= 50:
        grade = "C"
    elif percentage >= 40:
        grade = "D"
    else:
        grade = "F"

    status = "Passed" if percentage >= 40 else "Failed"

    result = {
        "success": True,
        "message": "Exam submitted successfully",
        "reference_number": f"REF-{exam_id[-6:]}",
        "exam_id": exam_id,
        "exam_title": exam.get("title", "Exam"),
        "subject": exam.get("subject", "General"),
        "submitted_at": timezone.now(),
        "score": score,
        "total_marks": total_marks,
        "percentage": percentage,
        "grade": grade,
        "status": status,
        "total_questions": total_questions,
        "correct_answers": correct_answers,
        "wrong_answers": wrong_answers,
        "unanswered_questions": unanswered_questions,
        "time_taken_seconds": request.data.get("time_taken_seconds", 0),
        "questions": question_review
    }

    # ---- Save to MongoDB ------------------------------------------------
    # Use a copy so Mongo's added _id never leaks into the response dict.
    doc = dict(result)
    doc.pop("success", None)
    doc.pop("message", None)
    doc["student_id"] = student_id
    doc["student_email"] = get_student_email(request)

    # One result per student per exam; resubmitting overwrites the old one.
    # (To keep every attempt instead, use results_collection.insert_one(doc).)
    saved = results_collection.find_one_and_update(
        {"student_id": student_id, "exam_id": exam_id},
        {"$set": doc},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    result["result_id"] = str(saved["_id"])

    # ---- Record the activity for the History page ----------------------
    # The attempt page can send "auto_submitted": true when the timer runs out.
    log_activity(
        student_id=student_id,
        student_email=get_student_email(request),
        exam_id=exam_id,
        exam_title=result["exam_title"],
        subject=result["subject"],
        activity_type=(
            "auto_submitted" if request.data.get("auto_submitted") else "submitted"
        ),
        duration_seconds=request.data.get("time_taken_seconds"),
        description=f"Exam submitted. Reference {result['reference_number']}.",
    )

    return Response(result)


# ---------------------------------------------------------------------
# Get this student's result for one exam
# ---------------------------------------------------------------------
@api_view(["GET"])
def get_result(request, exam_id):

    student_id = get_student_id(request)
    if student_id is None:
        return Response(
            {"success": False, "message": "Authentication required"},
            status=401
        )

    doc = results_collection.find_one(
        {"student_id": student_id, "exam_id": exam_id},
        sort=[("submitted_at", -1)],
    )

    if not doc:
        return Response(
            {"success": False, "message": "Result not found"},
            status=404
        )

    data = serialize_result(doc, include_questions=True)
    data["success"] = True
    return Response(data)


# ---------------------------------------------------------------------
# Get all results for the logged-in student (used by student-results.html)
# ---------------------------------------------------------------------
@api_view(["GET"])
def get_student_results(request):

    student_id = get_student_id(request)
    if student_id is None:
        return Response(
            {"success": False, "message": "Authentication required"},
            status=401
        )

    docs = results_collection.find({"student_id": student_id}).sort("submitted_at", -1)

    return Response({
        "success": True,
        "results": [serialize_result(d) for d in docs],
    })


# ---------------------------------------------------------------------
# Activity history for the logged-in student (used by student-history.html)
# ---------------------------------------------------------------------
@api_view(["GET"])
def get_student_history(request):

    student_id = get_student_id(request)
    if student_id is None:
        return Response(
            {"success": False, "message": "Authentication required"},
            status=401
        )

    # Make sure older results (saved before the log existed) are included.
    backfill_submissions(student_id)

    docs = activities_collection.find({"student_id": student_id}).sort("activity_at", -1)

    return Response({
        "success": True,
        "activities": [serialize_activity(d) for d in docs],
    })