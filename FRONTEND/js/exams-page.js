/* ===================================
   API
=================================== */

const API = {
    exams: "http://localhost:8000/api/student/exams/"
};

/* ===================================
   DOM
=================================== */

const elements = {

    examGrid:
        document.getElementById("examGrid"),

    examCount:
        document.getElementById("examCount"),

    searchInput:
        document.getElementById("searchInput"),

    statusFilter:
        document.getElementById("statusFilter"),

    subjectFilter:
        document.getElementById("subjectFilter"),

    sortFilter:
        document.getElementById("sortFilter"),

    pagination:
        document.getElementById("pagination")
};

/* ===================================
   STATE
=================================== */

let exams = [];
let filteredExams = [];

let currentPage = 1;
const examsPerPage = 6;

/* ===================================
   LOAD EXAMS
=================================== */

async function loadExams() {

    try {

        const response =
            await fetch(API.exams);

        if (!response.ok) {

            throw new Error(
                `HTTP Error ${response.status}`
            );
        }

        exams = await response.json();

        populateSubjects();

        applyFilters();

    }

    catch (error) {

        console.error(
            "Failed to load exams:",
            error
        );

        renderEmptyState();
    }
}

/* ===================================
   SUBJECT FILTER
=================================== */

function populateSubjects() {

    if (!elements.subjectFilter)
        return;

    const subjects =
        [...new Set(
            exams.map(exam => exam.subject)
        )];

    subjects.forEach(subject => {

        const option =
            document.createElement("option");

        option.value = subject;

        option.textContent = subject;

        elements.subjectFilter.appendChild(
            option
        );
    });
}

/* ===================================
   FILTERS
=================================== */

function applyFilters() {

    const search =
        elements.searchInput.value
            .toLowerCase();

    const status =
        elements.statusFilter.value;

    const subject =
        elements.subjectFilter.value;

    filteredExams = exams.filter(exam => {

        const matchesSearch =

            exam.name
                .toLowerCase()
                .includes(search)

            ||

            exam.subject
                .toLowerCase()
                .includes(search);

        const matchesStatus =

            status === "all"
            ||
            exam.status.toLowerCase() === status;

        const matchesSubject =

            subject === "all"
            ||
            exam.subject === subject;

        return (
            matchesSearch &&
            matchesStatus &&
            matchesSubject
        );
    });

    sortExams();

    currentPage = 1;

    renderExams();
}

/* ===================================
   SORT
=================================== */

function sortExams() {

    const sortBy =
        elements.sortFilter.value;

    if (sortBy === "name") {

        filteredExams.sort((a, b) =>
            a.name.localeCompare(b.name)
        );

        return;
    }

    filteredExams.sort((a, b) => {

        const dateA =
            new Date(a.date);

        const dateB =
            new Date(b.date);

        return sortBy === "latest"
            ? dateB - dateA
            : dateA - dateB;
    });
}

/* ===================================
   RENDER EXAMS
=================================== */

function renderExams() {

    if (!elements.examGrid)
        return;

    if (!filteredExams.length) {

        renderEmptyState();
        return;
    }

    const start =
        (currentPage - 1) * examsPerPage;

    const end =
        start + examsPerPage;

    const pageData =
        filteredExams.slice(start, end);

    elements.examGrid.innerHTML =

        pageData.map(exam => `

        <div class="exam-card">

            <div class="card-top">

                <div class="subject-icon">
                    <i class="fa-solid fa-file-pen"></i>
                </div>

                <span class="status ${exam.status.toLowerCase()}">
                    ${exam.status}
                </span>

            </div>

            <h3>${exam.name}</h3>

            <p>${exam.subject}</p>

            <div class="card-meta">

                <span>
                    <i class="fa-regular fa-calendar"></i>
                    ${exam.date}
                </span>

                <span>
                    <i class="fa-regular fa-clock"></i>
                    ${exam.duration}
                </span>

            </div>

            <div class="card-footer">

                <span>
                    ${exam.total_marks || 100} Marks
                </span>

                <button>
                    Start Exam
                </button>

            </div>

        </div>

    `).join("");

    updateExamCount();

    renderPagination();
}

/* ===================================
   EMPTY STATE
=================================== */

function renderEmptyState() {

    elements.examGrid.innerHTML = `

        <div class="empty-state">

            <i class="fa-regular fa-folder-open"></i>

            <h3>No Exams Found</h3>

            <p>
                No exams match the selected filters.
            </p>

        </div>

    `;

    updateExamCount();
}

/* ===================================
   EXAM COUNT
=================================== */

function updateExamCount() {

    if (!elements.examCount)
        return;

    elements.examCount.textContent =
        `${filteredExams.length} Exams`;
}

/* ===================================
   PAGINATION
=================================== */

function renderPagination() {

    if (!elements.pagination)
        return;

    const totalPages =
        Math.ceil(
            filteredExams.length /
            examsPerPage
        );

    if (totalPages <= 1) {

        elements.pagination.innerHTML = "";
        return;
    }

    let html = "";

    for (
        let i = 1;
        i <= totalPages;
        i++
    ) {

        html += `

            <button
                class="${
                    currentPage === i
                    ? "active"
                    : ""
                }"
                onclick="changePage(${i})">

                ${i}

            </button>

        `;
    }

    elements.pagination.innerHTML =
        html;
}

function changePage(page) {

    currentPage = page;

    renderExams();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/* ===================================
   EVENTS
=================================== */

function initializeEvents() {

    elements.searchInput.addEventListener(
        "input",
        applyFilters
    );

    elements.statusFilter.addEventListener(
        "change",
        applyFilters
    );

    elements.subjectFilter.addEventListener(
        "change",
        applyFilters
    );

    elements.sortFilter.addEventListener(
        "change",
        applyFilters
    );
}

/* ===================================
   INIT
=================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadExams();

        initializeEvents();
    }
);