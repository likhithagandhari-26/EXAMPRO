/* =========================================================
   EXAM PRO — LIVE MONITORING
   Professional • Responsive • Admin Monitoring
========================================================= */

"use strict";

/* =========================================================
   CONFIGURATION
========================================================= */

const API_BASE = "http://127.0.0.1:8000/api";

const MONITORING_CONFIG = {
    refreshInterval: 10000,
    activityRefreshInterval: 5000,
    studentsPerPage: 10,

    endpoints: {
        monitoring: `${API_BASE}/monitoring/`,
        liveExam: `${API_BASE}/monitoring/live-exam/`,
        students: `${API_BASE}/monitoring/students/`,
        activity: `${API_BASE}/monitoring/activity/`,
        alerts: `${API_BASE}/monitoring/alerts/`,
        pauseExam: `${API_BASE}/monitoring/exam/pause/`,
        resumeExam: `${API_BASE}/monitoring/exam/resume/`,
        extendExam: `${API_BASE}/monitoring/exam/extend/`,
        broadcast: `${API_BASE}/monitoring/exam/broadcast/`,
        endExam: `${API_BASE}/monitoring/exam/end/`,
        warning: `${API_BASE}/monitoring/student/warning/`,
        terminate: `${API_BASE}/monitoring/student/terminate/`,
        profile: `${API_BASE}/admin/profile/`
    }
};


/* =========================================================
   APPLICATION STATE
========================================================= */

const state = {
    students: [],
    filteredStudents: [],
    activities: [],
    alerts: [],
    auditLogs: [],

    selectedStudent: null,

    currentPage: 1,
    studentsPerPage: MONITORING_CONFIG.studentsPerPage,

    exam: {
        id: null,
        title: "No Live Examination",
        status: "offline",
        duration: 0,
        remainingSeconds: 0,
        totalStudents: 0,
        started: 0,
        inProgress: 0,
        submitted: 0,
        notStarted: 0
    },

    examPaused: false,

    filters: {
        search: "",
        status: "all",
        warning: "all"
    },

    timers: {
        countdown: null,
        refresh: null,
        activity: null
    },

    modalAction: null,

    connection: {
        connected: false,
        lastChecked: null
    }
};


/* =========================================================
   DOM ELEMENTS
========================================================= */

const DOM = {};

function cacheDOM() {

    const ids = [
        "sidebar",
        "menuToggle",

        "systemStatus",
        "connectionText",

        "notificationBtn",
        "notificationCount",

        "profileBtn",
        "adminName",
        "adminRole",

        "refreshBtn",
        "fullscreenBtn",

        "examName",
        "examStatus",
        "examDuration",
        "examTimer",

        "liveStudents",
        "activeStudents",
        "warningStudents",
        "offlineStudents",
        "submittedStudents",

        "progressPercentage",
        "examProgress",

        "startedCount",
        "inProgressCount",
        "submittedCount",
        "notStartedCount",

        "studentSearch",
        "statusFilter",
        "warningFilter",

        "studentCount",
        "studentTableBody",

        "tableResultText",
        "previousPage",
        "currentPage",
        "nextPage",

        "activityFeed",
        "securityAlerts",
        "alertCount",

        "studentDetailPanel",
        "detailAvatar",
        "detailName",
        "detailId",
        "detailStatus",
        "detailProgress",
        "detailCamera",
        "detailWarnings",
        "detailQuestion",
        "detailTimeRemaining",

        "sendWarningBtn",
        "terminateBtn",

        "pauseExamBtn",
        "extendTimeBtn",
        "broadcastBtn",
        "endExamBtn",

        "completionStarted",
        "completionInProgress",
        "completionSubmitted",
        "completionNotStarted",

        "auditLog",

        "activityLogBtn",
        "exportReportBtn",

        "confirmationModal",
        "modalTitle",
        "modalMessage",
        "cancelModalBtn",
        "confirmModalBtn"
    ];

    ids.forEach((id) => {
        DOM[id] = document.getElementById(id);
    });
}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    cacheDOM();

    initializeApplication();

});


async function initializeApplication() {

    initializeSidebar();

    initializeTopbar();

    initializeFilters();

    initializePagination();

    initializeMonitoringActions();

    initializeModal();

    initializeKeyboardShortcuts();

    updateConnectionStatus("connecting");

    setLoadingStates();

    /*
     * Try loading real backend data.
     * If API is unavailable, the page remains usable
     * with an empty-state instead of breaking.
     */

    await loadMonitoringData();

    startAutoRefresh();

}


/* =========================================================
   SIDEBAR
========================================================= */

function initializeSidebar() {

    if (!DOM.menuToggle || !DOM.sidebar) {
        return;
    }

    DOM.menuToggle.addEventListener("click", () => {

        const isOpen =
            DOM.sidebar.classList.toggle("active");

        DOM.menuToggle.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

    });


    /*
     * Close sidebar when clicking outside on smaller screens
     */

    document.addEventListener("click", (event) => {

        if (
            window.innerWidth > 900 ||
            !DOM.sidebar.classList.contains("active")
        ) {
            return;
        }

        const clickedInsideSidebar =
            DOM.sidebar.contains(event.target);

        const clickedMenu =
            DOM.menuToggle.contains(event.target);

        if (!clickedInsideSidebar && !clickedMenu) {

            DOM.sidebar.classList.remove("active");

            DOM.menuToggle.setAttribute(
                "aria-expanded",
                "false"
            );
        }

    });


    /*
     * Close mobile sidebar after navigation
     */

    const sidebarLinks =
        DOM.sidebar.querySelectorAll("a");

    sidebarLinks.forEach((link) => {

        link.addEventListener("click", () => {

            if (window.innerWidth <= 900) {

                DOM.sidebar.classList.remove("active");

                DOM.menuToggle.setAttribute(
                    "aria-expanded",
                    "false"
                );
            }

        });

    });

}


/* =========================================================
   TOPBAR
========================================================= */

function initializeTopbar() {

    /*
     * Notification
     */

    if (DOM.notificationBtn) {

        DOM.notificationBtn.addEventListener(
            "click",
            handleNotifications
        );

    }


    /*
     * Profile
     */

    if (DOM.profileBtn) {

        DOM.profileBtn.addEventListener(
            "click",
            handleProfile
        );

    }

}


/* =========================================================
   CONNECTION STATUS
========================================================= */

function updateConnectionStatus(status) {

    if (!DOM.systemStatus || !DOM.connectionText) {
        return;
    }

    const indicator =
        DOM.systemStatus.querySelector(
            ".status-indicator"
        );


    DOM.systemStatus.classList.remove(
        "connecting",
        "connected",
        "disconnected"
    );


    if (status === "connected") {

        DOM.systemStatus.classList.add(
            "connected"
        );

        DOM.connectionText.textContent =
            "Connected";

        state.connection.connected = true;

        state.connection.lastChecked =
            new Date();

    }

    else if (status === "disconnected") {

        DOM.systemStatus.classList.add(
            "disconnected"
        );

        DOM.connectionText.textContent =
            "Disconnected";

        state.connection.connected = false;

    }

    else {

        DOM.systemStatus.classList.add(
            "connecting"
        );

        DOM.connectionText.textContent =
            "Connecting...";

        state.connection.connected = false;

    }

    if (indicator) {

        indicator.setAttribute(
            "aria-label",
            DOM.connectionText.textContent
        );

    }

}


/* =========================================================
   API HELPER
========================================================= */

async function apiRequest(
    url,
    options = {}
) {

    const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token");


    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };


    if (token) {

        headers.Authorization =
            `Bearer ${token}`;

    }


    const response = await fetch(
        url,
        {
            ...options,
            headers
        }
    );


    let data = null;

    try {

        data = await response.json();

    }

    catch {

        data = null;

    }


    if (!response.ok) {

        const message =
            data?.detail ||
            data?.message ||
            `Request failed with status ${response.status}`;

        throw new Error(message);

    }


    return data;

}


