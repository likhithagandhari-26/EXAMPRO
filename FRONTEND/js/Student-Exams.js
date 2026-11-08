/* =========================================================
   EXAM PRO — STUDENT EXAMS PAGE
   Professional • Dynamic • Secure • Responsive
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    /* =====================================================
       API CONFIGURATION
    ===================================================== */

    const API = {
        students: "http://127.0.0.1:8000/api/students/",
        exams: "http://127.0.0.1:8000/api/exams/",
        // results: "http://127.0.0.1:8000/api/results/"
    };

    /* =====================================================
       STATE
    ===================================================== */

    let allExams = [];
    let filteredExams = [];

    let selectedExam = null;

    let currentFilter = "all";
    let searchTerm = "";

    /* =====================================================
       AUTH CHECK
    ===================================================== */

    const token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "auth333.html";
        return;
    }

    /* =====================================================
       COMMON FETCH OPTIONS
    ===================================================== */

    const authHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };

    /* =====================================================
       DOM HELPERS
    ===================================================== */

    const $ = (id) => document.getElementById(id);

    const examContainer = $("examContainer");
    const searchInput = $("searchInput");

    const profileBtn = $("profileBtn");
    const profileDropdown = $("profileDropdown");

    const notificationBtn = $("notificationBtn");
    const notificationDropdown = $("notificationDropdown");

    const sidebar = $("sidebar");
    const menuToggle = $("menuToggle");

    /* =====================================================
       SIDEBAR TOGGLE
    ===================================================== */

    menuToggle?.addEventListener("click", (event) => {
        event.stopPropagation();

        sidebar?.classList.toggle("collapsed");
    });

    /* =====================================================
       PROFILE DROPDOWN
    ===================================================== */

    profileBtn?.addEventListener("click", (event) => {
        event.stopPropagation();

        profileDropdown?.classList.toggle("show");

        notificationDropdown?.classList.remove("show");
    });

    /* =====================================================
       NOTIFICATION DROPDOWN
    ===================================================== */

    notificationBtn?.addEventListener("click", (event) => {
        event.stopPropagation();

        notificationDropdown?.classList.toggle("show");

        profileDropdown?.classList.remove("show");
    });

    /* =====================================================
       CLOSE DROPDOWNS
    ===================================================== */

    document.addEventListener("click", () => {
        profileDropdown?.classList.remove("show");

        notificationDropdown?.classList.remove("show");
    });

    /* =====================================================
       ESCAPE HTML
    ===================================================== */

    function escapeHTML(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /* =====================================================
       FORMAT DATE
    ===================================================== */

    function formatDate(dateValue) {
        if (!dateValue) {
            return "Date not available";
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return dateValue;
        }

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    }

    /* =====================================================
       FORMAT DATE + TIME
    ===================================================== */

    function formatDateTime(dateValue) {
        if (!dateValue) {
            return "Date not available";
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return dateValue;
        }

        return date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    /* =====================================================
       GET EXAM STATUS
    ===================================================== */

    function getExamStatus(exam) {
        /*
            If your backend already provides a student-specific
            status such as Completed, use it first.
        */

        if (exam.student_status && String(exam.student_status).toLowerCase() === "completed") {
            return "completed";
        }

        if (exam.attempted === true || exam.completed === true) {
            return "completed";
        }

        const examDate = new Date(exam.exam_date);

        if (Number.isNaN(examDate.getTime())) {
            return "available";
        }

        const now = new Date();

        if (examDate > now) {
            return "upcoming";
        }

        return "available";
    }

    /* =====================================================
       STATUS LABEL
    ===================================================== */

    function getStatusLabel(status) {
        const labels = {
            available: "Available",
            upcoming: "Upcoming",
            completed: "Completed",
            expired: "Expired",
        };

        return labels[status] || "Available";
    }

    /* =====================================================
       LOAD STUDENT
    ===================================================== */

    async function loadStudent() {
        try {
            const response = await fetch(API.students, {
                method: "GET",
                headers: authHeaders,
            });

            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    return;
                }

                throw new Error(`Student API error: ${response.status}`);
            }

            const data = await response.json();

            /*
                Supports:

                {
                    students: [...]
                }

                OR

                [...]
            */

            const students = Array.isArray(data) ? data : data.students || [];

            if (!students.length) {
                return;
            }

            const student = students[0];

            if ($("studentName")) {
                $("studentName").textContent = student.name || student.full_name || student.username || "Student";
            }
        } catch (error) {
            console.error("Student loading error:", error);
        }
    }

    /* =====================================================
       LOAD EXAMS
    ===================================================== */

    async function loadExams() {
        showLoading();

        try {
            const response = await fetch(API.exams, {
                method: "GET",
                headers: authHeaders,
            });

            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    return;
                }

                throw new Error(`Exam API error: ${response.status}`);
            }

            const data = await response.json();

            /*
                Supports either:

                [...]
                
                OR

                {
                    exams: [...]
                }
            */

            const exams = Array.isArray(data) ? data : data.exams || [];

            /*
                Only published exams are visible
                to students.
            */

            allExams = exams.filter((exam) => {
                return String(exam.status || "").toLowerCase() === "published";
            });

            updateStats();

            applyFilters();
        } catch (error) {
            console.error("Exam loading error:", error);

            showError();
        }
    }

    /* =====================================================
       UPDATE STATISTICS
    ===================================================== */

    function updateStats() {
        let available = 0;
        let upcoming = 0;
        let completed = 0;

        allExams.forEach((exam) => {
            const status = getExamStatus(exam);

            if (status === "available") {
                available++;
            } else if (status === "upcoming") {
                upcoming++;
            } else if (status === "completed") {
                completed++;
            }
        });

        if ($("totalExams")) {
            $("totalExams").textContent = allExams.length;
        }

        if ($("availableExams")) {
            $("availableExams").textContent = available;
        }

        if ($("upcomingExams")) {
            $("upcomingExams").textContent = upcoming;
        }

        if ($("completedExams")) {
            $("completedExams").textContent = completed;
        }
    }

    /* =====================================================
       APPLY SEARCH + FILTER
    ===================================================== */

    function applyFilters() {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        filteredExams = allExams.filter((exam) => {
            const status = getExamStatus(exam);

            /*
                FILTER
            */

            if (currentFilter !== "all" && status !== currentFilter) {
                return false;
            }

            /*
                SEARCH
            */

            if (!normalizedSearch) {
                return true;
            }

            const title = String(exam.title || "").toLowerCase();

            const subject = String(exam.subject || "").toLowerCase();

            const description = String(exam.description || "").toLowerCase();

            return (
                title.includes(normalizedSearch) ||
                subject.includes(normalizedSearch) ||
                description.includes(normalizedSearch)
            );
        });

        renderExams(filteredExams);
    }

    /* =====================================================
       RENDER EXAMS
    ===================================================== */

    function renderExams(exams) {
        if (!examContainer) {
            return;
        }

        examContainer.innerHTML = "";

        if (!exams.length) {
            showEmptyState();

            return;
        }

        exams.forEach((exam) => {
            const card = createExamCard(exam);

            examContainer.appendChild(card);
        });

        bindCardEvents();
    }

    /* =====================================================
       CREATE EXAM CARD
    ===================================================== */

    function createExamCard(exam) {
        const card = document.createElement("div");

        card.className = "exam-card";

        const examId = exam._id || exam.id;

        const title = escapeHTML(exam.title || "Untitled Exam");

        const subject = escapeHTML(exam.subject || "General");

        const description = escapeHTML(exam.description || "Complete the examination within the allotted time.");

        const questionCount = Array.isArray(exam.questions)
            ? exam.questions.length
            : exam.question_count || exam.total_questions || 0;

        const duration = exam.duration || 60;

        const formattedDate = formatDate(exam.exam_date);

        const status = getExamStatus(exam);

        const statusLabel = getStatusLabel(status);

        const isAvailable = status === "available";

        const isCompleted = status === "completed";

        const isUpcoming = status === "upcoming";

        card.innerHTML = `

            <div class="exam-header">

                <div>

                    <h3>
                        ${title}
                    </h3>

                    <span>
                        ${subject}
                    </span>

                </div>

                <span class="status-badge ${status}">
                    ${statusLabel}
                </span>

            </div>


            <p class="exam-description">
                ${description}
            </p>


            <div class="exam-meta">

                <div>

                    <i class="fa-solid fa-list"></i>

                    <span>
                        ${questionCount} Questions
                    </span>

                </div>


                <div>

                    <i class="fa-regular fa-clock"></i>

                    <span>
                        ${escapeHTML(duration)} Minutes
                    </span>

                </div>


                <div>

                    <i class="fa-solid fa-calendar-days"></i>

                    <span>
                        ${escapeHTML(formattedDate)}
                    </span>

                </div>

            </div>


            <div class="exam-actions">

                <button
                    type="button"
                    class="details-btn"
                    data-id="${escapeHTML(examId)}"
                >
                    View Details
                </button>


                ${
                    isAvailable
                        ? `
                            <button
                                type="button"
                                class="start-btn"
                                data-id="${escapeHTML(examId)}"
                            >
                                Start Exam
                            </button>
                        `
                        : isUpcoming
                          ? `
                                <button
                                    type="button"
                                    class="start-btn"
                                    disabled
                                >
                                    Upcoming
                                </button>
                            `
                          : `
                                <button
                                    type="button"
                                    class="details-btn"
                                    disabled
                                >
                                    Completed
                                </button>
                            `
                }

            </div>

        `;

        /*
            Add a class for completed cards
            if you want special styling.
        */

        if (isCompleted) {
            card.classList.add("exam-completed");
        }

        return card;
    }

    /* =====================================================
       BIND CARD EVENTS
    ===================================================== */

    function bindCardEvents() {
        /*
            VIEW DETAILS
        */

        document.querySelectorAll(".details-btn[data-id]").forEach((button) => {
            button.addEventListener("click", () => {
                const examId = button.dataset.id;

                const exam = allExams.find((item) => String(item._id || item.id) === String(examId));

                if (exam) {
                    showExamModal(exam);
                }
            });
        });

        /*
            START EXAM
        */

        document.querySelectorAll(".start-btn[data-id]").forEach((button) => {
            button.addEventListener("click", () => {
                const examId = button.dataset.id;

                if (!examId) {
                    return;
                }

                startExam(examId);
            });
        });
    }

    /* =====================================================
       SHOW EXAM DETAILS MODAL
    ===================================================== */

    function showExamModal(exam) {
        selectedExam = exam;

        const modal = $("examModal");

        const modalTitle = $("modalTitle");

        const modalBody = $("modalBody");

        if (!modal) {
            return;
        }

        const title = exam.title || "Exam Details";

        const subject = exam.subject || "Not specified";

        const questions = Array.isArray(exam.questions)
            ? exam.questions.length
            : exam.question_count || exam.total_questions || 0;

        const duration = exam.duration || 60;

        const status = getExamStatus(exam);

        const instructions = Array.isArray(exam.instructions) ? exam.instructions : [];

        if (modalTitle) {
            modalTitle.textContent = title;
        }

        if (modalBody) {
            modalBody.innerHTML = `

                <div class="modal-exam-details">

                    <p>
                        <strong>Subject:</strong>
                        ${escapeHTML(subject)}
                    </p>

                    <p>
                        <strong>Date:</strong>
                        ${escapeHTML(formatDateTime(exam.exam_date))}
                    </p>

                    <p>
                        <strong>Questions:</strong>
                        ${questions}
                    </p>

                    <p>
                        <strong>Duration:</strong>
                        ${escapeHTML(duration)}
                        Minutes
                    </p>

                    <p>
                        <strong>Status:</strong>
                        ${escapeHTML(getStatusLabel(status))}
                    </p>

                    <h4>
                        Instructions
                    </h4>

                    ${
                        instructions.length
                            ? `
                                <ul>
                                    ${instructions.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
                                </ul>
                            `
                            : `
                                <ul>
                                    <li>
                                        Read all questions carefully.
                                    </li>

                                    <li>
                                        Do not refresh the page during the examination.
                                    </li>

                                    <li>
                                        Ensure you have a stable internet connection.
                                    </li>

                                    <li>
                                        Submit your examination before the timer ends.
                                    </li>
                                </ul>
                            `
                    }

                </div>

            `;
        }

        modal.classList.add("show");

        document.body.style.overflow = "hidden";
    }

    /* =====================================================
       CLOSE MODAL
    ===================================================== */

    function closeModal() {
        const modal = $("examModal");

        modal?.classList.remove("show");

        document.body.style.overflow = "";

        selectedExam = null;
    }

    $("closeModal")?.addEventListener("click", closeModal);

    /*
        Close when clicking outside modal
    */

    $("examModal")?.addEventListener("click", (event) => {
        if (event.target === $("examModal")) {
            closeModal();
        }
    });

    /*
        Close with Escape
    */

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && $("examModal")?.classList.contains("show")) {
            closeModal();
        }
    });

    /* =====================================================
       START EXAM FROM MODAL
    ===================================================== */

    $("startExamBtn")?.addEventListener("click", () => {
        if (!selectedExam) {
            return;
        }

        const status = getExamStatus(selectedExam);

        if (status !== "available") {
            return;
        }

        const examId = selectedExam._id || selectedExam.id;

        startExam(examId);
    });

    /* =====================================================
       SEARCH
    ===================================================== */

    searchInput?.addEventListener("input", (event) => {
        searchTerm = event.target.value || "";

        applyFilters();
    });

    /* =====================================================
       FILTER BUTTONS
    ===================================================== */

    document.querySelectorAll(".filter-buttons button").forEach((button) => {
        button.addEventListener("click", () => {
            /*
                        Remove active state
                    */

            document.querySelectorAll(".filter-buttons button").forEach((btn) => {
                btn.classList.remove("active");
            });

            /*
                        Activate clicked button
                    */

            button.classList.add("active");

            /*
                        Determine filter
                    */

            const text = button.textContent.trim().toLowerCase();

            const filterMap = {
                all: "all",
                available: "available",
                upcoming: "upcoming",
                completed: "completed",
            };

            currentFilter = filterMap[text] || "all";

            applyFilters();
        });
    });

    /* =====================================================
       START EXAM
    ===================================================== */

    function startExam(examId) {

    if (!examId) {
        console.error("Exam ID is missing.");
        return;
    }

    closeModal();

    window.location.href =
        `attempt-exam.html?examId=${encodeURIComponent(examId)}`;
    }

    /* =====================================================
       LOADING STATE
    ===================================================== */

    function showLoading() {
        if (!examContainer) {
            return;
        }

        examContainer.innerHTML = `

            <div class="loading-card">

                <i class="fa-solid fa-spinner"></i>

                <p>
                    Loading available exams...
                </p>

            </div>

        `;
    }

    /* =====================================================
       EMPTY STATE
    ===================================================== */

    function showEmptyState() {
        if (!examContainer) {
            return;
        }

        let title = "No Exams Found";

        let message = "There are no exams matching your current selection.";

        if (currentFilter === "available") {
            title = "No Available Exams";

            message = "There are currently no exams available to attempt.";
        } else if (currentFilter === "upcoming") {
            title = "No Upcoming Exams";

            message = "There are no upcoming examinations.";
        } else if (currentFilter === "completed") {
            title = "No Completed Exams";

            message = "You have not completed any examinations yet.";
        }

        examContainer.innerHTML = `

            <div class="empty-state">

                <i class="fa-solid fa-file-circle-xmark"></i>

                <h3>
                    ${title}
                </h3>

                <p>
                    ${message}
                </p>

            </div>

        `;
    }

    /* =====================================================
       ERROR STATE
    ===================================================== */

    function showError() {
        if (!examContainer) {
            return;
        }

        examContainer.innerHTML = `

            <div class="empty-state">

                <i class="fa-solid fa-circle-exclamation"></i>

                <h3>
                    Unable to Load Exams
                </h3>

                <p>
                    Something went wrong while loading exams.
                    Please try again.
                </p>

                <button
                    type="button"
                    class="primary-btn"
                    id="retryExamBtn"
                    style="max-width:130px;margin-top:12px;"
                >
                    Try Again
                </button>

            </div>

        `;

        $("retryExamBtn")?.addEventListener("click", loadExams);
    }

    /* =====================================================
       LOGOUT
    ===================================================== */

    function logout(event) {
        if (event) {
            event.preventDefault();
        }

        /*
            Remove authentication/session data
        */

        localStorage.removeItem("access_token");

        localStorage.removeItem("refresh_token");

        localStorage.removeItem("selected_exam_id");

        /*
            Redirect
        */

        window.location.href = "auth333.html";
    }

    $("logoutBtn")?.addEventListener("click", logout);

    $("logoutDropdownBtn")?.addEventListener("click", logout);

    /* =====================================================
       INITIALIZE PAGE
    ===================================================== */

    async function initializePage() {
        await Promise.all([loadStudent(), loadExams()]);
    }

    initializePage();
});
