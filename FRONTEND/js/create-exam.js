// ======================================
// EXAM PRO - CREATE / EDIT EXAM
// ======================================

const API_BASE = "http://127.0.0.1:8000/api/exams";

let currentExamId = null;
let hasUnsavedChanges = false;
let isSaving = false;
let isEditMode = false;

// ======================================
// DOM ELEMENTS
// ======================================

const examTitle = document.getElementById("examTitle");

const subject = document.getElementById("subject");

const enableDuration = document.getElementById("enableDuration");

const enableMarks = document.getElementById("enableMarks");

const enableQuestionCount = document.getElementById("enableQuestionCount");

const duration = document.getElementById("duration");

const totalMarks = document.getElementById("totalMarks");

const totalQuestions = document.getElementById("totalQuestions");

const examDate = document.getElementById("examDate");

const instructions = document.getElementById("instructions");

const saveDraftBtn = document.getElementById("saveDraftBtn");

const continueBtn = document.getElementById("continueBtn");

const clearBtn = document.getElementById("clearBtn");

// ======================================
// GET EXAM ID FROM URL
// ======================================

function getExamIdFromURL() {
    const params = new URLSearchParams(window.location.search);

    return params.get("exam_id");
}

// ======================================
// INITIALIZE PAGE
// ======================================

document.addEventListener("DOMContentLoaded", async () => {
    // Set minimum exam date
    const today = new Date().toISOString().split("T")[0];

    if (examDate) {
        examDate.min = today;
    }

    // Get exam ID from URL
    const urlExamId = getExamIdFromURL();

    console.log("Exam ID from URL:", urlExamId);

    // ==================================
    // EDIT MODE
    // ==================================

    if (urlExamId) {
        isEditMode = true;
        currentExamId = urlExamId;

        console.log("EDIT MODE", currentExamId);

        await loadExam(currentExamId);
    }

    // ==================================
    // CREATE MODE
    // ==================================
    else {
        isEditMode = false;

        console.log("CREATE MODE");

        // Don't automatically use an old
        // localStorage exam when creating
        currentExamId = null;

        if (continueBtn) {
            continueBtn.disabled = true;
        }
    }

    // ==================================
    // BUTTON EVENTS
    // ==================================

    if (saveDraftBtn) {
        saveDraftBtn.addEventListener("click", saveExam);
    }

    if (continueBtn) {
        continueBtn.addEventListener("click", continueToQuestions);
    }

    if (clearBtn) {
        clearBtn.addEventListener("click", confirmClearForm);
    }

    attachChangeListeners();

    updatePageMode();
});

// ======================================
// UPDATE PAGE MODE
// ======================================

function updatePageMode() {
    if (isEditMode) {
        // Change save button
        if (saveDraftBtn) {
            saveDraftBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i>
                 Update Exam`;
        }

        // Optional page title
        const pageTitle = document.querySelector(".page-title");

        if (pageTitle) {
            pageTitle.textContent = "Edit Exam";
        }
    } else {
        if (saveDraftBtn) {
            saveDraftBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i>
                 Save Draft`;
        }
    }
}

// ======================================
// TRACK CHANGES
// ======================================

function attachChangeListeners() {
    const inputs = [
        examTitle,
        subject,
        duration,
        totalMarks,
        totalQuestions,
        examDate,
        instructions,
        enableDuration,
        enableMarks,
        enableQuestionCount,
    ];

    inputs.forEach((input) => {
        if (!input) return;

        input.addEventListener("input", () => {
            hasUnsavedChanges = true;
        });

        input.addEventListener("change", () => {
            hasUnsavedChanges = true;
        });
    });
}

// ======================================
// WARN BEFORE LEAVING
// ======================================

window.addEventListener("beforeunload", function (e) {
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
    }
});

// ======================================
// OPTIONAL FIELD TOGGLES
// ======================================

enableDuration?.addEventListener("change", function () {
    duration.disabled = !this.checked;

    if (!this.checked) {
        duration.value = "";
    }

    hasUnsavedChanges = true;
});

enableMarks?.addEventListener("change", function () {
    totalMarks.disabled = !this.checked;

    if (!this.checked) {
        totalMarks.value = "";
    }

    hasUnsavedChanges = true;
});

enableQuestionCount?.addEventListener("change", function () {
    totalQuestions.disabled = !this.checked;

    if (!this.checked) {
        totalQuestions.value = "";
    }

    hasUnsavedChanges = true;
});