/* =========================================================
   LOAD MONITORING DATA
========================================================= */

async function loadMonitoringData() {

    try {

        const response =
            await apiRequest(
                MONITORING_CONFIG.endpoints.monitoring
            );


        updateConnectionStatus(
            "connected"
        );


        processMonitoringResponse(
            response
        );

    }

    catch (error) {

        console.warn(
            "Monitoring API unavailable:",
            error.message
        );


        updateConnectionStatus(
            "disconnected"
        );


        /*
         * Attempt individual endpoints.
         * This makes the page flexible while backend
         * APIs are still being developed.
         */

        await loadIndividualData();

    }

}


/* =========================================================
   INDIVIDUAL API LOADING
========================================================= */

async function loadIndividualData() {

    let successfulRequests = 0;


    /*
     * Live exam
     */

    try {

        const exam =
            await apiRequest(
                MONITORING_CONFIG.endpoints.liveExam
            );

        processExamData(exam);

        successfulRequests++;

    }

    catch (error) {

        console.warn(
            "Live exam unavailable:",
            error.message
        );

    }


    /*
     * Students
     */

    try {

        const students =
            await apiRequest(
                MONITORING_CONFIG.endpoints.students
            );

        processStudentsData(students);

        successfulRequests++;

    }

    catch (error) {

        console.warn(
            "Student monitoring unavailable:",
            error.message
        );

    }


    /*
     * Activity
     */

    try {

        const activity =
            await apiRequest(
                MONITORING_CONFIG.endpoints.activity
            );

        processActivityData(activity);

        successfulRequests++;

    }

    catch (error) {

        console.warn(
            "Activity API unavailable:",
            error.message
        );

    }


    /*
     * Alerts
     */

    try {

        const alerts =
            await apiRequest(
                MONITORING_CONFIG.endpoints.alerts
            );

        processAlertsData(alerts);

        successfulRequests++;

    }

    catch (error) {

        console.warn(
            "Security alerts unavailable:",
            error.message
        );

    }


    if (successfulRequests > 0) {

        updateConnectionStatus(
            "connected"
        );

    }

    else {

        updateConnectionStatus(
            "disconnected"
        );

        renderEmptyMonitoringState();

    }


    updateAllUI();

}


/* =========================================================
   PROCESS MONITORING RESPONSE
========================================================= */

function processMonitoringResponse(data) {

    if (!data) {
        return;
    }


    /*
     * Different possible backend structures
     */

    const exam =
        data.exam ||
        data.live_exam ||
        data.current_exam;

    const students =
        data.students ||
        data.student_data ||
        data.participants ||
        [];

    const activities =
        data.activities ||
        data.activity ||
        [];

    const alerts =
        data.alerts ||
        data.security_alerts ||
        [];

    const audit =
        data.audit_logs ||
        data.audit ||
        [];


    if (exam) {

        processExamData(exam);

    }


    if (Array.isArray(students)) {

        processStudentsData(students);

    }


    if (Array.isArray(activities)) {

        processActivityData(activities);

    }


    if (Array.isArray(alerts)) {

        processAlertsData(alerts);

    }


    if (Array.isArray(audit)) {

        state.auditLogs = audit;

        renderAuditLog();

    }


    updateAllUI();

}


/* =========================================================
   EXAM DATA
========================================================= */

function processExamData(data) {

    if (!data) {
        return;
    }


    state.exam.id =
        data.id ||
        data.exam_id ||
        data._id ||
        null;


    state.exam.title =
        data.title ||
        data.name ||
        "No Live Examination";


    state.exam.status =
        normalizeStatus(
            data.status || "live"
        );


    state.exam.duration =
        Number(
            data.duration ||
            data.duration_minutes ||
            0
        );


    /*
     * Remaining time may arrive in seconds
     * or minutes.
     */

    if (
        data.remaining_seconds !== undefined
    ) {

        state.exam.remainingSeconds =
            Number(data.remaining_seconds);

    }

    else if (
        data.time_remaining !== undefined
    ) {

        state.exam.remainingSeconds =
            convertTimeToSeconds(
                data.time_remaining
            );

    }


    state.exam.totalStudents =
        Number(
            data.total_students ||
            data.totalStudents ||
            data.participants_count ||
            state.students.length ||
            0
        );


    state.exam.started =
        Number(
            data.started ||
            data.started_count ||
            0
        );


    state.exam.inProgress =
        Number(
            data.in_progress ||
            data.inProgress ||
            data.active_students ||
            0
        );


    state.exam.submitted =
        Number(
            data.submitted ||
            data.submitted_count ||
            0
        );


    state.exam.notStarted =
        Number(
            data.not_started ||
            data.notStarted ||
            Math.max(
                0,
                state.exam.totalStudents -
                state.exam.started
            )
        );


    if (
        state.exam.remainingSeconds > 0
    ) {

        startCountdown();

    }

}


/* =========================================================
   STUDENT DATA
========================================================= */

function processStudentsData(data) {

    if (!Array.isArray(data)) {

        if (data?.students) {
            data = data.students;
        }
        else {
            data = [];
        }

    }


    state.students =
        data.map(
            normalizeStudent
        );


    state.exam.totalStudents =
        state.students.length;


    applyFilters();

}


/* =========================================================
   NORMALIZE STUDENT
========================================================= */

function normalizeStudent(student, index) {

    const warnings =
        Number(
            student.warnings ||
            student.warning_count ||
            student.warningCount ||
            0
        );


    const progress =
        Number(
            student.progress ||
            student.progress_percentage ||
            student.progressPercent ||
            0
        );


    let status =
        student.status ||
        "offline";


    status =
        normalizeStudentStatus(
            status
        );


    return {

        id:
            student.id ||
            student.student_id ||
            student._id ||
            `student-${index + 1}`,

        name:
            student.name ||
            student.student_name ||
            student.full_name ||
            "Unknown Student",

        studentId:
            student.studentId ||
            student.student_id ||
            student.roll_number ||
            student.rollNo ||
            "—",

        status,

        progress:
            Math.max(
                0,
                Math.min(100, progress)
            ),

        timeRemaining:
            student.time_remaining ||
            student.timeRemaining ||
            student.remaining_time ||
            "—",

        camera:
            normalizeCameraStatus(
                student.camera ||
                student.camera_status ||
                "Unknown"
            ),

        warnings,

        currentQuestion:
            student.current_question ||
            student.currentQuestion ||
            "—",

        lastActivity:
            student.last_activity ||
            student.lastActivity ||
            null,

        ipAddress:
            student.ip_address ||
            student.ipAddress ||
            "—",

        joinedAt:
            student.joined_at ||
            student.joinedAt ||
            null

    };

}


/* =========================================================
   STATUS NORMALIZATION
========================================================= */

function normalizeStatus(status) {

    return String(status)
        .toLowerCase()
        .replace(/[\s_-]+/g, "_");

}


function normalizeStudentStatus(status) {

    const value =
        String(status)
            .toLowerCase()
            .trim();


    if (
        value.includes("active") ||
        value.includes("live")
    ) {
        return "active";
    }


    if (
        value.includes("idle")
    ) {
        return "idle";
    }


    if (
        value.includes("submit")
    ) {
        return "submitted";
    }


    return "offline";

}


function normalizeCameraStatus(status) {

    const value =
        String(status)
            .toLowerCase();


    if (
        value.includes("on") ||
        value.includes("active") ||
        value.includes("working")
    ) {
        return "On";
    }


    if (
        value.includes("off") ||
        value.includes("inactive")
    ) {
        return "Off";
    }


    return "Unknown";

}


