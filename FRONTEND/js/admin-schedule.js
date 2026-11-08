// ======================================
// EXAM PRO - ADMIN SCHEDULE
// Dynamic Schedule Management
// ======================================

const API_BASE =
    "http://127.0.0.1:8000/api/exams/";


// ======================================
// DOM ELEMENTS
// ======================================

const totalScheduledExams =
    document.getElementById(
        "totalScheduledExams"
    );

const upcomingExams =
    document.getElementById(
        "upcomingExams"
    );

const liveExams =
    document.getElementById(
        "liveExams"
    );

const completedExams =
    document.getElementById(
        "completedExams"
    );

const scheduleTableBody =
    document.getElementById(
        "scheduleTableBody"
    );

const calendarGrid =
    document.getElementById(
        "calendarGrid"
    );

const todayEvents =
    document.getElementById(
        "todayEvents"
    );


// ======================================
// GLOBAL DATA
// ======================================

let exams = [];


// ======================================
// CALENDAR STATE
// ======================================

const currentDate = new Date();

let currentMonth =
    currentDate.getMonth();

let currentYear =
    currentDate.getFullYear();


const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];


// ======================================
// INITIALIZATION
// ======================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        initializeCalendarControls();

        await loadScheduleData();

    }
);


// ======================================
// LOAD SCHEDULE DATA
// ======================================

async function loadScheduleData() {

    try {

        showTableLoading();

        const response =
            await fetch(API_BASE);

        if (!response.ok) {

            throw new Error(
                `Failed to load exams. Status: ${response.status}`
            );
        }


        const data =
            await response.json();


        /*
         * Supports both:
         *
         * [
         *   {...},
         *   {...}
         * ]
         *
         * and:
         *
         * {
         *   results: [...]
         * }
         */

        if (Array.isArray(data)) {

            exams = data;

        }
        else if (
            data &&
            Array.isArray(data.results)
        ) {

            exams = data.results;

        }
        else {

            exams = [];

        }


        console.log(
            "Loaded Exams:",
            exams
        );


        updateStatistics();

        renderUpcomingTable();

        renderCalendar();

        renderTodayEvents();

    }
    catch (error) {

        console.error(
            "Schedule loading error:",
            error
        );


        showTableError(
            "Unable to load exam schedule."
        );


        updateStatistics();

        if (calendarGrid) {

            calendarGrid.innerHTML = `
                <div class="calendar-error">
                    Unable to load calendar data.
                </div>
            `;
        }


        if (todayEvents) {

            todayEvents.innerHTML = `
                <div class="event-card">
                    <div class="event-content">
                        <h4>
                            Unable to load exams
                        </h4>

                        <p>
                            Please try again later.
                        </p>
                    </div>
                </div>
            `;
        }

    }
}


// ======================================
// CALENDAR CONTROLS
// ======================================

function initializeCalendarControls() {

    const prevBtn =
        document.getElementById(
            "prevMonth"
        );

    const nextBtn =
        document.getElementById(
            "nextMonth"
        );

    const todayBtn =
        document.getElementById(
            "todayBtn"
        );


    // Previous month
    if (prevBtn) {

        prevBtn.onclick = () => {

            currentMonth--;

            if (currentMonth < 0) {

                currentMonth = 11;

                currentYear--;

            }

            renderCalendar();

        };
    }


    // Next month
    if (nextBtn) {

        nextBtn.onclick = () => {

            currentMonth++;

            if (currentMonth > 11) {

                currentMonth = 0;

                currentYear++;

            }

            renderCalendar();

        };
    }


    // Return to current month
    if (todayBtn) {

        todayBtn.onclick = () => {

            const today =
                new Date();

            currentMonth =
                today.getMonth();

            currentYear =
                today.getFullYear();

            renderCalendar();

        };
    }
}


// ======================================
// STATISTICS
// ======================================

