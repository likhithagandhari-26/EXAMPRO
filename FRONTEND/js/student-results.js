document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* =====================================================
       CONFIGURATION
       Confirm RESULTS endpoint and response fields against
       your Django urls.py/views.py before backend testing.
    ===================================================== */
    const BASE_URL = "http://127.0.0.1:8000";
    const API = {
        profile: `${BASE_URL}/api/students/me/`,
        results: `${BASE_URL}/api/results/student/`,
        single: (examId) => `${BASE_URL}/api/results/${encodeURIComponent(examId)}/`
    };
    const AUTH_SCHEME = "Bearer";
    const PAGE_SIZE = 8;

    const token = localStorage.getItem("access_token");
    if (!token) {
        window.location.href = "auth333.html";
        return;
    }

    const $ = (id) => document.getElementById(id);
    const state = { allResults: [], filteredResults: [], page: 1, chart: null };

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
            method: "GET",
            headers: {
                "Authorization": `${AUTH_SCHEME} ${token}`,
                "Accept": "application/json"
            }
        });

        if (response.status === 401) {
            redirectToLogin();
            throw new Error("Your session has expired. Please sign in again.");
        }
        if (!response.ok) {
            const body = await response.text().catch(() => "");
            throw new Error(`Request failed (${response.status}). ${body.slice(0, 180)}`);
        }
        return response.json();
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[char]);
    }

    function firstDefined(...values) {
        return values.find(value => value !== undefined && value !== null && value !== "");
    }

    function normalizeResults(payload) {
        // One result object (GET /api/results/<exam_id>/) becomes a one-item list.
        if (payload && !Array.isArray(payload) &&
            (payload.score !== undefined || payload.result_id || payload.exam_title)) {
            payload = [payload];
        }
        payload = payload || [];

        const rows = Array.isArray(payload) ? payload
            : (payload.results || payload.data || payload.submissions || payload.exam_results || []);
        if (!Array.isArray(rows)) return [];

        return rows.map(item => {
            const exam = item.exam || item.exam_details || {};
            const score = firstDefined(item.score, item.marks_obtained, item.obtained_marks, item.total_score);
            const total = firstDefined(item.total_marks, item.max_marks, item.exam_total_marks, exam.total_marks);
            const percentageRaw = firstDefined(item.percentage, item.score_percentage);
            const percentage = percentageRaw !== undefined
                ? Number(percentageRaw)
                : (Number.isFinite(Number(score)) && Number(total) > 0
                    ? (Number(score) / Number(total)) * 100 : null);

            const rawStatus = String(firstDefined(item.status, item.result_status, item.outcome, "")).toLowerCase();
            let status = rawStatus.includes("pass") ? "passed"
                : rawStatus.includes("fail") ? "failed"
                : rawStatus.includes("pending") || rawStatus.includes("publish") ? "pending" : "";

            // Respect backend's explicit pass/fail status. Do not guess the
            // passing threshold on the client if the backend did not send it.
            if (!status && item.is_passed === true) status = "passed";
            if (!status && item.is_passed === false) status = "failed";

            return {
                id: firstDefined(item.result_id, item._id, item.id, item.submission_id, ""),
                examId: String(firstDefined(item.exam_id, exam.id, "")),
                examName: firstDefined(item.exam_name, item.title, exam.title, item.exam_title, "Examination"),
                subject: firstDefined(item.subject, exam.subject, "—"),
                attemptedAt: firstDefined(item.attempted_at, item.submitted_at, item.completed_at, item.created_at, item.date, ""),
                score,
                total,
                percentage: Number.isFinite(Number(percentage)) ? Number(percentage) : null,
                status: status || "pending"
            };
        });
    }

    function formatDate(value) {
        if (!value) return "—";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? escapeHTML(value) :
            date.toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric" });
    }

    function formatPercent(value) {
        return value === null || value === undefined || !Number.isFinite(Number(value))
            ? "—" : `${Number(value).toFixed(1).replace(/\.0$/, "")}%`;
    }

    function setMessage(title, detail, icon = "fa-clipboard-list") {
        $("resultsTableBody").innerHTML = `
            <tr><td colspan="7" class="table-message">
                <i class="fa-solid ${icon}"></i>
                <strong>${escapeHTML(title)}</strong>
                <span>${escapeHTML(detail)}</span>
            </td></tr>`;
    }

    function updateSummary() {
        const graded = state.allResults.filter(r => r.percentage !== null);
        const passed = state.allResults.filter(r => r.status === "passed").length;
        const average = graded.length
            ? graded.reduce((sum, r) => sum + r.percentage, 0) / graded.length : null;
        const highest = graded.length ? Math.max(...graded.map(r => r.percentage)) : null;

        $("examsAttempted").textContent = state.allResults.length;
        $("overallAverage").textContent = formatPercent(average);
        $("highestScore").textContent = formatPercent(highest);
        $("passedExams").textContent = passed;
        $("passRateText").textContent = state.allResults.length
            ? `${Math.round((passed / state.allResults.length) * 100)}% pass rate` : "Published results";
    }

    function renderChart() {
        const graded = [...state.allResults]
            .filter(r => r.percentage !== null)
            .sort((a, b) => new Date(a.attemptedAt || 0) - new Date(b.attemptedAt || 0))
            .slice(-10);
        const empty = $("chartEmpty");
        const canvas = $("performanceChart");

        if (!window.Chart || !canvas) {
            if (empty) empty.style.display = "flex";
            return;
        }
        if (state.chart) state.chart.destroy();

        if (!graded.length) {
            if (empty) empty.style.display = "flex";
            state.chart = null;
            return;
        }

        if (empty) empty.style.display = "none";
        state.chart = new Chart(canvas, {
            type: "line",
            data: {
                labels: graded.map(r => r.examName.length > 18 ? `${r.examName.slice(0, 16)}…` : r.examName),
                datasets: [{
                    label: "Percentage",
                    data: graded.map(r => Number(r.percentage.toFixed(1))),
                    borderColor: "#2563eb",
                    backgroundColor: "rgba(37, 99, 235, 0.10)",
                    pointBackgroundColor: "#2563eb",
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 2,
                    tension: 0.35,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, max: 100, ticks: { callback: value => `${value}%` }, grid: { color: "#edf1f7" } },
                    x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true } }
                }
            }
        });
    }

    function getFilteredResults() {
        const term = $("resultSearch").value.trim().toLowerCase();
        const status = $("statusFilter").value;
        const sort = $("sortFilter").value;

        let rows = state.allResults.filter(row => {
            const matchesText = `${row.examName} ${row.subject}`.toLowerCase().includes(term);
            const matchesStatus = status === "all" || row.status === status;
            return matchesText && matchesStatus;
        });

        rows.sort((a, b) => {
            if (sort === "highest") return (b.percentage ?? -1) - (a.percentage ?? -1);
            if (sort === "lowest") return (a.percentage ?? Infinity) - (b.percentage ?? Infinity);
            const difference = new Date(a.attemptedAt || 0) - new Date(b.attemptedAt || 0);
            return sort === "oldest" ? difference : -difference;
        });
        return rows;
    }

    function renderTable() {
        state.filteredResults = getFilteredResults();
        const totalPages = Math.max(1, Math.ceil(state.filteredResults.length / PAGE_SIZE));
        state.page = Math.min(state.page, totalPages);
        const start = (state.page - 1) * PAGE_SIZE;
        const pageRows = state.filteredResults.slice(start, start + PAGE_SIZE);

        if (!pageRows.length) {
            setMessage(state.allResults.length ? "No matching results" : "No results available yet",
                state.allResults.length ? "Try changing your search or filters." : "Your released examination results will appear here.");
        } else {
            $("resultsTableBody").innerHTML = pageRows.map(row => {
                const statusMeta = {
                    passed: ["Passed", "status-passed", "fa-circle-check"],
                    failed: ["Failed", "status-failed", "fa-circle-xmark"],
                    pending: ["Pending", "status-pending", "fa-clock"]
                }[row.status] || ["Pending", "status-pending", "fa-clock"];

                const scoreText = row.score !== undefined && row.score !== null
                    ? `${escapeHTML(row.score)}${row.total !== undefined && row.total !== null ? ` / ${escapeHTML(row.total)}` : ""}`
                    : "—";
                const detailsUrl = row.examId
                    ? `result-details.html?exam_id=${encodeURIComponent(row.examId)}`
                    : "";

                return `<tr class="${row.id && row.id === state.latestId ? "latest-row" : ""}">
                    <td class="exam-title-cell">${escapeHTML(row.examName)}</td>
                    <td>${escapeHTML(row.subject)}</td>
                    <td>${formatDate(row.attemptedAt)}</td>
                    <td class="score-cell">${scoreText}</td>
                    <td>${formatPercent(row.percentage)}</td>
                    <td><span class="status-badge ${statusMeta[1]}"><i class="fa-solid ${statusMeta[2]}"></i>${statusMeta[0]}</span></td>
                    <td>${detailsUrl
                        ? `<a class="view-details-btn" href="${detailsUrl}"><i class="fa-regular fa-eye"></i> View Details</a>`
                        : `<span class="muted-action" title="The API response did not include an exam ID">—</span>`}
                    </td>
                </tr>`;
            }).join("");
        }

        $("resultsCount").textContent = `Showing ${state.filteredResults.length ? start + 1 : 0}–${Math.min(start + PAGE_SIZE, state.filteredResults.length)} of ${state.filteredResults.length} results`;
        $("pageIndicator").textContent = `Page ${state.page} of ${totalPages}`;
        $("previousPage").disabled = state.page <= 1;
        $("nextPage").disabled = state.page >= totalPages;
    }

    async function loadProfile() {
        const savedName = localStorage.getItem("student_name");
        if (savedName) $("studentName").textContent = savedName;

        try {
            const data = await authFetch(API.profile);
            const student = data.student || data;
            const name = student.name || student.full_name || savedName || "Student";
            $("studentName").textContent = name;
            $("studentRole").textContent = student.role || "Student Account";
            localStorage.setItem("student_name", name);
        } catch (error) {
            // Profile endpoint may differ between project versions; cached name remains visible.
            console.warn("Could not load student profile:", error.message);
        }
    }

    async function loadResults() {
        setMessage("Loading results", "Please wait while we retrieve your examination records.", "fa-spinner fa-spin");
        $("refreshResults").disabled = true;
        try {
            // Arriving from "View Results" gives us the exam that was just submitted.
            const examId = new URLSearchParams(window.location.search).get("exam_id")
                || localStorage.getItem("selected_exam_id");

            const [listPayload, latestPayload] = await Promise.all([
                authFetch(API.results),
                examId ? authFetch(API.single(examId)).catch(() => null) : Promise.resolve(null)
            ]);

            const rows = normalizeResults(listPayload);
            let latest = null;

            if (latestPayload) {
                latest = normalizeResults(latestPayload)[0] || null;
                if (latest && !rows.some(row => row.id && row.id === latest.id)) {
                    rows.unshift(latest);
                }
            }

            state.allResults = rows;
            state.latestId = latest ? latest.id : null;

            const banner = $("latestBanner");
            if (banner && latest) {
                const scoreText = latest.score !== undefined && latest.score !== null
                    ? ` ${latest.score}${latest.total ? " / " + latest.total : ""}`
                    : "";
                $("latestBannerText").textContent =
                    `${latest.examName}:${scoreText} (${formatPercent(latest.percentage)})`;
                banner.hidden = false;
            }

            localStorage.removeItem("selected_exam_id");

            updateSummary();
            renderChart();
            state.page = 1;
            renderTable();
            $("lastUpdated").textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        } catch (error) {
            console.error("Results loading error:", error);
            setMessage("Unable to load results", error.message || "Please try again later.", "fa-triangle-exclamation");
            $("lastUpdated").textContent = "Could not update";
        } finally {
            $("refreshResults").disabled = false;
        }
    }

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
            profileBtn.classList.toggle("active", profileDropdown.classList.contains("show"));
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
            if (!notificationBtn?.contains(event.target)) notificationDropdown?.classList.remove("show");
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

    $("menuToggle")?.addEventListener("click", () => $("sidebar")?.classList.toggle("collapsed"));
    $("refreshResults")?.addEventListener("click", loadResults);
    $("resultSearch")?.addEventListener("input", () => { state.page = 1; renderTable(); });
    $("statusFilter")?.addEventListener("change", () => { state.page = 1; renderTable(); });
    $("sortFilter")?.addEventListener("change", () => { state.page = 1; renderTable(); });
    $("previousPage")?.addEventListener("click", () => { if (state.page > 1) { state.page--; renderTable(); } });
    $("nextPage")?.addEventListener("click", () => {
        const pages = Math.max(1, Math.ceil(state.filteredResults.length / PAGE_SIZE));
        if (state.page < pages) { state.page++; renderTable(); }
    });

    function logout(event) {
        event.preventDefault();
        clearSession();
        window.location.href = "auth333.html";
    }
    $("logoutBtn")?.addEventListener("click", logout);
    $("logoutDropdownBtn")?.addEventListener("click", logout);

    initializeDropdowns();
    loadProfile();
    loadResults();

    // Optional integration hook for an existing backend script or test fixture.
    // Supply already-authorized result objects; normal page loading uses API.results.
    window.setStudentResults = results => {
        state.allResults = normalizeResults(results);
        updateSummary();
        renderChart();
        state.page = 1;
        renderTable();
    };
});