/* =========================================================
   FILTER INITIALIZATION
========================================================= */

function initializeFilters() {

    if (DOM.studentSearch) {

        DOM.studentSearch.addEventListener(
            "input",
            debounce(() => {

                state.filters.search =
                    DOM.studentSearch.value
                        .trim()
                        .toLowerCase();

                state.currentPage = 1;

                applyFilters();

            }, 250)
        );

    }


    if (DOM.statusFilter) {

        DOM.statusFilter.addEventListener(
            "change",
            () => {

                state.filters.status =
                    DOM.statusFilter.value;

                state.currentPage = 1;

                applyFilters();

            }
        );

    }


    if (DOM.warningFilter) {

        DOM.warningFilter.addEventListener(
            "change",
            () => {

                state.filters.warning =
                    DOM.warningFilter.value;

                state.currentPage = 1;

                applyFilters();

            }
        );

    }

}


/* =========================================================
   APPLY FILTERS
========================================================= */

function applyFilters() {

    const {
        search,
        status,
        warning
    } = state.filters;


    state.filteredStudents =
        state.students.filter(
            (student) => {

                const matchesSearch =
                    !search ||
                    student.name
                        .toLowerCase()
                        .includes(search) ||
                    String(student.studentId)
                        .toLowerCase()
                        .includes(search);


                const matchesStatus =
                    status === "all" ||
                    student.status === status;


                const matchesWarning =
                    warning === "all" ||
                    (
                        warning === "warning" &&
                        student.warnings > 0
                    ) ||
                    (
                        warning === "none" &&
                        student.warnings === 0
                    );


                return (
                    matchesSearch &&
                    matchesStatus &&
                    matchesWarning
                );

            }
        );


    renderStudentTable();

}


/* =========================================================
   STUDENT TABLE
========================================================= */

function renderStudentTable() {

    if (!DOM.studentTableBody) {
        return;
    }


    const total =
        state.filteredStudents.length;


    const start =
        (state.currentPage - 1) *
        state.studentsPerPage;


    const end =
        start +
        state.studentsPerPage;


    const students =
        state.filteredStudents.slice(
            start,
            end
        );


    DOM.studentTableBody.innerHTML = "";


    if (students.length === 0) {

        renderTableEmptyState();

        updatePagination();

        return;

    }


    students.forEach(
        (student) => {

            DOM.studentTableBody.appendChild(
                createStudentRow(student)
            );

        }
    );


    updatePagination();

}


/* =========================================================
   CREATE STUDENT ROW
========================================================= */

function createStudentRow(student) {

    const row =
        document.createElement("tr");


    const initials =
        getInitials(
            student.name
        );


    row.innerHTML = `

        <td>
            <div class="student-cell">

                <div class="student-avatar">
                    ${escapeHTML(initials)}
                </div>

                <div class="student-info">

                    <strong>
                        ${escapeHTML(student.name)}
                    </strong>

                    <span>
                        ${escapeHTML(
                            String(student.studentId)
                        )}
                    </span>

                </div>

            </div>
        </td>


        <td>
            <span class="status-badge ${escapeHTML(
                student.status
            )}">
                <span class="status-dot"></span>
                ${capitalize(
                    student.status
                )}
            </span>
        </td>


        <td>
            <div class="student-progress">

                <div class="mini-progress">
                    <div
                        class="mini-progress-fill"
                        style="width:${student.progress}%"
                    ></div>
                </div>

                <span>
                    ${student.progress}%
                </span>

            </div>
        </td>


        <td>
            <span class="time-value">
                ${escapeHTML(
                    formatTimeValue(
                        student.timeRemaining
                    )
                )}
            </span>
        </td>


        <td>
            <span class="camera-status ${cameraClass(
                student.camera
            )}">
                <i class="fa-solid fa-video"></i>
                ${escapeHTML(student.camera)}
            </span>
        </td>


        <td>
            <span class="warning-count ${
                student.warnings > 0
                    ? "has-warning"
                    : "no-warning"
            }">

                <i class="fa-solid fa-triangle-exclamation"></i>

                ${student.warnings}

            </span>
        </td>


        <td>
            <button
                type="button"
                class="view-student-btn"
                data-student-id="${escapeHTML(
                    String(student.id)
                )}"
                aria-label="View ${escapeHTML(
                    student.name
                )}"
            >
                <i class="fa-solid fa-eye"></i>
                View
            </button>
        </td>

    `;


    const viewButton =
        row.querySelector(
            ".view-student-btn"
        );


    if (viewButton) {

        viewButton.addEventListener(
            "click",
            () => selectStudent(
                student.id
            )
        );

    }


    return row;

}


/* =========================================================
   EMPTY TABLE
========================================================= */

function renderTableEmptyState() {

    DOM.studentTableBody.innerHTML = `

        <tr>
            <td
                colspan="7"
                class="table-empty-state"
            >

                <div class="empty-icon">
                    <i class="fa-solid fa-users-slash"></i>
                </div>

                <strong>
                    No students found
                </strong>

                <span>
                    Try changing your search or filters.
                </span>

            </td>
        </tr>

    `;

}


/* =========================================================
   PAGINATION
========================================================= */

function initializePagination() {

    if (DOM.previousPage) {

        DOM.previousPage.addEventListener(
            "click",
            () => {

                if (
                    state.currentPage > 1
                ) {

                    state.currentPage--;

                    renderStudentTable();

                }

            }
        );

    }


    if (DOM.nextPage) {

        DOM.nextPage.addEventListener(
            "click",
            () => {

                const totalPages =
                    Math.ceil(
                        state.filteredStudents.length /
                        state.studentsPerPage
                    );


                if (
                    state.currentPage <
                    totalPages
                ) {

                    state.currentPage++;

                    renderStudentTable();

                }

            }
        );

    }

}


function updatePagination() {

    const total =
        state.filteredStudents.length;


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                total /
                state.studentsPerPage
            )
        );


    if (
        state.currentPage >
        totalPages
    ) {

        state.currentPage =
            totalPages;

    }


    if (DOM.currentPage) {

        DOM.currentPage.textContent =
            state.currentPage;

    }


    if (DOM.previousPage) {

        DOM.previousPage.disabled =
            state.currentPage <= 1;

    }


    if (DOM.nextPage) {

        DOM.nextPage.disabled =
            state.currentPage >= totalPages;

    }


    if (DOM.tableResultText) {

        if (total === 0) {

            DOM.tableResultText.textContent =
                "No students found";

        }

        else {

            const start =
                (state.currentPage - 1) *
                state.studentsPerPage +
                1;

            const end =
                Math.min(
                    state.currentPage *
                    state.studentsPerPage,
                    total
                );


            DOM.tableResultText.textContent =
                `Showing ${start}–${end} of ${total} students`;

        }

    }

}


/* =========================================================
   STUDENT SELECTION
========================================================= */

function selectStudent(studentId) {

    const student =
        state.students.find(
            (item) =>
                String(item.id) ===
                String(studentId)
        );


    if (!student) {

        console.warn(
            "Student not found:",
            studentId
        );

        return;

    }


    state.selectedStudent =
        student;


    renderStudentDetails(
        student
    );


    if (DOM.studentDetailPanel) {

        DOM.studentDetailPanel.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });

    }

}


/* =========================================================
   STUDENT DETAILS
========================================================= */