function updateStatistics() {

    let upcoming = 0;

    let live = 0;

    let completed = 0;


    exams.forEach(
        exam => {

            const status =
                getExamStatus(exam);


            if (
                status.key === "upcoming"
            ) {

                upcoming++;

            }
            else if (
                status.key === "live"
            ) {

                live++;

            }
            else if (
                status.key === "completed"
            ) {

                completed++;

            }

        }
    );


    if (totalScheduledExams) {

        totalScheduledExams.textContent =
            exams.length;

    }


    if (upcomingExams) {

        upcomingExams.textContent =
            upcoming;

    }


    if (liveExams) {

        liveExams.textContent =
            live;

    }


    if (completedExams) {

        completedExams.textContent =
            completed;

    }
}


// ======================================
// SCHEDULE TABLE
// ======================================

function renderUpcomingTable() {

    if (!scheduleTableBody) {
        return;
    }


    scheduleTableBody.innerHTML = "";


    if (
        !Array.isArray(exams) ||
        exams.length === 0
    ) {

        scheduleTableBody.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="empty-row"
                >
                    No exams scheduled.
                </td>
            </tr>
        `;

        return;
    }


    // Sort exams by date and time
    const sortedExams =
        [...exams].sort(
            (a, b) => {

                const dateA =
                    getExamDateTime(a);

                const dateB =
                    getExamDateTime(b);

                return dateA - dateB;

            }
        );


    sortedExams.forEach(
        (exam, index) => {

            const status =
                getExamStatus(exam);


            const row =
                document.createElement(
                    "tr"
                );


            const examId =
                exam._id ||
                exam.id ||
                "";


            const title =
                exam.title ||
                "Untitled Exam";


            const subject =
                exam.subject ||
                "—";


            const date =
                formatDate(
                    exam.exam_date
                );


            const time =
                formatExamTime(
                    exam
                );


            const duration =
                exam.duration !== null &&
                exam.duration !== undefined &&
                exam.duration !== ""
                    ? `${exam.duration} min`
                    : "—";


            /*
             * This should be total_marks.
             *
             * Your previous code was using
             * total_students in this column.
             */
            const totalMarks =
                exam.total_marks !== null &&
                exam.total_marks !== undefined &&
                exam.total_marks !== ""
                    ? exam.total_marks
                    : "—";


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>


                <td>
                    <strong>
                        ${escapeHTML(title)}
                    </strong>
                </td>


                <td>
                    ${escapeHTML(subject)}
                </td>


                <td>
                    ${date}
                </td>


                <td>
                    ${time}
                </td>


                <td>
                    ${duration}
                </td>


                <td>
                    ${totalMarks}
                </td>


                <td>
                    <span
                        class="status ${status.className}"
                    >
                        ${status.text}
                    </span>
                </td>


                <td class="action-buttons">

                    <button
                        type="button"
                        onclick="viewExam('${examId}')"
                        title="View Exam"
                        aria-label="View Exam"
                    >
                        <i
                            class="fa-solid fa-eye"
                        ></i>
                    </button>


                    <button
                        type="button"
                        onclick="editExam('${examId}')"
                        title="Edit Exam"
                        aria-label="Edit Exam"
                    >
                        <i
                            class="fa-solid fa-pen"
                        ></i>
                    </button>


                    <button
                        type="button"
                        onclick="deleteExam('${examId}')"
                        title="Delete Exam"
                        aria-label="Delete Exam"
                    >
                        <i
                            class="fa-solid fa-trash"
                        ></i>
                    </button>

                </td>

            `;


            scheduleTableBody.appendChild(
                row
            );

        }
    );
}


// ======================================
// CALENDAR
// ======================================

