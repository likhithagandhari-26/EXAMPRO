const API_BASE = "http://127.0.0.1:8000/api/exams";

let examId = null;
let selectedQuestionId = null;
let examSettings = {};

/* ==================================
   PAGE LOAD
================================== */

document.addEventListener("DOMContentLoaded", () => {

    const params = new URLSearchParams(
        window.location.search
    );

    examId = params.get("exam_id");
    console.log("Exam ID:", examId);

    if (!examId) {

        alert("Exam ID Missing");

        window.location.href =
            "create-exam.html";

        return;
    }

    loadExam();
    loadQuestions();
});

/* ==================================
   LOAD EXAM DETAILS
================================== */

async function loadExam() {

    try {

        const response = await fetch(
            `${API_BASE}/${examId}/`
        );

        if (!response.ok) {
            throw new Error("Failed to load exam");
        }

        const exam = await response.json();

        examSettings = exam;

        document.getElementById(
            "examTitleDisplay"
        ).textContent =
            exam.title || "Untitled Exam";

        document.getElementById(
            "subjectDisplay"
        ).textContent =
            exam.subject || "No Subject";

        document.getElementById(
            "durationDisplay"
        ).textContent =
            exam.duration
                ? `${exam.duration} Min`
                : "No Time Limit";

        document.getElementById(
            "marksDisplay"
        ).textContent =
            exam.total_marks
                ? `${exam.total_marks} Marks`
                : "Flexible Marks";

        document.getElementById(
            "examStatus"
        ).textContent =
            exam.status || "Draft";

    } catch (error) {

        console.error(
            "Failed to load exam",
            error
        );

        document.getElementById(
            "examTitleDisplay"
        ).textContent = "Exam Not Found";
    }
}

/* ==================================
   LOAD QUESTIONS
================================== */

async function loadQuestions() {

    try {

        const response =
            await fetch(
                `${API_BASE}/${examId}/questions/`
            );

        const questions =
            await response.json();

        console.log(
            "Questions:",
            questions
        );

        renderQuestions(
            questions
        );

        document.getElementById(
            "questionCount"
        ).textContent =
            `${questions.length} Questions`;

        window.questionCache =
            questions;

    } catch (error) {

        console.error(error);
    }
}

/* ==================================
   RENDER QUESTIONS
================================== */

