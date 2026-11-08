console.log("Authentication Script Loaded");

/* ====================================
INITIAL STATE
==================================== */

window.onload = function () {

```
document.getElementById("student-options").style.display = "none";

document.getElementById("login").style.display = "none";
document.getElementById("register").style.display = "none";
document.getElementById("admin-login").style.display = "none";
```

};

/* ====================================
ROLE CARD HIGHLIGHT
==================================== */

function clearRoleSelection() {

```
document
    .querySelectorAll(".role-card")
    .forEach(card => card.classList.remove("active-role"));
```

}

/* ====================================
STUDENT SECTION
==================================== */

function showStudent() {

```
clearRoleSelection();

document
    .querySelectorAll(".role-card")[0]
    .classList.add("active-role");

document.getElementById("student-options").style.display = "block";

document.getElementById("admin-login").style.display = "none";

showLogin();
```

}

/* ====================================
ADMIN SECTION
==================================== */

function showAdmin() {

```
clearRoleSelection();

document
    .querySelectorAll(".role-card")[1]
    .classList.add("active-role");

document.getElementById("student-options").style.display = "none";

document.getElementById("login").style.display = "none";
document.getElementById("register").style.display = "none";

document.getElementById("admin-login").style.display = "block";
```

}

/* ====================================
TAB STYLING
==================================== */

function clearTabs() {

```
document
    .getElementById("login-tab")
    .classList.remove("active");

document
    .getElementById("register-tab")
    .classList.remove("active");
```

}

/* ====================================
SHOW LOGIN
==================================== */

function showLogin() {

```
clearTabs();

document
    .getElementById("login-tab")
    .classList.add("active");

document.getElementById("login").style.display = "block";

document.getElementById("register").style.display = "none";
```

}

/* ====================================
SHOW REGISTER
==================================== */

function showRegister() {

```
clearTabs();

document
    .getElementById("register-tab")
    .classList.add("active");

document.getElementById("login").style.display = "none";

document.getElementById("register").style.display = "block";
```

}

/* ====================================
STUDENT LOGIN
==================================== */

async function studentLogin(event) {

```
event.preventDefault();

const email =
    document.getElementById("student-email").value.trim();

const password =
    document.getElementById("student-password").value.trim();

const errorMessage =
    document.getElementById("login-error");

errorMessage.textContent = "";

if (!email || !password) {

    errorMessage.textContent =
        "Please fill all fields.";

    return;
}

try {

    const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email,
                password
            })
        }
    );

    const data = await response.json();

    if (response.ok) {

        localStorage.setItem(
            "token",
            data.token
        );

        localStorage.setItem(
            "student",
            JSON.stringify(data.student)
        );

        alert("Login Successful!");

        window.location.href =
            "student-dashboard.html";

    } else {

        errorMessage.textContent =
            data.message || "Login failed.";

    }

} catch (error) {

    errorMessage.textContent =
        "Unable to connect to server.";

}
```

}

/* ====================================
STUDENT REGISTER
==================================== */

async function studentRegister(event) {

```
event.preventDefault();

const name =
    document.getElementById("student-name").value.trim();

const email =
    document.getElementById("student-register-email").value.trim();

const password =
    document.getElementById("student-register-password").value;

const confirmPassword =
    document.getElementById("student-confirm-password").value;

const errorMessage =
    document.getElementById("register-error");

errorMessage.textContent = "";

if (
    !name ||
    !email ||
    !password ||
    !confirmPassword
) {

    errorMessage.textContent =
        "Please fill all fields.";

    return;
}

if (password !== confirmPassword) {

    errorMessage.textContent =
        "Passwords do not match.";

    return;
}

try {

    const response = await fetch(
        "http://localhost:5000/api/auth/register",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                name,
                email,
                password
            })
        }
    );

    const data = await response.json();

    if (response.ok) {

        alert("Registration Successful!");

        document
            .getElementById("register")
            .reset();

        showLogin();

    } else {

        errorMessage.textContent =
            data.message || "Registration failed.";

    }

} catch (error) {

    errorMessage.textContent =
        "Unable to connect to server.";

}
```

}

/* ====================================
ADMIN LOGIN
==================================== */

function adminLogin(event) {

```
event.preventDefault();

const adminId =
    document.getElementById("admin-id").value.trim();

const password =
    document.getElementById("admin-password").value.trim();

if (!adminId || !password) {

    alert("Please fill all fields.");
    return;

}

alert("Admin Login Successful!");

window.location.href =
    "admin-dashboard.html";
```

}
