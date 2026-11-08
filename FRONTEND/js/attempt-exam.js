"use strict";

/* ============================================================
   EXAM PRO
   ATTEMPT EXAM
   Dynamic Student Examination Controller
   ============================================================ */

/* ============================================================
   API CONFIGURATION
   ============================================================ */

const API = {
    BASE_URL: "http://localhost:8000/api",

    EXAM_DETAIL: (examId) =>
        `/exams/${encodeURIComponent(examId)}/attempt/`,

    SUBMIT_EXAM: (examId) =>
        `/results/${encodeURIComponent(examId)}/submit/`,

    SAVE_ANSWER: (examId) =>
        `/results/${encodeURIComponent(examId)}/save-answer/`,
};


/* ============================================================
   APPLICATION STATE
   ============================================================ */

const examState = {
    examId: null,

    exam: null,

    questions: [],

    currentQuestionIndex: 0,

    answers: {},

    markedQuestions: new Set(),

    visitedQuestions: new Set(),

    /*
     * For timed exams:
     *     timeRemaining = seconds remaining
     *
     * For unlimited exams:
     *     timeRemaining = null
     */
    timeRemaining: null,

    timerInterval: null,

    examStarted: false,

    examSubmitted: false,

    submitting: false,

    loading: false,

    startedAt: null,
};


/* ============================================================
   DOM ELEMENTS
   ============================================================ */

const DOM = {};


/* ============================================================
   PAGE INITIALIZATION
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initializeAttemptExam
);


async function initializeAttemptExam() {

    cacheDOMElements();

    examState.examId = getExamIdFromURL();

    if (!examState.examId) {

        showPageError(
            "Exam ID is missing. Please return to the exams page and select an exam."
        );

        return;
    }

    bindEvents();

    await loadExam();
}


/* ============================================================
   CACHE DOM ELEMENTS
   ============================================================ */

function cacheDOMElements() {

    DOM.examContainer =
        document.getElementById("examContainer");

    DOM.loading =
        document.getElementById("loading");

    DOM.loadingText =
        document.getElementById("loadingText");

    DOM.errorMessage =
        document.getElementById("errorMessage");


    /* Exam information */

    DOM.examTitle =
        document.getElementById("examTitle");

    DOM.examSubject =
        document.getElementById("examSubject");

    DOM.examDuration =
        document.getElementById("examDuration");

    DOM.totalQuestions =
        document.getElementById("totalQuestions");

    DOM.totalMarks =
        document.getElementById("totalMarks");

    DOM.instructions =
        document.getElementById("instructions");


    /* Student information */

    DOM.studentName =
        document.getElementById("studentName");


    /* Question */

    DOM.questionNumber =
        document.getElementById("questionNumber");

    DOM.questionText =
        document.getElementById("questionText");

    DOM.optionsContainer =
        document.getElementById("optionsContainer");


    /* Navigation */

    DOM.previousButton =
        document.getElementById("prevBtn");

    DOM.nextButton =
        document.getElementById("nextBtn");

    DOM.clearButton =
        document.getElementById("clearAnswerBtn");

    DOM.reviewButton =
        document.getElementById("markReviewBtn");

    DOM.submitButton =
        document.getElementById("submitExamBtn");


    /* Question palette */

    DOM.questionPalette =
        document.getElementById("questionPalette");


    /* Progress */

    DOM.progressBar =
        document.getElementById("progressBar");

    DOM.progressText =
        document.getElementById("progressText");


    /* Statistics */

    DOM.answeredCount =
        document.getElementById("answeredCount");

    DOM.unansweredCount =
        document.getElementById("unansweredCount");

    DOM.reviewCount =
        document.getElementById("reviewCount");


    /* Timer */

    DOM.timer =
        document.getElementById("timer");

    DOM.timerContainer =
        document.getElementById("timerContainer");
}


/* ============================================================
   EVENT BINDINGS
   ============================================================ */

function bindEvents() {

    if (DOM.previousButton) {

        DOM.previousButton.addEventListener(
            "click",
            goToPreviousQuestion
        );
    }


    if (DOM.nextButton) {

        DOM.nextButton.addEventListener(
            "click",
            goToNextQuestion
        );
    }


    if (DOM.clearButton) {

        DOM.clearButton.addEventListener(
            "click",
            clearCurrentAnswer
        );
    }


    if (DOM.reviewButton) {

        DOM.reviewButton.addEventListener(
            "click",
            toggleReviewQuestion
        );
    }


    if (DOM.submitButton) {

        DOM.submitButton.addEventListener(
            "click",
            confirmSubmit
        );
    }


    document.addEventListener(
        "keydown",
        handleKeyboardNavigation
    );


    window.addEventListener(
        "beforeunload",
        handleBeforeUnload
    );
}


/* ============================================================
   GET EXAM ID
   ============================================================ */

function getExamIdFromURL() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const examId =
        params.get("examId") ||
        params.get("id") ||
        params.get("exam");

    console.log(
        "Received Exam ID:",
        examId
    );

    return examId;
}


/* ============================================================
   LOAD EXAM FROM BACKEND
   ============================================================ */

