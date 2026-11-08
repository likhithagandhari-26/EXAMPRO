from django.urls import path

from .views import (
    save_answer,
    submit_exam,
    get_result
)

urlpatterns = [

    path(
        "<str:exam_id>/save-answer/",
        save_answer,
        name="save_answer"
    ),

    path(
        "<str:exam_id>/submit/",
        submit_exam,
        name="submit_exam"
    ),

    path(
        "<str:exam_id>/",
        get_result,
        name="get_result"
    ),

]