document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("contactForm");
    const statusEl = document.getElementById("formStatus");
    const submitBtn = document.getElementById("submitBtn");
    const btnText = submitBtn.querySelector("span");

    // URL comes from the template ({% url 'contact_submit' %}).
    // If your HTML is served from another origin, replace with the full URL:
    // const API_URL = "http://127.0.0.1:8000/api/contact/";
    const API_URL = form.dataset.url || "/api/contact/";

    function showStatus(text, type) {
        statusEl.textContent = text;
        statusEl.className = "form-status " + (type || "");
    }

    function isValidEmail(email) {
        return /^\S+@\S+\.\S+$/.test(email);
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const data = Object.fromEntries(new FormData(form));
        const csrfToken = form.querySelector("[name=csrfmiddlewaretoken]")?.value;

        // Client-side validation
        const name = (data.name || "").trim();
        const email = (data.email || "").trim();
        const subject = (data.subject || "").trim();
        const message = (data.message || "").trim();

        if (!name || !email || !subject || !message) {
            showStatus("Please fill in all fields.", "error");
            return;
        }
        if (!isValidEmail(email)) {
            showStatus("Please enter a valid email address.", "error");
            return;
        }

        // Disable button while sending
        submitBtn.disabled = true;
        btnText.textContent = "Sending...";
        showStatus("", "");

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken || ""
                },
                credentials: "same-origin",
                body: JSON.stringify({
                    name,
                    email,
                    subject,
                    message,
                    website: data.website || "" // honeypot
                })
            });

            let result = {};
            try {
                result = await response.json();
            } catch (_) {}

            if (response.ok) {
                showStatus("Message sent! We will get back to you soon.", "success");
                form.reset();
            } else {
                showStatus(result.error || "Something went wrong. Please try again.", "error");
            }
        } catch (err) {
            showStatus("Network error. Please check your connection and try again.", "error");
        } finally {
            submitBtn.disabled = false;
            btnText.textContent = "Send Message";
        }
    });
});