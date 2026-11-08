// ============================================================
// EXAM PRO - STUDENTS MANAGEMENT
// ============================================================
// Professional • Responsive • Dynamic • Admin Students Page
//
// Features:
// 1. Load all students from backend
// 2. Display student details
// 3. Total students
// 4. Active students
// 5. Top performer
// 6. Best score
// 7. Average score
// 8. Student ranking
// 9. Search students
// 10. Filter students
// 11. Sort students
// 12. Student details modal
// 13. Loading / error / empty states
// 14. Refresh students
// ============================================================

"use strict";

// ============================================================
// API CONFIGURATION
// ============================================================

const API_BASE = "http://127.0.0.1:8000/api";

// Possible endpoints.
// The first endpoint that successfully returns student data is used.
const STUDENT_ENDPOINTS = [
    `${API_BASE}/students/`,
    `${API_BASE}/students`,
    `${API_BASE}/admin/students/`,
    `${API_BASE}/admin/students`
];

// ============================================================
// GLOBAL STATE
// ============================================================

let students = [];
let filteredStudents = [];

let currentSort = {
    field: "rank",
    direction: "asc"
};

let currentPage = 1;
const STUDENTS_PER_PAGE = 10;

let currentStudent = null;

let activeEndpoint = null;

// ============================================================
// DOM ELEMENT HELPERS
// ============================================================

function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

// ============================================================
// PAGE INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("====================================");
    console.log("EXAM PRO - Students Page");
    console.log("Students.js initialized");
    console.log("====================================");

    initializeStudentsPage();

});

// ============================================================
// INITIALIZE PAGE
// ============================================================

async function initializeStudentsPage() {

    setupEventListeners();

    showLoadingState();

    try {

        await loadStudents();

        calculateStudentStatistics();

        applyFilters();

        renderStudents();

    } catch (error) {

        console.error("Students page initialization failed:", error);

        showErrorState(
            "Unable to load student data. Please check your backend server."
        );

    }

}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {

    // --------------------------------------------------------
    // Search
    // --------------------------------------------------------

    const searchInput =
        $("#studentSearch") ||
        $("#searchStudents") ||
        $("#searchInput");

    if (searchInput) {

        searchInput.addEventListener("input", () => {

            currentPage = 1;

            applyFilters();

            renderStudents();

        });

    }

    // --------------------------------------------------------
    // Status filter
    // --------------------------------------------------------

    const statusFilter =
        $("#statusFilter") ||
        $("#studentStatusFilter");

    if (statusFilter) {

        statusFilter.addEventListener("change", () => {

            currentPage = 1;

            applyFilters();

            renderStudents();

        });

    }

    // --------------------------------------------------------
    // Sort
    // --------------------------------------------------------

    const sortSelect =
        $("#sortStudents") ||
        $("#studentSort");

    if (sortSelect) {

        sortSelect.addEventListener("change", event => {

            currentSort.field = event.target.value;
            currentSort.direction = "desc";

            currentPage = 1;

            applyFilters();

            renderStudents();

        });

    }

    // --------------------------------------------------------
    // Refresh button
    // --------------------------------------------------------

    const refreshButton =
        $("#refreshStudents") ||
        $("#refreshStudentBtn") ||
        $(".refresh-students");

    if (refreshButton) {

        refreshButton.addEventListener("click", async () => {

            await refreshStudents();

        });

    }

    // --------------------------------------------------------
    // Pagination
    // --------------------------------------------------------

    document.addEventListener("click", event => {

        const target = event.target.closest("[data-page]");

        if (!target) return;

        const page = Number(target.dataset.page);

        if (!page) return;

        currentPage = page;

        renderStudents();

    });

    // --------------------------------------------------------
    // Student details
    // --------------------------------------------------------

    document.addEventListener("click", event => {

        const button =
            event.target.closest("[data-student-id]");

        if (!button) return;

        const studentId =
            button.dataset.studentId;

        openStudentDetails(studentId);

    });

    // --------------------------------------------------------
    // Close modal
    // --------------------------------------------------------

    document.addEventListener("click", event => {

        if (
            event.target.matches(".modal-close") ||
            event.target.matches("[data-close-modal]")
        ) {

            closeStudentModal();

        }

    });

    // --------------------------------------------------------
    // Escape key
    // --------------------------------------------------------

    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {

            closeStudentModal();

        }

    });

}

