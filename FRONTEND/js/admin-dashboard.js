// ======================================
// ADMIN DASHBOARD
// ======================================

const API_BASE =
    "http://127.0.0.1:8000/api/exams";

// ======================================
// INITIALIZE
// ======================================

document.addEventListener(
    "DOMContentLoaded",
    () => {
        loadExams();
    }
);

// ======================================
// LOAD EXAMS
// ======================================

async function loadExams() {

    try {

        const response =
            await fetch(API_BASE);

        if (!response.ok) {
            throw new Error(
                "Failed to load exams"
            );
        }

        const exams =
            await response.json();

        console.log(
            "Loaded Exams:",
            exams
        );

        updateStats(exams);

        renderExamTable(exams);

    } catch (error) {

        console.error(
            "Dashboard Error:",
            error
        );

        showTableError(
            "Failed to load exams."
        );
    }
}

// ======================================
// UPDATE STATISTICS
// ======================================

function updateStats(exams) {

    const totalExams =
        exams.length;

    const publishedExams =
        exams.filter(
            exam =>
                exam.status ===
                "Published"
        ).length;

    const draftExams =
        exams.filter(
            exam =>
                exam.status ===
                "Draft"
        ).length;

    const totalQuestions =
        exams.reduce(
            (sum, exam) =>
                sum +
                (
                    exam.questions
                        ? exam.questions.length
                        : 0
                ),
            0
        );

    const totalExamsEl =
        document.getElementById(
            "totalExams"
        );

    const publishedEl =
        document.getElementById(
            "publishedExams"
        );

    const draftEl =
        document.getElementById(
            "draftExams"
        );

    const questionsEl =
        document.getElementById(
            "totalQuestions"
        );

    if (totalExamsEl) {
        totalExamsEl.textContent =
            totalExams;
    }

    if (publishedEl) {
        publishedEl.textContent =
            publishedExams;
    }

    if (draftEl) {
        draftEl.textContent =
            draftExams;
    }

    if (questionsEl) {
        questionsEl.textContent =
            totalQuestions;
    }
}

// ======================================
// RENDER RECENT EXAMS
// ======================================

function renderExamTable(exams) {

    const tbody =
        document.getElementById(
            "examTableBody"
        );

    if (!tbody) return;

    if (!exams.length) {

        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">
                    <div class="empty-state">
                        <i class="fa-solid fa-file-circle-plus"></i>
                        <p>No Exams Created</p>
                        <span>
                            Newly created exams will appear here.
                        </span>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML = "";

    // Show latest 5 exams
    exams
        .reverse()
        .slice(0, 5)
        .forEach(exam => {

            const questionCount =
                exam.questions?.length || 0;

            const status =
                exam.status || "Draft";

            tbody.innerHTML += `
                <tr>

                    <td>
                        ${exam.title || "-"}
                    </td>

                    <td>
                        ${exam.exam_date || "-"}
                    </td>

                    <td>
                        ${questionCount}
                    </td>

                    <td>
                        <span class="
                            status-badge
                            ${status.toLowerCase()}
                        ">
                            ${status}
                        </span>
                    </td>

                    <td>

                        <button
                            class="action-btn edit-btn"
                            onclick="editExam('${exam._id}')">

                            Edit

                        </button>

                        <button
                            class="action-btn delete-btn"
                            onclick="deleteExam('${exam._id}')">

                            Delete

                        </button>

                    </td>

                </tr>
            `;
        });
}

// ======================================
// EDIT EXAM
// ======================================

window.editExam = function (
    examId
) {

    if (!examId) {

        alert(
            "Invalid Exam ID"
        );

        return;
    }

    window.location.href =
        `create-exam.html?exam_id=${examId}`;
};

// ======================================
// DELETE EXAM
// ======================================

window.deleteExam =
async function (
    examId
) {

    if (!examId) return;

    const confirmed =
        confirm(
            "Are you sure you want to delete this exam?"
        );

    if (!confirmed) return;

    try {

        const response =
            await fetch(
                `${API_BASE}/${examId}/delete/`,
                {
                    method: "DELETE"
                }
            );

        const result =
            await response.json();

        if (!response.ok) {

            throw new Error(
                result.error ||
                "Delete failed"
            );
        }

        alert(
            "Exam deleted successfully."
        );

        loadExams();

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

// ======================================
// TABLE ERROR
// ======================================

function showTableError(message) {

    const tbody =
        document.getElementById(
            "examTableBody"
        );

    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="5">
                ${message}
            </td>
        </tr>
    `;
}