async function loadExam() {

    setLoading(
        true,
        "Loading examination..."
    );

    examState.loading = true;

    try {

        const url =
            `${API.BASE_URL}${API.EXAM_DETAIL(
                examState.examId
            )}`;

        console.log(
            "Loading Exam:",
            url
        );


        const response =
            await fetch(
                url,
                {
                    method: "GET",
                    headers: getAuthHeaders(),
                }
            );


        console.log(
            "Status:",
            response.status
        );


        if (!response.ok) {

            throw new Error(
                await getAPIErrorMessage(
                    response,
                    "Unable to load the examination."
                )
            );
        }


        const rawExam =
            await response.json();


        console.log(
            "Exam Response:",
            rawExam
        );


        /*
         * Normalize backend response.
         */

        examState.exam =
            normalizeExam(rawExam);


        examState.questions =
            examState.exam.questions;


        console.log(
            "Questions Loaded:",
            examState.questions
        );


        /*
         * Exam must contain questions.
         */

        if (
            !Array.isArray(examState.questions) ||
            examState.questions.length === 0
        ) {

            throw new Error(
                "This examination does not contain any questions yet."
            );
        }


        initializeExamState();


        renderExamInformation();


        renderQuestionPalette();


        renderCurrentQuestion();


        updateAllCounters();


        /*
         * IMPORTANT:
         *
         * Only start timer when
         * exam has a valid time limit.
         */

        if (hasTimeLimit()) {

            startExamTimer();

        } else {

            showUnlimitedTimerState();
        }


    } catch (error) {

        console.error(
            "Exam loading error:",
            error
        );


        showPageError(
            error.message ||
            "Unable to load the examination."
        );


    } finally {

        examState.loading = false;

        setLoading(false);
    }
}


/* ============================================================
   NORMALIZE EXAM
   ============================================================ */

function normalizeExam(data) {

    /*
     * IMPORTANT:
     *
     * Do NOT use:
     *
     * duration || 60
     *
     * because that converts a missing/null duration
     * into a 60-minute exam.
     */

    const rawDuration =
        data.duration ??
        data.duration_minutes ??
        data.time_limit ??
        null;


    const duration =
        normalizeDuration(rawDuration);


    const exam = {

        id:
            data.id ||
            data._id ||
            data.exam_id ||
            examState.examId,


        title:
            data.title ||
            data.name ||
            "Examination",


        subject:
            data.subject ||
            data.category ||
            "",


        /*
         * null means NO TIME LIMIT.
         */

        duration: duration,


        totalMarks:
            data.total_marks ??
            data.totalMarks ??
            null,


        instructions:
            data.instructions ||
            "",


        status:
            data.status ||
            "",


        examDate:
            data.exam_date ||
            data.examDate ||
            null,


        questions:
            normalizeQuestions(
                data.questions ||
                data.exam_questions ||
                []
            ),
    };


    /*
     * If total marks isn't supplied by backend,
     * calculate it from questions.
     */

    if (
        exam.totalMarks === null ||
        exam.totalMarks === undefined
    ) {

        exam.totalMarks =
            exam.questions.reduce(
                (total, question) =>
                    total + question.marks,
                0
            );
    }


    console.log(
        "Normalized Exam Duration:",
        exam.duration
    );


    if (exam.duration === null) {

        console.log(
            "This examination has NO TIME LIMIT."
        );

    } else {

        console.log(
            `This examination has a ${exam.duration}-minute time limit.`
        );
    }


    return exam;
}


/* ============================================================
   NORMALIZE DURATION
   ============================================================ */

function normalizeDuration(value) {

    /*
     * null / undefined / empty string
     * means unlimited.
     */

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return null;
    }


    const number =
        Number(value);


    /*
     * Zero or negative duration
     * means no time limit.
     */

    if (
        !Number.isFinite(number) ||
        number <= 0
    ) {

        return null;
    }


    return number;
}


/* ============================================================
   CHECK WHETHER EXAM HAS TIME LIMIT
   ============================================================ */

function hasTimeLimit() {

    return (
        examState.exam &&
        examState.exam.duration !== null &&
        Number.isFinite(
            Number(examState.exam.duration)
        ) &&
        Number(examState.exam.duration) > 0
    );
}


/* ============================================================
   NORMALIZE QUESTIONS
   ============================================================ */

function normalizeQuestions(questions) {

    if (!Array.isArray(questions)) {

        return [];
    }


    return questions.map(
        (rawQuestion, index) => {

            const questionId =
                rawQuestion.id ||
                rawQuestion._id ||
                rawQuestion.question_id ||
                rawQuestion.questionId ||
                `question-${index + 1}`;


            const questionText =
                rawQuestion.question ||
                rawQuestion.question_text ||
                rawQuestion.questionText ||
                rawQuestion.text ||
                rawQuestion.title ||
                "";


            const options =
                normalizeOptions(
                    rawQuestion.options ||
                    rawQuestion.choices ||
                    rawQuestion.answers ||
                    []
                );


            const marks =
                toNumber(
                    rawQuestion.marks ??
                    rawQuestion.points ??
                    rawQuestion.mark ??
                    1
                );


            return {

                id:
                    String(questionId),


                number:
                    index + 1,


                text:
                    String(questionText),


                options:
                    options,


                marks:
                    marks,


                type:
                    rawQuestion.type ||
                    rawQuestion.question_type ||
                    "multiple_choice",
            };
        }
    );
}


/* ============================================================
   NORMALIZE OPTIONS
   ============================================================ */