// ============================================================
// LOAD STUDENTS
// ============================================================

async function loadStudents() {

    let lastError = null;

    for (const endpoint of STUDENT_ENDPOINTS) {

        try {

            console.log("Trying students API:", endpoint);

            const response = await fetch(endpoint, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            });

            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );

            }

            const data = await response.json();

            console.log("Students API response:", data);

            const extractedStudents =
                extractStudents(data);

            if (!Array.isArray(extractedStudents)) {

                throw new Error(
                    "Invalid students response format."
                );

            }

            students =
                extractedStudents.map(
                    normalizeStudent
                );

            activeEndpoint = endpoint;

            console.log(
                `Loaded ${students.length} students.`
            );

            return students;

        } catch (error) {

            console.warn(
                `Failed to load from ${endpoint}`,
                error
            );

            lastError = error;

        }

    }

    throw lastError ||
        new Error("No students API endpoint available.");

}

// ============================================================
// EXTRACT STUDENTS FROM API RESPONSE
// ============================================================

function extractStudents(data) {

    // Direct array
    if (Array.isArray(data)) {

        return data;

    }

    // Common Django REST Framework format
    if (Array.isArray(data.results)) {

        return data.results;

    }

    // Common API format
    if (Array.isArray(data.students)) {

        return data.students;

    }

    // Data wrapper
    if (
        data.data &&
        Array.isArray(data.data)
    ) {

        return data.data;

    }

    // Nested students
    if (
        data.data &&
        Array.isArray(data.data.students)
    ) {

        return data.data.students;

    }

    return [];

}

// ============================================================
// NORMALIZE STUDENT
// ============================================================

function normalizeStudent(student, index) {

    const firstName =
        student.first_name ||
        student.firstName ||
        "";

    const lastName =
        student.last_name ||
        student.lastName ||
        "";

    const combinedName =
        `${firstName} ${lastName}`.trim();

    const name =
        student.name ||
        student.full_name ||
        student.fullName ||
        combinedName ||
        student.username ||
        `Student ${index + 1}`;

    const score =
        getNumericValue(
            student.score,
            student.best_score,
            student.bestScore,
            student.highest_score,
            student.highestScore,
            student.marks,
            student.total_score
        );

    const percentage =
        getPercentage(student, score);

    const examsAttempted =
        getNumericValue(
            student.exams_attempted,
            student.examsAttempted,
            student.attempted_exams,
            student.attemptedExams,
            student.exam_count,
            student.examCount
        );

    const averageScore =
        getNumericValue(
            student.average_score,
            student.averageScore,
            student.avg_score,
            student.avgScore,
            percentage
        );

    const status =
        normalizeStatus(
            student.status,
            student.is_active,
            student.active
        );

    return {

        id:
            student.id ||
            student._id ||
            student.student_id ||
            student.studentId ||
            String(index + 1),

        name,

        firstName,

        lastName,

        email:
            student.email ||
            student.email_address ||
            "Not available",

        phone:
            student.phone ||
            student.phone_number ||
            student.mobile ||
            "Not available",

        username:
            student.username ||
            "—",

        rollNumber:
            student.roll_number ||
            student.rollNumber ||
            student.roll_no ||
            student.registration_number ||
            "—",

        department:
            student.department ||
            student.branch ||
            student.course ||
            "—",

        year:
            student.year ||
            student.study_year ||
            student.academic_year ||
            "—",

        score,

        percentage,

        averageScore,

        examsAttempted,

        status,

        avatar:
            student.avatar ||
            student.profile_image ||
            student.profileImage ||
            student.photo ||
            "",

        joinedAt:
            student.created_at ||
            student.createdAt ||
            student.registered_at ||
            student.registration_date ||
            null,

        lastActivity:
            student.last_activity ||
            student.lastActivity ||
            student.updated_at ||
            student.updatedAt ||
            null,

        raw: student

    };

}

// ============================================================
// NUMERIC VALUE HELPER
// ============================================================

