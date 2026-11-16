document.addEventListener("DOMContentLoaded", () => {

    const API = "http://127.0.0.1:8000/api/auth";

    const STUDENT_DASHBOARD = "student-dashboard.html";
    const ADMIN_DASHBOARD = "admin-dashboard.html";

    const loginTab = document.getElementById("loginTab");
    const registerTab = document.getElementById("registerTab");
    const tabContainer = document.querySelector(".tab-container");

    const loginForm = document.querySelector(".login-form");
    const registerForm = document.querySelector(".register-form");
    const adminForm = document.querySelector(".admin-form");

    const roleCards = document.querySelectorAll(".role-card");

    let selectedRole = "student";

    // ==============================
    // HELPERS
    // ==============================

    // Message from the server, whatever key it used.
    function serverMessage(data, fallback) {
        if (!data) return fallback;
        return data.error || data.detail || data.message || fallback;
    }

    // Safely read a JSON body (a server error page would otherwise throw).
    async function readJson(response) {
        try {
            return await response.json();
        } catch (error) {
            return null;
        }
    }

    // Accept the common names for the tokens.
    function pickTokens(data) {
        return {
            access: data && (data.access || data.access_token || data.token),
            refresh: data && (data.refresh || data.refresh_token)
        };
    }

    function setBusy(button, busy, busyText) {
        if (!button) return;

        if (busy) {
            button.dataset.label = button.textContent;
            button.textContent = busyText;
            button.disabled = true;
        } else {
            button.textContent = button.dataset.label || button.textContent;
            button.disabled = false;
        }
    }

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

            roleCards.forEach(c => c.classList.remove("active"));
            card.classList.add("active");

            selectedRole = card.dataset.role;

            if (selectedRole === "student") {

                tabContainer.style.display = "flex";

                adminForm.style.display = "none";
                registerForm.style.display = "none";
                loginForm.style.display = "block";

                loginTab.classList.add("active");
                registerTab.classList.remove("active");

            } else {

                tabContainer.style.display = "none";

                loginForm.style.display = "none";
                registerForm.style.display = "none";
                adminForm.style.display = "block";
            }
        });
    });

    // ==============================
    // STUDENT REGISTRATION
    // ==============================

    registerForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const name = document.getElementById("fullName").value.trim();
        const email = document.getElementById("registerEmail").value.trim();
        const password = document.getElementById("registerPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }

        const button = document.getElementById("registerBtn");
        setBusy(button, true, "Creating account...");

        try {

            const response = await fetch(`${API}/register/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password })
            });

            const data = await readJson(response);

            if (response.ok) {

                alert("Registration Successful. Please log in.");

                registerForm.reset();

                // Switch to the login form
                loginTab.click();

            } else {
                alert(serverMessage(data, "Registration Failed"));
            }

        } catch (error) {

            console.error(error);
            alert("Unable to connect to server");

        } finally {
            setBusy(button, false);
        }
    });

    // ==============================
    // STUDENT LOGIN  ->  STUDENT DASHBOARD
    // ==============================

    loginForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;

        const button = document.getElementById("loginBtn");
        setBusy(button, true, "Logging in...");

        try {

            const response = await fetch(`${API}/login/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await readJson(response);

            if (!response.ok) {
                alert(serverMessage(data, "Invalid Credentials"));
                return;
            }

            const { access, refresh } = pickTokens(data);

            // A "successful" response without a token would send the student to
            // the dashboard, which would immediately bounce them back to login.
            if (!access) {
                console.error("Login response had no access token:", data);
                alert("Login succeeded but the server did not return a token. Please contact support.");
                return;
            }

            // Clear anything left over from an admin session, then save the student's.
            ["admin_token", "admin_name"].forEach(key => localStorage.removeItem(key));

            localStorage.setItem("access_token", access);

            if (refresh) {
                localStorage.setItem("refresh_token", refresh);
            }

            const studentName =
                data.name ||
                (data.student && data.student.name) ||
                email.split("@")[0];

            localStorage.setItem("student_name", studentName);
            localStorage.setItem("student_email", data.email || email);

            // replace() so the Back button does not return to the login page.
            window.location.replace(STUDENT_DASHBOARD);

        } catch (error) {

            console.error(error);
            alert("Unable to connect to server");

        } finally {
            // Harmless if the page is already navigating away.
            setBusy(button, false);
        }
    });

    // ==============================
    // ADMIN LOGIN  ->  ADMIN DASHBOARD
    // ==============================

    adminForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const identifier = document.getElementById("adminIdentifier").value.trim();
        const password = document.getElementById("adminPassword").value;

        const button = adminForm.querySelector("button[type='submit']");
        setBusy(button, true, "Logging in...");

        try {

            const response = await fetch(`${API}/admin/login/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier, password })
            });

            const data = await readJson(response);

            if (!response.ok) {
                alert(serverMessage(data, "Invalid Admin Credentials"));
                return;
            }

            const { access, refresh } = pickTokens(data);

            if (!access) {
                console.error("Admin login response had no access token:", data);
                alert("Login succeeded but the server did not return a token.");
                return;
            }

            // Clear any student session first.
            ["student_name", "student_email"].forEach(key => localStorage.removeItem(key));

            // access_token is what the API calls use; admin_token is kept for
            // the older admin pages that still read it.
            localStorage.setItem("access_token", access);
            localStorage.setItem("admin_token", access);

            if (refresh) {
                localStorage.setItem("refresh_token", refresh);
            }

            localStorage.setItem("admin_name", data.username || identifier);

            window.location.replace(ADMIN_DASHBOARD);

        } catch (error) {

            console.error(error);
            alert("Unable to connect to server");

        } finally {
            setBusy(button, false);
        }
    });
});