/* ====================================
   ROLE SELECTION
==================================== */

const roleCards = document.querySelectorAll(".role-card");

roleCards.forEach(card => {

    card.addEventListener("click", () => {

        roleCards.forEach(item => {
            item.classList.remove("active");
        });

        card.classList.add("active");

        const selectedRole =
            card.querySelector("h4").textContent;

        console.log("Selected Role:", selectedRole);

    });

});


/* ====================================
   LOGIN / REGISTER TABS
==================================== */

const tabButtons =
    document.querySelectorAll(".tab-btn");

const loginForm =
    document.querySelector(".login-form");

const registerForm =
    document.querySelector(".register-form");

tabButtons.forEach((button, index) => {

    button.addEventListener("click", () => {

        tabButtons.forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        if (index === 0) {

            loginForm.style.display = "block";
            registerForm.style.display = "none";

        } else {

            loginForm.style.display = "none";
            registerForm.style.display = "block";

        }

    });

});


/* ====================================
   EMAIL VALIDATION
==================================== */

function isValidEmail(email) {

    const pattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return pattern.test(email);

}


/* ====================================
   LOGIN BUTTON
==================================== */

const loginBtn =
    document.getElementById("loginBtn");

loginBtn.addEventListener("click", (e) => {

    e.preventDefault();

    const email =
        document.getElementById("loginEmail")
            .value
            .trim();

    const password =
        document.getElementById("loginPassword")
            .value
            .trim();

    if (email === "" || password === "") {

        alert("Please fill all login fields.");
        return;

    }

    if (!isValidEmail(email)) {

        alert("Enter a valid email address.");
        return;

    }

    if (password.length < 6) {

        alert(
            "Password must contain at least 6 characters."
        );

        return;
    }

    console.log("Login Successful");

    // Future Backend API Call

    /*
    fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email,
            password
        })
    })
    */

    alert("Login Successful!");

});


/* ====================================
   REGISTER BUTTON
==================================== */

const registerBtn =
    document.getElementById("registerBtn");

registerBtn.addEventListener("click", (e) => {

    e.preventDefault();

    const name =
        document.getElementById("fullName")
            .value
            .trim();

    const email =
        document.getElementById("registerEmail")
            .value
            .trim();

    const password =
        document.getElementById("registerPassword")
            .value
            .trim();

    const confirmPassword =
        document.getElementById("confirmPassword")
            .value
            .trim();

    if (
        name === "" ||
        email === "" ||
        password === "" ||
        confirmPassword === ""
    ) {

        alert(
            "Please fill all registration fields."
        );

        return;
    }

    if (!isValidEmail(email)) {

        alert("Enter a valid email address.");
        return;

    }

    if (password.length < 6) {

        alert(
            "Password must contain at least 6 characters."
        );

        return;
    }

    if (password !== confirmPassword) {

        alert("Passwords do not match.");
        return;

    }

    console.log("Registration Successful");

    // Future Backend API Call

    /*
    fetch("/register", {
        method: "POST",
        headers: {
            "Content-Type":"application/json"
        },
        body: JSON.stringify({
            name,
            email,
            password
        })
    })
    */

    alert("Account Created Successfully!");

});


/* ====================================
   BACK TO HOME BUTTON
==================================== */

const backBtn =
    document.querySelector(".back-btn");

backBtn.addEventListener("click", () => {

    window.location.href = "index.html";

});


/* ====================================
   ADMIN LOGIN BUTTON
==================================== */

const adminBtn =
    document.getElementById("adminBtn");

adminBtn.addEventListener("click", () => {

    window.location.href =
        "admin-login.html";

});


/* ====================================
   ENTER KEY SUPPORT
==================================== */

document.addEventListener("keydown", (e) => {

    if (e.key === "Enter") {

        const loginTabActive =
            tabButtons[0].classList.contains("active");

        if (loginTabActive) {

            loginBtn.click();

        } else {

            registerBtn.click();

        }

    }

});