function getNumericValue(...values) {

    for (const value of values) {

        if (
            value !== undefined &&
            value !== null &&
            value !== "" &&
            !Number.isNaN(Number(value))
        ) {

            return Number(value);

        }

    }

    return 0;

}

// ============================================================
// PERCENTAGE
// ============================================================

function getPercentage(student, score) {

    const directPercentage =
        student.percentage ??
        student.percent ??
        student.average_percentage ??
        student.averagePercentage;

    if (
        directPercentage !== undefined &&
        directPercentage !== null &&
        directPercentage !== ""
    ) {

        return Number(directPercentage);

    }

    const totalMarks =
        getNumericValue(
            student.total_marks,
            student.totalMarks,
            student.max_marks,
            student.maxMarks
        );

    if (
        totalMarks > 0 &&
        score >= 0
    ) {

        return (
            score / totalMarks
        ) * 100;

    }

    return 0;

}

// ============================================================
// STATUS NORMALIZATION
// ============================================================

function normalizeStatus(status, isActive, active) {

    if (
        isActive === true ||
        active === true
    ) {

        return "Active";

    }

    if (
        isActive === false ||
        active === false
    ) {

        return "Inactive";

    }

    if (status) {

        const normalized =
            String(status)
                .toLowerCase();

        if (
            normalized === "active" ||
            normalized === "enabled"
        ) {

            return "Active";

        }

        if (
            normalized === "inactive" ||
            normalized === "disabled"
        ) {

            return "Inactive";

        }

    }

    return "Active";

}

// ============================================================
// CALCULATE STATISTICS
// ============================================================

function calculateStudentStatistics() {

    const totalStudents =
        students.length;

    const activeStudents =
        students.filter(
            student =>
                student.status === "Active"
        ).length;

    const totalPercentage =
        students.reduce(
            (sum, student) =>
                sum + student.percentage,
            0
        );

    const averagePercentage =
        totalStudents > 0
            ? totalPercentage / totalStudents
            : 0;

    const topPerformer =
        [...students]
            .sort(
                (a, b) =>
                    b.percentage - a.percentage
            )[0] || null;

    const bestScore =
        students.length > 0
            ? Math.max(
                ...students.map(
                    student => student.percentage
                )
            )
            : 0;

    updateStatistic(
        [
            "#totalStudents",
            "#totalStudentCount",
            "#studentsCount"
        ],
        totalStudents
    );

    updateStatistic(
        [
            "#activeStudents",
            "#activeStudentCount"
        ],
        activeStudents
    );

    updateStatistic(
        [
            "#averageScore",
            "#averagePercentage",
            "#avgScore"
        ],
        `${formatNumber(averagePercentage)}%`
    );

    updateStatistic(
        [
            "#bestScore",
            "#highestScore"
        ],
        `${formatNumber(bestScore)}%`
    );

    updateTopPerformer(topPerformer);

}

// ============================================================
// UPDATE STATISTIC ELEMENT
// ============================================================

function updateStatistic(selectors, value) {

    for (const selector of selectors) {

        const element = $(selector);

        if (element) {

            element.textContent = value;

            return;

        }

    }

}

// ============================================================
// TOP PERFORMER
// ============================================================

function updateTopPerformer(student) {

    if (!student) return;

    const nameElements = [
        "#topPerformerName",
        "#topStudentName",
        ".top-performer-name"
    ];

    const scoreElements = [
        "#topPerformerScore",
        "#topStudentScore",
        ".top-performer-score"
    ];

    const emailElements = [
        "#topPerformerEmail",
        "#topStudentEmail"
    ];

    const avatarElements = [
        "#topPerformerAvatar",
        "#topStudentAvatar"
    ];

    updateFirstExisting(
        nameElements,
        student.name
    );

    updateFirstExisting(
        scoreElements,
        `${formatNumber(student.percentage)}%`
    );

    updateFirstExisting(
        emailElements,
        student.email
    );

    for (const selector of avatarElements) {

        const avatar = $(selector);

        if (!avatar) continue;

        if (
            avatar.tagName === "IMG" &&
            student.avatar
        ) {

            avatar.src = student.avatar;
            avatar.alt = student.name;

        } else {

            avatar.textContent =
                getInitials(student.name);

        }

        break;

    }

}