function normalizeOptions(options) {

    if (!Array.isArray(options)) {

        return [];
    }


    return options.map(
        (rawOption, index) => {

            /*
             * Admin may have saved:
             *
             * "Option A"
             *
             * OR
             *
             * {
             *    id: "A",
             *    text: "Option A"
             * }
             */

            if (
                typeof rawOption ===
                "string"
            ) {

                return {

                    id:
                        String.fromCharCode(
                            65 + index
                        ),

                    text:
                        rawOption,
                };
            }


            const optionId =
                rawOption.id ??
                rawOption._id ??
                rawOption.value ??
                String.fromCharCode(
                    65 + index
                );


            const optionText =
                rawOption.text ??
                rawOption.label ??
                rawOption.option ??
                rawOption.value ??
                "";


            return {

                id:
                    String(optionId),

                text:
                    String(optionText),
            };
        }
    );
}


/* ============================================================
   INITIALIZE EXAM STATE
   ============================================================ */

function initializeExamState() {

    examState.currentQuestionIndex = 0;


    examState.answers = {};


    examState.markedQuestions =
        new Set();


    examState.visitedQuestions =
        new Set();


    examState.examSubmitted = false;


    examState.submitting = false;


    examState.startedAt =
        new Date();


    /*
     * IMPORTANT:
     *
     * Timed exam:
     *     duration * 60
     *
     * Unlimited exam:
     *     null
     */

    if (hasTimeLimit()) {

        examState.timeRemaining =
            Math.floor(
                Number(
                    examState.exam.duration
                ) * 60
            );

    } else {

        examState.timeRemaining =
            null;
    }


    /*
     * Initialize every question
     * with no answer.
     */

    examState.questions.forEach(
        (question) => {

            examState.answers[
                question.id
            ] = null;
        }
    );
}


/* ============================================================
   RENDER EXAM INFORMATION
   ============================================================ */

function renderExamInformation() {

    const exam =
        examState.exam;


    if (DOM.examTitle) {

        DOM.examTitle.textContent =
            exam.title;
    }


    if (DOM.examSubject) {

        DOM.examSubject.textContent =
            exam.subject ||
            "General";
    }


    if (DOM.examDuration) {

        if (hasTimeLimit()) {

            DOM.examDuration.textContent =
                `${exam.duration} min`;

        } else {

            DOM.examDuration.textContent =
                "No time limit";
        }
    }


    if (DOM.totalQuestions) {

        DOM.totalQuestions.textContent =
            examState.questions.length;
    }


    if (DOM.totalMarks) {

        DOM.totalMarks.textContent =
            exam.totalMarks;
    }


    if (DOM.instructions) {

        if (exam.instructions) {

            DOM.instructions.textContent =
                exam.instructions;

        } else {

            DOM.instructions.textContent =
                "Answer all questions carefully before submitting the examination.";
        }
    }


    loadStudentName();
}


/* ============================================================
   LOAD STUDENT NAME
   ============================================================ */

function loadStudentName() {

    if (!DOM.studentName) {

        return;
    }


    const studentName =
        localStorage.getItem(
            "studentName"
        ) ||
        sessionStorage.getItem(
            "studentName"
        );


    if (studentName) {

        DOM.studentName.textContent =
            studentName;
    }
}


/* ============================================================
   RENDER CURRENT QUESTION
   ============================================================ */

function renderCurrentQuestion() {

    const question =
        getCurrentQuestion();


    console.log(
        "Current Question:",
        question
    );


    if (!question) {

        console.error(
            "Question is null"
        );

        return;
    }


    examState.visitedQuestions.add(
        question.id
    );


    if (DOM.questionNumber) {

        DOM.questionNumber.textContent =
            `Question ${
                examState.currentQuestionIndex + 1
            }`;
    }


    if (DOM.questionText) {

        DOM.questionText.textContent =
            question.text;
    }


    renderQuestionOptions(
        question
    );


    updateNavigation();


    updateReviewButton();


    updateProgress();


    updateQuestionPalette();


    updateAllCounters();
}


/* ============================================================
   GET CURRENT QUESTION
   ============================================================ */

function getCurrentQuestion() {

    return (
        examState.questions[
            examState.currentQuestionIndex
        ] ||
        null
    );
}


/* ============================================================
   RENDER QUESTION OPTIONS
   ============================================================ */

function renderQuestionOptions(question) {

    if (!DOM.optionsContainer) {

        return;
    }


    DOM.optionsContainer.innerHTML =
        "";


    if (
        !question.options ||
        question.options.length === 0
    ) {

        DOM.optionsContainer.innerHTML = `

            <div class="no-options">

                <i class="fa-solid fa-circle-exclamation"></i>

                <span>
                    No answer options are available for this question.
                </span>

            </div>

        `;

        return;
    }


    const selectedAnswer =
        examState.answers[
            question.id
        ];


    question.options.forEach(
        (option, index) => {

            const optionLabel =
                document.createElement(
                    "label"
                );


            optionLabel.className =
                "answer-option";


            const isSelected =
                String(
                    selectedAnswer
                ) ===
                String(
                    option.id
                );


            if (isSelected) {

                optionLabel.classList.add(
                    "selected"
                );
            }


            optionLabel.innerHTML = `

                <input
                    type="radio"
                    name="question-${escapeAttribute(question.id)}"
                    value="${escapeAttribute(option.id)}"
                    ${isSelected ? "checked" : ""}
                >

                <span class="option-letter">
                    ${String.fromCharCode(
                        65 + index
                    )}
                </span>

                <span class="option-text">
                    ${escapeHTML(
                        option.text
                    )}
                </span>

                <span class="option-check">
                    <i class="fa-solid fa-check"></i>
                </span>

            `;


            const input =
                optionLabel.querySelector(
                    "input"
                );


            input.addEventListener(
                "change",
                () => {

                    selectAnswer(
                        question.id,
                        option.id
                    );
                }
            );


            DOM.optionsContainer.appendChild(
                optionLabel
            );
        }
    );
}