function renderStudentDetails(student) {

    if (DOM.detailAvatar) {

        DOM.detailAvatar.textContent =
            getInitials(
                student.name
            );

    }


    if (DOM.detailName) {

        DOM.detailName.textContent =
            student.name;

    }


    if (DOM.detailId) {

        DOM.detailId.textContent =
            student.studentId;

    }


    if (DOM.detailStatus) {

        DOM.detailStatus.textContent =
            capitalize(
                student.status
            );

        DOM.detailStatus.className =
            `detail-status ${student.status}`;

    }


    if (DOM.detailProgress) {

        DOM.detailProgress.textContent =
            `${student.progress}%`;

    }


    if (DOM.detailCamera) {

        DOM.detailCamera.textContent =
            student.camera;

    }


    if (DOM.detailWarnings) {

        DOM.detailWarnings.textContent =
            student.warnings;

    }


    if (DOM.detailQuestion) {

        DOM.detailQuestion.textContent =
            student.currentQuestion;

    }


    if (DOM.detailTimeRemaining) {

        DOM.detailTimeRemaining.textContent =
            formatTimeValue(
                student.timeRemaining
            );

    }


    if (DOM.sendWarningBtn) {

        DOM.sendWarningBtn.disabled =
            false;

    }


    if (DOM.terminateBtn) {

        DOM.terminateBtn.disabled =
            false;

    }

}


/* =========================================================
   STATISTICS
========================================================= */

function updateStatistics() {

    const students =
        state.students;


    const live =
        students.filter(
            s => s.status === "active"
        ).length;


    const active =
        students.filter(
            s =>
                s.status === "active" ||
                s.status === "idle"
        ).length;


    const offline =
        students.filter(
            s => s.status === "offline"
        ).length;


    const submitted =
        students.filter(
            s => s.status === "submitted"
        ).length;


    const warnings =
        students.filter(
            s => s.warnings > 0
        ).length;


    setText(
        DOM.liveStudents,
        live
    );

    setText(
        DOM.activeStudents,
        active
    );

    setText(
        DOM.warningStudents,
        warnings
    );

    setText(
        DOM.offlineStudents,
        offline
    );

    setText(
        DOM.submittedStudents,
        submitted
    );


    /*
     * Progress statistics
     */

    const total =
        students.length;


    const started =
        students.filter(
            s =>
                s.status !== "offline" ||
                s.progress > 0
        ).length;


    const inProgress =
        students.filter(
            s =>
                s.status === "active" ||
                s.status === "idle"
        ).length;


    state.exam.started =
        started;


    state.exam.inProgress =
        inProgress;


    state.exam.submitted =
        submitted;


    state.exam.notStarted =
        Math.max(
            0,
            total -
            started -
            submitted
        );


    updateProgressUI();

}


/* =========================================================
   EXAM PROGRESS
========================================================= */

function updateProgressUI() {

    const total =
        state.exam.totalStudents ||
        state.students.length;


    const started =
        state.exam.started || 0;


    const activePercentage =
        total > 0
            ? Math.round(
                (started / total) * 100
            )
            : 0;


    if (DOM.progressPercentage) {

        DOM.progressPercentage.textContent =
            `${activePercentage}% Active`;

    }


    if (DOM.examProgress) {

        DOM.examProgress.style.width =
            `${activePercentage}%`;

    }


    setText(
        DOM.startedCount,
        state.exam.started
    );

    setText(
        DOM.inProgressCount,
        state.exam.inProgress
    );

    setText(
        DOM.submittedCount,
        state.exam.submitted
    );

    setText(
        DOM.notStartedCount,
        state.exam.notStarted
    );


    setText(
        DOM.completionStarted,
        state.exam.started
    );

    setText(
        DOM.completionInProgress,
        state.exam.inProgress
    );

    setText(
        DOM.completionSubmitted,
        state.exam.submitted
    );

    setText(
        DOM.completionNotStarted,
        state.exam.notStarted
    );

}


/* =========================================================
   EXAM HEADER
========================================================= */

function updateExamUI() {

    setText(
        DOM.examName,
        state.exam.title
    );


    if (DOM.examStatus) {

        DOM.examStatus.textContent =
            state.examPaused
                ? "PAUSED"
                : state.exam.status === "live"
                    ? "LIVE"
                    : state.exam.status.toUpperCase();

    }


    if (DOM.examDuration) {

        DOM.examDuration.textContent =
            state.exam.duration
                ? `Duration: ${state.exam.duration} min`
                : "Duration: --";

    }


    updateExamTimer();

}


/* =========================================================
   COUNTDOWN TIMER
========================================================= */

function startCountdown() {

    stopCountdown();


    if (
        state.exam.remainingSeconds <= 0
    ) {

        updateExamTimer();

        return;

    }


    state.timers.countdown =
        setInterval(() => {

            if (
                !state.examPaused &&
                state.exam.remainingSeconds > 0
            ) {

                state.exam.remainingSeconds--;

            }


            updateExamTimer();


            if (
                state.exam.remainingSeconds <= 0
            ) {

                stopCountdown();

                handleExamTimeExpired();

            }

        }, 1000);

}


function stopCountdown() {

    if (state.timers.countdown) {

        clearInterval(
            state.timers.countdown
        );

        state.timers.countdown = null;

    }

}


function updateExamTimer() {

    if (!DOM.examTimer) {
        return;
    }


    if (
        state.exam.remainingSeconds <= 0
    ) {

        DOM.examTimer.textContent =
            "--:--";

        return;

    }


    DOM.examTimer.textContent =
        formatSeconds(
            state.exam.remainingSeconds
        );

}


/* =========================================================
   EXAM TIME EXPIRED
========================================================= */

function handleExamTimeExpired() {

    if (DOM.examTimer) {

        DOM.examTimer.textContent =
            "00:00";

    }


    addLocalActivity(
        "Exam timer reached zero",
        "The scheduled examination time has ended.",
        "fa-clock"
    );

}


/* =========================================================
   ACTIVITY DATA
========================================================= */

function processActivityData(data) {

    if (!Array.isArray(data)) {

        if (data?.activities) {

            data =
                data.activities;

        }

        else {

            data = [];

        }

    }


    state.activities =
        data.map(
            normalizeActivity
        );


    renderActivityFeed();

}


function normalizeActivity(activity) {

    return {

        id:
            activity.id ||
            activity._id ||
            Date.now() +
            Math.random(),

        student:
            activity.student ||
            activity.student_name ||
            "System",

        message:
            activity.message ||
            activity.description ||
            "Activity detected",

        type:
            activity.type ||
            "info",

        icon:
            activity.icon ||
            "fa-bolt",

        timestamp:
            activity.timestamp ||
            activity.created_at ||
            activity.time ||
            new Date()

    };

}


/* =========================================================
   ACTIVITY FEED
========================================================= */

function renderActivityFeed() {

    if (!DOM.activityFeed) {
        return;
    }


    if (
        state.activities.length === 0
    ) {

        DOM.activityFeed.innerHTML = `

            <div class="empty-state">

                <i class="fa-solid fa-bolt"></i>

                <strong>
                    No recent activity
                </strong>

                <span>
                    Live student activity will appear here.
                </span>

            </div>

        `;

        return;

    }


    const activities =
        state.activities.slice(
            0,
            10
        );


    DOM.activityFeed.innerHTML =
        activities
            .map(
                activity => `

                <div class="activity-item">

                    <div class="activity-icon ${escapeHTML(
                        activity.type
                    )}">
                        <i class="fa-solid ${
                            escapeHTML(
                                activity.icon
                            )
                        }"></i>
                    </div>

                    <div class="activity-content">

                        <strong>
                            ${escapeHTML(
                                activity.student
                            )}
                        </strong>

                        <p>
                            ${escapeHTML(
                                activity.message
                            )}
                        </p>

                        <span>
                            ${formatRelativeTime(
                                activity.timestamp
                            )}
                        </span>

                    </div>

                </div>

            `
            )
            .join("");

}


/* =========================================================
   SECURITY ALERTS
========================================================= */