// ============================================================
// UPDATE FIRST EXISTING ELEMENT
// ============================================================

function updateFirstExisting(selectors, value) {

    for (const selector of selectors) {

        const element = $(selector);

        if (element) {

            element.textContent = value;

            return;

        }

    }

}

// ============================================================
// APPLY FILTERS
// ============================================================

function applyFilters() {

    const searchInput =
        $("#studentSearch") ||
        $("#searchStudents") ||
        $("#searchInput");

    const statusFilter =
        $("#statusFilter") ||
        $("#studentStatusFilter");

    const searchTerm =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";

    const status =
        statusFilter
            ? statusFilter.value
            : "all";

    filteredStudents =
        students.filter(student => {

            const searchableText = [
                student.name,
                student.email,
                student.username,
                student.rollNumber,
                student.department
            ]
                .join(" ")
                .toLowerCase();

            const matchesSearch =
                !searchTerm ||
                searchableText.includes(searchTerm);

            const matchesStatus =
                status === "all" ||
                !status ||
                student.status.toLowerCase() ===
                status.toLowerCase();

            return (
                matchesSearch &&
                matchesStatus
            );

        });

    sortStudents();

}

// ============================================================
// SORT STUDENTS
// ============================================================

function sortStudents() {

    filteredStudents.sort((a, b) => {

        let valueA;
        let valueB;

        switch (currentSort.field) {

            case "name":

                valueA =
                    a.name.toLowerCase();

                valueB =
                    b.name.toLowerCase();

                break;

            case "score":
            case "percentage":

                valueA = a.percentage;
                valueB = b.percentage;

                break;

            case "exams":

                valueA = a.examsAttempted;
                valueB = b.examsAttempted;

                break;

            case "rank":

                valueA = a.percentage;
                valueB = b.percentage;

                break;

            default:

                valueA =
                    a.name.toLowerCase();

                valueB =
                    b.name.toLowerCase();

        }

        if (
            typeof valueA === "string"
        ) {

            return (
                currentSort.direction === "asc"
                    ? valueA.localeCompare(valueB)
                    : valueB.localeCompare(valueA)
            );

        }

        return (
            currentSort.direction === "asc"
                ? valueA - valueB
                : valueB - valueA
        );

    });

}

// ============================================================
// RENDER STUDENTS
// ============================================================

function renderStudents() {

    const tableBody =
        $("#studentTableBody") ||
        $("#studentsTableBody") ||
        $("#studentList");

    if (!tableBody) {

        console.warn(
            "Student table body not found."
        );

        return;

    }

    if (filteredStudents.length === 0) {

        showEmptyState(tableBody);

        renderPagination(0);

        return;

    }

    const startIndex =
        (currentPage - 1) *
        STUDENTS_PER_PAGE;

    const endIndex =
        startIndex +
        STUDENTS_PER_PAGE;

    const pageStudents =
        filteredStudents.slice(
            startIndex,
            endIndex
        );

    // Rank based on complete filtered list
    const rankMap =
        createRankMap(filteredStudents);

    tableBody.innerHTML =
        pageStudents
            .map(
                student =>
                    createStudentRow(
                        student,
                        rankMap.get(student.id)
                    )
            )
            .join("");

    renderPagination(
        filteredStudents.length
    );

}

// ============================================================
// CREATE STUDENT TABLE ROW
// ============================================================

function createStudentRow(student, rank) {

    const scoreClass =
        getPerformanceClass(
            student.percentage
        );

    const statusClass =
        student.status
            .toLowerCase();

    return `
        <tr>

            <td class="student-rank">
                ${getRankDisplay(rank)}
            </td>

            <td>
                <div class="student-info">

                    <div class="student-avatar">
                        ${
                            student.avatar
                                ? `
                                    <img
                                        src="${escapeAttribute(student.avatar)}"
                                        alt="${escapeAttribute(student.name)}"
                                    >
                                  `
                                : `
                                    ${getInitials(student.name)}
                                  `
                        }
                    </div>

                    <div class="student-name-wrapper">

                        <strong>
                            ${escapeHTML(student.name)}
                        </strong>

                        <small>
                            ${escapeHTML(student.email)}
                        </small>

                    </div>

                </div>
            </td>

            <td>
                ${escapeHTML(student.rollNumber)}
            </td>

            <td>
                ${escapeHTML(student.department)}
            </td>

            <td>
                ${student.examsAttempted}
            </td>

            <td>
                <span class="score-badge ${scoreClass}">
                    ${formatNumber(student.percentage)}%
                </span>
            </td>

            <td>
                <span class="status-badge ${statusClass}">
                    ${escapeHTML(student.status)}
                </span>
            </td>

            <td>
                <button
                    type="button"
                    class="student-view-btn"
                    data-student-id="${escapeAttribute(student.id)}"
                    title="View student details"
                >
                    <i class="fa-solid fa-eye"></i>
                    View
                </button>
            </td>

        </tr>
    `;

}