// ======================================
// VALIDATION
// ======================================

function validateForm() {
    if (!examTitle.value.trim()) {
        alert("Exam title is required.");

        examTitle.focus();

        return false;
    }

    if (!subject.value.trim()) {
        alert("Subject is required.");

        subject.focus();

        return false;
    }

    if (enableDuration.checked) {
        const durationValue = Number(duration.value);

        if (!durationValue || durationValue < 1 || durationValue > 300) {
            alert("Duration must be between 1 and 300 minutes.");

            duration.focus();

            return false;
        }
    }

    if (enableMarks.checked) {
        const marksValue = Number(totalMarks.value);

        if (!marksValue || marksValue < 1) {
            alert("Total marks must be greater than 0.");

            totalMarks.focus();

            return false;
        }
    }

    if (enableQuestionCount.checked) {
        const questionValue = Number(totalQuestions.value);

        if (!questionValue || questionValue < 1) {
            alert("Question count must be greater than 0.");

            totalQuestions.focus();

            return false;
        }
    }

    return true;
}

// ======================================
// SAVE / UPDATE EXAM
// ======================================

async function saveExam() {
    if (isSaving) return;

    if (!validateForm()) {
        return;
    }

    const examData = {
        title: examTitle.value.trim(),

        subject: subject.value.trim(),

        is_timed: enableDuration.checked,

        duration: enableDuration.checked ? Number(duration.value) : null,

        enable_marks: enableMarks.checked,

        total_marks: enableMarks.checked ? Number(totalMarks.value) : null,

        fixed_question_count: enableQuestionCount.checked,

        total_questions: enableQuestionCount.checked ? Number(totalQuestions.value) : null,

        exam_date: examDate.value || null,

        instructions: instructions.value.trim(),

        status: "Draft",
    };

    try {
        isSaving = true;

        saveDraftBtn.disabled = true;

        saveDraftBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>
             ${isEditMode ? "Updating..." : "Saving..."}`;

        const token = localStorage.getItem("access_token");

        let response;

        // ==================================
        // EDIT MODE → UPDATE EXISTING EXAM
        // ==================================

        if (isEditMode) {
            console.log("Updating exam:", currentExamId);

            response = await fetch(`${API_BASE}/${currentExamId}/update/`, {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json",

                    ...(token && {
                        Authorization: `Bearer ${token}`,
                    }),
                },

                body: JSON.stringify(examData),
            });
        }

        // ==================================
        // CREATE MODE → CREATE NEW EXAM
        // ==================================
        else {
            console.log("Creating new exam");

            response = await fetch(`${API_BASE}/create/`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",

                    ...(token && {
                        Authorization: `Bearer ${token}`,
                    }),
                },

                body: JSON.stringify(examData),
            });
        }

        // ==================================
        // READ RESPONSE
        // ==================================

        const responseText = await response.text();

        console.log("Status:", response.status);

        console.log("Response:", responseText);

        let result = {};

        try {
            result = responseText ? JSON.parse(responseText) : {};
        } catch (error) {
            throw new Error(
                `Server returned invalid JSON.
Status: ${response.status}`
            );
        }

        // ==================================
        // HANDLE ERROR
        // ==================================

        if (!response.ok) {
            throw new Error(
                result.error || result.message || result.detail || `Failed to ${isEditMode ? "update" : "create"} exam.`
            );
        }

        // ==================================
        // GET / KEEP EXAM ID
        // ==================================

        if (isEditMode) {
            // Keep the existing exam ID
            // because we are updating the
            // existing MongoDB document.

            console.log("Existing exam updated:", currentExamId);
        } else {
            // New exam → backend returns
            // the newly created ID.

            currentExamId = result.exam_id || result._id || result.id;

            console.log("New exam created:", currentExamId);
        }

        // ==================================
        // CHECK EXAM ID
        // ==================================

        if (!currentExamId) {
            throw new Error("Exam was saved, but no Exam ID was found.");
        }

        // ==================================
        // STORE CURRENT EXAM ID
        // ==================================

        localStorage.setItem("currentExamId", currentExamId);

        // ==================================
        // RESET UNSAVED STATE
        // ==================================

        hasUnsavedChanges = false;

        if (continueBtn) {
            continueBtn.disabled = false;
        }

        // ==================================
        // SUCCESS MESSAGE
        // ==================================

        alert(isEditMode ? "Exam updated successfully." : "Exam created successfully.");
    } catch (error) {
        console.error("Save Exam Error:", error);

        alert(error.message || "Unable to save exam.");
    } finally {
        isSaving = false;

        saveDraftBtn.disabled = false;

        saveDraftBtn.innerHTML = isEditMode
            ? `<i class="fa-solid fa-floppy-disk"></i>
                   Update Exam`
            : `<i class="fa-solid fa-floppy-disk"></i>
                   Save Draft`;
    }
}

// ======================================
// LOAD EXAM FOR EDITING
// ======================================

async function loadExam(examId) {
    if (!examId) {
        console.error("No exam ID provided.");

        return;
    }

    try {
        console.log("Loading exam:", examId);

        const token = localStorage.getItem("access_token");

        const response = await fetch(`${API_BASE}/${examId}/`, {
            method: "GET",

            headers: {
                ...(token && {
                    Authorization: `Bearer ${token}`,
                }),
            },
        });

        const responseText = await response.text();

        console.log("Load status:", response.status);

        console.log("Load response:", responseText);

        if (!response.ok) {
            throw new Error(
                `Unable to load exam.
Status: ${response.status}`
            );
        }

        let exam;

        try {
            exam = JSON.parse(responseText);
        } catch (error) {
            throw new Error("Server returned invalid exam data.");
        }

        console.log("Existing exam:", exam);

        // ==================================
        // SET CURRENT EXAM ID
        // ==================================

        currentExamId = exam._id || exam.exam_id || exam.id || examId;

        // ==================================
        // POPULATE FORM
        // ==================================

        examTitle.value = exam.title || "";

        subject.value = exam.subject || "";

        enableDuration.checked = Boolean(exam.is_timed);

        duration.disabled = !enableDuration.checked;

        duration.value = exam.duration ?? "";

        enableMarks.checked = Boolean(exam.enable_marks);

        totalMarks.disabled = !enableMarks.checked;

        totalMarks.value = exam.total_marks ?? "";

        enableQuestionCount.checked = Boolean(exam.fixed_question_count);

        totalQuestions.disabled = !enableQuestionCount.checked;

        totalQuestions.value = exam.total_questions ?? "";

        examDate.value = exam.exam_date || "";

        instructions.value = exam.instructions || "";

        // ==================================
        // STORE ID
        // ==================================

        localStorage.setItem("currentExamId", currentExamId);

        // ==================================
        // ENABLE CONTINUE
        // ==================================

        if (continueBtn) {
            continueBtn.disabled = false;
        }

        hasUnsavedChanges = false;

        console.log("Exam loaded successfully.");
    } catch (error) {
        console.error("Load Exam Error:", error);

        alert(error.message || "Unable to load exam for editing.");
    }
}

// ======================================
// CONTINUE TO QUESTIONS
// ======================================

function continueToQuestions() {
    const examId = currentExamId || getExamIdFromURL() || localStorage.getItem("currentExamId");

    if (!examId) {
        alert("Please save the exam first.");

        return;
    }

    window.location.href = `question-manager.html?exam_id=${examId}`;
}

// ======================================
// CLEAR FORM
// ======================================

function confirmClearForm() {
    const confirmed = confirm("Are you sure you want to clear the form?");

    if (confirmed) {
        clearForm();
    }
}

function clearForm() {
    examTitle.value = "";

    subject.value = "";

    enableDuration.checked = false;

    enableMarks.checked = false;

    enableQuestionCount.checked = false;

    duration.value = "";

    totalMarks.value = "";

    totalQuestions.value = "";

    duration.disabled = true;

    totalMarks.disabled = true;

    totalQuestions.disabled = true;

    examDate.value = "";

    instructions.value = "";

    currentExamId = null;

    hasUnsavedChanges = false;

    // ==================================
    // IMPORTANT
    // ==================================
    // If we are editing an existing exam,
    // clearing the form should NOT
    // accidentally turn it into a new
    // exam without confirmation.

    if (isEditMode) {
        const params = new URLSearchParams(window.location.search);

        params.delete("exam_id");

        window.history.replaceState({}, "", `${window.location.pathname}`);
    }

    isEditMode = false;

    localStorage.removeItem("currentExamId");

    if (continueBtn) {
        continueBtn.disabled = true;
    }

    updatePageMode();
}