/* ============================================================
   SELECT ANSWER
   ============================================================ */

function selectAnswer(
    questionId,
    answerId
) {

    examState.answers[
        questionId
    ] = String(answerId);


    if (DOM.optionsContainer) {

        const options =
            DOM.optionsContainer.querySelectorAll(
                ".answer-option"
            );


        options.forEach(
            (option) => {

                const input =
                    option.querySelector(
                        "input"
                    );


                if (!input) {

                    return;
                }


                option.classList.toggle(
                    "selected",
                    String(input.value) ===
                    String(answerId)
                );
            }
        );
    }


    updateAllCounters();


    updateQuestionPalette();


    saveAnswerToServer(
        questionId,
        answerId
    );
}


/* ============================================================
   CLEAR CURRENT ANSWER
   ============================================================ */

function clearCurrentAnswer() {

    const question =
        getCurrentQuestion();


    if (!question) {

        return;
    }


    examState.answers[
        question.id
    ] = null;


    renderQuestionOptions(
        question
    );


    updateAllCounters();


    updateQuestionPalette();
}


/* ============================================================
   MARK / UNMARK QUESTION
   ============================================================ */

function toggleReviewQuestion() {

    const question =
        getCurrentQuestion();


    if (!question) {

        return;
    }


    if (
        examState.markedQuestions.has(
            question.id
        )
    ) {

        examState.markedQuestions.delete(
            question.id
        );

    } else {

        examState.markedQuestions.add(
            question.id
        );
    }


    updateReviewButton();


    updateQuestionPalette();


    updateAllCounters();
}


/* ============================================================
   UPDATE REVIEW BUTTON
   ============================================================ */

function updateReviewButton() {

    if (!DOM.reviewButton) {

        return;
    }


    const question =
        getCurrentQuestion();


    if (!question) {

        return;
    }


    const marked =
        examState.markedQuestions.has(
            question.id
        );


    DOM.reviewButton.classList.toggle(
        "active",
        marked
    );


    const icon =
        DOM.reviewButton.querySelector(
            "i"
        );


    if (icon) {

        icon.className =
            marked
                ? "fa-solid fa-bookmark"
                : "fa-regular fa-bookmark";
    }


    const text =
        DOM.reviewButton.querySelector(
            ".btn-text"
        );


    if (text) {

        text.textContent =
            marked
                ? "Marked for Review"
                : "Mark for Review";
    }
}


/* ============================================================
   RENDER QUESTION PALETTE
   ============================================================ */

function renderQuestionPalette() {

    if (!DOM.questionPalette) {

        return;
    }


    DOM.questionPalette.innerHTML =
        "";


    examState.questions.forEach(
        (question, index) => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "question-number";


            button.textContent =
                index + 1;


            button.dataset.index =
                index;


            button.setAttribute(
                "aria-label",
                `Go to question ${index + 1}`
            );


            button.addEventListener(
                "click",
                () => {

                    goToQuestion(index);
                }
            );


            DOM.questionPalette.appendChild(
                button
            );
        }
    );


    updateQuestionPalette();
}


/* ============================================================
   UPDATE QUESTION PALETTE
   ============================================================ */

function updateQuestionPalette() {

    if (!DOM.questionPalette) {

        return;
    }


    const buttons =
        DOM.questionPalette.querySelectorAll(
            ".question-number"
        );


    buttons.forEach(
        (button, index) => {

            const question =
                examState.questions[
                    index
                ];


            if (!question) {

                return;
            }


            const answered =
                hasAnswer(
                    question.id
                );


            const marked =
                examState.markedQuestions.has(
                    question.id
                );


            const visited =
                examState.visitedQuestions.has(
                    question.id
                );


            const current =
                index ===
                examState.currentQuestionIndex;


            button.classList.toggle(
                "current",
                current
            );


            button.classList.toggle(
                "answered",
                answered
            );


            button.classList.toggle(
                "review",
                marked
            );


            button.classList.toggle(
                "visited",
                visited
            );


            if (marked) {

                button.title =
                    `Question ${
                        index + 1
                    } — Marked for review`;

            } else if (answered) {

                button.title =
                    `Question ${
                        index + 1
                    } — Answered`;

            } else {

                button.title =
                    `Question ${
                        index + 1
                    } — Not answered`;
            }
        }
    );
}


/* ============================================================
   GO TO QUESTION
   ============================================================ */

function goToQuestion(index) {

    if (
        index < 0 ||
        index >=
            examState.questions.length
    ) {

        return;
    }


    examState.currentQuestionIndex =
        index;


    renderCurrentQuestion();


    scrollToQuestion();
}


/* ============================================================
   NEXT QUESTION
   ============================================================ */

function goToNextQuestion() {

    const isLastQuestion =
        examState.currentQuestionIndex ===
        examState.questions.length - 1;


    if (isLastQuestion) {

        confirmSubmit();

        return;
    }


    examState.currentQuestionIndex++;


    renderCurrentQuestion();


    scrollToQuestion();
}


