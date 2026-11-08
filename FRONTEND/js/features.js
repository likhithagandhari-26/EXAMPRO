// ===============================
// NAVIGATION ACTIVE STATE
// ===============================

const navLinks = document.querySelectorAll(".nav-links a");

navLinks.forEach(link => {

    link.addEventListener("click", () => {

        navLinks.forEach(item =>
            item.classList.remove("active")
        );

        link.classList.add("active");

    });

});

// ===============================
// SMOOTH SCROLL
// ===============================

document.querySelectorAll('a[href^="#"]')
.forEach(anchor => {

    anchor.addEventListener("click", function(e){

        e.preventDefault();

        const target =
            document.querySelector(
                this.getAttribute("href")
            );

        if(target){

            target.scrollIntoView({
                behavior:"smooth",
                block:"start"
            });

        }

    });

});

// ===============================
// FEATURE CARD ANIMATION
// ===============================

const cards =
    document.querySelectorAll(".feature-card");

cards.forEach(card => {

    card.addEventListener("mouseenter", () => {

        card.style.transform =
            "translateY(-8px)";

    });

    card.addEventListener("mouseleave", () => {

        card.style.transform =
            "translateY(0px)";

    });

});

// ===============================
// SCROLL REVEAL ANIMATION
// ===============================

const revealElements =
    document.querySelectorAll(
        ".feature-card, .hero-content, .hero-image"
    );

const revealObserver =
new IntersectionObserver((entries)=>{

    entries.forEach(entry=>{

        if(entry.isIntersecting){

            entry.target.classList.add("show");

        }

    });

},{
    threshold:0.15
});

revealElements.forEach(element=>{

    revealObserver.observe(element);

});

// ===============================
// COUNTER ANIMATION (OPTIONAL)
// ===============================

function animateCounter(
    element,
    start,
    end,
    duration
){

    let startTime = null;

    function update(currentTime){

        if(!startTime)
            startTime = currentTime;

        const progress =
            Math.min(
                (currentTime - startTime) /
                duration,
                1
            );

        element.textContent =
            Math.floor(
                progress *
                (end - start)
                + start
            );

        if(progress < 1){

            requestAnimationFrame(update);

        }

    }

    requestAnimationFrame(update);

}

// Example

const counters =
document.querySelectorAll(".counter");

counters.forEach(counter => {

    animateCounter(
        counter,
        0,
        counter.dataset.target,
        2000
    );

});

// ===============================
// PAGE LOAD ANIMATION
// ===============================

window.addEventListener("load",()=>{

    document.body.classList.add("loaded");

});

// ===============================
// BACK TO TOP BUTTON
// ===============================

const backToTop =
document.querySelector(".back-to-top");

if(backToTop){

    window.addEventListener("scroll",()=>{

        if(window.scrollY > 400){

            backToTop.classList.add("visible");

        }else{

            backToTop.classList.remove("visible");

        }

    });

    backToTop.addEventListener("click",()=>{

        window.scrollTo({

            top:0,
            behavior:"smooth"

        });

    });

}