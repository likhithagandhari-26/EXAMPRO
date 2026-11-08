from bson import ObjectId
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone

from exams.mongodb import exams_collection


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


@api_view(["POST"])
def submit_exam(request, exam_id):

    answers = request.data.get("answers", {})
    print("=" * 50)
    print("REQUEST DATA")
    print(request.data)
    print("ANSWERS")
    print(request.data.get("answers"))
    print(type(request.data.get("answers")))
    print("=" * 50)

    exam = exams_collection.find_one(
        {"_id": ObjectId(exam_id)}
    )

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

        if selected_answer is None or selected_answer == "":
            unanswered_questions += 1

        elif str(selected_answer).strip().lower() == str(correct_answer).strip().lower():
            correct_answers += 1
            is_correct = True

        else:
            wrong_answers += 1

        question_review.append({
            "question_text":
                question.get(
                    "question_text",
                    question.get(
                        "question",
                        ""
                    )
                ),

            "selected_answer":
                selected_answer,

            "correct_answer":
                correct_answer,

            "is_correct":
                is_correct
        })

    total_questions = len(questions)

    score = correct_answers

    total_marks = total_questions

    percentage = (
        round(
            (score / total_marks) * 100,
            2
        )
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

    status = (
        "Passed"
        if percentage >= 40
        else "Failed"
    )

    result = {
        "success": True,
        "message": "Exam submitted successfully",

        "reference_number":
            f"REF-{exam_id[-6:]}",

        "exam_id":
            exam_id,

        "exam_title":
            exam.get(
                "title",
                "Exam"
            ),

        "subject":
            exam.get(
                "subject",
                "General"
            ),

        "submitted_at":
            timezone.now(),

        "score":
            score,

        "total_marks":
            total_marks,

        "percentage":
            percentage,

        "grade":
            grade,

        "status":
            status,

        "total_questions":
            total_questions,

        "correct_answers":
            correct_answers,

        "wrong_answers":
            wrong_answers,

        "unanswered_questions":
            unanswered_questions,

        "time_taken_seconds":
            request.data.get(
                "time_taken_seconds",
                0
            ),

        "questions":
            question_review
    }

    return Response(result)


@api_view(["GET"])
def get_result(request, exam_id):

    return Response({
        "success": False,
        "message":
            "Use submit_exam() to generate real results."
    })