function renderQuestions(questions) {

    const container =
        document.getElementById(
            "questionList"
        );

    if (!questions.length) {

        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-circle-question"></i>
                <h4>No Questions Added</h4>
                <p>Create your first question.</p>
            </div>
        `;

        return;
    }

    container.innerHTML = "";

    questions.forEach((question, index) => {

        container.innerHTML += `
            <div class="question-card">

                <div class="question-info">

                    <h4>
                        Q${index + 1}.
                        ${question.question}
                    </h4>

                    <p>
                        Correct:
                        ${question.correct_answer}
                        •
                        ${question.marks} Marks
                    </p>

                </div>

                <div class="question-actions">

                    <button
                        class="icon-btn edit-btn"
                        onclick="editQuestion('${question.question_id}')">

                        <i class="fa-solid fa-pen"></i>

                    </button>

                    <button
                        class="icon-btn delete-btn"
                        onclick="deleteQuestion('${question.question_id}')">

                        <i class="fa-solid fa-trash"></i>

                    </button>

                </div>

            </div>
        `;
    });

    window.questionCache = questions;
}

/* ==================================
   ADD QUESTION
================================== */

document
    .getElementById("saveQuestionBtn")
    .addEventListener(
        "click",
        addQuestion
    );

async function addQuestion() {

    const questionText =
        document.getElementById(
            "questionText"
        ).value.trim();

    const optionA =
        document.getElementById(
            "optionA"
        ).value.trim();

    const optionB =
        document.getElementById(
            "optionB"
        ).value.trim();

    const optionC =
        document.getElementById(
            "optionC"
        ).value.trim();

    const optionD =
        document.getElementById(
            "optionD"
        ).value.trim();

    const correctAnswer =
        document.getElementById(
            "correctAnswer"
        ).value;

    const questionMarks =
        Number(
            document.getElementById(
                "questionMarks"
            ).value || 0
        );

    /* ==========================
       BASIC VALIDATION
    ========================== */

    if (
        !questionText ||
        !optionA ||
        !optionB ||
        !optionC ||
        !optionD ||
        !correctAnswer
    ) {
        alert(
            "Please fill all question fields"
        );
        return;
    }

    /* ==========================
       QUESTION LIMIT CHECK
    ========================== */

    const currentQuestionCount =
        window.questionCache?.length || 0;

    if (
        examSettings.fixed_question_count &&
        currentQuestionCount >=
        examSettings.total_questions
    ) {

        alert(
            `Maximum ${examSettings.total_questions} questions allowed`
        );

        return;
    }

    /* ==========================
       TOTAL MARKS CHECK
    ========================== */

    if (examSettings.enable_marks) {

        const currentMarks =
            (window.questionCache || []).reduce(
                (sum, q) =>
                    sum +
                    Number(
                        q.marks || 0
                    ),
                0
            );

        if (
            currentMarks +
            questionMarks >
            examSettings.total_marks
        ) {

            const remainingMarks =
                examSettings.total_marks -
                currentMarks;

            alert(
                `Only ${remainingMarks} marks remaining`
            );

            return;
        }
    }

    /* ==========================
       PAYLOAD
    ========================== */

    const payload = {

        question:
            questionText,

        option_a:
            optionA,

        option_b:
            optionB,

        option_c:
            optionC,

        option_d:
            optionD,

        correct_answer:
            correctAnswer,

        marks:
            questionMarks
    };

    try {

        console.log("Exam ID:", examId);
        console.log("Payload:", payload);

        const response = await fetch(
            `${API_BASE}/${examId}/questions/add/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );

        const result =
            await response.json();
            console.log("Status:", response.status);
            console.log("Response:", result);

        if (response.ok) {

            alert(
                "Question Added Successfully"
            );

            clearForm();

            loadQuestions();

        } else {

            alert(
                result.error ||
                "Failed to add question"
            );
        }

    } catch (error) {

        console.error(error);

        alert(
            "Server Connection Failed"
        );
    }
}

/* ==================================
   EDIT QUESTION
================================== */

window.editQuestion =
function (questionId) {

    const question =
        window.questionCache.find(
            q =>
            q.question_id === questionId
        );

    if (!question) return;

    selectedQuestionId =
        questionId;

    document.getElementById(
        "questionText"
    ).value =
        question.question;

    document.getElementById(
        "optionA"
    ).value =
        question.option_a;

    document.getElementById(
        "optionB"
    ).value =
        question.option_b;

    document.getElementById(
        "optionC"
    ).value =
        question.option_c;

    document.getElementById(
        "optionD"
    ).value =
        question.option_d;

    document.getElementById(
        "correctAnswer"
    ).value =
        question.correct_answer;

    document.getElementById(
        "questionMarks"
    ).value =
        question.marks;
};

/* ==================================
   UPDATE QUESTION
================================== */

document
    .getElementById("updateQuestionBtn")
    .addEventListener(
        "click",
        updateQuestion
    );