function processAlertsData(data) {

    if (!Array.isArray(data)) {

        if (data?.alerts) {

            data =
                data.alerts;

        }

        else {

            data = [];

        }

    }


    state.alerts =
        data.map(
            normalizeAlert
        );


    renderSecurityAlerts();

}


function normalizeAlert(alert) {

    return {

        id:
            alert.id ||
            alert._id ||
            Date.now() +
            Math.random(),

        student:
            alert.student ||
            alert.student_name ||
            "Unknown Student",

        message:
            alert.message ||
            alert.description ||
            "Security event detected",

        severity:
            alert.severity ||
            alert.level ||
            "warning",

        timestamp:
            alert.timestamp ||
            alert.created_at ||
            new Date()

    };

}


/* =========================================================
   SECURITY ALERT UI
========================================================= */

function renderSecurityAlerts() {

    if (!DOM.securityAlerts) {
        return;
    }


    setText(
        DOM.alertCount,
        state.alerts.length
    );


    if (
        state.alerts.length === 0
    ) {

        DOM.securityAlerts.innerHTML = `

            <div class="empty-state">

                <i class="fa-solid fa-shield-check"></i>

                <strong>
                    No security alerts
                </strong>

                <span>
                    No suspicious activity has been detected.
                </span>

            </div>

        `;

        return;

    }


    DOM.securityAlerts.innerHTML =
        state.alerts
            .slice(0, 8)
            .map(
                alert => `

                <div class="security-alert ${escapeHTML(
                    alert.severity
                )}">

                    <div class="alert-icon">

                        <i class="fa-solid fa-triangle-exclamation"></i>

                    </div>

                    <div class="alert-content">

                        <strong>
                            ${escapeHTML(
                                alert.student
                            )}
                        </strong>

                        <p>
                            ${escapeHTML(
                                alert.message
                            )}
                        </p>

                        <span>
                            ${formatRelativeTime(
                                alert.timestamp
                            )}
                        </span>

                    </div>

                </div>

            `
            )
            .join("");

}


/* =========================================================
   AUDIT LOG
========================================================= */

function renderAuditLog() {

    if (!DOM.auditLog) {
        return;
    }


    if (
        state.auditLogs.length === 0
    ) {

        DOM.auditLog.innerHTML = `

            <div class="empty-state">

                <i class="fa-solid fa-clock-rotate-left"></i>

                <strong>
                    No recent admin activity
                </strong>

            </div>

        `;

        return;

    }


    DOM.auditLog.innerHTML =
        state.auditLogs
            .slice(0, 8)
            .map(
                log => `

                <div class="audit-item">

                    <div class="audit-icon">

                        <i class="fa-solid fa-circle-check"></i>

                    </div>

                    <div>

                        <strong>
                            ${escapeHTML(
                                log.action ||
                                log.message ||
                                "Administrative action"
                            )}
                        </strong>

                        <span>
                            ${formatRelativeTime(
                                log.timestamp ||
                                log.created_at
                            )}
                        </span>

                    </div>

                </div>

            `
            )
            .join("");

}


/* =========================================================
   MONITORING ACTIONS
========================================================= */

function initializeMonitoringActions() {

    /*
     * Refresh
     */

    if (DOM.refreshBtn) {

        DOM.refreshBtn.addEventListener(
            "click",
            async () => {

                setButtonLoading(
                    DOM.refreshBtn,
                    true
                );

                await loadMonitoringData();

                setButtonLoading(
                    DOM.refreshBtn,
                    false
                );

                showToast(
                    "Monitoring data refreshed.",
                    "success"
                );

            }
        );

    }


    /*
     * Fullscreen
     */

    if (DOM.fullscreenBtn) {

        DOM.fullscreenBtn.addEventListener(
            "click",
            toggleFullscreen
        );

    }


    /*
     * Student warning
     */

    if (DOM.sendWarningBtn) {

        DOM.sendWarningBtn.addEventListener(
            "click",
            sendStudentWarning
        );

    }


    /*
     * Student termination
     */

    if (DOM.terminateBtn) {

        DOM.terminateBtn.addEventListener(
            "click",
            terminateStudent
        );

    }


    /*
     * Pause
     */

    if (DOM.pauseExamBtn) {

        DOM.pauseExamBtn.addEventListener(
            "click",
            toggleExamPause
        );

    }


    /*
     * Extend time
     */

    if (DOM.extendTimeBtn) {

        DOM.extendTimeBtn.addEventListener(
            "click",
            extendExamTime
        );

    }


    /*
     * Broadcast
     */

    if (DOM.broadcastBtn) {

        DOM.broadcastBtn.addEventListener(
            "click",
            broadcastMessage
        );

    }


    /*
     * End exam
     */

    if (DOM.endExamBtn) {

        DOM.endExamBtn.addEventListener(
            "click",
            endExam
        );

    }


    /*
     * Activity log
     */

    if (DOM.activityLogBtn) {

        DOM.activityLogBtn.addEventListener(
            "click",
            openActivityLog
        );

    }


    /*
     * Export
     */

    if (DOM.exportReportBtn) {

        DOM.exportReportBtn.addEventListener(
            "click",
            exportMonitoringReport
        );

    }

}


/* =========================================================
   PAUSE / RESUME EXAM
========================================================= */

async function toggleExamPause() {

    if (state.examPaused) {

        await performExamAction(
            "resume"
        );

    }

    else {

        await showConfirmation(
            "Pause Examination",
            "Are you sure you want to temporarily pause the examination?",
            "pause"
        );

    }

}


async function executeModalAction(action) {

    switch (action) {

        case "pause":
            await performExamAction(
                "pause"
            );
            break;


        case "end":
            await performExamAction(
                "end"
            );
            break;


        case "terminate":
            await performTerminateStudent();
            break;


        case "warning":
            await performSendWarning();
            break;

    }

}


/* =========================================================
   EXAM ACTION API
========================================================= */

async function performExamAction(action) {

    const endpoint =
        action === "pause"
            ? MONITORING_CONFIG.endpoints.pauseExam
            : action === "resume"
                ? MONITORING_CONFIG.endpoints.resumeExam
                : MONITORING_CONFIG.endpoints.endExam;


    try {

        await apiRequest(
            endpoint,
            {
                method: "POST",
                body: JSON.stringify({
                    exam_id: state.exam.id
                })
            }
        );


        if (action === "pause") {

            state.examPaused = true;

            updatePauseButton();

            addLocalActivity(
                "Examination paused",
                "Administrator paused the examination.",
                "fa-pause"
            );

            showToast(
                "Exam paused successfully.",
                "success"
            );

        }


        else if (action === "resume") {

            state.examPaused = false;

            updatePauseButton();

            addLocalActivity(
                "Examination resumed",
                "Administrator resumed the examination.",
                "fa-play"
            );

            showToast(
                "Exam resumed successfully.",
                "success"
            );

        }


        else if (action === "end") {

            state.exam.status =
                "completed";

            state.examPaused =
                false;

            stopCountdown();

            updateExamUI();

            addLocalActivity(
                "Examination ended",
                "The administrator ended the examination.",
                "fa-stop"
            );

            showToast(
                "Exam ended successfully.",
                "success"
            );

        }

    }

    catch (error) {

        /*
         * If backend endpoint is not ready,
         * keep frontend functional.
         */

        console.warn(
            `${action} exam API failed:`,
            error.message
        );


        if (action === "pause") {

            state.examPaused = true;

        }

        else if (action === "resume") {

            state.examPaused = false;

        }

        else if (action === "end") {

            state.exam.status =
                "completed";

            stopCountdown();

        }


        updatePauseButton();

        updateExamUI();


        showToast(
            `Exam ${action} action could not be synced with the server.`,
            "warning"
        );

    }

}


/* =========================================================
   PAUSE BUTTON UI
========================================================= */

