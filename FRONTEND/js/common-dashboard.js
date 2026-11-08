/* ===================================
   API
=================================== */

const API = {
    profile: "http://localhost:8000/api/student/profile/"
};

/* ===================================
   DOM
=================================== */

const elements = {
    sidebar: document.getElementById("sidebar"),
    menuToggle: document.getElementById("menuToggle"),

    studentName: document.getElementById("studentName"),
    studentRole: document.getElementById("studentRole"),

    studentHeroName: document.getElementById("studentHeroName"),
    greetingText: document.getElementById("greetingText"),
    heroMessage: document.getElementById("heroMessage"),

    notificationCount:
        document.getElementById("notificationCount")
};

/* ===================================
   PROFILE
=================================== */

async function loadStudentProfile() {

    try {

        const response =
            await fetch(API.profile);

        if (!response.ok)
            throw new Error(response.status);

        const data =
            await response.json();

        if (elements.studentName)
            elements.studentName.textContent =
                data.name || "Student";

        if (elements.studentRole)
            elements.studentRole.textContent =
                data.role || "Student Account";

        if (elements.studentHeroName)
            elements.studentHeroName.textContent =
                data.name || "Student";

        if (elements.notificationCount)
            elements.notificationCount.textContent =
                data.notifications || 0;

    } catch (error) {

        console.error(
            "Profile load failed:",
            error
        );
    }
}

/* ===================================
   GREETING
=================================== */

function updateGreeting() {

    if (
        !elements.greetingText ||
        !elements.heroMessage
    ) return;

    const hour =
        new Date().getHours();

    let greeting = "";
    let message = "";

    if (hour < 12) {

        greeting = "Good Morning";
        message =
            "Ready to take your next examination?";

    } else if (hour < 17) {

        greeting = "Good Afternoon";
        message =
            "Keep up the great work and stay focused.";

    } else {

        greeting = "Good Evening";
        message =
            "Review your progress and prepare for upcoming exams.";
    }

    elements.greetingText.textContent =
        greeting;

    elements.heroMessage.textContent =
        message;
}

/* ===================================
   SIDEBAR
=================================== */

function toggleSidebar() {

    if (elements.sidebar) {

        elements.sidebar.classList.toggle(
            "collapsed"
        );
    }
}

/* ===================================
   PROFILE DROPDOWN
=================================== */

function initializeProfileDropdown() {

    const profileBtn =
        document.getElementById("profileBtn");

    const profileDropdown =
        document.getElementById("profileDropdown");

    if (!profileBtn || !profileDropdown)
        return;

    profileBtn.addEventListener(
        "click",
        (e) => {

            e.stopPropagation();

            profileDropdown.classList.toggle(
                "show"
            );

            profileBtn.classList.toggle(
                "active"
            );
        }
    );

    document.addEventListener(
        "click",
        () => {

            profileDropdown.classList.remove(
                "show"
            );

            profileBtn.classList.remove(
                "active"
            );
        }
    );
}

/* ===================================
   NOTIFICATION DROPDOWN
=================================== */

function initializeNotificationDropdown() {

    const notificationBtn =
        document.getElementById(
            "notificationBtn"
        );

    const notificationDropdown =
        document.getElementById(
            "notificationDropdown"
        );

    if (
        !notificationBtn ||
        !notificationDropdown
    ) return;

    notificationBtn.addEventListener(
        "click",
        (e) => {

            e.stopPropagation();

            notificationDropdown.classList.toggle(
                "show"
            );
        }
    );

    document.addEventListener(
        "click",
        () => {

            notificationDropdown.classList.remove(
                "show"
            );
        }
    );
}

/* ===================================
   EVENTS
=================================== */

function initializeEvents() {

    if (elements.menuToggle) {

        elements.menuToggle.addEventListener(
            "click",
            toggleSidebar
        );
    }

    initializeProfileDropdown();
    initializeNotificationDropdown();
}

/* ===================================
   INIT
=================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadStudentProfile();
        updateGreeting();
        initializeEvents();
    }
);