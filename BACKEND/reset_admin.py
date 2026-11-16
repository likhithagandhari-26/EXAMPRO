
from getpass import getpass
from werkzeug.security import generate_password_hash, check_password_hash
from authentication.mongodb import admins_collection

# Find the existing admin
old_admin = admins_collection.find_one({
    "$or": [
        {"username": "admin"},
        {"email": "admin@exampro.com"}
    ]
})

if not old_admin:
    print("Existing admin not found.")

else:
    print("Existing admin found.")

    new_username = input("Enter new username: ").strip()
    new_email = input("Enter new email: ").strip().lower()

    new_password = getpass("Enter new password: ")
    confirm_password = getpass("Confirm new password: ")

    if not new_username or not new_email or not new_password:
        print("All fields are required.")

    elif len(new_password) < 8:
        print("Password must contain at least 8 characters.")

    elif new_password != confirm_password:
        print("Passwords do not match.")

    else:
        duplicate = admins_collection.find_one({
            "$or": [
                {"username": new_username},
                {"email": new_email}
            ],
            "_id": {"$ne": old_admin["_id"]}
        })

        if duplicate:
            print("Username or email already exists.")

        else:
            hashed_password = generate_password_hash(new_password)

            result = admins_collection.update_one(
                {"_id": old_admin["_id"]},
                {
                    "$set": {
                        "username": new_username,
                        "email": new_email,
                        "password": hashed_password,
                        "role": "admin"
                    }
                }
            )

            if result.matched_count == 1:
                updated_admin = admins_collection.find_one({
                    "_id": old_admin["_id"]
                })

                print("\nAdmin credentials updated successfully!")
                print("Username:", updated_admin["username"])
                print("Email:", updated_admin["email"])
                print(
                    "Password verification:",
                    check_password_hash(
                        updated_admin["password"],
                        new_password
                    )
                )
            else:
                print("Admin update failed.")
