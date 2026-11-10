(function () {
    const cats = window.CATEGORIES || {};
    const assets = window.ASSETS || [];
    const current = document.body.dataset.category || "";

    const count = key => assets.filter(a => a.category === key).length;

    const links = Object.entries(cats).map(([key, c], i) => `
        <a href="${c.href}" class="cat-link${key === current ? " active" : ""}"${key === current ? ' aria-current="page"' : ""}>
            <span class="cat-num">0${i + 1}</span>
            <span class="cat-text"><strong>${c.title}</strong><small>${c.sub}</small></span>
            <span class="cat-count">${count(key)}</span>
            <span class="cat-arrow">→</span>
        </a>`).join("");

    document.body.insertAdjacentHTML("beforeend", `
        <button class="cat-tab" id="cat-tab" type="button" aria-label="Open categories" aria-expanded="false" aria-controls="cat-panel">
            <i>☰</i><span>Categories</span>
        </button>
        <div class="cat-overlay-bg" id="cat-bg"></div>
        <aside class="cat-panel" id="cat-panel" aria-label="Categories">
            <div class="cat-panel-head">
                <div><span>POLYMARKET</span><h2>Categories</h2></div>
                <button class="cat-close" id="cat-close" type="button" aria-label="Close categories">×</button>
            </div>
            <nav class="cat-list">${links}</nav>
            <div class="cat-panel-foot"><a href="shop.html">← BACK TO MARKETPLACE</a></div>
        </aside>`);

    const tab = document.getElementById("cat-tab");
    const bg = document.getElementById("cat-bg");
    const closeBtn = document.getElementById("cat-close");

    function setOpen(open) {
        document.body.classList.toggle("cat-open", open);
        tab.setAttribute("aria-expanded", open);
        (open ? closeBtn : tab).focus({ preventScroll: true });
    }

    tab.addEventListener("click", () => setOpen(true));
    bg.addEventListener("click", () => setOpen(false));
    closeBtn.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", e => {
        if (e.key === "Escape" && document.body.classList.contains("cat-open")) setOpen(false);
    });
})();
