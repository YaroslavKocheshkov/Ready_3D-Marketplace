(function () {
    function init() {
        const header = document.querySelector(".site-header");
        const progress = document.querySelector(".scroll-progress");

        if (!header && !progress) return;

        function update() {
            const scrolled = window.scrollY;

            if (header) {
                header.classList.toggle("is-scrolled", scrolled > 30);
            }

            if (progress) {
                const max = document.documentElement.scrollHeight - window.innerHeight;
                progress.style.width = (max > 0 ? (scrolled / max) * 100 : 0) + "%";
            }
        }

        window.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        update();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