// ============================================================
// CREATE RANK MAP
// ============================================================

function createRankMap(studentList) {

    const sorted =
        [...studentList].sort(
            (a, b) =>
                b.percentage - a.percentage
        );

    const map = new Map();

    sorted.forEach(
        (student, index) => {

            map.set(
                student.id,
                index + 1
            );

        }
    );

    return map;

}

// ============================================================
// RANK DISPLAY
// ============================================================

function getRankDisplay(rank) {

    if (rank === 1) {

        return `
            <span class="rank rank-gold">
                <i class="fa-solid fa-trophy"></i>
                1
            </span>
        `;

    }

    if (rank === 2) {

        return `
            <span class="rank rank-silver">
                2
            </span>
        `;

    }

    if (rank === 3) {

        return `
            <span class="rank rank-bronze">
                3
            </span>
        `;

    }

    return `
        <span class="rank">
            ${rank}
        </span>
    `;

}

// ============================================================
// PERFORMANCE CLASS
// ============================================================

function getPerformanceClass(percentage) {

    if (percentage >= 90) {

        return "excellent";

    }

    if (percentage >= 75) {

        return "good";

    }

    if (percentage >= 50) {

        return "average";

    }

    return "low";

}

// ============================================================
// STUDENT DETAILS MODAL
// ============================================================

function openStudentDetails(studentId) {

    const student =
        students.find(
            item =>
                String(item.id) ===
                String(studentId)
        );

    if (!student) {

        console.error(
            "Student not found:",
            studentId
        );

        return;

    }

    currentStudent = student;

    let modal =
        $("#studentDetailsModal");

    if (!modal) {

        modal =
            createStudentModal();

        document.body.appendChild(modal);

    }

    renderStudentModal(student);

    modal.classList.add("show");

    document.body.classList.add(
        "modal-open"
    );

}

// ============================================================
// CREATE STUDENT MODAL
// ============================================================

function createStudentModal() {

    const modal =
        document.createElement("div");

    modal.id =
        "studentDetailsModal";

    modal.className =
        "student-modal";

    modal.innerHTML = `
        <div class="student-modal-overlay"
             data-close-modal></div>

        <div class="student-modal-content">

            <button
                type="button"
                class="modal-close"
                data-close-modal
                aria-label="Close"
            >
                <i class="fa-solid fa-xmark"></i>
            </button>

            <div id="studentModalContent"></div>

        </div>
    `;

    return modal;

}

// ============================================================
// RENDER STUDENT MODAL
// ============================================================

