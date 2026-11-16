from django.contrib import admin
from django.urls import include, path
from django.urls import path, include

urlpatterns = [

    path(
        "admin/",
        admin.site.urls,
    ),

    path("api/contact/", include("contact.urls")),

    # Authentication
    path(
        "api/auth/",
        include("authentication.urls"),
    ),

    # Exams
    path(
        "api/exams/",
        include("exams.urls"),
    ),

    # Students
    path(
        "api/students/",
        include("students.urls"),
    ),

    path(
    "api/results/",
    include("results.urls")
    ),
]