function renderCalendar() {

    if (!calendarGrid) {
        return;
    }


    calendarGrid.innerHTML = "";


    const today =
        new Date();


    const year =
        currentYear;


    const month =
        currentMonth;


    // Calendar title
    const monthTitle =
        document.getElementById(
            "calendarMonthYear"
        );


    if (monthTitle) {

        monthTitle.textContent =
            `${monthNames[month]} ${year}`;

    }


    // First day of month
    const firstDay =
        new Date(
            year,
            month,
            1
        ).getDay();


    // Number of days
    const totalDays =
        new Date(
            year,
            month + 1,
            0
        ).getDate();


    // Empty cells before first day
    for (
        let i = 0;
        i < firstDay;
        i++
    ) {

        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "calendar-empty";

        calendarGrid.appendChild(
            empty
        );
    }


    // Calendar days
    for (
        let day = 1;
        day <= totalDays;
        day++
    ) {

        const cell =
            document.createElement(
                "div"
            );


        cell.className =
            "calendar-day";


        const dateKey =
            formatCalendarDate(
                year,
                month,
                day
            );


        /*
         * Compare dates using a
         * normalized date key instead
         * of startsWith().
         */

        const dayExams =
            exams.filter(
                exam =>
                    getExamDateKey(
                        exam.exam_date
                    ) === dateKey
            );


        // Has exams
        if (
            dayExams.length > 0
        ) {

            cell.classList.add(
                "exam"
            );

        }


        // Today
        if (
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        ) {

            cell.classList.add(
                "today"
            );

        }


        // Exam events
        let eventHtml = "";


        if (
            dayExams.length > 0
        ) {

            eventHtml =
                dayExams
                    .slice(0, 2)
                    .map(
                        exam => `

                            <div
                                class="day-event"
                                title="${escapeHTML(
                                    exam.title ||
                                    "Exam"
                                )}"
                            >
                                ${escapeHTML(
                                    exam.title ||
                                    "Exam"
                                )}
                            </div>

                        `
                    )
                    .join("");


            if (
                dayExams.length > 2
            ) {

                eventHtml += `

                    <div class="day-event more-events">
                        +${dayExams.length - 2} more
                    </div>

                `;

            }
        }


        cell.innerHTML = `

            <div class="day-number">
                ${day}
            </div>

            ${eventHtml}

        `;


        /*
         * Optional click behaviour:
         * clicking a date with exams
         * can show those exams.
         */

        if (
            dayExams.length > 0
        ) {

            cell.style.cursor =
                "pointer";

            cell.addEventListener(
                "click",
                () => {

                    showCalendarDayExams(
                        dayExams,
                        dateKey
                    );

                }
            );

        }


        calendarGrid.appendChild(
            cell
        );

    }
}


// ======================================
// TODAY EVENTS
// ======================================

function renderTodayEvents() {

    if (!todayEvents) {
        return;
    }


    todayEvents.innerHTML = "";


    const todayKey =
        getTodayDateKey();


    const todaysExams =
        exams.filter(
            exam =>
                getExamDateKey(
                    exam.exam_date
                ) === todayKey
        );


    if (
        todaysExams.length === 0
    ) {

        todayEvents.innerHTML = `

            <div class="event-card">

                <div class="event-icon">
                    <i
                        class="fa-solid fa-calendar-check"
                    ></i>
                </div>


                <div class="event-content">

                    <h4>
                        No Exams Today
                    </h4>

                    <p>
                        No exams are scheduled for today.
                    </p>

                </div>

            </div>

        `;

        return;
    }


    // Sort today's exams by time
    todaysExams.sort(
        (a, b) =>
            getExamDateTime(a) -
            getExamDateTime(b)
    );


    todaysExams.forEach(
        exam => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "event-card";


            const status =
                getExamStatus(exam);


            card.innerHTML = `

                <div class="event-icon">

                    <i
                        class="fa-solid fa-book"
                    ></i>

                </div>


                <div class="event-content">

                    <h4>
                        ${escapeHTML(
                            exam.title ||
                            "Untitled Exam"
                        )}
                    </h4>


                    <p>
                        ${formatExamTime(exam)}
                    </p>


                    <span>
                        ${escapeHTML(
                            exam.subject ||
                            "Exam"
                        )}
                    </span>

                </div>


                <span
                    class="status ${status.className}"
                >
                    ${status.text}
                </span>

            `;


            todayEvents.appendChild(
                card
            );

        }
    );
}


// ======================================
// CALENDAR DAY DETAILS
// ======================================

function showCalendarDayExams(
    dayExams,
    dateKey
) {

    if (
        !dayExams ||
        dayExams.length === 0
    ) {
        return;
    }


    const date =
        new Date(
            `${dateKey}T00:00:00`
        );


    const formattedDate =
        date.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "long",
                year: "numeric"
            }
        );


    const examNames =
        dayExams
            .map(
                exam =>
                    `${exam.title || "Untitled Exam"}`
            )
            .join("\n");


    alert(
        `Exams on ${formattedDate}:\n\n${examNames}`
    );
}