async function updateQuestion() {

    if (!selectedQuestionId) {

        alert(
            "Select a question first"
        );

        return;
    }

    const updatedMarks =
        Number(
            document.getElementById(
                "questionMarks"
            ).value || 0
        );

    /* ==========================
       MARKS VALIDATION
    ========================== */

    if (examSettings.enable_marks) {

        let currentTotal = 0;

        (window.questionCache || []).forEach(q => {

            if (
                q.question_id !==
                selectedQuestionId
            ) {

                currentTotal +=
                    Number(
                        q.marks || 0
                    );
            }
        });

        if (
            currentTotal +
            updatedMarks >
            examSettings.total_marks
        ) {

            alert(
                `Total Marks Limit (${examSettings.total_marks}) Exceeded`
            );

            return;
        }
    }

    const payload = {

        question:
            document.getElementById(
                "questionText"
            ).value,

        option_a:
            document.getElementById(
                "optionA"
            ).value,

        option_b:
            document.getElementById(
                "optionB"
            ).value,

        option_c:
            document.getElementById(
                "optionC"
            ).value,

        option_d:
            document.getElementById(
                "optionD"
            ).value,

        correct_answer:
            document.getElementById(
                "correctAnswer"
            ).value,

        marks:
            updatedMarks
    };

    try {

        const response =
            await fetch(
                `${API_BASE}/${examId}/questions/${selectedQuestionId}/update/`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );

        if (response.ok) {

            alert(
                "Question Updated"
            );

            clearForm();

            loadQuestions();
        }

    } catch (error) {

        console.error(error);
    }
}
/* ==================================
   DELETE QUESTION
================================== */

window.deleteQuestion =
async function (questionId) {

    const confirmDelete =
        confirm(
            "Delete Question?"
        );

    if (!confirmDelete) return;

    try {

        const response =
            await fetch(
                `${API_BASE}/${examId}/questions/${questionId}/delete/`,
                {
                    method: "DELETE"
                }
            );

        if (response.ok) {

            if (
                selectedQuestionId ===
                questionId
            ) {

                clearForm();
            }

            loadQuestions();
        }

    } catch (error) {

        console.error(error);
    }
};
/* ==================================
   CLEAR FORM
================================== */

document
    .getElementById("clearFormBtn")
    .addEventListener(
        "click",
        clearForm
    );

function clearForm() {

    selectedQuestionId = null;

    document.getElementById(
        "questionText"
    ).value = "";

    document.getElementById(
        "optionA"
    ).value = "";

    document.getElementById(
        "optionB"
    ).value = "";

    document.getElementById(
        "optionC"
    ).value = "";

    document.getElementById(
        "optionD"
    ).value = "";

    document.getElementById(
        "correctAnswer"
    ).value = "A";

    document.getElementById(
        "questionMarks"
    ).value = 1;
}

/* ==================================
   PUBLISH EXAM
================================== */

document
    .getElementById(
        "publishExamBtn"
    )
    .addEventListener(
        "click",
        publishExam
    );

async function publishExam() {

    const questionCount =
        window.questionCache?.length || 0;

    const totalMarks =
        window.questionCache.reduce(
            (sum, q) =>
                sum +
                Number(
                    q.marks || 0
                ),
            0
        );

    /* ==========================
       QUESTION LIMIT CHECK
    ========================== */

    if (
        examSettings.fixed_question_count &&
        questionCount !==
        examSettings.total_questions
    ) {

        alert(
            `Exam requires exactly ${examSettings.total_questions} questions`
        );

        return;
    }

    /* ==========================
       MARKS CHECK
    ========================== */

    if (
        examSettings.enable_marks &&
        totalMarks !==
        examSettings.total_marks
    ) {

        alert(
            `Total marks must equal ${examSettings.total_marks}`
        );

        return;
    }

    /* ==========================
       AT LEAST ONE QUESTION
    ========================== */

    if (questionCount === 0) {

        alert(
            "Add at least one question"
        );

        return;
    }

    try {

        const response =
            await fetch(
                `${API_BASE}/${examId}/update/`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            status:
                                "Published"
                        })
                }
            );

        const result =
            await response.json();

        if (response.ok) {

            alert(
                "Exam Published Successfully"
            );

            loadExam();

        } else {

            alert(
                result.error ||
                "Publish Failed"
            );
        }

    } catch (error) {

        console.error(error);

        alert(
            "Server Error"
        );
    }
}