document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const BASE_URL = "http://127.0.0.1:8000";
    const API = {
        profile: `${BASE_URL}/api/students/me/`,
        exams: `${BASE_URL}/api/exams/`
    };

    const token = localStorage.getItem("access_token");
    if (!token) {
        window.location.href = "auth333.html";
        return;
    }

    const $ = id => document.getElementById(id);
    const MONTHS = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    const state = {
        exams: [],
        view: new Date(),     // month shown in the calendar
        filter: "all",
        selected: null,       // exam shown in the modal
        next: null            // next upcoming exam
    };
    state.view.setDate(1);

    // ---------------------------------------------------------------
    // helpers
    // ---------------------------------------------------------------
    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[char]);
    }

    function clearSession() {
        ["access_token", "refresh_token", "student_name", "student_email", "selected_exam_id"]
            .forEach(key => localStorage.removeItem(key));
    }

    function redirectToLogin() {
        clearSession();
        window.location.href = "auth333.html";
    }

    async function authFetch(url) {
        const response = await fetch(url, {
            headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
        });

        if (response.status === 401) {
            redirectToLogin();
            throw new Error("Your session has expired. Please sign in again.");
        }
        if (!response.ok) {
            throw new Error(`Request failed (${response.status}).`);
        }
        return response.json();
    }

    const startOfDay = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const dayKey = date =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    /**
     * Understands "2026-11-20", "20-11-2026", "2026-11-20T10:30", full ISO strings
     * and Date objects. Returns { date, hasTime } or null.
     */
    function parseExamDate(value) {
        if (!value) return null;

        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : { date: value, hasTime: true };
        }

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

    function formatDate(date) {
        return date.toLocaleDateString(undefined, {
            weekday: "short", day: "2-digit", month: "short", year: "numeric"
        });
    }

    function formatTime(exam) {
        return exam.hasTime
            ? exam.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Not specified";
    }

    function formatDuration(minutes) {
        const total = Number(minutes);
        if (!Number.isFinite(total) || total <= 0) return "—";
        const hours = Math.floor(total / 60);
        const rest = total % 60;
        if (hours && rest) return `${hours}h ${rest}m`;
        return hours ? `${hours}h` : `${rest} min`;
    }

    // ---------------------------------------------------------------
    // normalising the API response
    // ---------------------------------------------------------------
    function normalizeExams(payload) {
        const rows = Array.isArray(payload)
            ? payload
            : (payload.exams || payload.results || payload.data || []);

        if (!Array.isArray(rows)) return [];

        const today = startOfDay(new Date());

        return rows
            .map(item => {
                const parsed = parseExamDate(item.exam_date || item.date || item.scheduled_at);
                if (!parsed) return null;   // no date -> cannot be placed on a schedule

                const completed = item.attempted === true || item.completed === true;
                const day = startOfDay(parsed.date);

                let status;
                if (completed) status = "completed";
                else if (day.getTime() === today.getTime()) status = "today";
                else if (day > today) status = "upcoming";
                else status = "missed";

                return {
                    id: String(item._id || item.id || ""),
                    title: item.title || item.exam_name || "Examination",
                    subject: item.subject || "General",
                    date: parsed.date,
                    hasTime: parsed.hasTime,
                    key: dayKey(parsed.date),
                    duration: item.duration,
                    status
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.date - b.date);
    }

    const isUpcoming = exam => exam.status === "upcoming" || exam.status === "today";

    const STATUS_LABEL = {
        completed: "Completed",
        today: "Live today",
        upcoming: "Upcoming",
        missed: "Missed"
    };

    // Your stylesheet has upcoming / completed / live styles.
    const STATUS_CLASS = {
        completed: "completed",
        missed: "completed",
        today: "live",
        upcoming: "upcoming"
    };

    function countdownText(exam) {
        if (exam.status === "completed") return "Completed";
        if (exam.status === "missed") return "Date has passed";

        const diff = exam.date - new Date();

        // A date-only exam counts as running all day.
        if (!exam.hasTime && exam.status === "today") return "Available today";
        if (diff <= 0) return "Starting now";

        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);

        if (days) return `${days}d ${hours}h ${minutes}m`;
        if (hours) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    function shortCountdown(exam) {
        if (exam.status === "today") return "Today";
        const days = Math.ceil((startOfDay(exam.date) - startOfDay(new Date())) / 86400000);
        return days === 1 ? "Tomorrow" : `in ${days} days`;
    }

    // ---------------------------------------------------------------
    // summary + header
    // ---------------------------------------------------------------
    function renderSummary() {
        const now = new Date();

        $("todayDate").textContent = now.toLocaleDateString(undefined, {
            weekday: "short", day: "2-digit", month: "short", year: "numeric"
        });

        $("upcomingCount").textContent = state.exams.filter(isUpcoming).length;
        $("completedCount").textContent = state.exams.filter(e => e.status === "completed").length;
        $("missedCount").textContent = state.exams.filter(e => e.status === "missed").length;
        $("monthCount").textContent = state.exams.filter(e =>
            e.date.getFullYear() === now.getFullYear() && e.date.getMonth() === now.getMonth()
        ).length;
    }

    // ---------------------------------------------------------------
    // next exam panel
    // ---------------------------------------------------------------
    function renderNextExam() {
        const next = state.exams.find(isUpcoming) || null;
        state.next = next;

        if (!next) {
            $("nextExamTitle").textContent = "No upcoming exams";
            $("nextExamSubject").textContent = "Nothing scheduled";
            $("nextExamDate").textContent = "—";
            $("nextExamTime").textContent = "—";
            $("nextExamDuration").textContent = "—";
            $("nextExamCountdown").textContent = "—";
            $("nextExamBtn").style.display = "none";
            return;
        }

        $("nextExamTitle").textContent = next.title;
        $("nextExamSubject").textContent = next.subject;
        $("nextExamDate").textContent = formatDate(next.date);
        $("nextExamTime").textContent = formatTime(next);
        $("nextExamDuration").textContent = formatDuration(next.duration);
        $("nextExamCountdown").textContent = countdownText(next);
        $("nextExamBtn").style.display = "";
    }

    // ---------------------------------------------------------------
    // calendar
    // ---------------------------------------------------------------
    function renderCalendar() {
        const year = state.view.getFullYear();
        const month = state.view.getMonth();

        $("calendarMonth").textContent = `${MONTHS[month]} ${year}`;

        const firstWeekday = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const todayKey = dayKey(new Date());

        const byDay = {};
        state.exams.forEach(exam => {
            (byDay[exam.key] = byDay[exam.key] || []).push(exam);
        });

        // Visible grid: leading days of last month, this month, trailing days of next month.
        const cells = [];
        for (let i = firstWeekday; i > 0; i--) {
            cells.push({ date: new Date(year, month, 1 - i), other: true });
        }
        for (let day = 1; day <= daysInMonth; day++) {
            cells.push({ date: new Date(year, month, day), other: false });
        }
        while (cells.length % 7 !== 0) {
            const last = cells[cells.length - 1].date;
            cells.push({
                date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
                other: true
            });
        }

        $("calendarDays").innerHTML = cells.map(cell => {
            const key = dayKey(cell.date);
            const exams = byDay[key] || [];

            const classes = ["calendar-day"];
            if (cell.other) classes.push("other-month");
            if (key === todayKey) classes.push("today");

            const events = exams.map(exam => `
                <span class="calendar-event ${STATUS_CLASS[exam.status]}"
                      data-id="${escapeHTML(exam.id)}"
                      title="${escapeHTML(exam.title)}">
                    ${escapeHTML(exam.title)}
                </span>
            `).join("");

            return `
                <div class="${classes.join(" ")}" data-key="${key}">
                    <span class="day-number">${cell.date.getDate()}</span>
                    ${events}
                </div>
            `;
        }).join("");
    }

    // ---------------------------------------------------------------
    // upcoming list
    // ---------------------------------------------------------------
    function renderUpcoming() {
        const upcoming = state.exams.filter(isUpcoming);

        if (!upcoming.length) {
            $("upcomingList").innerHTML = `
                <div class="schedule-empty">
                    <i class="fa-regular fa-calendar"></i>
                    <p>No upcoming exams.</p>
                </div>`;
            return;
        }

        $("upcomingList").innerHTML = upcoming.map(exam => `
            <div class="upcoming-item" data-id="${escapeHTML(exam.id)}" role="button" tabindex="0">
                <div class="exam-date-box">
                    <span>${MONTHS[exam.date.getMonth()].slice(0, 3)}</span>
                    <span>${exam.date.getDate()}</span>
                </div>
                <div class="upcoming-info">
                    <h4>${escapeHTML(exam.title)}</h4>
                    <p>${escapeHTML(exam.subject)} • ${formatDuration(exam.duration)}</p>
                </div>
                <span class="upcoming-time">${shortCountdown(exam)}</span>
            </div>
        `).join("");
    }

    // ---------------------------------------------------------------
    // timeline
    // ---------------------------------------------------------------
    function renderTimeline() {
        let rows = state.exams;

        if (state.filter === "upcoming") rows = rows.filter(isUpcoming);
        if (state.filter === "completed") rows = rows.filter(e => e.status === "completed");
        if (state.filter === "missed") rows = rows.filter(e => e.status === "missed");

        if (!rows.length) {
            $("scheduleTimeline").innerHTML = `
                <div class="schedule-empty">
                    <i class="fa-regular fa-calendar-xmark"></i>
                    <p>No exams to show for this filter.</p>
                </div>`;
            return;
        }

        $("scheduleTimeline").innerHTML = rows.map(exam => `
            <div class="timeline-item ${exam.status === "completed" || exam.status === "missed" ? "completed" : ""}"
                 data-id="${escapeHTML(exam.id)}" role="button" tabindex="0" style="cursor:pointer;">
                <span class="timeline-dot"></span>

                <div class="timeline-date">
                    <span class="day">${exam.date.getDate()}</span>
                    <span class="month">${MONTHS[exam.date.getMonth()].slice(0, 3)}</span>
                </div>

                <div class="timeline-content">
                    <h3>${escapeHTML(exam.title)}</h3>
                    <p>${escapeHTML(exam.subject)}</p>
                    <div class="timeline-meta">
                        <span><i class="fa-regular fa-clock"></i> ${formatTime(exam)}</span>
                        <span><i class="fa-solid fa-hourglass-half"></i> ${formatDuration(exam.duration)}</span>
                    </div>
                </div>

                <span class="status-badge ${STATUS_CLASS[exam.status]}">${STATUS_LABEL[exam.status]}</span>
            </div>
        `).join("");
    }

    function renderAll() {
        renderSummary();
        renderNextExam();
        renderCalendar();
        renderUpcoming();
        renderTimeline();
    }

    // ---------------------------------------------------------------
    // modal
    // ---------------------------------------------------------------
    function findExam(id) {
        return state.exams.find(exam => exam.id === String(id));
    }

    function openModal(exam) {
        if (!exam) return;
        state.selected = exam;

        $("modalTitle").textContent = exam.title;
        $("modalSubject").textContent = exam.subject;
        $("modalDate").textContent = formatDate(exam.date);
        $("modalTime").textContent = formatTime(exam);
        $("modalDuration").textContent = formatDuration(exam.duration);
        $("modalCountdown").textContent =
            exam.status === "completed" || exam.status === "missed"
                ? STATUS_LABEL[exam.status]
                : `Starts in ${countdownText(exam)}`;

        $("modalAction").innerHTML = exam.status === "completed"
            ? `View Result <i class="fa-solid fa-arrow-right"></i>`
            : `Go to Exams <i class="fa-solid fa-arrow-right"></i>`;

        $("examModal").classList.add("show");
    }

    function closeModal() {
        $("examModal").classList.remove("show");
        state.selected = null;
    }

    // ---------------------------------------------------------------
    // profile
    // ---------------------------------------------------------------
    async function loadProfile() {
        const saved = localStorage.getItem("student_name");
        if (saved) $("studentName").textContent = saved;

        try {
            const data = await authFetch(API.profile);
            const student = data.student || data;
            const name = student.name || student.full_name || saved || "Student";

            $("studentName").textContent = name;
            $("studentRole").textContent = student.role || "Student Account";
            localStorage.setItem("student_name", name);
        } catch (error) {
            console.warn("Could not load student profile:", error.message);
        }
    }

    // ---------------------------------------------------------------
    // load schedule
    // ---------------------------------------------------------------
    async function loadSchedule() {
        try {
            const payload = await authFetch(API.exams);
            state.exams = normalizeExams(payload);
            renderAll();
        } catch (error) {
            console.error("Schedule loading error:", error);

            $("nextExamTitle").textContent = "Unable to load schedule";
            $("nextExamSubject").textContent = error.message || "Please try again later.";

            $("scheduleTimeline").innerHTML = `
                <div class="schedule-empty">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <p>${escapeHTML(error.message || "Could not load your exams.")}</p>
                </div>`;
        }
    }

    // ---------------------------------------------------------------
    // events
    // ---------------------------------------------------------------
    $("prevMonth").addEventListener("click", () => {
        state.view.setMonth(state.view.getMonth() - 1);
        renderCalendar();
    });

    $("nextMonth").addEventListener("click", () => {
        state.view.setMonth(state.view.getMonth() + 1);
        renderCalendar();
    });

    $("todayBtn").addEventListener("click", () => {
        state.view = new Date();
        state.view.setDate(1);
        renderCalendar();
    });

    $("statusFilter").addEventListener("change", event => {
        state.filter = event.target.value;
        renderTimeline();
    });

    // One delegated handler for everything that opens the modal.
    document.addEventListener("click", event => {
        const target = event.target.closest(".calendar-event, .upcoming-item, .timeline-item");
        if (target) openModal(findExam(target.dataset.id));
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeModal();
            return;
        }

        if (event.key === "Enter") {
            const target = event.target.closest?.(".upcoming-item, .timeline-item");
            if (target) openModal(findExam(target.dataset.id));
        }
    });

    $("modalClose").addEventListener("click", closeModal);

    $("examModal").addEventListener("click", event => {
        if (event.target === $("examModal")) closeModal();
    });

    $("modalAction").addEventListener("click", () => {
        const exam = state.selected;
        if (!exam) return;

        window.location.href = exam.status === "completed"
            ? `student-results.html?exam_id=${encodeURIComponent(exam.id)}`
            : "student-exams.html";
    });

    // Keep the countdown on the Next Exam card fresh.
    setInterval(() => {
        if (state.next) $("nextExamCountdown").textContent = countdownText(state.next);
    }, 30000);

    // ----- shared topbar behaviour (same as the other student pages) -----
    $("menuToggle")?.addEventListener("click", () => {
        $("sidebar")?.classList.toggle("collapsed");
    });

    const profileBtn = $("profileBtn");
    const profileDropdown = $("profileDropdown");
    const notificationBtn = $("notificationBtn");
    const notificationDropdown = $("notificationDropdown");

    profileBtn?.addEventListener("click", event => {
        if (event.target.closest("a")) return;
        event.stopPropagation();
        profileDropdown?.classList.toggle("show");
        notificationDropdown?.classList.remove("show");
    });

    notificationBtn?.addEventListener("click", event => {
        event.stopPropagation();
        notificationDropdown?.classList.toggle("show");
        profileDropdown?.classList.remove("show");
    });

    document.addEventListener("click", event => {
        if (!profileBtn?.contains(event.target)) profileDropdown?.classList.remove("show");
        if (!notificationBtn?.contains(event.target)) notificationDropdown?.classList.remove("show");
    });

    function logout(event) {
        event.preventDefault();
        redirectToLogin();
    }

    $("logoutBtn")?.addEventListener("click", logout);
    $("logoutDropdownBtn")?.addEventListener("click", logout);

    // ---------------------------------------------------------------
    // go
    // ---------------------------------------------------------------
    renderCalendar();
    renderSummary();
    loadProfile();
    loadSchedule();
});