function updatePauseButton() {

    if (!DOM.pauseExamBtn) {
        return;
    }


    if (state.examPaused) {

        DOM.pauseExamBtn.classList.add(
            "resume"
        );

        DOM.pauseExamBtn.classList.remove(
            "pause"
        );


        DOM.pauseExamBtn.innerHTML = `

            <i class="fa-solid fa-play"></i>

            <div>

                <strong>
                    Resume Exam
                </strong>

                <span>
                    Continue examination
                </span>

            </div>

        `;

    }

    else {

        DOM.pauseExamBtn.classList.remove(
            "resume"
        );

        DOM.pauseExamBtn.classList.add(
            "pause"
        );


        DOM.pauseExamBtn.innerHTML = `

            <i class="fa-solid fa-pause"></i>

            <div>

                <strong>
                    Pause Exam
                </strong>

                <span>
                    Temporarily pause examination
                </span>

            </div>

        `;

    }

}


/* =========================================================
   EXTEND EXAM TIME
========================================================= */

async function extendExamTime() {

    const input =
        prompt(
            "Enter additional time in minutes:",
            "10"
        );


    if (input === null) {
        return;
    }


    const minutes =
        Number(input);


    if (
        !Number.isFinite(minutes) ||
        minutes <= 0 ||
        minutes > 180
    ) {

        showToast(
            "Please enter a valid time between 1 and 180 minutes.",
            "error"
        );

        return;

    }


    try {

        await apiRequest(
            MONITORING_CONFIG.endpoints.extendExam,
            {
                method: "POST",
                body: JSON.stringify({
                    exam_id:
                        state.exam.id,
                    minutes
                })
            }
        );


        state.exam.remainingSeconds +=
            minutes * 60;


        state.exam.duration +=
            minutes;


        startCountdown();


        updateExamUI();


        addLocalActivity(
            "Exam time extended",
            `${minutes} minutes added to the examination.`,
            "fa-clock"
        );


        showToast(
            `${minutes} minutes added successfully.`,
            "success"
        );

    }

    catch (error) {

        console.warn(
            "Extend exam API failed:",
            error.message
        );


        /*
         * Local fallback
         */

        state.exam.remainingSeconds +=
            minutes * 60;


        state.exam.duration +=
            minutes;


        startCountdown();

        updateExamUI();


        showToast(
            "Time updated locally. Server synchronization is unavailable.",
            "warning"
        );

    }

}


/* =========================================================
   BROADCAST MESSAGE
========================================================= */

async function broadcastMessage() {

    const message =
        prompt(
            "Enter the message to broadcast to all students:"
        );


    if (
        !message ||
        !message.trim()
    ) {

        return;

    }


    const cleanMessage =
        message.trim();


    if (
        cleanMessage.length > 500
    ) {

        showToast(
            "Message cannot exceed 500 characters.",
            "error"
        );

        return;

    }


    try {

        await apiRequest(
            MONITORING_CONFIG.endpoints.broadcast,
            {
                method: "POST",
                body: JSON.stringify({
                    exam_id:
                        state.exam.id,
                    message:
                        cleanMessage
                })
            }
        );


        addLocalActivity(
            "Broadcast message sent",
            cleanMessage,
            "fa-bullhorn"
        );


        showToast(
            "Broadcast sent to all students.",
            "success"
        );

    }

    catch (error) {

        console.warn(
            "Broadcast API failed:",
            error.message
        );


        addLocalActivity(
            "Broadcast prepared",
            cleanMessage,
            "fa-bullhorn"
        );


        showToast(
            "Message prepared, but server synchronization is unavailable.",
            "warning"
        );

    }

}


/* =========================================================
   END EXAM
========================================================= */

async function endExam() {

    await showConfirmation(
        "End Examination",
        "This will end the examination for all students. This action should only be used when you are certain.",
        "end"
    );

}


/* =========================================================
   SEND STUDENT WARNING
========================================================= */

async function sendStudentWarning() {

    if (
        !state.selectedStudent
    ) {

        showToast(
            "Please select a student first.",
            "warning"
        );

        return;

    }


    await showConfirmation(
        "Send Warning",
        `Send a warning to ${state.selectedStudent.name}?`,
        "warning"
    );

}


async function performSendWarning() {

    const student =
        state.selectedStudent;


    if (!student) {
        return;
    }


    try {

        await apiRequest(
            MONITORING_CONFIG.endpoints.warning,
            {
                method: "POST",
                body: JSON.stringify({
                    exam_id:
                        state.exam.id,
                    student_id:
                        student.id
                })
            }
        );


        student.warnings++;

        renderStudentDetails(
            student
        );

        updateStatistics();


        addLocalActivity(
            "Warning sent",
            `Warning sent to ${student.name}.`,
            "fa-triangle-exclamation"
        );


        showToast(
            `Warning sent to ${student.name}.`,
            "success"
        );

    }

    catch (error) {

        console.warn(
            "Warning API failed:",
            error.message
        );


        student.warnings++;

        renderStudentDetails(
            student
        );

        updateStatistics();


        showToast(
            "Warning recorded locally. Server synchronization unavailable.",
            "warning"
        );

    }

}


/* =========================================================
   TERMINATE STUDENT
========================================================= */

async function terminateStudent() {

    if (
        !state.selectedStudent
    ) {

        showToast(
            "Please select a student first.",
            "warning"
        );

        return;

    }


    await showConfirmation(
        "Terminate Student",
        `Are you sure you want to terminate ${state.selectedStudent.name}'s examination session?`,
        "terminate"
    );

}


async function performTerminateStudent() {

    const student =
        state.selectedStudent;


    if (!student) {
        return;
    }


    try {

        await apiRequest(
            MONITORING_CONFIG.endpoints.terminate,
            {
                method: "POST",
                body: JSON.stringify({
                    exam_id:
                        state.exam.id,
                    student_id:
                        student.id
                })
            }
        );


        student.status =
            "offline";


        renderStudentDetails(
            student
        );


        applyFilters();


        updateStatistics();


        addLocalActivity(
            "Student session terminated",
            `${student.name}'s examination session was terminated.`,
            "fa-user-xmark"
        );


        showToast(
            `${student.name}'s session was terminated.`,
            "success"
        );

    }

    catch (error) {

        console.warn(
            "Terminate API failed:",
            error.message
        );


        student.status =
            "offline";


        applyFilters();

        updateStatistics();


        showToast(
            "Student was marked offline locally. Server synchronization unavailable.",
            "warning"
        );

    }

}


/* =========================================================
   CONFIRMATION MODAL
========================================================= */

function initializeModal() {

    if (DOM.cancelModalBtn) {

        DOM.cancelModalBtn.addEventListener(
            "click",
            closeModal
        );

    }


    if (DOM.confirmModalBtn) {

        DOM.confirmModalBtn.addEventListener(
            "click",
            async () => {

                const action =
                    state.modalAction;

                closeModal();

                if (action) {

                    await executeModalAction(
                        action
                    );

                }

            }
        );

    }


    if (DOM.confirmationModal) {

        DOM.confirmationModal.addEventListener(
            "click",
            (event) => {

                if (
                    event.target ===
                    DOM.confirmationModal
                ) {

                    closeModal();

                }

            }
        );

    }

}


function showConfirmation(
    title,
    message,
    action
) {

    return new Promise(
        (resolve) => {

            state.modalAction =
                action;


            state.modalResolver =
                resolve;


            if (DOM.modalTitle) {

                DOM.modalTitle.textContent =
                    title;

            }


            if (DOM.modalMessage) {

                DOM.modalMessage.textContent =
                    message;

            }


            if (DOM.confirmationModal) {

                DOM.confirmationModal.hidden =
                    false;

                DOM.confirmationModal.classList.add(
                    "show"
                );

            }

        }
    );

}