function renderStudentModal(student) {

    const container =
        $("#studentModalContent");

    if (!container) return;

    const performanceClass =
        getPerformanceClass(
            student.percentage
        );

    container.innerHTML = `

        <div class="student-modal-header">

            <div class="student-modal-avatar">

                ${
                    student.avatar
                        ? `
                            <img
                                src="${escapeAttribute(student.avatar)}"
                                alt="${escapeAttribute(student.name)}"
                            >
                          `
                        : `
                            ${getInitials(student.name)}
                          `
                }

            </div>

            <div>

                <h2>
                    ${escapeHTML(student.name)}
                </h2>

                <p>
                    ${escapeHTML(student.email)}
                </p>

                <span class="status-badge ${student.status.toLowerCase()}">
                    ${escapeHTML(student.status)}
                </span>

            </div>

        </div>

        <div class="student-performance-summary">

            <div class="performance-card">

                <span>Rank</span>

                <strong>
                    #${getStudentRank(student)}
                </strong>

            </div>

            <div class="performance-card">

                <span>Best Score</span>

                <strong class="${performanceClass}">
                    ${formatNumber(student.percentage)}%
                </strong>

            </div>

            <div class="performance-card">

                <span>Exams Attempted</span>

                <strong>
                    ${student.examsAttempted}
                </strong>

            </div>

        </div>

        <div class="student-details-grid">

            <div class="detail-item">
                <span>Roll Number</span>
                <strong>
                    ${escapeHTML(student.rollNumber)}
                </strong>
            </div>

            <div class="detail-item">
                <span>Username</span>
                <strong>
                    ${escapeHTML(student.username)}
                </strong>
            </div>

            <div class="detail-item">
                <span>Department</span>
                <strong>
                    ${escapeHTML(student.department)}
                </strong>
            </div>

            <div class="detail-item">
                <span>Year</span>
                <strong>
                    ${escapeHTML(student.year)}
                </strong>
            </div>

            <div class="detail-item">
                <span>Phone</span>
                <strong>
                    ${escapeHTML(student.phone)}
                </strong>
            </div>

            <div class="detail-item">
                <span>Joined</span>
                <strong>
                    ${formatDate(student.joinedAt)}
                </strong>
            </div>

            <div class="detail-item">
                <span>Last Activity</span>
                <strong>
                    ${formatDate(student.lastActivity)}
                </strong>
            </div>

            <div class="detail-item">
                <span>Average Performance</span>
                <strong>
                    ${formatNumber(student.averageScore)}%
                </strong>
            </div>

        </div>

    `;

}

// ============================================================
// GET STUDENT RANK
// ============================================================

function getStudentRank(student) {

    const sorted =
        [...students].sort(
            (a, b) =>
                b.percentage - a.percentage
        );

    const index =
        sorted.findIndex(
            item =>
                String(item.id) ===
                String(student.id)
        );

    return index >= 0
        ? index + 1
        : "—";

}

// ============================================================
// CLOSE MODAL
// ============================================================

function closeStudentModal() {

    const modal =
        $("#studentDetailsModal");

    if (!modal) return;

    modal.classList.remove("show");

    document.body.classList.remove(
        "modal-open"
    );

}

// ============================================================
// EMPTY STATE
// ============================================================

function showEmptyState(tableBody) {

    tableBody.innerHTML = `

        <tr>

            <td
                colspan="8"
                class="students-empty-state"
            >

                <div>

                    <i class="fa-solid fa-user-group"></i>

                    <h3>
                        No students found
                    </h3>

                    <p>
                        No students match your current search or filter.
                    </p>

                </div>

            </td>

        </tr>

    `;

}

// ============================================================
// LOADING STATE
// ============================================================

function showLoadingState() {

    const tableBody =
        $("#studentTableBody") ||
        $("#studentsTableBody") ||
        $("#studentList");

    if (!tableBody) return;

    tableBody.innerHTML = `

        <tr>

            <td
                colspan="8"
                class="students-loading-state"
            >

                <div>

                    <i class="fa-solid fa-spinner fa-spin"></i>

                    <span>
                        Loading students...
                    </span>

                </div>

            </td>

        </tr>

    `;

}

// ============================================================
// ERROR STATE
// ============================================================

function showErrorState(message) {

    const tableBody =
        $("#studentTableBody") ||
        $("#studentsTableBody") ||
        $("#studentList");

    if (!tableBody) return;

    tableBody.innerHTML = `

        <tr>

            <td
                colspan="8"
                class="students-error-state"
            >

                <div>

                    <i class="fa-solid fa-triangle-exclamation"></i>

                    <h3>
                        Unable to load students
                    </h3>

                    <p>
                        ${escapeHTML(message)}
                    </p>

                    <button
                        type="button"
                        onclick="refreshStudents()"
                    >
                        <i class="fa-solid fa-rotate"></i>
                        Try Again
                    </button>

                </div>

            </td>

        </tr>

    `;

}

// ============================================================
// REFRESH STUDENTS
// ============================================================

