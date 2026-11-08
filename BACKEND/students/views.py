from django.shortcuts import render

# Create your views here.
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from authentication.views import students_collection


@require_GET
def students_list(request):

    try:

        students = list(
            students_collection.find({})
        )

        result = []

        for student in students:

            student_id = student.get("_id")

            result.append({
                "id": str(student_id),

                "name": (
                    student.get("name")
                    or student.get("full_name")
                    or student.get("username")
                    or "Student"
                ),

                "email": (
                    student.get("email")
                    or "Not available"
                ),

                "username": (
                    student.get("username")
                    or "—"
                ),

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

                "status": (
                    student.get("status")
                    or "Active"
                ),

                "exams_attempted": (
                    student.get("exams_attempted")
                    or 0
                ),

                "average_score": (
                    student.get("average_score")
                    or 0
                ),

                "best_score": (
                    student.get("best_score")
                    or student.get("highest_score")
                    or 0
                ),

                "created_at": (
                    student.get("created_at")
                ),

                "last_activity": (
                    student.get("last_activity")
                ),
            })

        return JsonResponse(
            {
                "success": True,
                "count": len(result),
                "students": result
            },
            status=200
        )

    except Exception as e:

        return JsonResponse(
            {
                "success": False,
                "message": "Unable to fetch students.",
                "error": str(e)
            },
            status=500
        )
