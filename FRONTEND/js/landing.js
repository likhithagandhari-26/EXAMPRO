document.addEventListener("DOMContentLoaded", () => {

    // ===== Feature cards: lift on hover / keyboard focus =====
    const cards = document.querySelectorAll(".card");

    cards.forEach((card) => {
        // make sure the lift animates smoothly even if the CSS has no transition
        card.style.transition = "transform 0.25s ease";

        const lift = () => { card.style.transform = "translateY(-8px)"; };
        const drop = () => { card.style.transform = "translateY(0)"; };

        card.addEventListener("mouseenter", lift);
        card.addEventListener("mouseleave", drop);
        card.addEventListener("focusin", lift);
        card.addEventListener("focusout", drop);
    });

    // ===== Smooth scroll for in-page links (e.g. "Learn More" -> #features) =====
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener("click", (e) => {
            const id = link.getAttribute("href");

            // ignore empty anchors like href="#"
            if (id.length < 2) return;

            const target = document.querySelector(id);
            if (!target) return;

            e.preventDefault();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

});