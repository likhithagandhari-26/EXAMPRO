# ============================================
# EXAM PRO - EXAMS URL CONFIGURATION
# ============================================

from django.urls import path

from .views import (
    create_exam,
    get_exams,
    get_exam,
    update_exam,
    delete_exam,
    add_question,
    get_questions,
    update_question,
    delete_question,
    publish_exam,

    # NEW
    get_exam_for_attempt,
)

urlpatterns = [

    # ========================================
    # EXAM MANAGEMENT
    # ========================================

    path(
        "create/",
        create_exam,
        name="create_exam",
    ),

    path(
        "",
        get_exams,
        name="get_exams",
    ),

    path(
        "<str:exam_id>/",
        get_exam,
        name="get_exam",
    ),

    path(
        "<str:exam_id>/update/",
        update_exam,
        name="update_exam",
    ),

    path(
        "<str:exam_id>/delete/",
        delete_exam,
        name="delete_exam",
    ),

    # ========================================
    # STUDENT ATTEMPT EXAM
    # ========================================

    path(
        "<str:exam_id>/attempt/",
        get_exam_for_attempt,
        name="get_exam_for_attempt",
    ),

    # ========================================
    # QUESTION MANAGEMENT
    # ========================================

    path(
        "<str:exam_id>/questions/",
        get_questions,
        name="get_questions",
    ),

    path(
        "<str:exam_id>/questions/add/",
        add_question,
        name="add_question",
    ),

    path(
        "<str:exam_id>/questions/<str:question_id>/update/",
        update_question,
        name="update_question",
    ),

    path(
        "<str:exam_id>/questions/<str:question_id>/delete/",
        delete_question,
        name="delete_question",
    ),

    # ========================================
    # EXAM PUBLISHING
    # ========================================

    path(
        "<str:exam_id>/publish/",
        publish_exam,
        name="publish_exam",
    ),

]
