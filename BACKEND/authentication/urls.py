from django.urls import path
from .views import (
    test_connection,
    register_student,
    login_student,
    admin_login
)

urlpatterns = [
    path('test/', test_connection),
    path('register/', register_student),
    path('login/', login_student),
    path('admin/login/', admin_login),
]