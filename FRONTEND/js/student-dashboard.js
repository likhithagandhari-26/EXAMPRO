document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // API ENDPOINTS
    // ==========================================

    const API = {
        students: "http://127.0.0.1:8000/api/students/",
        exams: "http://127.0.0.1:8000/api/exams/"
    };

    // ==========================================
    // AUTH CHECK
    // ==========================================

    const token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "auth333.html";
        return;
    }

    // ==========================================
    // SIDEBAR TOGGLE
    // ==========================================

    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");

    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", () => {
            sidebar.classList.toggle("collapsed");
        });
    }

    // ==========================================
    // PROFILE DROPDOWN
    // ==========================================

    const profileBtn = document.getElementById("profileBtn");
    const profileDropdown = document.getElementById("profileDropdown");

    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle("show");
        });
    }

    // ==========================================
    // NOTIFICATION DROPDOWN
    // ==========================================

    const notificationBtn =
        document.getElementById("notificationBtn");

    const notificationDropdown =
        document.getElementById("notificationDropdown");

    if (notificationBtn && notificationDropdown) {

        notificationBtn.addEventListener("click", (e) => {

            e.stopPropagation();

            notificationDropdown.classList.toggle("show");
        });
    }

    document.addEventListener("click", () => {

        profileDropdown?.classList.remove("show");

        notificationDropdown?.classList.remove("show");
    });

    // ==========================================
    // GREETING
    // ==========================================

    const hour = new Date().getHours();

    let greeting = "Good Evening";

    if (hour < 12) {
        greeting = "Good Morning";
    } else if (hour < 17) {
        greeting = "Good Afternoon";
    }

    const greetingText =
        document.getElementById("greetingText");

    if (greetingText) {
        greetingText.textContent = greeting;
    }

    // ==========================================
    // LOAD PROFILE
    // ==========================================

    async function loadProfile() {

        try {

            const response =
                await fetch(API.students);

            if (!response.ok) {
                throw new Error(
                    `HTTP Error ${response.status}`
                );
            }

            const data =
                await response.json();

            if (
                !data.students ||
                data.students.length === 0
            ) {
                return;
            }

            const student =
                data.students[0];

            const name =
                student.name || "Student";

            document.getElementById(
                "studentName"
            ).textContent = name;

            document.getElementById(
                "studentHeroName"
            ).textContent = name;

        } catch (error) {

            console.error(
                "Profile Error:",
                error
            );
        }
    }

    // ==========================================
    // LOAD EXAMS
    // ==========================================

    async function loadExams() {

        try {

            const response =
                await fetch(API.exams);

            if (!response.ok) {

                throw new Error(
                    `HTTP Error ${response.status}`
                );
            }

            const exams =
                await response.json();

            const tableBody =
                document.getElementById(
                    "examTableBody"
                );

            if (!tableBody) return;

            tableBody.innerHTML = "";

            // ======================
            // STATS
            // ======================

            let total =
                exams.length;

            let completed = 0;
            let pending = 0;

            const today =
                new Date();

            exams.forEach(exam => {

                const examDate =
                    new Date(exam.exam_date);

                if (
                    exam.status ===
                    "Completed"
                ) {

                    completed++;

                } else if (
                    examDate >= today
                ) {

                    pending++;
                }

                tableBody.innerHTML += `
                    <tr>

                        <td>
                            ${exam.title || "-"}
                        </td>

                        <td>
                            ${exam.exam_date || "-"}
                        </td>

                        <td>
                            ${exam.duration || 60} min
                        </td>

                        <td>
                            <span class="status-badge ${(
                                exam.status || ""
                            ).toLowerCase()}">
                                ${exam.status || "-"}
                            </span>
                        </td>

                        <td>

                            ${
                                exam.status === "Published"

                                ?

                                `<button class="details-btn"
                                    onclick="viewExam('${exam._id}')">
                                    Start
                                </button>`

                                :

                                `<span>-</span>`
                            }

                        </td>

                    </tr>
                `;
            });

            document.getElementById(
                "totalExams"
            ).textContent = total;

            document.getElementById(
                "completedExams"
            ).textContent = completed;

            document.getElementById(
                "pendingExams"
            ).textContent = pending;

            // Results API not available yet

            document.getElementById(
                "averageScore"
            ).textContent = "0%";

            // Empty chart placeholder

            createEmptyChart();

        } catch (error) {

            console.error(
                "Exam Error:",
                error
            );
        }
    }

    // ==========================================
    // EMPTY CHART
    // ==========================================

    function createEmptyChart() {

        const canvas =
            document.getElementById(
                "performanceChart"
            );

        if (!canvas) return;

        new Chart(canvas, {

            type: "line",

            data: {

                labels: ["No Data"],

                datasets: [

                    {
                        label: "Score",
                        data: [0]
                    }
                ]
            },

            options: {

                responsive: true,

                plugins: {

                    legend: {
                        display: false
                    }
                },

                scales: {

                    y: {

                        beginAtZero: true,

                        max: 100
                    }
                }
            }
        });
    }

    // ==========================================
    // NOTIFICATIONS
    // ==========================================

    const notificationCount =
        document.getElementById(
            "notificationCount"
        );

    if (notificationCount) {
        notificationCount.textContent = "0";
    }

    const activityContainer =
        document.getElementById(
            "activityContainer"
        );

    if (activityContainer) {

        activityContainer.innerHTML = `

            <div class="empty-state">

                <i class="fa-regular fa-clock"></i>

                <p>
                    No recent activity
                </p>

            </div>

        `;
    }

    // ==========================================
    // LOGOUT
    // ==========================================

    function logout(e) {

        e.preventDefault();

        localStorage.removeItem(
            "access_token"
        );

        localStorage.removeItem(
            "refresh_token"
        );

        localStorage.removeItem(
            "student_name"
        );

        localStorage.removeItem(
            "student_email"
        );

        window.location.href =
            "auth333.html";
    }

    document
        .getElementById("logoutBtn")
        ?.addEventListener(
            "click",
            logout
        );

    document
        .getElementById(
            "logoutDropdownBtn"
        )
        ?.addEventListener(
            "click",
            logout
        );

    // ==========================================
    // INITIAL LOAD
    // ==========================================

    loadProfile();
    loadExams();
});

// ==========================================
// START EXAM
// ==========================================

function viewExam(examId) {

    localStorage.setItem(
        "selected_exam_id",
        examId
    );

    window.location.href =
        "student-exam.html";
}