async function refreshStudents() {

    const button =
        $("#refreshStudents") ||
        $("#refreshStudentBtn") ||
        $(".refresh-students");

    const originalHTML =
        button
            ? button.innerHTML
            : "";

    if (button) {

        button.disabled = true;

        button.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Refreshing...
        `;

    }

    showLoadingState();

    try {

        await loadStudents();

        calculateStudentStatistics();

        currentPage = 1;

        applyFilters();

        renderStudents();

        showNotification(
            "Student data refreshed successfully.",
            "success"
        );

    } catch (error) {

        console.error(error);

        showErrorState(
            "Unable to refresh student data."
        );

        showNotification(
            "Failed to refresh students.",
            "error"
        );

    } finally {

        if (button) {

            button.disabled = false;

            button.innerHTML =
                originalHTML;

        }

    }

}

// ============================================================
// PAGINATION
// ============================================================

function renderPagination(totalItems) {

    const container =
        $("#studentPagination") ||
        $("#studentsPagination") ||
        $(".students-pagination");

    if (!container) return;

    const totalPages =
        Math.ceil(
            totalItems /
            STUDENTS_PER_PAGE
        );

    if (totalPages <= 1) {

        container.innerHTML = "";

        return;

    }

    let html = "";

    // Previous
    html += `
        <button
            type="button"
            data-page="${currentPage - 1}"
            ${currentPage === 1 ? "disabled" : ""}
            aria-label="Previous page"
        >
            <i class="fa-solid fa-chevron-left"></i>
        </button>
    `;

    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        html += `
            <button
                type="button"
                data-page="${page}"
                class="${page === currentPage ? "active" : ""}"
            >
                ${page}
            </button>
        `;

    }

    // Next
    html += `
        <button
            type="button"
            data-page="${currentPage + 1}"
            ${currentPage === totalPages ? "disabled" : ""}
            aria-label="Next page"
        >
            <i class="fa-solid fa-chevron-right"></i>
        </button>
    `;

    container.innerHTML = html;

}

// ============================================================
// NOTIFICATION
// ============================================================

function showNotification(message, type = "info") {

    let container =
        $("#studentNotifications");

    if (!container) {

        container =
            document.createElement("div");

        container.id =
            "studentNotifications";

        container.className =
            "student-notifications";

        document.body.appendChild(
            container
        );

    }

    const notification =
        document.createElement("div");

    notification.className =
        `student-notification ${type}`;

    const icon =
        type === "success"
            ? "fa-circle-check"
            : type === "error"
                ? "fa-circle-exclamation"
                : "fa-circle-info";

    notification.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>
            ${escapeHTML(message)}
        </span>
    `;

    container.appendChild(
        notification
    );

    setTimeout(() => {

        notification.classList.add(
            "hide"
        );

        setTimeout(() => {

            notification.remove();

        }, 300);

    }, 3000);

}

// ============================================================
// FORMAT NUMBER
// ============================================================

function formatNumber(value) {

    const number =
        Number(value);

    if (
        Number.isNaN(number)
    ) {

        return "0";

    }

    return number.toFixed(1);

}

// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(dateValue) {

    if (!dateValue) {

        return "—";

    }

    const date =
        new Date(dateValue);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "—";

    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}

// ============================================================
// GET INITIALS
// ============================================================

function getInitials(name) {

    if (!name) {

        return "ST";

    }

    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(
            word =>
                word
                    .charAt(0)
                    .toUpperCase()
        )
        .join("");

}

// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}

// ============================================================
// ESCAPE ATTRIBUTE
// ============================================================

function escapeAttribute(value) {

    return escapeHTML(value);

}

// ============================================================
// LOG CURRENT DATA
// ============================================================

function debugStudents() {

    console.table(students);

    console.log(
        "Filtered Students:",
        filteredStudents
    );

    console.log(
        "Active API Endpoint:",
        activeEndpoint
    );

}

// ============================================================
// PUBLIC FUNCTIONS
// ============================================================

window.refreshStudents =
    refreshStudents;

window.openStudentDetails =
    openStudentDetails;

window.closeStudentModal =
    closeStudentModal;

window.debugStudents =
    debugStudents;

// ============================================================
// END STUDENTS.JS
// ============================================================