function closeModal() {

    if (DOM.confirmationModal) {

        DOM.confirmationModal.hidden =
            true;

        DOM.confirmationModal.classList.remove(
            "show"
        );

    }


    state.modalAction =
        null;


    if (state.modalResolver) {

        state.modalResolver();

        state.modalResolver =
            null;

    }

}


/* =========================================================
   FULLSCREEN MONITORING MODE
========================================================= */

async function toggleFullscreen() {

    try {

        if (!document.fullscreenElement) {

            await document.documentElement
                .requestFullscreen();


            if (DOM.fullscreenBtn) {

                DOM.fullscreenBtn.innerHTML = `

                    <i class="fa-solid fa-compress"></i>
                    Exit Monitoring Mode

                `;

            }

        }

        else {

            await document.exitFullscreen();

        }

    }

    catch (error) {

        console.warn(
            "Fullscreen unavailable:",
            error
        );

        showToast(
            "Fullscreen mode is not available in this browser.",
            "warning"
        );

    }

}


document.addEventListener(
    "fullscreenchange",
    () => {

        if (
            !DOM.fullscreenBtn
        ) {
            return;
        }


        if (
            document.fullscreenElement
        ) {

            DOM.fullscreenBtn.innerHTML = `

                <i class="fa-solid fa-compress"></i>
                Exit Monitoring Mode

            `;

        }

        else {

            DOM.fullscreenBtn.innerHTML = `

                <i class="fa-solid fa-expand"></i>
                Monitoring Mode

            `;

        }

    }
);


/* =========================================================
   NOTIFICATIONS
========================================================= */

function handleNotifications() {

    const alertCount =
        state.alerts.length;


    if (
        DOM.notificationCount
    ) {

        DOM.notificationCount.textContent =
            alertCount;

    }


    if (alertCount === 0) {

        showToast(
            "No new notifications.",
            "info"
        );

        return;

    }


    showToast(
        `You have ${alertCount} security alert${alertCount === 1 ? "" : "s"}.`,
        "warning"
    );


    if (
        DOM.securityAlerts
    ) {

        DOM.securityAlerts.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    }

}


/* =========================================================
   PROFILE
========================================================= */

async function handleProfile() {

    /*
     * Try loading current profile.
     */

    try {

        const profile =
            await apiRequest(
                MONITORING_CONFIG.endpoints.profile
            );


        if (profile) {

            setText(
                DOM.adminName,
                profile.name ||
                profile.full_name ||
                "Administrator"
            );


            setText(
                DOM.adminRole,
                profile.role ||
                "Super Admin"
            );

        }

    }

    catch {

        /*
         * Profile endpoint is optional.
         */

    }


    showToast(
        "Administrator profile selected.",
        "info"
    );

}


/* =========================================================
   AUTO REFRESH
========================================================= */

function startAutoRefresh() {

    stopAutoRefresh();


    state.timers.refresh =
        setInterval(
            async () => {

                await refreshStudents();

            },
            MONITORING_CONFIG.refreshInterval
        );


    state.timers.activity =
        setInterval(
            async () => {

                await refreshActivity();

            },
            MONITORING_CONFIG.activityRefreshInterval
        );

}


function stopAutoRefresh() {

    if (
        state.timers.refresh
    ) {

        clearInterval(
            state.timers.refresh
        );

        state.timers.refresh =
            null;

    }


    if (
        state.timers.activity
    ) {

        clearInterval(
            state.timers.activity
        );

        state.timers.activity =
            null;

    }

}


/* =========================================================
   REFRESH STUDENTS
========================================================= */

async function refreshStudents() {

    try {

        const data =
            await apiRequest(
                MONITORING_CONFIG.endpoints.students
            );


        processStudentsData(
            data
        );


        updateStatistics();

        updateConnectionStatus(
            "connected"
        );

    }

    catch (error) {

        console.warn(
            "Automatic student refresh failed:",
            error.message
        );


        updateConnectionStatus(
            "disconnected"
        );

    }

}


/* =========================================================
   REFRESH ACTIVITY
========================================================= */

async function refreshActivity() {

    try {

        const activity =
            await apiRequest(
                MONITORING_CONFIG.endpoints.activity
            );


        processActivityData(
            activity
        );

    }

    catch (error) {

        console.warn(
            "Activity refresh failed:",
            error.message
        );

    }

}


/* =========================================================
   UPDATE EVERYTHING
========================================================= */

function updateAllUI() {

    updateExamUI();

    updateStatistics();

    renderStudentTable();

    renderActivityFeed();

    renderSecurityAlerts();

    renderAuditLog();

    updateNotificationCount();

    updatePauseButton();

}


/* =========================================================
   NOTIFICATION COUNT
========================================================= */

function updateNotificationCount() {

    if (
        !DOM.notificationCount
    ) {
        return;
    }


    const count =
        state.alerts.length;


    DOM.notificationCount.textContent =
        count;


    DOM.notificationCount.setAttribute(
        "aria-label",
        `${count} notifications`
    );

}


/* =========================================================
   LOCAL ACTIVITY
========================================================= */

function addLocalActivity(
    title,
    message,
    icon = "fa-bolt"
) {

    state.activities.unshift({

        id:
            Date.now(),

        student:
            title,

        message,

        type:
            "admin",

        icon,

        timestamp:
            new Date()

    });


    state.activities =
        state.activities.slice(
            0,
            20
        );


    renderActivityFeed();

}


/* =========================================================
   ACTIVITY LOG
========================================================= */

function openActivityLog() {

    if (
        DOM.auditLog
    ) {

        DOM.auditLog.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    }

}


/* =========================================================
   EXPORT MONITORING REPORT
========================================================= */

