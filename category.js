document.addEventListener("DOMContentLoaded", () => {
    const key = document.body.dataset.category;
    const all = (window.ASSETS || []).filter(a => a.category === key);

    const grid = document.getElementById("category-grid");
    const countEl = document.getElementById("result-count");
    const sortEl = document.getElementById("sort-select");
    const filterEl = document.getElementById("filter-input");
    const section = document.querySelector(".category-products");

    const fmt = p => (p == null ? "—" : "$" + p.toFixed(2));
    const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

    function render() {
        const q = filterEl.value.trim().toLowerCase();
        let list = all.filter(a => (a.title + " " + a.author + " " + a.type + " " + (a.tags || "")).toLowerCase().includes(q));

        switch (sortEl.value) {
            case "price-asc":  list.sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9)); break;
            case "price-desc": list.sort((a, b) => (b.price ?? -1) - (a.price ?? -1)); break;
            case "name":       list.sort((a, b) => a.title.localeCompare(b.title)); break;
        }

        countEl.textContent = list.length + (list.length === 1 ? " ASSET" : " ASSETS");

        grid.innerHTML = list.length ? list.map(a => `
            <article class="asset-card">
                <div class="asset-image">
                    <a href="${esc(a.href)}" class="asset-image-link"><img src="${esc(a.img)}" alt="${esc(a.title)}" loading="lazy"></a>
                    ${a.badge ? `<span class="asset-badge">${esc(a.badge)}</span>` : ""}
                    <button class="wishlist" type="button" aria-label="Add to wishlist">♡</button>
                </div>
                <div class="asset-info">
                    <div class="asset-type">${esc(a.type.toUpperCase())}</div>
                    <h3><a href="${esc(a.href)}">${esc(a.title)}</a></h3>
                    <div class="asset-bottom"><span>${esc(a.meta)}</span><strong>${fmt(a.price)}</strong></div>
                </div>
            </article>`).join("")
            : `<div class="empty-state">Ничего не найдено</div>`;

        if (window.PolyCart && PolyCart.quickAdd) PolyCart.quickAdd();
    }

    grid.addEventListener("click", e => {
        const btn = e.target.closest(".wishlist");
        if (!btn) return;
        e.preventDefault();
        const saved = btn.classList.toggle("saved");
        btn.textContent = saved ? "♥" : "♡";
    });

    sortEl.addEventListener("change", render);
    filterEl.addEventListener("input", render);
    render();

    const io = new IntersectionObserver(entries => {
        entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("revealed"); io.unobserve(en.target); } });
    }, { threshold: .05 });
    io.observe(section);
});