/* ============================================================
   PREVIOUS QUESTION
   ============================================================ */

function goToPreviousQuestion() {

    if (
        examState.currentQuestionIndex <= 0
    ) {

        return;
    }


    examState.currentQuestionIndex--;


    renderCurrentQuestion();


    scrollToQuestion();
}


/* ============================================================
   UPDATE NAVIGATION
   ============================================================ */

function updateNavigation() {

    const currentIndex =
        examState.currentQuestionIndex;


    const lastIndex =
        examState.questions.length - 1;


    if (DOM.previousButton) {

        DOM.previousButton.disabled =
            currentIndex === 0;
    }


    if (DOM.nextButton) {

        const lastQuestion =
            currentIndex === lastIndex;


        const buttonText =
            DOM.nextButton.querySelector(
                ".btn-text"
            );


        if (buttonText) {

            buttonText.textContent =
                lastQuestion
                    ? "Finish"
                    : "Next Question";

        } else {

            DOM.nextButton.textContent =
                lastQuestion
                    ? "Finish"
                    : "Next Question";
        }


        const icon =
            DOM.nextButton.querySelector(
                "i"
            );


        if (icon) {

            icon.className =
                lastQuestion
                    ? "fa-solid fa-check"
                    : "fa-solid fa-arrow-right";
        }
    }
}


/* ============================================================
   UPDATE PROGRESS
   ============================================================ */

function updateProgress() {

    const total =
        examState.questions.length;


    const current =
        examState.currentQuestionIndex + 1;


    if (!total) {

        return;
    }


    const percentage =
        (current / total) * 100;


    if (DOM.progressBar) {

        DOM.progressBar.style.width =
            `${percentage}%`;


        DOM.progressBar.setAttribute(
            "aria-valuenow",
            Math.round(percentage)
        );
    }


    if (DOM.progressText) {

        DOM.progressText.textContent =
            `${current} of ${total}`;
    }
}


/* ============================================================
   UPDATE COUNTERS
   ============================================================ */

function updateAllCounters() {

    const total =
        examState.questions.length;


    const answered =
        examState.questions.filter(
            (question) =>
                hasAnswer(question.id)
        ).length;


    const unanswered =
        Math.max(
            0,
            total - answered
        );


    const review =
        examState.markedQuestions.size;


    if (DOM.answeredCount) {

        DOM.answeredCount.textContent =
            answered;
    }


    if (DOM.unansweredCount) {

        DOM.unansweredCount.textContent =
            unanswered;
    }


    if (DOM.reviewCount) {

        DOM.reviewCount.textContent =
            review;
    }
}


/* ============================================================
   CHECK IF QUESTION IS ANSWERED
   ============================================================ */

function hasAnswer(questionId) {

    const answer =
        examState.answers[
            questionId
        ];


    return (
        answer !== null &&
        answer !== undefined &&
        answer !== ""
    );
}


/* ============================================================
   TIMER
   ============================================================ */

function startExamTimer() {

    /*
     * Safety check.
     *
     * Never start a timer for an unlimited exam.
     */

    if (!hasTimeLimit()) {

        console.log(
            "Timer not started — exam has no time limit."
        );

        showUnlimitedTimerState();

        return;
    }


    stopExamTimer();


    examState.examStarted =
        true;


    updateTimerDisplay();


    updateTimerAppearance();


    examState.timerInterval =
        setInterval(
            () => {

                /*
                 * Safety check in case duration
                 * changes unexpectedly.
                 */

                if (!hasTimeLimit()) {

                    stopExamTimer();

                    showUnlimitedTimerState();

                    return;
                }


                if (
                    examState.timeRemaining <= 0
                ) {

                    handleTimeExpired();

                    return;
                }


                examState.timeRemaining--;


                updateTimerDisplay();


                updateTimerAppearance();

            },
            1000
        );
}


/* ============================================================
   SHOW UNLIMITED TIMER STATE
   ============================================================ */

function showUnlimitedTimerState() {

    stopExamTimer();


    examState.timeRemaining =
        null;


    if (DOM.timer) {

        DOM.timer.textContent =
            "No limit";


        DOM.timer.removeAttribute(
            "aria-label"
        );


        DOM.timer.classList.remove(
            "warning"
        );


        DOM.timer.classList.remove(
            "danger"
        );
    }


    if (DOM.timerContainer) {

        DOM.timerContainer.classList.remove(
            "warning"
        );


        DOM.timerContainer.classList.remove(
            "danger"
        );


        /*
         * Add class so CSS can optionally
         * style the unlimited state.
         */

        DOM.timerContainer.classList.add(
            "unlimited"
        );
    }
}


/* ============================================================
   STOP TIMER
   ============================================================ */

function stopExamTimer() {

    if (examState.timerInterval) {

        clearInterval(
            examState.timerInterval
        );


        examState.timerInterval =
            null;
    }
}


/* ============================================================
   UPDATE TIMER DISPLAY
   ============================================================ */

