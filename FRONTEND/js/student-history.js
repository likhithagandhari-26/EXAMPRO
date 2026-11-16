document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // API CONFIGURATION
    const BASE_URL = "http://127.0.0.1:8000";

    const API = {
        profile: `${BASE_URL}/api/students/me/`,

        // Confirm this endpoint exists in your Django backend.
        activities: `${BASE_URL}/api/results/history/`
    };

    const PAGE_SIZE = 8;
    const token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "auth333.html";
        return;
    }

    const $ = id => document.getElementById(id);

    const state = {
        allActivities: [],
        filteredActivities: [],
        page: 1
    };

    // ACTIVITY TYPES
    const EVENT_META = {
        started: {
            label: "Exam Started",
            icon: "fa-play",
            pill: "pill-started",
            marker: ""
        },
        resumed: {
            label: "Exam Resumed",
            icon: "fa-rotate-right",
            pill: "pill-resumed",
            marker: ""
        },
        submitted: {
            label: "Exam Submitted",
            icon: "fa-paper-plane",
            pill: "pill-submitted",
            marker: "marker-submitted"
        },
        auto_submitted: {
            label: "Auto Submitted",
            icon: "fa-stopwatch",
            pill: "pill-auto_submitted",
            marker: "marker-submitted"
        },
        interrupted: {
            label: "Interrupted",
            icon: "fa-triangle-exclamation",
            pill: "pill-interrupted",
            marker: "marker-interrupted"
        },
        missed: {
            label: "Missed",
            icon: "fa-calendar-xmark",
            pill: "pill-missed",
            marker: "marker-interrupted"
        }
    };

    // SESSION MANAGEMENT
    function clearSession() {
        [
            "access_token",
            "refresh_token",
            "student_name",
            "student_email",
            "selected_exam_id"
        ].forEach(key => localStorage.removeItem(key));
    }

    function redirectToLogin() {
        clearSession();
        window.location.href = "auth333.html";
    }

    // AUTHENTICATED API REQUEST
    async function authFetch(url) {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json"
            }
        });

        if (response.status === 401) {
            redirectToLogin();
            throw new Error("Your session has expired. Please sign in again.");
        }

        if (!response.ok) {
            const body = await response.text().catch(() => "");
            throw new Error(
                `Request failed (${response.status}). ${body.slice(0, 180)}`
            );
        }

        return response.json();
    }

    // PREVENT HTML INJECTION
    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function firstDefined(...values) {
        return values.find(value =>
            value !== undefined &&
            value !== null &&
            value !== ""
        );
    }

    // EXTRACT API RESPONSE
    function extractRows(payload) {
        if (Array.isArray(payload)) {
            return payload;
        }

        const candidates = [
            payload?.activities,
            payload?.history,
            payload?.events,
            payload?.data,
            payload?.results,
            payload?.activity_logs
        ];

        return candidates.find(Array.isArray) || [];
    }

    // NORMALIZE ACTIVITY TYPES
    function normalizeEventType(value) {
        const raw = String(value || "")
            .toLowerCase()
            .trim()
            .replace(/[ -]+/g, "_");

        if ([
            "exam_started",
            "start",
            "started",
            "attempt_started"
        ].includes(raw)) return "started";

        if ([
            "exam_resumed",
            "resume",
            "resumed",
            "attempt_resumed"
        ].includes(raw)) return "resumed";

        if ([
            "exam_submitted",
            "submit",
            "submitted",
            "manual_submission"
        ].includes(raw)) return "submitted";

        if ([
            "exam_auto_submitted",
            "auto_submit",
            "auto_submitted",
            "automatically_submitted"
        ].includes(raw)) return "auto_submitted";

        if ([
            "exam_interrupted",
            "interruption",
            "interrupted",
            "attempt_interrupted"
        ].includes(raw)) return "interrupted";

        if ([
            "exam_missed",
            "missed",
            "no_show"
        ].includes(raw)) return "missed";

        return raw || "activity";
    }

    // CONVERT BACKEND RECORDS INTO FRONTEND FORMAT
    function normalizeActivities(payload) {
        return extractRows(payload).map((item, index) => {

            const exam = item.exam || item.exam_details || {};

            const type = normalizeEventType(
                firstDefined(
                    item.activity_type,
                    item.event_type,
                    item.action,
                    item.event,
                    item.type
                )
            );

            const meta = EVENT_META[type] || {
                label: "Activity Recorded",
                icon: "fa-clock",
                pill: "pill-started",
                marker: ""
            };

            const dateValue = firstDefined(
                item.activity_at,
                item.event_at,
                item.timestamp,
                item.created_at,
                item.occurred_at,
                item.submitted_at,
                item.started_at,
                item.date
            );

            const date = dateValue ? new Date(dateValue) : null;

            const duration = firstDefined(
                item.duration_seconds,
                item.duration,
                item.elapsed_seconds
            );

            const statusRaw = String(
                firstDefined(item.status, item.activity_status, "")
            ).toLowerCase();

            let status = "Recorded";
            let statusClass = "";

            if (
                ["submitted", "auto_submitted", "completed"].includes(type) ||
                statusRaw.includes("complete") ||
                statusRaw.includes("submit")
            ) {
                status = "Completed";
                statusClass = "status-completed";
            }
            else if (
                type === "interrupted" ||
                type === "missed" ||
                statusRaw.includes("interrupt") ||
                statusRaw.includes("miss")
            ) {
                status = type === "missed" ? "Missed" : "Interrupted";
                statusClass = "status-interrupted";
            }
            else if (
                type === "started" ||
                type === "resumed" ||
                statusRaw.includes("progress") ||
                statusRaw.includes("active")
            ) {
                status = "In Progress";
                statusClass = "status-in-progress";
            }

            return {
                id: firstDefined(
                    item.activity_id,
                    item._id,
                    item.id,
                    `${index}`
                ),

                examName: firstDefined(
                    item.exam_name,
                    item.title,
                    exam.title,
                    item.exam_title,
                    "Examination"
                ),

                subject: firstDefined(
                    item.subject,
                    exam.subject,
                    "—"
                ),

                type,
                typeLabel: meta.label,
                icon: meta.icon,
                pillClass: meta.pill,
                markerClass: meta.marker,

                description: firstDefined(
                    item.description,
                    item.message,
                    ""
                ),

                dateValue:
                    date && !Number.isNaN(date.getTime())
                        ? date
                        : null,

                durationSeconds:
                    Number.isFinite(Number(duration)) && duration !== ""
                        ? Number(duration)
                        : null,

                status,
                statusClass
            };
        }).filter(row => row.dateValue || row.examName);
    }

    // DATE FORMATTING
    function formatDate(date) {
        if (!date) return "—";

        return date.toLocaleDateString(undefined, {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function formatTime(date) {
        if (!date) return "Time unavailable";

        return date.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function formatDuration(seconds) {
        if (seconds === null || seconds === undefined) {
            return "—";
        }

        const total = Math.max(0, Math.floor(seconds));

        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);

        if (hours) return `${hours}h ${minutes}m`;
        if (minutes) return `${minutes}m`;

        return `${total % 60}s`;
    }

    // EMPTY TABLE MESSAGE
    function showTableMessage(
        title,
        detail,
        icon = "fa-clipboard-list"
    ) {
        $("historyTableBody").innerHTML = `
            <tr>
                <td colspan="6" class="history-table-message">
                    <i class="fa-solid ${icon}"></i>
                    <strong>${escapeHTML(title)}</strong>
                    <span>${escapeHTML(detail)}</span>
                </td>
            </tr>
        `;
    }

    // UPDATE SUMMARY CARDS
    function updateSummary() {
        const rows = state.allActivities;

        $("totalActivities").textContent = rows.length;

        $("examsStarted").textContent =
            rows.filter(row => row.type === "started").length;

        $("examsSubmitted").textContent =
            rows.filter(row =>
                ["submitted", "auto_submitted"].includes(row.type)
            ).length;

        $("interruptedAttempts").textContent =
            rows.filter(row => row.type === "interrupted").length;
    }

    // RECENT ACTIVITY TIMELINE
    function renderTimeline() {
        const container = $("activityTimeline");

        const rows = [...state.allActivities]
            .sort((a, b) =>
                (b.dateValue?.getTime() || 0) -
                (a.dateValue?.getTime() || 0)
            )
            .slice(0, 5);

        if (!rows.length) {
            container.innerHTML = `
                <div class="history-state">
                    <i class="fa-regular fa-clock"></i>
                    <strong>No activity recorded yet</strong>
                    <span>
                        Your examination activity will appear here
                        when the system records an event.
                    </span>
                </div>
            `;
            return;
        }

        container.innerHTML = rows.map(row => `
            <article class="timeline-item">

                <div class="timeline-marker ${row.markerClass}">
                    <i class="fa-solid ${row.icon}"></i>
                </div>

                <div class="timeline-copy">
                    <strong>
                        ${escapeHTML(row.typeLabel)}
                        · ${escapeHTML(row.examName)}
                    </strong>

                    <p>
                        ${escapeHTML(
                            row.description ||
                            `${row.subject} examination activity recorded.`
                        )}
                    </p>
                </div>

                <time class="timeline-time">
                    ${escapeHTML(formatDate(row.dateValue))}
                    <br>
                    ${escapeHTML(formatTime(row.dateValue))}
                </time>

            </article>
        `).join("");
    }

    // SEARCH, FILTER AND SORT
    function getFilteredActivities() {
        const term = $("historySearch").value.trim().toLowerCase();
        const type = $("activityTypeFilter").value;

        const fromValue = $("dateFrom").value;
        const toValue = $("dateTo").value;

        const sort = $("historySort").value;

        let rows = state.allActivities.filter(row => {

            const searchableText =
                `${row.examName} ${row.subject} ${row.typeLabel}`
                    .toLowerCase();

            const matchesText = searchableText.includes(term);

            const matchesType =
                type === "all" || row.type === type;

            const date = row.dateValue;

            const matchesFrom =
                !fromValue ||
                (date && date >= new Date(`${fromValue}T00:00:00`));

            const matchesTo =
                !toValue ||
                (date && date <= new Date(`${toValue}T23:59:59.999`));

            return (
                matchesText &&
                matchesType &&
                matchesFrom &&
                matchesTo
            );
        });

        rows.sort((a, b) => {
            const difference =
                (a.dateValue?.getTime() || 0) -
                (b.dateValue?.getTime() || 0);

            return sort === "oldest" ? difference : -difference;
        });

        return rows;
    }

    // RENDER ACTIVITY TABLE
    function renderTable() {
        state.filteredActivities = getFilteredActivities();

        const totalPages = Math.max(
            1,
            Math.ceil(state.filteredActivities.length / PAGE_SIZE)
        );

        state.page = Math.min(state.page, totalPages);

        const start = (state.page - 1) * PAGE_SIZE;

        const pageRows = state.filteredActivities.slice(
            start,
            start + PAGE_SIZE
        );

        if (!pageRows.length) {
            showTableMessage(
                state.allActivities.length
                    ? "No matching activity"
                    : "No history available yet",

                state.allActivities.length
                    ? "Try adjusting your search, activity type, or date range."
                    : "Your recorded examination activities will appear here."
            );
        }
        else {
            $("historyTableBody").innerHTML = pageRows.map(row => `
                <tr>

                    <td class="history-exam-name">
                        ${escapeHTML(row.examName)}
                    </td>

                    <td>
                        ${escapeHTML(row.subject)}
                    </td>

                    <td>
                        <span class="activity-pill ${row.pillClass}">
                            <i class="fa-solid ${row.icon}"></i>
                            ${escapeHTML(row.typeLabel)}
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(formatDate(row.dateValue))}
                        <br>
                        <span class="history-muted-time">
                            ${escapeHTML(formatTime(row.dateValue))}
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(formatDuration(row.durationSeconds))}
                    </td>

                    <td>
                        <span class="activity-status ${row.statusClass}">
                            ${escapeHTML(row.status)}
                        </span>
                    </td>

                </tr>
            `).join("");
        }

        const from =
            state.filteredActivities.length ? start + 1 : 0;

        const to = Math.min(
            start + PAGE_SIZE,
            state.filteredActivities.length
        );

        $("historyCount").textContent =
            `Showing ${from}–${to} of ${state.filteredActivities.length} activities`;

        $("historyPageIndicator").textContent =
            `Page ${state.page} of ${totalPages}`;

        $("historyPrevious").disabled = state.page <= 1;
        $("historyNext").disabled = state.page >= totalPages;
    }

    // LOAD STUDENT PROFILE
    async function loadProfile() {
        const savedName = localStorage.getItem("student_name");

        if (savedName) {
            $("studentName").textContent = savedName;
        }

        try {
            const data = await authFetch(API.profile);

            const student = data.student || data;

            const name =
                student.name ||
                student.full_name ||
                savedName ||
                "Student";

            $("studentName").textContent = name;

            $("studentRole").textContent =
                student.role || "Student Account";

            localStorage.setItem("student_name", name);

        } catch (error) {
            console.warn(
                "Could not load student profile:",
                error.message
            );
        }
    }

    // LOAD HISTORY FROM BACKEND
    async function loadHistory() {
        $("refreshHistory").disabled = true;

        showTableMessage(
            "Loading activity history",
            "Please wait while we retrieve your examination activity.",
            "fa-spinner fa-spin"
        );

        $("activityTimeline").innerHTML = `
            <div class="history-state">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <strong>Loading activity</strong>
                <span>Please wait while your records are retrieved.</span>
            </div>
        `;

        try {
            const payload = await authFetch(API.activities);

            state.allActivities = normalizeActivities(payload);

            state.page = 1;

            updateSummary();
            renderTimeline();
            renderTable();

            $("lastUpdated").textContent =
                `Updated ${new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                })}`;

        } catch (error) {
            console.error("History loading error:", error);

            showTableMessage(
                "Unable to load activity history",
                error.message || "Please try again later.",
                "fa-triangle-exclamation"
            );

            $("activityTimeline").innerHTML = `
                <div class="history-state">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <strong>Activity records unavailable</strong>
                    <span>
                        ${escapeHTML(error.message ||
                        "Check the configured history API endpoint and try again.")}
                    </span>
                </div>
            `;

            $("lastUpdated").textContent = "Could not update";

            $("totalActivities").textContent = "—";
            $("examsStarted").textContent = "—";
            $("examsSubmitted").textContent = "—";
            $("interruptedAttempts").textContent = "—";

            $("historyCount").textContent =
                "Activity records unavailable";

        } finally {
            $("refreshHistory").disabled = false;
        }
    }

    // PROFILE AND NOTIFICATION DROPDOWNS
    function initializeDropdowns() {
        const profileBtn = $("profileBtn");
        const profileDropdown = $("profileDropdown");

        const notificationBtn = $("notificationBtn");
        const notificationDropdown = $("notificationDropdown");

        profileBtn?.addEventListener("click", event => {
            if (event.target.closest("a")) return;

            event.stopPropagation();

            profileDropdown.classList.toggle("show");

            notificationDropdown?.classList.remove("show");

            profileBtn.classList.toggle(
                "active",
                profileDropdown.classList.contains("show")
            );
        });

        notificationBtn?.addEventListener("click", event => {
            event.stopPropagation();

            notificationDropdown?.classList.toggle("show");

            profileDropdown?.classList.remove("show");

            profileBtn?.classList.remove("active");
        });

        document.addEventListener("click", event => {

            if (!profileBtn?.contains(event.target)) {
                profileDropdown?.classList.remove("show");
                profileBtn?.classList.remove("active");
            }

            if (!notificationBtn?.contains(event.target)) {
                notificationDropdown?.classList.remove("show");
            }
        });

        [profileBtn, notificationBtn].forEach(element => {

            element?.addEventListener("keydown", event => {

                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    element.click();
                }
            });
        });
    }

    // SIDEBAR TOGGLE
    $("menuToggle")?.addEventListener("click", () => {
        $("sidebar")?.classList.toggle("collapsed");
    });

    // REFRESH BUTTON
    $("refreshHistory")?.addEventListener("click", loadHistory);

    // FILTER EVENTS
    [
        "historySearch",
        "activityTypeFilter",
        "dateFrom",
        "dateTo",
        "historySort"
    ].forEach(id => {

        $(id)?.addEventListener(
            id === "historySearch" ? "input" : "change",
            () => {
                state.page = 1;
                renderTable();
            }
        );
    });

    // PREVIOUS PAGE
    $("historyPrevious")?.addEventListener("click", () => {

        if (state.page > 1) {
            state.page--;
            renderTable();
        }
    });

    // NEXT PAGE
    $("historyNext")?.addEventListener("click", () => {

        const pages = Math.max(
            1,
            Math.ceil(state.filteredActivities.length / PAGE_SIZE)
        );

        if (state.page < pages) {
            state.page++;
            renderTable();
        }
    });

    // LOGOUT
    function logout(event) {
        event.preventDefault();

        clearSession();

        window.location.href = "auth333.html";
    }

    $("logoutBtn")?.addEventListener("click", logout);

    $("logoutDropdownBtn")?.addEventListener("click", logout);

    // INITIALIZE PAGE
    initializeDropdowns();

    loadProfile();
    loadHistory();

    // OPTIONAL FRONTEND TESTING FUNCTION
    // This only renders supplied records. It does not save them.
    window.setStudentHistory = payload => {

        state.allActivities = normalizeActivities(payload);

        state.page = 1;

        updateSummary();
        renderTimeline();
        renderTable();
    };

});