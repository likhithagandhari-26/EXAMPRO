from pymongo import MongoClient
from django.conf import settings


# MongoDB connection
client = MongoClient(
    getattr(settings, "MONGO_URI", "mongodb://localhost:27017/")
)

db = client[getattr(settings, "MONGO_DB_NAME", "exampro")]

# NOTE: if exams_collection is already defined elsewhere in your project
# (for example in an older version of this file), keep that definition
# and delete this line. views.py imports it from here.
exams_collection = db["exams"]

results_collection = db["results"]


def attempted_exam_ids(email=None, student_id=None):
    """
    Return exam IDs already attempted by this student.

    Results are saved with both student_id and student_email, so either
    can be used to look a student up. Older results that only have an
    email still match.
    """

    conditions = []

    if email:
        conditions.append({"student_email": email})

    if student_id:
        conditions.append({"student_id": str(student_id)})

    if not conditions:
        return []

    results = results_collection.find(
        {"$or": conditions},
        {"exam_id": 1}
    )

    # set() removes duplicates; sorted() keeps the output stable
    return sorted({
        str(result["exam_id"])
        for result in results
        if result.get("exam_id")
    })