function updateTimerDisplay() {

    if (!DOM.timer) {

        return;
    }


    /*
     * Unlimited exam.
     */

    if (!hasTimeLimit()) {

        DOM.timer.textContent =
            "No limit";


        DOM.timer.removeAttribute(
            "aria-label"
        );


        return;
    }


    const remaining =
        Math.max(
            0,
            Number(
                examState.timeRemaining
            )
        );


    const hours =
        Math.floor(
            remaining / 3600
        );


    const minutes =
        Math.floor(
            (remaining % 3600) / 60
        );


    const seconds =
        remaining % 60;


    if (hours > 0) {

        DOM.timer.textContent =
            `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

    } else {

        DOM.timer.textContent =
            `${pad(minutes)}:${pad(seconds)}`;
    }


    DOM.timer.setAttribute(
        "aria-label",
        `Time remaining ${DOM.timer.textContent}`
    );
}


/* ============================================================
   TIMER VISUAL WARNING
   ============================================================ */

function updateTimerAppearance() {

    /*
     * Do nothing for unlimited exams.
     */

    if (!hasTimeLimit()) {

        if (DOM.timer) {

            DOM.timer.classList.remove(
                "warning"
            );


            DOM.timer.classList.remove(
                "danger"
            );
        }


        if (DOM.timerContainer) {

            DOM.timerContainer.classList.remove(
                "warning"
            );


            DOM.timerContainer.classList.remove(
                "danger"
            );
        }


        return;
    }


    const remaining =
        examState.timeRemaining;


    if (DOM.timer) {

        DOM.timer.classList.toggle(
            "warning",
            remaining <= 300 &&
            remaining > 60
        );


        DOM.timer.classList.toggle(
            "danger",
            remaining <= 60
        );
    }


    if (DOM.timerContainer) {

        DOM.timerContainer.classList.toggle(
            "warning",
            remaining <= 300 &&
            remaining > 60
        );


        DOM.timerContainer.classList.toggle(
            "danger",
            remaining <= 60
        );


        DOM.timerContainer.classList.remove(
            "unlimited"
        );
    }


    /*
     * Notify student once at thresholds.
     */

    if (remaining === 300) {

        showToast(
            "Only 5 minutes remaining.",
            "warning"
        );
    }


    if (remaining === 60) {

        showToast(
            "Only 1 minute remaining.",
            "danger"
        );
    }
}


/* ============================================================
   HANDLE TIME EXPIRATION
   ============================================================ */

function handleTimeExpired() {

    /*
     * Never execute for unlimited exams.
     */

    if (!hasTimeLimit()) {

        stopExamTimer();

        return;
    }


    stopExamTimer();


    if (examState.examSubmitted) {

        return;
    }


    showToast(
        "Time is over. Your examination will be submitted automatically.",
        "danger"
    );


    setTimeout(
        () => {

            submitExam(true);

        },
        1200
    );
}


/* ============================================================
   CONFIRM SUBMISSION
   ============================================================ */

function confirmSubmit() {

    if (
        examState.submitting ||
        examState.examSubmitted
    ) {

        return;
    }


    const unanswered =
        examState.questions.filter(
            (question) =>
                !hasAnswer(question.id)
        ).length;


    const marked =
        examState.markedQuestions.size;


    let message =
        "Are you sure you want to submit the examination?";


    if (unanswered > 0) {

        message +=
            `\n\n${unanswered} question${
                unanswered === 1
                    ? ""
                    : "s"
            } remain unanswered.`;
    }


    if (marked > 0) {

        message +=
            `\n${marked} question${
                marked === 1
                    ? ""
                    : "s"
            } ${
                marked === 1
                    ? "is"
                    : "are"
            } marked for review.`;
    }


    message +=
        "\n\nSubmitted answers cannot be changed.";


    const confirmed =
        window.confirm(
            message
        );


    if (confirmed) {

        submitExam(false);
    }
}


/* ============================================================
   SUBMIT EXAM
   ============================================================ */

async function submitExam(
    automatic = false
) {

    if (
        examState.submitting ||
        examState.examSubmitted
    ) {
        return;
    }

    examState.submitting = true;

    stopExamTimer();

    setSubmitButtonState(true);

    const payload =
        buildSubmissionPayload(
            automatic
        );

    console.log(
        "===================================="
    );
    console.log(
        "SUBMISSION PAYLOAD:"
    );
    console.log(payload);
    console.log(
        "ANSWERS:"
    );
    console.log(payload.answers);
    console.log(
        "===================================="
    );

    try {

        const response =
            await fetch(
                `${API.BASE_URL}${API.SUBMIT_EXAM(
                    examState.examId
                )}`,
                {
                    method: "POST",
                    headers: {
                        ...getAuthHeaders(),
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );

        console.log(
            "Response Status:",
            response.status
        );

        let result = {};

        try {

            result =
                await response.json();

            console.log(
                "Backend Result:"
            );

            console.log(
                result
            );

        } catch (error) {

            console.error(
                "JSON Parse Error:",
                error
            );
        }

        if (!response.ok) {

            throw new Error(
                result.message ||
                "Submission failed"
            );
        }

        sessionStorage.setItem(
            "examResult",
            JSON.stringify(
                result
            )
        );

        sessionStorage.setItem(
            "latestExamSubmission",
            JSON.stringify({

                reference_number:
                    result.reference_number,

                exam_id:
                    result.exam_id,

                exam_title:
                    result.exam_title,

                total_questions:
                    result.total_questions,

                answered_questions:
                    Object.keys(
                        examState.answers
                    ).length,

                duration_minutes:
                    examState.exam
                        ?.duration || 0,

                submitted_at:
                    result.submitted_at,

                score:
                    result.score,

                percentage:
                    result.percentage,

                grade:
                    result.grade,

                status:
                    result.status
            })
        );

        examState.examSubmitted =
            true;

        window.location.href =
            "submission-successful.html";

    } catch (error) {

        console.error(
            "Exam submission failed:",
            error
        );

        examState.submitting =
            false;

        setSubmitButtonState(
            false
        );

        showToast(
            error.message ||
            "Submission failed",
            "danger"
        );

        if (
            hasTimeLimit() &&
            examState.timeRemaining >
                0 &&
            !examState.examSubmitted
        ) {
            startExamTimer();
        }
    }
}


/* ============================================================
   BUILD SUBMISSION PAYLOAD
   ============================================================ */

function buildSubmissionPayload(
    automatic = false
) {

    let timeSpent = 0;

    if (
        examState.startedAt
    ) {

        timeSpent =
            Math.max(
                0,
                Math.floor(
                    (
                        Date.now() -
                        examState.startedAt.getTime()
                    ) / 1000
                )
            );
    }

    if (
        hasTimeLimit()
    ) {

        const timeAllowed =
            Number(
                examState.exam
                    ?.duration || 0
            ) * 60;

        timeSpent =
            Math.max(
                0,
                timeAllowed -
                examState.timeRemaining
            );
    }

    return {

        exam_id:
            examState.examId,

        answers:
            examState.answers,

        marked_for_review:
            Array.from(
                examState.markedQuestions
            ),

        time_remaining:
            hasTimeLimit()
                ? examState.timeRemaining
                : null,

        time_spent:
            timeSpent,

        submitted_automatically:
            automatic
    };
}
/* ============================================================
   SAVE ANSWER TO BACKEND
   ============================================================ */

async function saveAnswerToServer(
    questionId,
    answerId
) {

    try {

        const response =
            await fetch(
                `${API.BASE_URL}${API.SAVE_ANSWER(
                    examState.examId
                )}`,
                {
                    method: "POST",

                    headers:
                        getAuthHeaders(),

                    body:
                        JSON.stringify({

                            question_id:
                                questionId,

                            answer:
                                answerId,
                        }),
                }
            );


        if (!response.ok) {

            console.warn(
                "Answer could not be synchronized with the server."
            );
        }


    } catch (error) {

        console.warn(
            "Answer synchronization failed:",
            error
        );
    }
}


/* ============================================================
   SAVE SUBMISSION RESULT
   ============================================================ */

function saveSubmissionResult(
    result
) {

    try {

        const answeredQuestions =
            Object.values(
                examState.answers || {}
            ).filter(
                answer =>
                    answer !== null &&
                    answer !== undefined &&
                    answer !== ""
            ).length;


        sessionStorage.setItem(
            "latestExamSubmission",

            JSON.stringify({

                reference_number:
                    result?.reference_number ||
                    result?.submission_reference ||
                    `REF-${Date.now()}`,

                exam_id:
                    examState.examId,

                exam_title:
                    examState.exam?.title ||
                    "Exam",

                total_questions:
                    examState.questions?.length || 0,

                answered_questions:
                    answeredQuestions,

                duration_minutes:
                    examState.exam?.duration ||
                    examState.exam?.duration_minutes ||
                    0,

                submitted_at:
                    result?.submitted_at ||
                    new Date().toISOString(),

                score:
                    result?.score || null,

                status:
                    "Submitted"
            })
        );

    } catch (error) {

        console.warn(
            "Could not save submission result:",
            error
        );
    }
}


/* ============================================================
   REDIRECT TO SUBMISSION SUCCESS PAGE
   ============================================================ */

function redirectToResult(
    result
) {

    const params =
        new URLSearchParams();

    params.set(
        "examId",
        examState.examId
    );

    window.location.href =
        `submission-successful.html?${params.toString()}`;
}

/* ============================================================
   SUBMIT BUTTON STATE
   ============================================================ */

function setSubmitButtonState(
    loading
) {

    if (!DOM.submitButton) {

        return;
    }


    DOM.submitButton.disabled =
        loading;


    DOM.submitButton.classList.toggle(
        "loading",
        loading
    );


    const text =
        DOM.submitButton.querySelector(
            ".btn-text"
        );


    if (text) {

        text.textContent =
            loading
                ? "Submitting..."
                : "Submit Exam";
    }


    const icon =
        DOM.submitButton.querySelector(
            "i"
        );


    if (icon) {

        icon.className =
            loading
                ? "fa-solid fa-spinner fa-spin"
                : "fa-solid fa-paper-plane";
    }
}


/* ============================================================
   KEYBOARD NAVIGATION
   ============================================================ */

function handleKeyboardNavigation(
    event
) {

    const tag =
        event.target?.tagName;


    if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        event.target?.isContentEditable
    ) {

        return;
    }


    if (
        event.key ===
        "ArrowRight"
    ) {

        event.preventDefault();

        goToNextQuestion();
    }


    if (
        event.key ===
        "ArrowLeft"
    ) {

        event.preventDefault();

        goToPreviousQuestion();
    }
}


/* ============================================================
   BEFORE UNLOAD WARNING
   ============================================================ */

function handleBeforeUnload(
    event
) {

    if (
        examState.examStarted &&
        !examState.examSubmitted
    ) {

        event.preventDefault();

        event.returnValue =
            "Your examination is still in progress.";
    }
}


/* ============================================================
   SCROLL TO QUESTION
   ============================================================ */

function scrollToQuestion() {

    if (
        window.innerWidth <= 768
    ) {

        const questionCard =
            document.querySelector(
                ".question-card"
            );


        if (questionCard) {

            questionCard.scrollIntoView(
                {
                    behavior: "smooth",
                    block: "start",
                }
            );
        }
    }
}


/* ============================================================
   LOADING UI
   ============================================================ */

function setLoading(
    visible,
    message = "Loading..."
) {

    if (DOM.loading) {

        DOM.loading.style.display =
            visible
                ? "flex"
                : "none";
    }


    if (DOM.loadingText) {

        DOM.loadingText.textContent =
            message;
    }


    if (DOM.examContainer) {

        DOM.examContainer.style.visibility =
            visible
                ? "hidden"
                : "visible";
    }
}


/* ============================================================
   PAGE ERROR
   ============================================================ */

function showPageError(
    message
) {

    if (DOM.loading) {

        DOM.loading.style.display =
            "none";
    }


    if (DOM.examContainer) {

        DOM.examContainer.style.visibility =
            "visible";
    }


    if (DOM.errorMessage) {

        DOM.errorMessage.textContent =
            message;


        DOM.errorMessage.style.display =
            "block";


        return;
    }


    showToast(
        message,
        "danger"
    );
}


/* ============================================================
   TOAST SYSTEM
   ============================================================ */

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


    toast.innerHTML = `

        <div class="toast-icon">

            <i class="${getToastIcon(type)}"></i>

        </div>

        <div class="toast-message">

            ${escapeHTML(message)}

        </div>

        <button
            type="button"
            class="toast-close"
            aria-label="Close notification"
        >
            &times;
        </button>

    `;


    const close =
        toast.querySelector(
            ".toast-close"
        );


    close.addEventListener(
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


/* ============================================================
   TOAST ICON
   ============================================================ */

function getToastIcon(
    type
) {

    switch (type) {

        case "success":

            return "fa-solid fa-circle-check";


        case "warning":

            return "fa-solid fa-triangle-exclamation";


        case "danger":

            return "fa-solid fa-circle-exclamation";


        default:

            return "fa-solid fa-circle-info";
    }
}


/* ============================================================
   REMOVE TOAST
   ============================================================ */

function removeToast(
    toast
) {

    if (!toast) {

        return;
    }


    toast.classList.remove(
        "show"
    );


    setTimeout(
        () => {

            if (
                toast &&
                toast.parentNode
            ) {

                toast.remove();
            }

        },
        250
    );
}


/* ============================================================
   API ERROR HANDLING
   ============================================================ */

async function getAPIErrorMessage(
    response,
    fallback
) {

    try {

        const data =
            await response.json();


        if (
            typeof data ===
            "string"
        ) {

            return data;
        }


        return (
            data.detail ||
            data.message ||
            data.error ||
            data.non_field_errors?.[0] ||
            fallback
        );


    } catch (_) {

        return fallback;
    }
}


/* ============================================================
   AUTHENTICATION
   ============================================================ */

function getAuthToken() {

    return (

        localStorage.getItem(
            "access_token"
        ) ||

        localStorage.getItem(
            "accessToken"
        ) ||

        localStorage.getItem(
            "token"
        ) ||

        sessionStorage.getItem(
            "access_token"
        ) ||

        sessionStorage.getItem(
            "accessToken"
        ) ||

        sessionStorage.getItem(
            "token"
        ) ||

        null
    );
}


/* ============================================================
   AUTH HEADERS
   ============================================================ */

function getAuthHeaders() {

    const headers = {

        "Content-Type":
            "application/json",
    };


    const token =
        getAuthToken();


    if (token) {

        headers.Authorization =
            `Bearer ${token}`;
    }


    return headers;
}


/* ============================================================
   NUMBER CONVERSION
   ============================================================ */

function toNumber(value) {

    const number =
        Number(value);


    return Number.isFinite(
        number
    )
        ? number
        : 0;
}


/* ============================================================
   PAD TIME
   ============================================================ */

function pad(value) {

    return String(value)
        .padStart(2, "0");
}


/* ============================================================
   HTML ESCAPING
   ============================================================ */

function escapeHTML(value) {

    const element =
        document.createElement(
            "div"
        );


    element.textContent =
        String(value ?? "");


    return element.innerHTML;
}


/* ============================================================
   ATTRIBUTE ESCAPING
   ============================================================ */

function escapeAttribute(
    value
) {

    return String(value ?? "")

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        );
}


/* ============================================================
   PUBLIC EXAM CONTROLLER
   ============================================================ */

window.ExamProAttempt = {

    nextQuestion:
        goToNextQuestion,


    previousQuestion:
        goToPreviousQuestion,


    goToQuestion:
        goToQuestion,


    clearAnswer:
        clearCurrentAnswer,


    markForReview:
        toggleReviewQuestion,


    submit:
        () => submitExam(false),


    getCurrentQuestion:
        getCurrentQuestion,


    getState:
        () => ({

            examId:
                examState.examId,


            currentQuestion:
                examState.currentQuestionIndex + 1,


            totalQuestions:
                examState.questions.length,


            answers: {
                ...examState.answers,
            },


            markedQuestions:
                Array.from(
                    examState.markedQuestions
                ),


            timeRemaining:
                examState.timeRemaining,


            /*
             * Helpful for debugging/UI.
             */

            hasTimeLimit:
                hasTimeLimit(),


            duration:
                examState.exam?.duration ??
                null,
        }),
};


/* ============================================================
   END OF ATTEMPT-EXAM.JS
   ============================================================ */