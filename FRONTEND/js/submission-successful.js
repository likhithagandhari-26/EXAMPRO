/* =========================================================
   SUBMISSION SUCCESSFUL
   Exam Pro
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    initializeSubmissionPage();
});

/* =========================================================
   CONFIG
========================================================= */

const API = {
    examDetails:
        "http://127.0.0.1:8000/api/exams/submission-details/",

    studentProfile:
        "http://127.0.0.1:8000/api/student/profile/",

    notifications:
        "http://127.0.0.1:8000/api/student/notifications/count/",
};

/* =========================================================
   INITIALIZE
========================================================= */

async function initializeSubmissionPage() {
    try {
        showLoadingState();

        await Promise.all([
            loadSubmissionDetails(),
            loadStudentProfile(),
            loadNotificationCount(),
        ]);

        setupButtons();

        animateCards();
    } catch (error) {
        console.error(
            "Submission page initialization failed:",
            error
        );

        showErrorState(
            "Unable to load submission details."
        );
    }
}

/* =========================================================
   LOAD SUBMISSION DETAILS
========================================================= */

async function loadSubmissionDetails() {
    try {
        /*
         --------------------------------------------------
         PRIORITY 1:
         Get data passed from Attempt Exam page
         --------------------------------------------------
        */

        const storedSubmission =
            sessionStorage.getItem(
                "latestExamSubmission"
            );

        if (storedSubmission) {
            const submissionData =
                JSON.parse(storedSubmission);

            populateSubmissionData(
                submissionData
            );

            return;
        }

        /*
         --------------------------------------------------
         PRIORITY 2:
         Query parameter
         submission-successful.html?examId=123
         --------------------------------------------------
        */

        const params =
            new URLSearchParams(
                window.location.search
            );

        const examId =
            params.get("examId");

        if (!examId) {
            generateFallbackData();
            return;
        }

        /*
         --------------------------------------------------
         PRIORITY 3:
         Backend API
         --------------------------------------------------
        */

        const token =
            localStorage.getItem(
                "access_token"
            );

        const response =
            await fetch(
                `${API.examDetails}${examId}/`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

        if (!response.ok) {
            throw new Error(
                "Failed to fetch submission details"
            );
        }

        const data =
            await response.json();

        populateSubmissionData(data);
    } catch (error) {
        console.error(
            "Error loading submission:",
            error
        );

        generateFallbackData();
    }
}

/* =========================================================
   POPULATE PAGE
========================================================= */

function populateSubmissionData(data) {
    setText(
        "submissionReference",
        data.reference_number ||
            generateReferenceNumber()
    );

    setText(
        "examTitle",
        data.exam_title ||
            data.title ||
            "Exam Completed"
    );

    setText(
        "examId",
        data.exam_id ||
            data.id ||
            "-"
    );

    setText(
        "totalQuestions",
        data.total_questions || 0
    );

    setText(
        "answeredQuestions",
        data.answered_questions || 0
    );

    setText(
        "examDuration",
        formatDuration(
            data.duration_minutes
        )
    );

    setText(
        "submissionTime",
        formatDateTime(
            data.submitted_at ||
                new Date()
        )
    );

    updatePageTitle(
        data.exam_title ||
            data.title
    );
}

/* =========================================================
   STUDENT PROFILE
========================================================= */

async function loadStudentProfile() {
    try {
        const token =
            localStorage.getItem(
                "access_token"
            );

        if (!token) return;

        const response =
            await fetch(
                API.studentProfile,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

        if (!response.ok) return;

        const student =
            await response.json();

        const nameElement =
            document.getElementById(
                "studentName"
            );

        const avatarElement =
            document.getElementById(
                "studentAvatar"
            );

        if (nameElement) {
            nameElement.textContent =
                student.full_name ||
                student.name ||
                "Student";
        }

        if (
            avatarElement &&
            student.full_name
        ) {
            avatarElement.src =
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    student.full_name
                )}&background=2563eb&color=fff`;
        }
    } catch (error) {
        console.error(
            "Profile loading failed:",
            error
        );
    }
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

async function loadNotificationCount() {
    try {
        const badge =
            document.getElementById(
                "notificationCount"
            );

        if (!badge) return;

        const token =
            localStorage.getItem(
                "access_token"
            );

        const response =
            await fetch(
                API.notifications,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

        if (!response.ok) {
            badge.textContent = "0";
            return;
        }

        const data =
            await response.json();

        badge.textContent =
            data.count || 0;
    } catch (error) {
        console.error(
            "Notification error:",
            error
        );
    }
}

/* =========================================================
   BUTTONS
========================================================= */

function setupButtons() {
    const dashboardBtn =
        document.getElementById(
            "dashboardBtn"
        );

    const myExamsBtn =
        document.getElementById(
            "myExamsBtn"
        );

    const resultsBtn =
        document.getElementById(
            "resultsBtn"
        );

    if (dashboardBtn) {
        dashboardBtn.addEventListener(
            "click",
            () => {
                window.location.href =
                    "student-dashboard.html";
            }
        );
    }

    if (myExamsBtn) {
        myExamsBtn.addEventListener(
            "click",
            () => {
                window.location.href =
                    "my-exams.html";
            }
        );
    }

    if (resultsBtn) {
        resultsBtn.addEventListener(
            "click",
            () => {
                window.location.href =
                    "student-results.html";
            }
        );
    }
}

/* =========================================================
   ANIMATIONS
========================================================= */

function animateCards() {
    const cards =
        document.querySelectorAll(
            ".summary-card, .status-card, .next-steps-card"
        );

    cards.forEach(
        (card, index) => {
            card.style.opacity = "0";
            card.style.transform =
                "translateY(25px)";

            setTimeout(() => {
                card.style.transition =
                    "all 0.6s ease";

                card.style.opacity =
                    "1";

                card.style.transform =
                    "translateY(0)";
            }, index * 150);
        }
    );
}

/* =========================================================
   PAGE TITLE
========================================================= */

function updatePageTitle(
    examTitle
) {
    if (!examTitle) return;

    document.title =
        `${examTitle} Submitted | Exam Pro`;
}

/* =========================================================
   LOADING STATE
========================================================= */

function showLoadingState() {
    setText(
        "examTitle",
        "Loading..."
    );

    setText(
        "submissionReference",
        "Loading..."
    );
}

/* =========================================================
   ERROR STATE
========================================================= */

function showErrorState(
    message
) {
    console.error(message);

    setText(
        "examTitle",
        "Unable to load exam"
    );
}

/* =========================================================
   FALLBACK DATA
========================================================= */

function generateFallbackData() {
    const now = new Date();

    populateSubmissionData({
        reference_number:
            generateReferenceNumber(),

        exam_title:
            "Exam Successfully Submitted",

        exam_id: "-",

        total_questions: 0,

        answered_questions: 0,

        duration_minutes: 0,

        submitted_at: now,
    });
}

/* =========================================================
   HELPERS
========================================================= */

function setText(
    id,
    value
) {
    const element =
        document.getElementById(id);

    if (element) {
        element.textContent =
            value ?? "-";
    }
}

function formatDuration(
    minutes
) {
    if (
        !minutes ||
        isNaN(minutes)
    ) {
        return "-";
    }

    const hrs =
        Math.floor(minutes / 60);

    const mins =
        minutes % 60;

    if (hrs === 0) {
        return `${mins} mins`;
    }

    return `${hrs}h ${mins}m`;
}

function formatDateTime(
    value
) {
    const date =
        new Date(value);

    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",

            hour: "2-digit",
            minute: "2-digit",
        }
    );
}

function generateReferenceNumber() {
    const timestamp =
        Date.now()
            .toString()
            .slice(-8);

    return `REF-${timestamp}`;
}

/* =========================================================
   OPTIONAL:
   Called from Attempt Exam Page
========================================================= */

/*
Example before redirecting:

sessionStorage.setItem(
    "latestExamSubmission",
    JSON.stringify({
        reference_number:
            "REF-202608271200",

        exam_id: "EXM-101",

        exam_title:
            "Software Engineering",

        total_questions: 50,

        answered_questions: 48,

        duration_minutes: 90,

        submitted_at:
            new Date().toISOString()
    })
);

window.location.href =
    "submission-successful.html";
*/