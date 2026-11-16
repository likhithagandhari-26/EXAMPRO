
document.addEventListener("DOMContentLoaded", () => {
    // ================= API CONFIGURATION =================

    const API = {
        me: "http://127.0.0.1:8000/api/students/me/",
        schedule: "http://127.0.0.1:8000/api/results/schedule/",
        exams: "http://127.0.0.1:8000/api/exams/",
        results: "http://127.0.0.1:8000/api/results/student/"
    };

    const token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "auth333.html";
        return;
    }

    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
    };

    // ================= STATE =================

    let allExams = [];
    let filteredExams = [];
    let selectedExam = null;
    let searchTerm = "";

    const params = new URLSearchParams(window.location.search);
    const requestedFilter = params.get("filter");

    let currentFilter = [
        "all", "available", "upcoming", "pending", "completed"
    ].includes(requestedFilter) ? requestedFilter : "all";

    // ================= DOM ELEMENTS =================

    const $ = id => document.getElementById(id);

    const examContainer = $("examContainer");
    const searchInput = $("searchInput");

    const sidebar = $("sidebar");
    const menuToggle = $("menuToggle");

    const profileBtn = $("profileBtn");
    const profileDropdown = $("profileDropdown");

    const notificationBtn = $("notificationBtn");
    const notificationDropdown = $("notificationDropdown");

    // ================= HELPERS =================

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function getList(data, keys = []) {
        if (Array.isArray(data)) return data;

        for (const key of keys) {
            if (Array.isArray(data?.[key])) return data[key];
        }

        return [];
    }

    function getExamId(exam) {
        return String(
            exam?._id ??
            exam?.id ??
            exam?.exam_id ??
            exam?.examId ??
            exam?.exam?._id ??
            exam?.exam?.id ??
            ""
        );
    }

    function toBoolean(value) {
        if (value === true || value === 1) return true;
        if (value === false || value === 0 || value == null) return false;

        const text = String(value).trim().toLowerCase();

        return [
            "true", "yes", "1", "completed",
            "submitted", "attempted", "finished"
        ].includes(text);
    }

    function isExamAttempted(exam) {
        const status = String(
            exam.schedule_status ??
            exam.student_status ??
            exam.attempt_status ??
            exam.result_status ??
            ""
        ).trim().toLowerCase();

        return (
            toBoolean(exam.attempted) ||
            toBoolean(exam.completed) ||
            toBoolean(exam.is_attempted) ||
            toBoolean(exam.is_completed) ||
            [
                "completed",
                "submitted",
                "attempted",
                "finished"
            ].includes(status)
        );
    }

    function isExamMissed(exam) {
        const status = String(
            exam.schedule_status ??
            exam.student_status ??
            exam.attempt_status ??
            ""
        ).trim().toLowerCase();

        return [
            "missed",
            "expired",
            "cancelled",
            "canceled"
        ].includes(status);
    }

    function formatDate(value) {
        if (!value) return "Date not available";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return value;

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function formatDateTime(value) {
        if (!value) return "Date not available";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return value;

        return date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    // ================= EXAM STATUS =================

    function getExamStatus(exam) {
        if (isExamAttempted(exam)) return "completed";
        if (isExamMissed(exam)) return "expired";

        const dateValue = exam.starts_at || exam.exam_date;
        if (!dateValue) return "available";

        const examDate = new Date(dateValue);

        if (Number.isNaN(examDate.getTime())) return "available";

        return examDate > new Date() ? "upcoming" : "available";
    }

    function getStatusLabel(status) {
        const labels = {
            available: "Available",
            upcoming: "Upcoming",
            completed: "Completed",
            expired: "Missed"
        };

        return labels[status] || "Available";
    }

    // ================= SIDEBAR =================

    menuToggle?.addEventListener("click", event => {
        event.stopPropagation();
        sidebar?.classList.toggle("collapsed");
    });

    // ================= DROPDOWNS =================

    profileBtn?.addEventListener("click", event => {
        event.stopPropagation();
        profileDropdown?.classList.toggle("show");
        notificationDropdown?.classList.remove("show");
    });

    notificationBtn?.addEventListener("click", event => {
        event.stopPropagation();
        notificationDropdown?.classList.toggle("show");
        profileDropdown?.classList.remove("show");
    });

    document.addEventListener("click", () => {
        profileDropdown?.classList.remove("show");
        notificationDropdown?.classList.remove("show");
    });

    // ================= LOAD STUDENT =================

    async function loadStudent() {
        try {
            const response = await fetch(API.me, { headers });

            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    return;
                }
                throw new Error(`Student API error: ${response.status}`);
            }

            const data = await response.json();

            const students = data.student
                ? [data.student]
                : Array.isArray(data)
                    ? data
                    : data.students || [];

            const student = students[0];

            if ($("studentName") && student) {
                $("studentName").textContent =
                    student.name ||
                    student.full_name ||
                    student.username ||
                    "Student";
            }
        } catch (error) {
            console.error("Student loading error:", error);
        }
    }

    // ================= LOAD COMPLETED RESULTS =================

    async function loadCompletedExamIds() {
        try {
            const response = await fetch(API.results, { headers });

            if (!response.ok) {
                throw new Error(`Results API error: ${response.status}`);
            }

            const data = await response.json();

            const results = getList(data, [
                "results", "data", "submissions"
            ]);

            return new Set(
                results
                    .map(result => {
                        const id =
                            result.exam_id ??
                            result.examId ??
                            result.exam?._id ??
                            result.exam?.id ??
                            result.exam;

                        return id == null ? "" : String(id);
                    })
                    .filter(Boolean)
            );
        } catch (error) {
            console.warn("Could not load results:", error);
            return new Set();
        }
    }

    // ================= LOAD EXAMS =================

    async function loadExams() {
        showLoading();

        try {
            let exams = [];
            let scheduleLoaded = false;

            // First use the student-specific schedule API.
            try {
                const response = await fetch(API.schedule, { headers });

                if (response.ok) {
                    const data = await response.json();

                    exams = getList(data, [
                        "exams", "results", "data", "schedules"
                    ]);

                    scheduleLoaded = exams.length > 0;
                }
            } catch (error) {
                console.warn("Schedule API unavailable:", error);
            }

            // Fallback to the general exams API.
            if (!scheduleLoaded) {
                const response = await fetch(API.exams, { headers });

                if (!response.ok) {
                    if (response.status === 401) {
                        logout();
                        return;
                    }

                    throw new Error(`Exam API error: ${response.status}`);
                }

                const data = await response.json();

                exams = getList(data, ["exams", "results", "data"]);

                const completedIds = await loadCompletedExamIds();

                exams = exams.map(exam => {
                    if (completedIds.has(getExamId(exam))) {
                        return {
                            ...exam,
                            attempted: true,
                            student_status: "completed"
                        };
                    }

                    return exam;
                });
            }

            // If schedule entries contain a nested exam object,
            // combine it with the student-specific status fields.
            exams = exams.map(item => {
                if (item.exam && typeof item.exam === "object") {
                    return {
                        ...item.exam,
                        ...item,
                        _id: item.exam._id || item.exam.id || item._id
                    };
                }

                return item;
            });

            // Only show published exams.
            allExams = exams.filter(exam => {
                const publicationStatus = String(
                    exam.status ?? exam.exam_status ?? ""
                ).toLowerCase();

                return !publicationStatus ||
                    publicationStatus === "published";
            });

            updateStats();
            syncFilterButtons();
            applyFilters();

        } catch (error) {
            console.error("Exam loading error:", error);
            showError();
        }
    }

    // ================= STATISTICS =================

    function updateStats() {
        let available = 0;
        let upcoming = 0;
        let completed = 0;

        allExams.forEach(exam => {
            const status = getExamStatus(exam);

            if (status === "available") available++;
            if (status === "upcoming") upcoming++;
            if (status === "completed") completed++;
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

    // ================= FILTERS =================

    function applyFilters() {
        const search = searchTerm.trim().toLowerCase();

        filteredExams = allExams.filter(exam => {
            const status = getExamStatus(exam);

            // Pending means the student has NOT attempted the exam.
            // Future exams are also pending until attempted.
            if (currentFilter === "pending") {
                if (isExamAttempted(exam) || isExamMissed(exam)) {
                    return false;
                }
            } else if (
                currentFilter !== "all" &&
                status !== currentFilter
            ) {
                return false;
            }

            if (!search) return true;

            const title = String(exam.title || "").toLowerCase();
            const subject = String(exam.subject || "").toLowerCase();
            const description = String(exam.description || "").toLowerCase();

            return (
                title.includes(search) ||
                subject.includes(search) ||
                description.includes(search)
            );
        });

        renderExams(filteredExams);
    }

    function syncFilterButtons() {
        document.querySelectorAll(".filter-buttons button").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.filter === currentFilter ||
                (!button.dataset.filter &&
                    button.textContent.trim().toLowerCase() === currentFilter)
            );
        });
    }

    document.querySelectorAll(".filter-buttons button").forEach(button => {
        button.addEventListener("click", () => {
            const text = button.textContent.trim().toLowerCase();

            const filterMap = {
                all: "all",
                available: "available",
                upcoming: "upcoming",
                pending: "pending",
                completed: "completed"
            };

            currentFilter =
                button.dataset.filter ||
                filterMap[text] ||
                "all";

            syncFilterButtons();
            applyFilters();
        });
    });

    searchInput?.addEventListener("input", event => {
        searchTerm = event.target.value || "";
        applyFilters();
    });

    // ================= RENDER EXAMS =================

    function renderExams(exams) {
        if (!examContainer) return;

        examContainer.innerHTML = "";

        if (!exams.length) {
            showEmptyState();
            return;
        }

        exams.forEach(exam => {
            examContainer.appendChild(createExamCard(exam));
        });

        bindCardEvents();
    }

    function createExamCard(exam) {
        const card = document.createElement("div");

        card.className = "exam-card";

        const id = getExamId(exam);
        const title = escapeHTML(exam.title || "Untitled Exam");
        const subject = escapeHTML(exam.subject || "General");
        const description = escapeHTML(
            exam.description ||
            "Complete the examination within the allotted time."
        );

        const questionCount = Array.isArray(exam.questions)
            ? exam.questions.length
            : exam.question_count || exam.total_questions || 0;

        const duration = exam.duration
            ? `${exam.duration} Minutes`
            : "Duration not set";

        const status = getExamStatus(exam);

        const available = status === "available";
        const completed = status === "completed";
        const upcoming = status === "upcoming";

        card.innerHTML = `
            <div class="exam-header">
                <div>
                    <h3>${title}</h3>
                    <span>${subject}</span>
                </div>
                <span class="status-badge ${status}">
                    ${getStatusLabel(status)}
                </span>
            </div>

            <p class="exam-description">${description}</p>

            <div class="exam-meta">
                <div>
                    <i class="fa-solid fa-list"></i>
                    <span>${questionCount} Questions</span>
                </div>

                <div>
                    <i class="fa-regular fa-clock"></i>
                    <span>${escapeHTML(duration)}</span>
                </div>

                <div>
                    <i class="fa-solid fa-calendar-days"></i>
                    <span>${escapeHTML(formatDate(exam.exam_date))}</span>
                </div>
            </div>

            <div class="exam-actions">
                <button type="button" class="details-btn" data-id="${escapeHTML(id)}">
                    View Details
                </button>

                ${
                    available
                        ? `<button type="button" class="start-btn" data-id="${escapeHTML(id)}">Start Exam</button>`
                        : upcoming
                            ? `<button type="button" class="start-btn" disabled>Upcoming</button>`
                            : completed
                                ? `<button type="button" class="details-btn" disabled>Completed</button>`
                                : `<button type="button" class="details-btn" disabled>Missed</button>`
                }
            </div>
        `;

        if (completed) card.classList.add("exam-completed");

        return card;
    }

    function bindCardEvents() {
        document.querySelectorAll(".details-btn[data-id]").forEach(button => {
            button.addEventListener("click", () => {
                const exam = allExams.find(
                    item => getExamId(item) === button.dataset.id
                );

                if (exam) showExamModal(exam);
            });
        });

        document.querySelectorAll(".start-btn[data-id]").forEach(button => {
            button.addEventListener("click", () => {
                startExam(button.dataset.id);
            });
        });
    }

    // ================= EXAM DETAILS MODAL =================

    function showExamModal(exam) {
        selectedExam = exam;

        const modal = $("examModal");
        const modalTitle = $("modalTitle");
        const modalBody = $("modalBody");

        if (!modal) return;

        const questions = Array.isArray(exam.questions)
            ? exam.questions.length
            : exam.question_count || exam.total_questions || 0;

        const instructions = Array.isArray(exam.instructions)
            ? exam.instructions
            : String(exam.instructions || "")
                .split("\n")
                .map(item => item.trim())
                .filter(Boolean);

        if (modalTitle) {
            modalTitle.textContent = exam.title || "Exam Details";
        }

        if (modalBody) {
            modalBody.innerHTML = `
                <div class="modal-exam-details">
                    <p><strong>Subject:</strong> ${escapeHTML(exam.subject || "Not specified")}</p>
                    <p><strong>Date:</strong> ${escapeHTML(formatDateTime(exam.exam_date))}</p>
                    <p><strong>Questions:</strong> ${questions}</p>
                    <p><strong>Duration:</strong> ${escapeHTML(exam.duration ? `${exam.duration} Minutes` : "Duration not set")}</p>
                    <p><strong>Status:</strong> ${escapeHTML(getStatusLabel(getExamStatus(exam)))}</p>

                    <h4>Instructions</h4>

                    <ul>
                        ${
                            instructions.length
                                ? instructions.map(item => `<li>${escapeHTML(item)}</li>`).join("")
                                : `
                                    <li>Read all questions carefully.</li>
                                    <li>Do not refresh the page during the examination.</li>
                                    <li>Ensure you have a stable internet connection.</li>
                                    <li>Submit your examination before the timer ends.</li>
                                `
                        }
                    </ul>
                </div>
            `;
        }

        modal.classList.add("show");
        document.body.style.overflow = "hidden";
    }

    function closeModal() {
        $("examModal")?.classList.remove("show");
        document.body.style.overflow = "";
        selectedExam = null;
    }

    $("closeModal")?.addEventListener("click", closeModal);

    $("examModal")?.addEventListener("click", event => {
        if (event.target === $("examModal")) closeModal();
    });

    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            $("examModal")?.classList.contains("show")
        ) {
            closeModal();
        }
    });

    $("startExamBtn")?.addEventListener("click", () => {
        if (!selectedExam) return;
        if (getExamStatus(selectedExam) !== "available") return;

        startExam(getExamId(selectedExam));
    });

    // ================= START EXAM =================

    function startExam(examId) {
        if (!examId) {
            console.error("Exam ID is missing.");
            return;
        }

        closeModal();

        window.location.href =
            `attempt-exam.html?examId=${encodeURIComponent(examId)}`;
    }

    // ================= LOADING / EMPTY / ERROR =================

    function showLoading() {
        if (!examContainer) return;

        examContainer.innerHTML = `
            <div class="loading-card">
                <i class="fa-solid fa-spinner"></i>
                <p>Loading available exams...</p>
            </div>
        `;
    }

    function showEmptyState() {
        if (!examContainer) return;

        const messages = {
            all: ["No Exams Found", "There are no examinations available."],
            available: ["No Available Exams", "There are currently no exams available to attempt."],
            upcoming: ["No Upcoming Exams", "There are no upcoming examinations."],
            completed: ["No Completed Exams", "You have not completed any examinations yet."],
            pending: ["No Pending Exams", "You have no examinations waiting to be attempted."]
        };

        const [title, message] = messages[currentFilter] || messages.all;

        examContainer.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-file-circle-xmark"></i>
                <h3>${title}</h3>
                <p>${message}</p>
            </div>
        `;
    }

    function showError() {
        if (!examContainer) return;

        examContainer.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-circle-exclamation"></i>
                <h3>Unable to Load Exams</h3>
                <p>Something went wrong while loading exams. Please try again.</p>
                <button type="button" class="primary-btn" id="retryExamBtn">
                    Try Again
                </button>
            </div>
        `;

        $("retryExamBtn")?.addEventListener("click", loadExams);
    }

    // ================= LOGOUT =================

    function logout(event) {
        event?.preventDefault();

        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("selected_exam_id");
        localStorage.removeItem("student_name");
        localStorage.removeItem("student_email");

        window.location.href = "auth333.html";
    }

    $("logoutBtn")?.addEventListener("click", logout);
    $("logoutDropdownBtn")?.addEventListener("click", logout);

    // ================= INITIALIZE =================

    async function initializePage() {
        await Promise.all([
            loadStudent(),
            loadExams()
        ]);
    }

    initializePage();
});
