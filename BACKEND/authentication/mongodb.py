from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")

db = client["exampro"]

students_collection = db["students"]
admins_collection = db["admins"]