// ======================================
// EXAM STATUS
// ======================================

function getExamStatus(exam) {

    if (!exam) {

        return {
            key: "upcoming",
            text: "Upcoming",
            className: "upcoming"
        };

    }


    /*
     * Respect explicit Draft status.
     */

    if (
        String(exam.status || "")
            .toLowerCase() === "draft"
    ) {

        return {
            key: "draft",
            text: "Draft",
            className: "draft"
        };

    }


    const startTime =
        getExamDateTime(exam);


    if (
        isNaN(startTime.getTime())
    ) {

        return {
            key: "upcoming",
            text: "Upcoming",
            className: "upcoming"
        };

    }


    const now =
        new Date();


    const duration =
        Number(exam.duration) || 60;


    const endTime =
        new Date(
            startTime.getTime() +
            duration * 60 * 1000
        );


    /*
     * Before exam start
     */
    if (
        now < startTime
    ) {

        return {
            key: "upcoming",
            text: "Upcoming",
            className: "upcoming"
        };

    }


    /*
     * During exam
     */
    if (
        now >= startTime &&
        now <= endTime
    ) {

        return {
            key: "live",
            text: "Live",
            className: "live"
        };

    }


    /*
     * After exam end
     */
    return {
        key: "completed",
        text: "Completed",
        className: "completed"
    };
}


// ======================================
// GET EXAM DATE + TIME
// ======================================

function getExamDateTime(exam) {

    if (!exam) {
        return new Date(NaN);
    }


    /*
     * Preferred:
     *
     * exam_date contains complete
     * ISO date/time.
     */

    if (
        exam.exam_date &&
        !exam.exam_time
    ) {

        return new Date(
            exam.exam_date
        );

    }


    /*
     * If date and time are stored
     * separately:
     *
     * exam_date = 2026-08-21
     * exam_time = 10:00 AM
     */

    if (
        exam.exam_date &&
        exam.exam_time
    ) {

        const date =
            getExamDateKey(
                exam.exam_date
            );


        const time =
            convertTo24Hour(
                exam.exam_time
            );


        if (date && time) {

            return new Date(
                `${date}T${time}`
            );

        }

    }


    return new Date(
        exam.exam_date
    );
}


// ======================================
// FORMAT EXAM TIME
// ======================================

function formatExamTime(exam) {

    if (!exam) {
        return "—";
    }


    /*
     * If backend provides
     * separate exam_time.
     */

    if (
        exam.exam_time
    ) {

        return exam.exam_time;
    }


    /*
     * Otherwise extract time
     * from exam_date.
     */

    if (
        exam.exam_date
    ) {

        const date =
            new Date(
                exam.exam_date
            );


        if (
            !isNaN(
                date.getTime()
            )
        ) {

            return date.toLocaleTimeString(
                "en-IN",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                }
            );

        }
    }


    return "—";
}


// ======================================
// FORMAT DATE
// ======================================

function formatDate(
    dateString
) {

    if (!dateString) {
        return "—";
    }


    const date =
        new Date(
            dateString
        );


    if (
        isNaN(
            date.getTime()
        )
    ) {

        return "—";
    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


// ======================================
// GET DATE KEY
// ======================================

function getExamDateKey(
    dateValue
) {

    if (!dateValue) {
        return "";
    }


    /*
     * If date is already
     * YYYY-MM-DD, use it.
     */

    if (
        typeof dateValue === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(
            dateValue
        )
    ) {

        return dateValue;
    }


    const date =
        new Date(
            dateValue
        );


    if (
        isNaN(
            date.getTime()
        )
    ) {

        return "";
    }


    /*
     * Use local date rather than
     * UTC date so India timezone
     * does not shift the calendar day.
     */

    return `${date.getFullYear()}-${String(
        date.getMonth() + 1
    ).padStart(2, "0")}-${String(
        date.getDate()
    ).padStart(2, "0")}`;
}


// ======================================
// TODAY DATE KEY
// ======================================

function getTodayDateKey() {

    const today =
        new Date();


    return formatCalendarDate(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );
}


// ======================================
// CALENDAR DATE
// ======================================

function formatCalendarDate(
    year,
    month,
    day
) {

    return `${year}-${String(
        month + 1
    ).padStart(
        2,
        "0"
    )}-${String(
        day
    ).padStart(
        2,
        "0"
    )}`;
}


// ======================================
// CONVERT 12-HOUR TIME TO 24-HOUR
// ======================================

function convertTo24Hour(
    timeString
) {

    if (!timeString) {
        return "";
    }


    const value =
        String(
            timeString
        )
            .trim()
            .toUpperCase();


    /*
     * Already HH:MM
     */

    if (
        /^\d{1,2}:\d{2}$/.test(
            value
        )
    ) {

        const [
            hours,
            minutes
        ] =
            value.split(":");


        return `${String(
            hours
        ).padStart(
            2,
            "0"
        )}:${minutes}`;
    }


    /*
     * 12-hour format:
     * 10:00 AM
     * 2:30 PM
     */

    const match =
        value.match(
            /^(\d{1,2}):(\d{2})\s*(AM|PM)$/
        );


    if (!match) {
        return "";
    }


    let hours =
        Number(
            match[1]
        );


    const minutes =
        match[2];


    const period =
        match[3];


    if (
        period === "AM" &&
        hours === 12
    ) {

        hours = 0;

    }


    if (
        period === "PM" &&
        hours !== 12
    ) {

        hours += 12;

    }


    return `${String(
        hours
    ).padStart(
        2,
        "0"
    )}:${minutes}`;
}


// ======================================
// VIEW EXAM
// ======================================

window.viewExam =
function (id) {

    if (!id) {

        alert(
            "Exam ID is missing."
        );

        return;
    }


    window.location.href =
        `manage-exams.html?id=${encodeURIComponent(id)}`;
};


// ======================================
// EDIT EXAM
// ======================================

window.editExam =
function (id) {

    if (!id) {

        alert(
            "Exam ID is missing."
        );

        return;
    }


    window.location.href =
        `create-exam.html?exam_id=${encodeURIComponent(id)}`;
};


// ======================================
// DELETE EXAM
// ======================================

window.deleteExam =
async function (id) {

    if (!id) {

        alert(
            "Exam ID is missing."
        );

        return;
    }


    const exam =
        exams.find(
            item =>
                String(
                    item._id ||
                    item.id
                ) === String(id)
        );


    const examName =
        exam?.title ||
        "this exam";


    const confirmed =
        confirm(
            `Are you sure you want to delete "${examName}"?\n\nThis action cannot be undone.`
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}${encodeURIComponent(id)}/`,
                {
                    method: "DELETE"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Delete failed. Status: ${response.status}`
            );
        }


        /*
         * Remove deleted exam from
         * local array immediately.
         */

        exams =
            exams.filter(
                item =>
                    String(
                        item._id ||
                        item.id
                    ) !== String(id)
            );


        /*
         * Refresh all sections
         * without another API request.
         */

        updateStatistics();

        renderUpcomingTable();

        renderCalendar();

        renderTodayEvents();


        alert(
            "Exam deleted successfully."
        );

    }
    catch (error) {

        console.error(
            "Delete exam error:",
            error
        );


        alert(
            "Unable to delete the exam. Please try again."
        );

    }
};


// ======================================
// REFRESH SCHEDULE
// ======================================

window.refreshSchedule =
async function () {

    await loadScheduleData();

};


// ======================================
// TABLE LOADING STATE
// ======================================

function showTableLoading() {

    if (!scheduleTableBody) {
        return;
    }


    scheduleTableBody.innerHTML = `

        <tr>

            <td
                colspan="9"
                class="loading-row"
            >
                <i
                    class="fa-solid fa-spinner fa-spin"
                ></i>

                Loading exam schedule...

            </td>

        </tr>

    `;
}


// ======================================
// TABLE ERROR STATE
// ======================================

function showTableError(
    message
) {

    if (!scheduleTableBody) {
        return;
    }


    scheduleTableBody.innerHTML = `

        <tr>

            <td
                colspan="9"
                class="empty-row"
            >
                ${escapeHTML(message)}
            </td>

        </tr>

    `;
}


// ======================================
// ESCAPE HTML
// ======================================

function escapeHTML(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        String(value);


    return div.innerHTML;
}