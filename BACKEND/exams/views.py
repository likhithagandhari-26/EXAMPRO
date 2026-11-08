from bson import ObjectId

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .mongodb import exams_collection


# ==================================
# CREATE EXAM
# ==================================

@api_view(["POST"])
def create_exam(request):
    try:
        data = request.data

        # Safe numeric conversion
        duration = data.get("duration")
        total_marks = data.get("total_marks")
        total_questions = data.get("total_questions")

        duration = (
            int(duration)
            if duration not in [None, "", "null"]
            else None
        )

        total_marks = (
            int(total_marks)
            if total_marks not in [None, "", "null"]
            else None
        )

        total_questions = (
            int(total_questions)
            if total_questions not in [None, "", "null"]
            else None
        )

        exam = {
            "title": data.get("title", "").strip(),
            "subject": data.get("subject", "").strip(),
            "exam_date": data.get("exam_date"),
            "duration": duration,
            "total_marks": total_marks,
            "total_questions": total_questions,
            "instructions": data.get("instructions", ""),
            "status": data.get("status", "Draft"),

            "negative_marking": data.get(
                "negative_marking",
                False
            ),
            "shuffle_questions": data.get(
                "shuffle_questions",
                False
            ),
            "shuffle_options": data.get(
                "shuffle_options",
                False
            ),
            "show_results": data.get(
                "show_results",
                True
            ),
            "ai_proctoring": data.get(
                "ai_proctoring",
                False
            ),

            "questions": []
        }

        result = exams_collection.insert_one(exam)

        return Response({
            "success": True,
            "message": "Exam created successfully",
            "exam_id": str(result.inserted_id)
        })

    except Exception as e:
        return Response({
            "success": False,
            "message": str(e)
        }, status=500)

# ==================================
# GET ALL EXAMS
# ==================================

@api_view(['GET'])
def get_exams(request):

    exams = []

    for exam in exams_collection.find():

        exam["_id"] = str(exam["_id"])

        exams.append(exam)

    return Response(exams)


# ==================================
# GET SINGLE EXAM
# ==================================