function exportMonitoringReport() {

    const rows =
        state.students.map(
            student => [

                student.name,

                student.studentId,

                capitalize(
                    student.status
                ),

                `${student.progress}%`,

                student.timeRemaining,

                student.camera,

                student.warnings

            ]
        );


    const headers = [
        "Student",
        "Student ID",
        "Status",
        "Progress",
        "Time Remaining",
        "Camera",
        "Warnings"
    ];


    const csvData =
        [
            headers,
            ...rows
        ]
            .map(
                row =>
                    row
                        .map(
                            value =>
                                csvEscape(
                                    value
                                )
                        )
                        .join(",")
            )
            .join("\n");


    const blob =
        new Blob(
            [csvData],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        `exam-pro-monitoring-${formatDateForFile(
            new Date()
        )}.csv`;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    URL.revokeObjectURL(
        url
    );


    addLocalActivity(
        "Monitoring report exported",
        "Current monitoring data was exported as a CSV file.",
        "fa-download"
    );


    showToast(
        "Monitoring report exported successfully.",
        "success"
    );

}


/* =========================================================
   LOADING STATES
========================================================= */

function setLoadingStates() {

    if (
        DOM.studentTableBody
    ) {

        DOM.studentTableBody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="table-loading-state"
                >

                    <i class="fa-solid fa-spinner fa-spin"></i>

                    <span>
                        Loading students...
                    </span>

                </td>

            </tr>

        `;

    }


    if (
        DOM.activityFeed
    ) {

        DOM.activityFeed.innerHTML = `

            <div class="loading-state">

                <i class="fa-solid fa-spinner fa-spin"></i>

                <span>
                    Loading live activity...
                </span>

            </div>

        `;

    }


    if (
        DOM.securityAlerts
    ) {

        DOM.securityAlerts.innerHTML = `

            <div class="loading-state">

                <i class="fa-solid fa-spinner fa-spin"></i>

                <span>
                    Loading security alerts...
                </span>

            </div>

        `;

    }

}


/* =========================================================
   EMPTY MONITORING STATE
========================================================= */

function renderEmptyMonitoringState() {

    if (
        state.students.length === 0
    ) {

        state.filteredStudents =
            [];

        renderStudentTable();

    }


    if (
        state.activities.length === 0
    ) {

        renderActivityFeed();

    }


    if (
        state.alerts.length === 0
    ) {

        renderSecurityAlerts();

    }


    updateExamUI();

    updateStatistics();

}


/* =========================================================
   TOAST NOTIFICATION
========================================================= */

function showToast(
    message,
    type = "info"
) {

    let container =
        document.getElementById(
            "toastContainer"
        );


    if (!container) {

        container =
            document.createElement(
                "div"
            );

        container.id =
            "toastContainer";

        container.className =
            "toast-container";

        document.body.appendChild(
            container
        );

    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        `toast toast-${type}`;


    const icons = {

        success:
            "fa-circle-check",

        error:
            "fa-circle-xmark",

        warning:
            "fa-triangle-exclamation",

        info:
            "fa-circle-info"

    };


    toast.innerHTML = `

        <i class="fa-solid ${
            icons[type] ||
            icons.info
        }"></i>

        <span>
            ${escapeHTML(message)}
        </span>

        <button
            type="button"
            aria-label="Close notification"
        >
            <i class="fa-solid fa-xmark"></i>
        </button>

    `;


    const closeButton =
        toast.querySelector(
            "button"
        );


    closeButton.addEventListener(
        "click",
        () => {

            removeToast(
                toast
            );

        }
    );


    container.appendChild(
        toast
    );


    requestAnimationFrame(
        () => {

            toast.classList.add(
                "show"
            );

        }
    );


    setTimeout(
        () => {

            removeToast(
                toast
            );

        },
        4000
    );

}


function removeToast(toast) {

    if (!toast) {
        return;
    }


    toast.classList.remove(
        "show"
    );


    setTimeout(
        () => {

            toast.remove();

        },
        300
    );

}


/* =========================================================
   BUTTON LOADING
========================================================= */

function setButtonLoading(
    button,
    loading
) {

    if (!button) {
        return;
    }


    if (loading) {

        if (
            !button.dataset.originalHTML
        ) {

            button.dataset.originalHTML =
                button.innerHTML;

        }


        button.disabled =
            true;


        button.innerHTML = `

            <i class="fa-solid fa-spinner fa-spin"></i>
            Refreshing...

        `;

    }

    else {

        button.disabled =
            false;


        if (
            button.dataset.originalHTML
        ) {

            button.innerHTML =
                button.dataset.originalHTML;

        }

    }

}


/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

function initializeKeyboardShortcuts() {

    document.addEventListener(
        "keydown",
        (event) => {

            /*
             * Escape closes modal
             */

            if (
                event.key === "Escape"
            ) {

                closeModal();

            }


            /*
             * Ctrl + R
             * Don't override browser refresh.
             */

            if (
                event.ctrlKey &&
                event.key.toLowerCase() === "r"
            ) {

                /*
                 * Keep browser behavior.
                 */

                return;

            }

        }
    );

}


/* =========================================================
   UTILITY FUNCTIONS
========================================================= */

function setText(
    element,
    value
) {

    if (
        element
    ) {

        element.textContent =
            value ?? "—";

    }

}


function capitalize(value) {

    if (!value) {
        return "";
    }


    return String(value)
        .charAt(0)
        .toUpperCase() +
        String(value)
            .slice(1)
            .toLowerCase();

}


function getInitials(name) {

    if (!name) {
        return "—";
    }


    const words =
        String(name)
            .trim()
            .split(/\s+/);


    if (words.length === 1) {

        return words[0]
            .slice(0, 2)
            .toUpperCase();

    }


    return (
        words[0][0] +
        words[words.length - 1][0]
    ).toUpperCase();

}


function formatSeconds(seconds) {

    seconds =
        Math.max(
            0,
            Number(seconds) || 0
        );


    const hours =
        Math.floor(
            seconds / 3600
        );


    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );


    const secs =
        Math.floor(
            seconds % 60
        );


    if (hours > 0) {

        return [
            String(hours)
                .padStart(2, "0"),

            String(minutes)
                .padStart(2, "0"),

            String(secs)
                .padStart(2, "0")

        ].join(":");

    }


    return [

        String(minutes)
            .padStart(2, "0"),

        String(secs)
            .padStart(2, "0")

    ].join(":");

}


function formatTimeValue(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "—";

    }


    if (
        typeof value === "number"
    ) {

        return formatSeconds(
            value
        );

    }


    return String(value);

}


function convertTimeToSeconds(value) {

    if (
        typeof value === "number"
    ) {

        return value;

    }


    if (
        typeof value !== "string"
    ) {

        return 0;

    }


    const parts =
        value.split(":")
            .map(Number);


    if (
        parts.some(
            part => Number.isNaN(part)
        )
    ) {

        return 0;

    }


    if (
        parts.length === 3
    ) {

        return (
            parts[0] * 3600 +
            parts[1] * 60 +
            parts[2]
        );

    }


    if (
        parts.length === 2
    ) {

        return (
            parts[0] * 60 +
            parts[1]
        );

    }


    return Number(value) || 0;

}


function formatRelativeTime(timestamp) {

    if (!timestamp) {
        return "Just now";
    }


    const date =
        timestamp instanceof Date
            ? timestamp
            : new Date(timestamp);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "Recently";

    }


    const difference =
        Date.now() -
        date.getTime();


    const seconds =
        Math.floor(
            difference / 1000
        );


    if (seconds < 10) {

        return "Just now";

    }


    if (seconds < 60) {

        return `${seconds}s ago`;

    }


    const minutes =
        Math.floor(
            seconds / 60
        );


    if (minutes < 60) {

        return `${minutes}m ago`;

    }


    const hours =
        Math.floor(
            minutes / 60
        );


    if (hours < 24) {

        return `${hours}h ago`;

    }


    return date.toLocaleDateString();

}


function cameraClass(camera) {

    const value =
        String(camera)
            .toLowerCase();


    if (
        value === "on"
    ) {

        return "camera-on";

    }


    if (
        value === "off"
    ) {

        return "camera-off";

    }


    return "camera-unknown";

}


function debounce(
    callback,
    delay
) {

    let timeout;


    return function (...args) {

        clearTimeout(
            timeout
        );


        timeout =
            setTimeout(
                () => callback.apply(
                    this,
                    args
                ),
                delay
            );

    };

}


/* =========================================================
   CSV HELPERS
========================================================= */

function csvEscape(value) {

    const text =
        String(
            value ?? ""
        );


    return `"${text.replace(
        /"/g,
        '""'
    )}"`;

}


function formatDateForFile(date) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    const hours =
        String(
            date.getHours()
        ).padStart(
            2,
            "0"
        );


    const minutes =
        String(
            date.getMinutes()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}-${hours}${minutes}`;

}


/* =========================================================
   SECURITY — ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   LOGOUT
========================================================= */

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        (event) => {

            event.preventDefault();


            const confirmed =
                confirm(
                    "Are you sure you want to logout?"
                );


            if (!confirmed) {
                return;
            }


            /*
             * Clear authentication data
             */

            localStorage.removeItem(
                "access_token"
            );

            localStorage.removeItem(
                "accessToken"
            );

            localStorage.removeItem(
                "refresh_token"
            );

            localStorage.removeItem(
                "refreshToken"
            );

            localStorage.removeItem(
                "token"
            );


            window.location.href =
                "login.html";

        }
    );

}


/* =========================================================
   PAGE CLEANUP
========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        stopCountdown();

        stopAutoRefresh();

    }
);


/* =========================================================
   DEBUG ACCESS
========================================================= */

window.ExamProMonitoring = {

    state,

    refresh:
        loadMonitoringData,

    selectStudent,

    exportReport:
        exportMonitoringReport

};