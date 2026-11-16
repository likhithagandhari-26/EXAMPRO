import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from authentication.auth import IsAdminRole, IsStudent
from authentication.mongodb import students_collection

logger = logging.getLogger(__name__)


def _serialize_student(student):
    """Safe public fields only. Never includes the password hash."""
    return {
        "id": str(student.get("_id")),

        "name": (
            student.get("name")
            or student.get("full_name")
            or student.get("username")
            or "Student"
        ),

        "email": student.get("email") or "Not available",

        "username": student.get("username") or "—",

        "roll_number": (
            student.get("roll_number")
            or student.get("roll_no")
            or "—"
        ),

        "department": (
            student.get("department")
            or student.get("branch")
            or student.get("course")
            or "—"
        ),

        "year": (
            student.get("year")
            or student.get("academic_year")
            or "—"
        ),

        "phone": (
            student.get("phone")
            or student.get("phone_number")
            or "Not available"
        ),

        "status": student.get("status") or "Active",

        "exams_attempted": student.get("exams_attempted") or 0,
        "average_score": student.get("average_score") or 0,
        "best_score": (
            student.get("best_score")
            or student.get("highest_score")
            or 0
        ),

        "created_at": student.get("created_at"),
        "last_activity": student.get("last_activity"),
    }


# ==================================
# ALL STUDENTS  (admin only)
# ==================================

@api_view(["GET"])
@permission_classes([IsAdminRole])
def students_list(request):

    try:
        result = [
            _serialize_student(student)
            for student in students_collection.find({})
        ]

        return Response({
            "success": True,
            "count": len(result),
            "students": result
        })

    except Exception:
        logger.exception("Unable to fetch students")

        return Response(
            {"success": False, "message": "Unable to fetch students."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ==================================
# CURRENT STUDENT  (from the token)
# ==================================

@api_view(["GET"])
@permission_classes([IsStudent])
def student_me(request):

    student = students_collection.find_one({"email": request.user.email})

    if not student:
        return Response(
            {"success": False, "message": "Student not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    return Response({
        "success": True,
        "student": _serialize_student(student)
    })