@api_view(['GET'])
def get_exam(request, exam_id):

    try:

        exam = exams_collection.find_one({
            "_id": ObjectId(exam_id)
        })

        if not exam:

            return Response(
                {"error": "Exam not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        formatted_questions = []

        for q in exam.get("questions", []):

            formatted_questions.append({

                "question_id":
                    q.get("question_id"),

                "question":
                    q.get("question"),

                "options": [

                    q.get("option_a", ""),

                    q.get("option_b", ""),

                    q.get("option_c", ""),

                    q.get("option_d", "")

                ],

                "marks":
                    q.get("marks", 1)

            })

        response_data = {

            "_id":
                str(exam["_id"]),

            "title":
                exam.get("title"),

            "subject":
                exam.get("subject"),

            "duration":
                exam.get("duration"),

            "total_marks":
                exam.get("total_marks"),

            "exam_date":
                exam.get("exam_date"),

            "status":
                exam.get("status"),

            "instructions":
                exam.get("instructions"),

            "questions":
                formatted_questions
        }

        return Response(
            response_data,
            status=status.HTTP_200_OK
        )

    except Exception as e:

        return Response(
            {
                "error": str(e)
            },
            status=status.HTTP_400_BAD_REQUEST
        )


# ==================================
# UPDATE EXAM
# ==================================

@api_view(['PUT'])
def update_exam(request, exam_id):

    try:

        update_data = {}

        if "title" in request.data:
            update_data["title"] = request.data["title"]

        if "subject" in request.data:
            update_data["subject"] = request.data["subject"]

        if "duration" in request.data:
            update_data["duration"] = request.data["duration"]

        if "total_marks" in request.data:
            update_data["total_marks"] = request.data["total_marks"]

        if "total_questions" in request.data:
            update_data["total_questions"] = request.data["total_questions"]

        if "exam_date" in request.data:
            update_data["exam_date"] = request.data["exam_date"]

        if "status" in request.data:
            update_data["status"] = request.data["status"]

        if "instructions" in request.data:
            update_data["instructions"] = request.data["instructions"]

        if not update_data:
            return Response(
                {"error": "No fields provided for update"},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = exams_collection.update_one(
            {"_id": ObjectId(exam_id)},
            {"$set": update_data}
        )

        if result.matched_count == 0:

            return Response(
                {"error": "Exam not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            "message": "Exam Updated Successfully"
        })

    except Exception:

        return Response(
            {"error": "Invalid Exam ID"},
            status=status.HTTP_400_BAD_REQUEST
        )
# ==================================
# DELETE EXAM
# ==================================

@api_view(['DELETE'])
def delete_exam(request, exam_id):

    try:

        result = exams_collection.delete_one({
            "_id": ObjectId(exam_id)
        })

        if result.deleted_count == 0:

            return Response(
                {"error": "Exam not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            "message": "Exam Deleted Successfully"
        })

    except Exception:

        return Response(
            {"error": "Invalid Exam ID"},
            status=status.HTTP_400_BAD_REQUEST
        )


# ==================================
# ADD QUESTION
# ==================================

@api_view(['POST'])
def add_question(request, exam_id):

    try:

        exam = exams_collection.find_one({
            "_id": ObjectId(exam_id)
        })

        if not exam:

            return Response(
                {"error": "Exam not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        question = {

            "question_id":
                str(ObjectId()),

            "question":
                request.data.get("question"),

            "option_a":
                request.data.get("option_a"),

            "option_b":
                request.data.get("option_b"),

            "option_c":
                request.data.get("option_c"),

            "option_d":
                request.data.get("option_d"),

            "correct_answer":
                request.data.get("correct_answer"),

            "marks":
                int(request.data.get("marks", 1))
        }

        exams_collection.update_one(
            {"_id": ObjectId(exam_id)},
            {
                "$push": {
                    "questions": question
                }
            }
        )

        return Response(
            {
                "message":
                    "Question Added Successfully",

                "question":
                    question
            },
            status=status.HTTP_201_CREATED
        )

    except Exception as e:

        return Response(
            {
                "error":
                    str(e)
            },
            status=status.HTTP_400_BAD_REQUEST
        )

# ==================================
# GET QUESTIONS
# ==================================

@api_view(['GET'])
def get_questions(request, exam_id):

    try:

        exam = exams_collection.find_one({
            "_id": ObjectId(exam_id)
        })

        if not exam:

            return Response(
                {"error": "Exam not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(
            exam.get("questions", [])
        )

    except Exception:

        return Response(
            {"error": "Invalid Exam ID"},
            status=status.HTTP_400_BAD_REQUEST
        )


# ==================================
# UPDATE QUESTION
# ==================================

@api_view(['PUT'])
def update_question(request, exam_id, question_id):

    try:

        result = exams_collection.update_one(
            {
                "_id": ObjectId(exam_id),
                "questions.question_id": question_id
            },
            {
                "$set": {
                    "questions.$.question":
                        request.data.get("question"),

                    "questions.$.option_a":
                        request.data.get("option_a"),

                    "questions.$.option_b":
                        request.data.get("option_b"),

                    "questions.$.option_c":
                        request.data.get("option_c"),

                    "questions.$.option_d":
                        request.data.get("option_d"),

                    "questions.$.correct_answer":
                        request.data.get("correct_answer"),

                    "questions.$.marks":
                        request.data.get("marks")
                }
            }
        )

        if result.matched_count == 0:

            return Response(
                {"error": "Question not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            "message": "Question Updated Successfully"
        })

    except Exception:

        return Response(
            {"error": "Update Failed"},
            status=status.HTTP_400_BAD_REQUEST
        )


# ==================================
# DELETE QUESTION
# ==================================

@api_view(['DELETE'])
def delete_question(request, exam_id, question_id):

    try:

        result = exams_collection.update_one(
            {
                "_id": ObjectId(exam_id)
            },
            {
                "$pull": {
                    "questions": {
                        "question_id": question_id
                    }
                }
            }
        )

        if result.modified_count == 0:

            return Response(
                {"error": "Question not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            "message": "Question Deleted Successfully"
        })

    except Exception:

        return Response(
            {"error": "Delete Failed"},
            status=status.HTTP_400_BAD_REQUEST
        )


# ==================================
# PUBLISH EXAM
# ==================================

@api_view(['PUT'])
def publish_exam(request, exam_id):

    try:

        result = exams_collection.update_one(
            {"_id": ObjectId(exam_id)},
            {
                "$set": {
                    "status": "Published"
                }
            }
        )

        if result.matched_count == 0:

            return Response(
                {"error": "Exam not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            "message": "Exam Published Successfully"
        })

    except Exception:

        return Response(
            {"error": "Invalid Exam ID"},
            status=status.HTTP_400_BAD_REQUEST
        )
@api_view(['GET'])
def get_exam_for_attempt(request, exam_id):

    try:

        exam = exams_collection.find_one({
            "_id": ObjectId(exam_id)
        })

        if not exam:

            return Response(
                {"error": "Exam not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        questions = []

        for q in exam.get("questions", []):

            questions.append({

                "question_id":
                    q["question_id"],

                "question":
                    q["question"],

                "options": [

                    q["option_a"],
                    q["option_b"],
                    q["option_c"],
                    q["option_d"]

                ],

                "marks":
                    q.get("marks", 1)

            })

        return Response({

            "exam_id":
                str(exam["_id"]),

            "title":
                exam.get("title"),

            "subject":
                exam.get("subject"),

            "duration":
                exam.get("duration"),

            "instructions":
                exam.get("instructions"),

            "questions":
                questions

        })

    except Exception as e:

        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )