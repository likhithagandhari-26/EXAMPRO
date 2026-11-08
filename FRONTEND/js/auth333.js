document.addEventListener("DOMContentLoaded", () => {

    const loginTab =
        document.getElementById("loginTab");

    const registerTab =
        document.getElementById("registerTab");

    const tabContainer =
        document.querySelector(".tab-container");

    const loginForm =
        document.querySelector(".login-form");

    const registerForm =
        document.querySelector(".register-form");

    const adminForm =
        document.querySelector(".admin-form");

    const roleCards =
        document.querySelectorAll(".role-card");

    let selectedRole = "student";

    // ==============================
    // LOGIN TAB
    // ==============================

    loginTab.addEventListener("click", () => {

        loginTab.classList.add("active");
        registerTab.classList.remove("active");

        loginForm.style.display = "block";
        registerForm.style.display = "none";
    });

    // ==============================
    // REGISTER TAB
    // ==============================

    registerTab.addEventListener("click", () => {

        registerTab.classList.add("active");
        loginTab.classList.remove("active");

        loginForm.style.display = "none";
        registerForm.style.display = "block";
    });

    // ==============================
    // ROLE SWITCHING
    // ==============================

    roleCards.forEach(card => {

        card.addEventListener("click", () => {

            roleCards.forEach(c =>
                c.classList.remove("active")
            );

            card.classList.add("active");

            selectedRole =
                card.dataset.role;

            if(selectedRole === "student"){

                tabContainer.style.display =
                    "flex";

                adminForm.style.display =
                    "none";

                registerForm.style.display =
                    "none";

                loginForm.style.display =
                    "block";

                loginTab.classList.add("active");
                registerTab.classList.remove("active");
            }
            else{

                tabContainer.style.display =
                    "none";

                loginForm.style.display =
                    "none";

                registerForm.style.display =
                    "none";

                adminForm.style.display =
                    "block";
            }
        });
    });

    // ==============================
    // STUDENT REGISTRATION
    // ==============================

    registerForm.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();

            const name =
                document.getElementById(
                    "fullName"
                ).value.trim();

            const email =
                document.getElementById(
                    "registerEmail"
                ).value.trim();

            const password =
                document.getElementById(
                    "registerPassword"
                ).value;

            const confirmPassword =
                document.getElementById(
                    "confirmPassword"
                ).value;

            if(password !== confirmPassword){

                alert(
                    "Passwords do not match"
                );

                return;
            }

            try{

                const response =
                    await fetch(
                        "http://127.0.0.1:8000/api/auth/register/",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                "application/json"
                            },
                            body: JSON.stringify({
                                name,
                                email,
                                password
                            })
                        }
                    );

                const data =
                    await response.json();

                if(response.ok){

                    alert(
                        "Registration Successful"
                    );

                    registerForm.reset();

                    // Switch to Login Form

                    loginTab.click();
                }
                else{

                    alert(
                        data.error ||
                        "Registration Failed"
                    );
                }

            }
            catch(error){

                console.error(error);

                alert(
                    "Unable to connect to server"
                );
            }
        }
    );

    // ==============================
    // STUDENT LOGIN
    // ==============================

    loginForm.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();

            const email =
                document.getElementById(
                    "loginEmail"
                ).value.trim();

            const password =
                document.getElementById(
                    "loginPassword"
                ).value;

            try{

                const response =
                    await fetch(
                        "http://127.0.0.1:8000/api/auth/login/",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                "application/json"
                            },
                            body: JSON.stringify({
                                email,
                                password
                            })
                        }
                    );

                const data =
                    await response.json();

                if(response.ok){

                    localStorage.setItem(
                        "access_token",
                        data.access
                    );

                    localStorage.setItem(
                        "refresh_token",
                        data.refresh
                    );

                    localStorage.setItem(
                        "student_name",
                        data.name
                    );

                    localStorage.setItem(
                        "student_email",
                        data.email
                    );

                    alert(
                        "Login Successful"
                    );

                    window.location.href =
                        "student-dashboard.html";
                }
                else{

                    alert(
                        data.error ||
                        "Invalid Credentials"
                    );
                }

            }
            catch(error){

                console.error(error);

                alert(
                    "Unable to connect to server"
                );
            }
        }
    );

    // =================================
// ADMIN LOGIN
// =================================

adminForm.addEventListener(
    "submit",
    async (e) => {

        e.preventDefault();

        const identifier =
            document.getElementById(
                "adminIdentifier"
            ).value.trim();

        const password =
            document.getElementById(
                "adminPassword"
            ).value;

        try {

            const response =
                await fetch(
                    "http://127.0.0.1:8000/api/auth/admin/login/",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                            "application/json"
                        },
                        body: JSON.stringify({
                            identifier,
                            password
                        })
                    }
                );

            const data =
                await response.json();

            if(response.ok){

                localStorage.setItem(
                    "admin_token",
                    data.access
                );

                localStorage.setItem(
                    "admin_name",
                    data.username
                );

                alert(
                    "Admin Login Successful"
                );

                window.location.href =
                    "admin-dashboard.html";
            }
            else{

                alert(
                    data.error ||
                    "Invalid Admin Credentials"
                );
            }

        }
        catch(error){

            console.error(error);

            alert(
                "Unable to connect to server"
            );
        }
    }
);
});