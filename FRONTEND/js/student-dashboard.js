document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // CONFIG
    // ==========================================

    const BASE_URL = "http://127.0.0.1:8000";

    const API = {
        me: `${BASE_URL}/api/students/me/`,
        schedule: `${BASE_URL}/api/results/schedule/`,   // exams + status + can_start
        exams: `${BASE_URL}/api/exams/`,                 // fallback if schedule is unavailable
        results: `${BASE_URL}/api/results/student/`,     // this student's results
        history: `${BASE_URL}/api/results/history/`      // activity log
    };

    const AUTH_SCHEME = "Bearer";

    const TABLE_LIMIT = 8;       // rows in the exam table
    const CHART_LIMIT = 8;       // points on the performance chart
    const ACTIVITY_LIMIT = 5;    // items in Recent Activity
    const NOTIFY_DAYS = 7;       // upcoming exams inside this window are notifications

    // ==========================================
    // AUTH CHECK
    // ==========================================

    const token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "auth333.html";
        return;
    }

    function clearSession() {
        [
            "access_token",
            "refresh_token",
            "student_name",
            "student_email",
            "selected_exam_id"
        ].forEach((key) => localStorage.removeItem(key));
    }

    function redirectToLogin() {
        clearSession();
        window.location.href = "auth333.html";
    }

    // fetch() that sends the token, logs out on 401 and keeps the HTTP status on errors
    async function authFetch(url) {

        const response = await fetch(url, {
            headers: {
                "Authorization": `${AUTH_SCHEME} ${token}`,
                "Accept": "application/json"
            }
        });

        if (response.status === 401) {
            redirectToLogin();
            throw new Error("Session expired");
        }

        if (!response.ok) {
            const error = new Error(`HTTP Error ${response.status}`);
            error.status = response.status;
            throw error;
        }

        return response.json();
    }

    // ==========================================
    // HELPERS
    // ==========================================

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    const startOfDay = (date) =>
        new Date(date.getFullYear(), date.getMonth(), date.getDate());

    /**
     * Understands "2026-12-01", "01-12-2026", "2026-12-01T10:30" and full ISO.
     * Returns { date, hasTime } or null.
     */
    function parseExamDate(value) {

        if (!value) return null;

        const text = String(value).trim();

        let match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
            return { date: new Date(+match[1], +match[2] - 1, +match[3]), hasTime: false };
        }

        match = text.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
        if (match) {
            return { date: new Date(+match[3], +match[2] - 1, +match[1]), hasTime: false };
        }

        const parsed = new Date(text);
        if (Number.isNaN(parsed.getTime())) return null;

        return { date: parsed, hasTime: /[T ]\d{1,2}:\d{2}/.test(text) };
    }

    function formatExamDate(exam) {

        if (!exam.date) return "-";

        const day = exam.date.toLocaleDateString(undefined, {
            day: "2-digit", month: "short", year: "numeric"
        });

        if (!exam.hasTime) return day;

        const time = exam.date.toLocaleTimeString([], {
            hour: "2-digit", minute: "2-digit"
        });

        return `${day}, ${time}`;
    }

    function timeAgo(value) {

        const date = value ? new Date(value) : null;
        if (!date || Number.isNaN(date.getTime())) return "";

        const seconds = Math.round((Date.now() - date.getTime()) / 1000);

        if (seconds < 60) return "just now";
        if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
        if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)} days ago`;

        return date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
    }

    function shortTitle(text, max = 14) {
        const value = String(text || "Exam");
        return value.length > max ? value.slice(0, max - 1) + "…" : value;
    }

    // ==========================================
    // SIDEBAR + DROPDOWNS
    // ==========================================

    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");

    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", () => {
            sidebar.classList.toggle("collapsed");
        });
    }

    const profileBtn = document.getElementById("profileBtn");
    const profileDropdown = document.getElementById("profileDropdown");
    const notificationBtn = document.getElementById("notificationBtn");
    const notificationDropdown = document.getElementById("notificationDropdown");

    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener("click", (e) => {
            if (e.target.closest("a")) return;
            e.stopPropagation();
            notificationDropdown?.classList.remove("show");
            profileDropdown.classList.toggle("show");
        });
    }

    if (notificationBtn && notificationDropdown) {
        notificationBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            profileDropdown?.classList.remove("show");
            notificationDropdown.classList.toggle("show");
        });
    }

    document.addEventListener("click", () => {
        profileDropdown?.classList.remove("show");
        notificationDropdown?.classList.remove("show");
    });

    // ==========================================
    // GREETING + PROFILE
    // ==========================================

    const hour = new Date().getHours();
    let greeting = "Good Evening";

    if (hour < 12) {
        greeting = "Good Morning";
    } else if (hour < 17) {
        greeting = "Good Afternoon";
    }

    setText("greetingText", greeting);

    function showStudentName(name) {
        setText("studentName", name);
        setText("studentHeroName", name);
    }

    async function loadProfile() {

        // Show the name saved at login straight away.
        const savedName = localStorage.getItem("student_name");
        showStudentName(savedName || "Student");

        try {
            const data = await authFetch(API.me);

            const student = data.student || data;
            const name = student.name || student.full_name || savedName || "Student";

            showStudentName(name);
            localStorage.setItem("student_name", name);

        } catch (error) {
            console.warn("Profile not loaded:", error.message);
        }
    }

    // ==========================================
    // EXAMS (table, cards, notifications)
    // ==========================================

    const STATUS_LABEL = {
        completed: "Completed",
        today: "Today",
        upcoming: "Upcoming",
        missed: "Missed",
        unscheduled: "Open"
    };

    // One shape for both endpoints.
    function normalizeExam(item) {

        const parsed = parseExamDate(item.starts_at || item.exam_date);
        const today = startOfDay(new Date());

        const attempted =
            item.attempted === true ||
            item.completed === true ||
            item.schedule_status === "completed";

        let status = item.schedule_status;

        if (!status) {
            if (attempted) status = "completed";
            else if (!parsed) status = "unscheduled";
            else if (startOfDay(parsed.date) > today) status = "upcoming";
            else if (startOfDay(parsed.date).getTime() === today.getTime()) status = "today";
            else status = "missed";
        }

        const canStart = typeof item.can_start === "boolean"
            ? item.can_start
            : (!attempted && (!parsed || startOfDay(parsed.date) <= today));

        return {
            id: String(item._id || item.id || ""),
            title: item.title || item.exam_name || "Examination",
            subject: item.subject || "",
            date: parsed ? parsed.date : null,
            hasTime: parsed ? parsed.hasTime : false,
            duration: item.duration,
            attempted,
            status,
            canStart: canStart && !attempted
        };
    }

    function listFrom(data, keys) {
        if (Array.isArray(data)) return data;
        for (const key of keys) {
            if (data && Array.isArray(data[key])) return data[key];
        }
        return [];
    }

    async function fetchExams() {

        try {
            const data = await authFetch(API.schedule);
            return listFrom(data, ["exams"]).map(normalizeExam);
        } catch (error) {
            console.warn("Schedule endpoint unavailable, using /api/exams/:", error.message);
        }

        const data = await authFetch(API.exams);
        return listFrom(data, ["exams", "results", "data"]).map(normalizeExam);
    }

    // Today, then upcoming (soonest first), then undated, then missed, then completed (newest first).
    const TABLE_RANK = { today: 0, upcoming: 1, unscheduled: 2, missed: 3, completed: 4 };

    function sortForTable(exams) {

        return [...exams].sort((a, b) => {

            const rank = (TABLE_RANK[a.status] ?? 5) - (TABLE_RANK[b.status] ?? 5);
            if (rank !== 0) return rank;

            const first = a.date ? a.date.getTime() : 0;
            const second = b.date ? b.date.getTime() : 0;

            return a.status === "completed" || a.status === "missed"
                ? second - first      // newest first
                : first - second;     // soonest first
        });
    }

    function actionFor(exam) {

        if (exam.attempted) {
            return `<a class="details-btn" href="student-results.html?exam_id=${encodeURIComponent(exam.id)}"
                       style="text-decoration:none;">View Result</a>`;
        }

        if (exam.canStart) {
            return `<button class="details-btn" type="button"
                        data-exam-id="${escapeHtml(exam.id)}">Start</button>`;
        }

        if (exam.status === "upcoming" && exam.date) {
            return `<span>Opens ${escapeHtml(exam.date.toLocaleDateString(undefined, { day: "2-digit", month: "short" }))}</span>`;
        }

        return `<span>-</span>`;
    }

    function renderExamRows(exams) {

        const tableBody = document.getElementById("examTableBody");
        if (!tableBody) return;

        if (exams.length === 0) {
            tableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="5">
                        <div class="empty-state">
                            <i class="fa-regular fa-calendar-xmark"></i>
                            <p>No exams available</p>
                            <span>New examinations will appear here once published.</span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = sortForTable(exams).slice(0, TABLE_LIMIT).map((exam) => `
            <tr>
                <td>${escapeHtml(exam.title)}</td>
                <td>${escapeHtml(formatExamDate(exam))}</td>
                <td>${exam.duration ? escapeHtml(exam.duration) + " min" : "-"}</td>
                <td>
                    <span class="status-badge ${exam.status}">
                        ${escapeHtml(STATUS_LABEL[exam.status] || exam.status)}
                    </span>
                </td>
                <td>${actionFor(exam)}</td>
            </tr>
        `).join("");
    }

    function renderExamStats(exams) {

        // Pending = still to be taken (missed ones are shown but not counted).
        const completed = exams.filter((e) => e.attempted).length;
        const pending = exams.filter((e) => !e.attempted && e.status !== "missed").length;

        setText("totalExams", exams.length);
        setText("completedExams", completed);
        setText("pendingExams", pending);
    }

    function renderNotifications(exams) {

        const list = notificationDropdown?.querySelector("ul");
        const today = startOfDay(new Date());

        const items = exams
            .filter((e) => !e.attempted && e.date && (e.status === "today" || e.status === "upcoming"))
            .map((e) => ({
                exam: e,
                days: Math.round((startOfDay(e.date) - today) / 86400000)
            }))
            .filter((x) => x.days >= 0 && x.days <= NOTIFY_DAYS)
            .sort((a, b) => a.days - b.days)
            .slice(0, 5)
            .map(({ exam, days }) => {
                const when = days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
                return `${when}: ${exam.title}`;
            });

        if (list) {
            list.innerHTML = items.length
                ? items.map((text) => `<li>${escapeHtml(text)}</li>`).join("")
                : `<li>No new notifications</li>`;
        }

        const badge = document.getElementById("notificationCount");
        if (badge) {
            badge.textContent = items.length;
            badge.style.display = items.length ? "" : "none";
        }
    }

    async function loadExams() {

        try {
            const exams = await fetchExams();

            renderExamRows(exams);
            renderExamStats(exams);
            renderNotifications(exams);

        } catch (error) {

            console.error("Exam Error:", error);

            const tableBody = document.getElementById("examTableBody");
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr class="empty-row">
                        <td colspan="5">
                            <div class="empty-state">
                                <i class="fa-solid fa-triangle-exclamation"></i>
                                <p>Unable to load exams</p>
                                <span>${escapeHtml(error.message || "Please try again later.")}</span>
                            </div>
                        </td>
                    </tr>
                `;
            }

            renderNotifications([]);
        }
    }

    // ==========================================
    // RESULTS (average score, chart)
    // ==========================================

    function normalizeResult(item) {
        return {
            title: item.exam_title || item.exam_name || item.title || "Exam",
            percentage: Number(item.percentage),
            submittedAt: item.submitted_at ? new Date(item.submitted_at) : null
        };
    }

    let performanceChart = null;

    function createPerformanceChart() {

        const canvas = document.getElementById("performanceChart");
        if (!canvas || typeof Chart === "undefined") return;

        if (performanceChart) performanceChart.destroy();

        performanceChart = new Chart(canvas, {
            type: "line",
            data: {
                labels: ["No Data"],
                datasets: [{
                    label: "Score",
                    data: [0],
                    borderColor: "#2563eb",
                    backgroundColor: "rgba(37, 99, 235, 0.1)",
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.parsed.y}%`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { callback: (value) => `${value}%` }
                    }
                }
            }
        });
    }

    function updatePerformanceChart(results) {

        if (!performanceChart) return;

        const points = results
            .filter((r) => Number.isFinite(r.percentage))
            .sort((a, b) => (a.submittedAt ?? 0) - (b.submittedAt ?? 0))
            .slice(-CHART_LIMIT);

        performanceChart.data.labels = points.length
            ? points.map((r) => shortTitle(r.title))
            : ["No Data"];

        performanceChart.data.datasets[0].data = points.length
            ? points.map((r) => r.percentage)
            : [0];

        performanceChart.update();
    }

    function renderAverage(results) {

        const scores = results
            .map((r) => r.percentage)
            .filter((value) => Number.isFinite(value));

        if (!scores.length) {
            setText("averageScore", "—");
            return;
        }

        const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;

        setText("averageScore", `${Number(average.toFixed(1))}%`);
    }

    async function loadResults() {

        try {
            const data = await authFetch(API.results);

            const results = listFrom(data, ["results", "data"]).map(normalizeResult);

            renderAverage(results);
            updatePerformanceChart(results);

            return results;

        } catch (error) {

            console.error("Results Error:", error);

            setText("averageScore", "—");
            updatePerformanceChart([]);

            return [];
        }
    }

    // ==========================================
    // RECENT ACTIVITY
    // ==========================================

    const ACTIVITY = {
        started: { icon: "fa-play", verb: "Started" },
        resumed: { icon: "fa-rotate-right", verb: "Resumed" },
        submitted: { icon: "fa-circle-check", verb: "Submitted" },
        auto_submitted: { icon: "fa-hourglass-end", verb: "Auto-submitted" },
        interrupted: { icon: "fa-triangle-exclamation", verb: "Interrupted" },
        missed: { icon: "fa-calendar-xmark", verb: "Missed" }
    };

    function renderActivity(items) {

        const container = document.getElementById("activityContainer");
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-regular fa-clock"></i>
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }

        container.innerHTML = items.slice(0, ACTIVITY_LIMIT).map((item) => {

            const meta = ACTIVITY[item.type] || { icon: "fa-circle", verb: "Activity" };

            return `
                <div class="activity-item">
                    <i class="fa-solid ${meta.icon}"></i>
                    <span>${escapeHtml(meta.verb)} ${escapeHtml(item.title)}</span>
                    <small>${escapeHtml(timeAgo(item.at))}</small>
                </div>
            `;
        }).join("");
    }

    async function loadActivity(results) {

        try {
            const data = await authFetch(API.history);

            const items = listFrom(data, ["activities", "results", "data"]).map((a) => ({
                type: a.activity_type,
                title: a.exam_title || a.exam_name || "exam",
                at: a.activity_at
            }));

            renderActivity(items);

        } catch (error) {

            console.warn("Activity history unavailable, using results:", error.message);

            // Fall back to the submitted results.
            renderActivity(
                [...results]
                    .sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0))
                    .map((r) => ({
                        type: "submitted",
                        title: r.title,
                        at: r.submittedAt ? r.submittedAt.toISOString() : null
                    }))
            );
        }
    }

    // ==========================================
    // START EXAM (one listener for all buttons)
    // ==========================================

    document.getElementById("examTableBody")?.addEventListener("click", (e) => {

        const btn = e.target.closest("[data-exam-id]");
        if (!btn) return;

        localStorage.setItem("selected_exam_id", btn.dataset.examId);

        window.location.href =
            `attempt-exam.html?examId=${encodeURIComponent(btn.dataset.examId)}`;
    });

    // ==========================================
    // LOGOUT
    // ==========================================

    function logout(e) {
        e.preventDefault();
        redirectToLogin();
    }

    document.getElementById("logoutBtn")?.addEventListener("click", logout);
    document.getElementById("logoutDropdownBtn")?.addEventListener("click", logout);

    // ==========================================
    // LOAD EVERYTHING
    // ==========================================

    async function loadAll() {

        // Exams and results are independent, so one failing never blanks the other.
        const [, results] = await Promise.all([loadExams(), loadResults()]);

        await loadActivity(results);
    }

    // Refresh when the student comes back to this page (for example after
    // submitting an exam and pressing Back).
    window.addEventListener("pageshow", (event) => {
        if (event.persisted) loadAll();
    });

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") loadAll();
    });

    // ==========================================
    // INITIAL LOAD
    // ==========================================

    createPerformanceChart();
    loadProfile();
    loadAll();
});