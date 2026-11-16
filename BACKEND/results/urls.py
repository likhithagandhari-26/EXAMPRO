from django.urls import path

from .views import (
    save_answer,
    submit_exam,
    get_result,
    get_student_results,
    get_student_history,
)

urlpatterns = [

    # Fixed paths first: they must come before "<str:exam_id>/"
    path("student/", get_student_results, name="student_results"),
    path("history/", get_student_history, name="student_history"),

    path("<str:exam_id>/save-answer/", save_answer, name="save_answer"),

    path("<str:exam_id>/submit/", submit_exam, name="submit_exam"),

    path("<str:exam_id>/", get_result, name="get_result"),

]