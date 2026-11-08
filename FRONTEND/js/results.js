/* ==========================================================
   EXAM PRO - RESULTS PAGE
========================================================== */

const API = {
    BASE_URL: "http://127.0.0.1:8000/api",

    RESULT_DETAILS: (resultId) =>
        `/results/${encodeURIComponent(resultId)}/`
};

let resultData = null;
let performanceChart = null;

/* ==========================================================
   INIT
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeResultsPage
);

async function initializeResultsPage() {

    try {

        const cachedResult =

        sessionStorage.getItem(
            "examResult"
        );

        if (cachedResult) {

            resultData =
                JSON.parse(
                    cachedResult
                );

            console.log(
                "Result loaded from sessionStorage"
            );

            populateResultData();
            renderPerformanceChart();
            renderQuestionReview();

            return;
        }

        const params =
            new URLSearchParams(
                window.location.search
            );

        const resultId =
            params.get(
                "resultId"
            );

        if (resultId) {

            await loadResultFromAPI(
                resultId
            );

            return;
        }

        showEmptyState();

    } catch (error) {

        console.error(
            "Result Initialization Error:",
            error
        );

        showEmptyState();
    }
}

/* ==========================================================
   LOAD RESULT FROM API
========================================================== */

async function loadResultFromAPI(
    resultId
) {

    try {

        const response =
            await fetch(
                `${API.BASE_URL}${API.RESULT_DETAILS(resultId)}`,
                {
                    headers:
                        getAuthHeaders()
                }
            );

        if (!response.ok) {

            throw new Error(
                "Unable to load result."
            );
        }

        resultData =
            await response.json();

        populateResultData();
        renderPerformanceChart();
        renderQuestionReview();

    } catch (error) {

        console.error(
            error
        );

        showError(
            error.message
        );
    }
}

/* ==========================================================
   POPULATE PAGE
========================================================== */

function populateResultData() {

    const score =
        Number(
            resultData.score || 0
        );

    const totalMarks =
        Number(
            resultData.max_score ||
            resultData.total_marks ||
            resultData.total_questions ||
            0
        );

    const percentage =
        Number(
            resultData.percentage || 0
        );

    const correctAnswers =
        Number(
            resultData.correct_answers || 0
        );

    const wrongAnswers =
        Number(
            resultData.wrong_answers || 0
        );

    const unanswered =
        Number(
            resultData.unanswered ||
            resultData.unanswered_questions ||
            0
        );

    const totalQuestions =
        Number(
            resultData.total_questions ||
            correctAnswers +
            wrongAnswers +
            unanswered
        );

    const grade =
        resultData.grade ||
        calculateGrade(
            percentage
        );

    const status =
        resultData.status ||
        (
            percentage >= 40
                ? "Passed"
                : "Failed"
        );

    /* Banner */

    setText(
        "referenceNumber",
        resultData.reference_number ||
        `REF-${Date.now()}`
    );

    setText(
        "submittedAt",
        formatDate(
            resultData.submitted_at
        )
    );

    /* Score Cards */

    setText(
        "scoreValue",
        `${score} / ${totalMarks}`
    );

    setText(
        "percentageValue",
        `${percentage}%`
    );

    setText(
        "gradeValue",
        grade
    );

    setText(
        "statusValue",
        status
    );

    /* Statistics */

    setText(
        "totalQuestions",
        totalQuestions
    );

    setText(
        "correctAnswers",
        correctAnswers
    );

    setText(
        "wrongAnswers",
        wrongAnswers
    );

    setText(
        "unansweredQuestions",
        unanswered
    );

    setText(
        "timeTaken",
        formatDuration(
            resultData.time_taken_seconds
        )
    );

    /* Summary */

    setText(
        "examTitle",
        resultData.exam_title ||
        "Exam"
    );

    setText(
        "examSubject",
        resultData.exam_subject ||
        resultData.subject ||
        "General"
    );

    setText(
        "summaryScore",
        `${score} / ${totalMarks}`
    );

    setText(
        "summaryPercentage",
        `${percentage}%`
    );

    setText(
        "summaryGrade",
        grade
    );

    setText(
        "summaryStatus",
        status
    );

    updateResultBanner(
        status
    );
}

/* ==========================================================
   RESULT BANNER
========================================================== */

function updateResultBanner(
    status
) {

    const heading =
        document.getElementById(
            "resultHeading"
        );

    const message =
        document.getElementById(
            "resultMessage"
        );

    if (!heading || !message) {
        return;
    }

    if (
        status.toLowerCase() ===
        "passed"
    ) {

        heading.textContent =
            "Congratulations!";

        message.textContent =
            "You have successfully completed the examination.";

    } else {

        heading.textContent =
            "Examination Completed";

        message.textContent =
            "Review your performance and prepare for improvement.";
    }
}

