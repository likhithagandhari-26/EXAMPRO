/* ======================================
   EXAM PRO - MANAGE EXAMS
====================================== */

const API_BASE =
    "http://127.0.0.1:8000/api/exams";

// Admin requests must carry the login token, otherwise the API answers 401/403.
function getAuthHeaders() {
    const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("admin_token");

    return token ? { Authorization: `Bearer ${token}` } : {};
}

let allExams = [];

/* ======================================
   DOM ELEMENTS
====================================== */

const examGrid =
    document.getElementById(
        "examGrid"
    );

const searchInput =
    document.getElementById(
        "searchExam"
    );

const statusFilter =
    document.getElementById(
        "statusFilter"
    );

/* ======================================
   LOAD EXAMS
====================================== */

async function loadExams() {

    try {

        const response =
            await fetch(API_BASE, {
                headers: getAuthHeaders()
            });

        if (!response.ok) {

            throw new Error(
                response.status === 401 || response.status === 403
                    ? "Please log in as an administrator to view exams."
                    : "Failed to load exams"
            );
        }

        const exams =
            await response.json();

        allExams = exams;

        renderExams(allExams);

    } catch (error) {

        console.error(error);

        showEmptyState(
            error.message || "Unable to load exams"
        );
    }
}

/* ======================================
   RENDER EXAMS
====================================== */

function renderExams(exams) {

    examGrid.innerHTML = "";

    if (!exams.length) {

        showEmptyState("No exams found");
        return;
    }

    exams.forEach(exam => {

        console.log("Exam Object:", exam);

        const examId =
            exam.exam_id ||
            exam._id ||
            exam.id;

        console.log("Resolved Exam ID:", examId);

        const statusClass =
            exam.status === "Published"
                ? "published"
                : "draft";

        const questionCount =
            exam.question_count ||
            exam.questions?.length ||
            0;

        const card =
            document.createElement("div");

        card.className = "exam-card";

        card.innerHTML = `

            <div class="card-header">

                <div>

                    <h3>${exam.title || "Untitled Exam"}</h3>

                    <p>
                        Subject:
                        ${exam.subject || "-"}
                    </p>

                </div>

                <span class="status ${statusClass}">
                    ${exam.status || "Draft"}
                </span>

            </div>

            <div class="exam-meta">

                <span>
                    <i class="fa-regular fa-calendar"></i>
                    ${exam.exam_date || "-"}${exam.exam_time ? " • " + exam.exam_time : ""}
                </span>

                <span>
                    <i class="fa-solid fa-list"></i>
                    ${questionCount} Questions
                </span>

                <span>
                    <i class="fa-regular fa-clock"></i>
                    ${exam.duration || 0} mins
                </span>

                <span>
                    <i class="fa-solid fa-award"></i>
                    ${exam.total_marks || 0} Marks
                </span>

            </div>

            <div class="card-actions">

                <button
                    class="action-btn primary"
                    onclick="manageQuestions('${examId}')"
                >
                    <i class="fa-solid fa-list-check"></i>
                    Questions
                </button>

                <button
                    class="action-btn"
                    onclick="editExam('${examId}')"
                >
                    <i class="fa-solid fa-pen"></i>
                    Edit
                </button>

                <button
                    class="action-btn danger"
                    onclick="deleteExam('${examId}')"
                >
                    <i class="fa-solid fa-trash"></i>
                    Delete
                </button>

            </div>

        `;

        examGrid.appendChild(card);

    });

}
/* ======================================
   EMPTY STATE
====================================== */

function showEmptyState(message) {

    examGrid.innerHTML = `

        <div class="empty-state">

            <i class="fa-solid fa-file-circle-xmark"></i>

            <h3>
                ${message}
            </h3>

            <p>
                Create your first exam
                to get started.
            </p>

        </div>

    `;
}

/* ======================================
   SEARCH EXAMS
====================================== */

searchInput.addEventListener(
    "input",
    filterExams
);

statusFilter.addEventListener(
    "change",
    filterExams
);

function filterExams() {

    const searchTerm =
        searchInput.value
            .toLowerCase()
            .trim();

    const selectedStatus =
        statusFilter.value;

    const filtered =
        allExams.filter(exam => {

            const matchesSearch =

                exam.title
                    ?.toLowerCase()
                    .includes(
                        searchTerm
                    ) ||

                exam.subject
                    ?.toLowerCase()
                    .includes(
                        searchTerm
                    );

            const matchesStatus =

                !selectedStatus ||

                exam.status ===
                selectedStatus;

            return (
                matchesSearch &&
                matchesStatus
            );
        });

    renderExams(filtered);
}

/* ======================================
   MANAGE QUESTIONS
====================================== */

window.manageQuestions = function (examId) {

    if (!examId) {

        console.error("Invalid Exam ID");

        alert(
            "Unable to open questions. Exam ID is missing."
        );

        return;
    }

    window.location.href =
        `question-manager.html?exam_id=${examId}`;
};

/* ======================================
   EDIT EXAM
====================================== */

window.editExam = function (examId) {

    if (!examId) {

        console.error("Invalid Exam ID");

        alert(
            "Unable to edit exam. Exam ID is missing."
        );

        return;
    }

    window.location.href =
        `create-exam.html?exam_id=${examId}`;
};

/* ======================================
   DELETE EXAM
====================================== */

window.deleteExam = async function (examId) {

    if (!examId) {

        alert(
            "Invalid Exam ID"
        );

        return;
    }

    const confirmed = confirm(
        "Are you sure you want to delete this exam?\n\nThis action cannot be undone."
    );

    if (!confirmed) {
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE}/${examId}/delete/`,
            {
                method: "DELETE",
                    headers: getAuthHeaders()
            }
        );

        const result =
            await response.json();

        if (!response.ok) {

            throw new Error(
                result.error ||
                "Failed to delete exam"
            );
        }

        alert(
            "Exam deleted successfully."
        );

        await loadExams();

    } catch (error) {

        console.error(
            "Delete Error:",
            error
        );

        alert(
            error.message ||
            "Unable to delete exam."
        );
    }
};

/* ======================================
   INITIAL LOAD
====================================== */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        try {

            await loadExams();

        } catch (error) {

            console.error(
                "Initialization Error:",
                error
            );

            showEmptyState(
                "Unable to load exams"
            );
        }
    }
);