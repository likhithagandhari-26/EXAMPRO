from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)

from .mongodb import (
    db,
    students_collection,
    admins_collection
)


# ==================================
# TEST MONGODB CONNECTION
# ==================================

@api_view(['GET'])
@permission_classes([AllowAny])
def test_connection(request):

    collections = db.list_collection_names()

    return Response({
        "message": "MongoDB Connected Successfully",
        "collections": collections
    })


# ==================================
# STUDENT REGISTRATION
# ==================================

@api_view(['POST'])
@permission_classes([AllowAny])
def register_student(request):

    name = request.data.get('name')
    email = request.data.get('email')
    password = request.data.get('password')

    # Validation
    if not name or not email or not password:
        return Response({
            "error": "All fields are required"
        }, status=400)

    existing_user = students_collection.find_one({
        "email": email
    })

    if existing_user:
        return Response({
            "error": "Email already registered"
        }, status=400)

    hashed_password = generate_password_hash(password)

    students_collection.insert_one({
        "name": name,
        "email": email,
        "password": hashed_password
    })

    return Response({
        "message": "Registration Successful"
    })


# ==================================
# STUDENT LOGIN
# ==================================

@api_view(['POST'])
@permission_classes([AllowAny])
def login_student(request):

    email = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return Response({
            "error": "Email and Password are required"
        }, status=400)

    student = students_collection.find_one({
        "email": email
    })

    if not student:
        return Response({
            "error": "User not found"
        }, status=404)

    if not check_password_hash(
        student['password'],
        password
    ):
        return Response({
            "error": "Invalid password"
        }, status=401)

    refresh = RefreshToken()

    # Add custom claims
    refresh["email"] = student["email"]
    refresh["name"] = student["name"]
    refresh["role"] = "student"

    return Response({
        "message": "Login Successful",
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "name": student["name"],
        "email": student["email"]
    })


# ==================================
# ADMIN LOGIN
# ==================================

@api_view(['POST'])
@permission_classes([AllowAny])
def admin_login(request):

    identifier = request.data.get('identifier')
    password = request.data.get('password')

    if not identifier or not password:
        return Response({
            "error": "Username/Email and Password are required"
        }, status=400)

    admin = admins_collection.find_one({
        "$or": [
            {"username": identifier},
            {"email": identifier}
        ]
    })

    if not admin:
        return Response({
            "error": "Admin not found"
        }, status=404)

    # Use hashed passwords
    if not check_password_hash(
        admin["password"],
        password
    ):
        return Response({
            "error": "Invalid password"
        }, status=401)

    refresh = RefreshToken()

    # Add custom claims
    refresh["username"] = admin["username"]
    refresh["email"] = admin.get("email", "")
    refresh["role"] = "admin"

    return Response({
        "message": "Admin Login Successful",
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "username": admin["username"]
    })