/* ==========================================================
   PERFORMANCE CHART
========================================================== */

function renderPerformanceChart() {

    const chartCanvas =
        document.getElementById(
            "performanceChart"
        );

    if (!chartCanvas) {
        return;
    }

    if (performanceChart) {
        performanceChart.destroy();
    }

    const correct =
        Number(
            resultData.correct_answers || 0
        );

    const wrong =
        Number(
            resultData.wrong_answers || 0
        );

    const unanswered =
        Number(
            resultData.unanswered_questions || 0
        );

    console.log(
        "Chart Values:",
        {
            correct,
            wrong,
            unanswered
        }
    );

    performanceChart =
        new Chart(
            chartCanvas,
            {
                type: "doughnut",

                data: {
                    labels: [
                        "Correct",
                        "Wrong",
                        "Unanswered"
                    ],

                    datasets: [
                        {
                            data: [
                                correct,
                                wrong,
                                unanswered
                            ],

                            backgroundColor: [
                                "#16a34a",
                                "#dc2626",
                                "#f59e0b"
                            ],

                            borderColor: "#ffffff",
                            borderWidth: 2,

                            hoverOffset: 8
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            position: "bottom"
                        },

                        tooltip: {
                            callbacks: {
                                label(context) {

                                    const value =
                                        context.raw || 0;

                                    const total =
                                        correct +
                                        wrong +
                                        unanswered;

                                    const percentage =
                                        total > 0
                                            ? (
                                                value /
                                                total *
                                                100
                                            ).toFixed(1)
                                            : 0;

                                    return `${context.label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            }
        );
}
/* ==========================================================
   QUESTION REVIEW
========================================================== */

function renderQuestionReview() {

    const container =
        document.getElementById(
            "questionReviewContainer"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const questions =
        resultData.questions || [];

    if (
        questions.length === 0
    ) {

        container.innerHTML =
            `
            <div class="review-card">
                Question review is unavailable.
            </div>
            `;

        return;
    }

    questions.forEach(
        (
            question,
            index
        ) => {

            const isCorrect =
                question.is_correct;

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                `review-card ${
                    isCorrect
                        ? "correct"
                        : "wrong"
                }`;

            card.innerHTML =
                `
                <div class="review-content">

                    <h4>
                        Question ${index + 1}
                    </h4>

                    <p>
                        ${
                            question.question_text ||
                            question.question ||
                            ""
                        }
                    </p>

                    <p>
                        <strong>Your Answer:</strong>
                        ${
                            question.selected_answer ||
                            "Not Answered"
                        }
                    </p>

                    <p>
                        <strong>Correct Answer:</strong>
                        ${
                            question.correct_answer ||
                            "-"
                        }
                    </p>

                </div>

                <div class="marks ${
                    isCorrect
                        ? "positive"
                        : "negative"
                }">

                    ${
                        isCorrect
                            ? "Correct"
                            : "Wrong"
                    }

                </div>
                `;

            container.appendChild(
                card
            );
        }
    );
}

/* ==========================================================
   HELPERS
========================================================== */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );

    if (element) {

        element.textContent =
            value ?? "--";
    }
}

function calculateGrade(
    percentage
) {

    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B+";
    if (percentage >= 60) return "B";
    if (percentage >= 50) return "C";
    if (percentage >= 40) return "D";

    return "F";
}

function formatDate(
    dateString
) {

    if (!dateString) {
        return "--";
    }

    return new Date(
        dateString
    ).toLocaleString(
        "en-IN",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );
}

function formatDuration(
    seconds
) {

    if (!seconds) {
        return "N/A";
    }

    const hrs =
        Math.floor(
            seconds / 3600
        );

    const mins =
        Math.floor(
            (seconds % 3600) / 60
        );

    const secs =
        seconds % 60;

    let text = "";

    if (hrs)
        text += `${hrs}h `;

    if (mins)
        text += `${mins}m `;

    text += `${secs}s`;

    return text;
}

function getAuthHeaders() {

    const token =
        localStorage.getItem(
            "accessToken"
        );

    return {

        "Content-Type":
            "application/json",

        Authorization:
            token
                ? `Bearer ${token}`
                : ""
    };
}

function showError(
    message
) {

    console.error(
        message
    );

    alert(
        message
    );
}

function showEmptyState() {

    document.body.innerHTML =
        `
        <div style="
            display:flex;
            justify-content:center;
            align-items:center;
            height:100vh;
            flex-direction:column;
            gap:12px;
            font-family:Poppins,sans-serif;
        ">
            <h2>No Result Found</h2>
            <p>Please attempt an exam first.</p>
        </div>
        `;
}