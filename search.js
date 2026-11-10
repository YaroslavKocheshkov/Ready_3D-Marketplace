(() => {
    'use strict';

    const TYPES = {
        model: '3D Model',
        material: 'Material',
        environment: 'Environment',
        texture: 'Textures',
        learn: 'Learn'
    };

    const KIND = { models: 'model', materials: 'material', environments: 'environment', textures: 'texture' };

    const CATALOG = [
        ...(window.ASSETS || []).map(a => ({
            t: a.title, type: KIND[a.category], cat: a.type, price: a.price,
            url: a.href, img: a.img, pop: a.pop, tags: a.tags || '', desc: a.desc || ''
        })),
        ...(window.LEARN || []).map(l => ({ ...l, type: 'learn' }))
    ];

    const CHIPS = [
        ['all', 'All'], ['model', 'Models'], ['material', 'Materials'],
        ['environment', 'Environments'], ['learn', 'Learn']
    ];

    const SUGGESTIONS = ['forest', 'truck', 'concrete', 'hotkeys', 'лес', 'render'];

    const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    CATALOG.forEach(it => {
        it._title = norm(it.t);
        it._tw = it._title.split(/[\s\-]+/);
        it._tags = norm(it.tags);
        it._gw = it._tags.split(/\s+/);
        it._meta = norm(TYPES[it.type] + ' ' + it.cat);
        it._desc = norm(it.desc);
    });

    function lev(a, b) {
        if (Math.abs(a.length - b.length) > 1) return 2;
        let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
        for (let i = 1; i <= a.length; i++) {
            const cur = [i];
            for (let j = 1; j <= b.length; j++) {
                cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
            }
            prev = cur;
        }
        return prev[b.length];
    }

    function score(it, tokens) {
        let total = 0;
        for (const tok of tokens) {
            let s = 0;
            if (it._title.startsWith(tok)) s = 12;
            else if (it._tw.some(w => w.startsWith(tok))) s = 10;
            else if (it._title.includes(tok)) s = 7;
            else if (it._gw.some(w => w.startsWith(tok))) s = 6;
            else if (it._tags.includes(tok)) s = 4;
            else if (it._meta.includes(tok)) s = 3;
            else if (it._desc.includes(tok)) s = 1;
            else if (tok.length >= 4 && [...it._tw, ...it._gw].some(w => lev(w, tok) <= 1)) s = 2;
            if (!s) return 0;
            total += s;
        }
        return total + (it.pop ? 0.5 : 0);
    }

    const inChip = (it, chip) =>
        chip === 'all' || it.type === chip || (chip === 'material' && it.type === 'texture');

    function search(query, chip) {
        const tokens = norm(query).split(/\s+/).filter(Boolean);
        const pool = CATALOG.filter(it => inChip(it, chip));
        if (!tokens.length) {
            return [...pool].sort((a, b) => (b.pop || 0) - (a.pop || 0)).slice(0, 6);
        }
        return pool
            .map(it => ({ it, s: score(it, tokens) }))
            .filter(x => x.s > 0)
            .sort((a, b) => b.s - a.s || a.it.t.localeCompare(b.it.t))
            .map(x => x.it);
    }

    let root, input, results, count, chipsEl, closeBtn;
    let chip = 'all', active = 0, lastFocus = null, current = [];

    function highlight(text, query) {
        const words = query.trim().split(/\s+/).filter(Boolean);
        if (!words.length) return esc(text);
        const re = new RegExp('(' + words.map(rx).join('|') + ')', 'gi');
        return text.split(re).map((p, i) => (i % 2 ? '<mark>' + esc(p) + '</mark>' : esc(p))).join('');
    }

    function itemHTML(it, i, q) {
        const price = typeof it.price === 'number' ? '$' + it.price.toFixed(2) : '';
        const thumb = it.img
            ? `<img src="${esc(it.img)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`
            : '<span class="pm-item__ico" aria-hidden="true">⌘</span>';
        return `<a class="pm-item${i === active ? ' is-active' : ''}" role="option" data-i="${i}" href="${esc(it.url)}">
            <span class="pm-item__thumb">${thumb}</span>
            <span class="pm-item__body">
                <strong>${highlight(it.t, q)}</strong>
                <small>${esc(TYPES[it.type])} · ${esc(it.cat)}</small>
            </span>
            <span class="pm-item__price">${price}</span>
        </a>`;
    }

    function render() {
        const q = input.value;
        current = search(q, chip);
        if (active >= current.length) active = 0;

        if (!current.length) {
            results.innerHTML = `<div class="pm-empty">
                <p>Nothing found for “${esc(q.trim())}”.</p>
                <span>Try one of these:</span>
                <div class="pm-suggest">${SUGGESTIONS.map(s => `<button type="button" data-suggest="${esc(s)}">${esc(s)}</button>`).join('')}</div>
            </div>`;
            count.textContent = '0 results';
            return;
        }

        const label = q.trim() ? '' : '<div class="pm-label">Popular</div>';
        results.innerHTML = label + current.map((it, i) => itemHTML(it, i, q)).join('');
        count.textContent = q.trim() ? current.length + (current.length === 1 ? ' result' : ' results') : '';
    }

    function setActive(i, scroll) {
        const items = results.querySelectorAll('.pm-item');
        if (!items.length) return;
        active = (i + items.length) % items.length;
        items.forEach((el, k) => el.classList.toggle('is-active', k === active));
        if (scroll) items[active].scrollIntoView({ block: 'nearest' });
    }

    function open(value = '') {
        if (!root) return;
        closeCart();
        lastFocus = document.activeElement;
        input.value = value;
        chip = 'all';
        active = 0;
        chipsEl.querySelectorAll('button').forEach(b => b.classList.toggle('is-on', b.dataset.chip === 'all'));
        render();
        root.classList.add('is-open');
        root.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        setTimeout(() => { input.focus(); input.select(); }, 40);
    }

    function close() {
        if (!root || !root.classList.contains('is-open')) return;
        root.classList.remove('is-open');
        root.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function build() {
        root = document.createElement('div');
        root.className = 'pm-search';
        root.id = 'pm-search';
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-modal', 'true');
        root.setAttribute('aria-label', 'Search PolyMarket');
        root.setAttribute('aria-hidden', 'true');
        root.innerHTML = `
            <div class="pm-search__panel">
                <div class="pm-search__bar">
                    <span class="pm-search__icon" aria-hidden="true"></span>
                    <input type="search" id="pm-search-input" placeholder="Search models, materials, guides…" autocomplete="off" spellcheck="false" aria-label="Search">
                    <button type="button" class="pm-search__close" aria-label="Close search">Esc</button>
                </div>
                <div class="pm-search__chips">${CHIPS.map(([k, l]) => `<button type="button" data-chip="${k}" class="${k === 'all' ? 'is-on' : ''}">${l}</button>`).join('')}</div>
                <div class="pm-search__results" role="listbox" aria-live="polite"></div>
                <div class="pm-search__foot"><span>↑ ↓ to move · Enter to open</span><span class="pm-count"></span></div>
            </div>`;
        document.body.appendChild(root);

        input = root.querySelector('input');
        results = root.querySelector('.pm-search__results');
        count = root.querySelector('.pm-count');
        chipsEl = root.querySelector('.pm-search__chips');
        closeBtn = root.querySelector('.pm-search__close');

        input.addEventListener('input', () => { active = 0; render(); });

        input.addEventListener('keydown', e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1, true); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1, true); }
            else if (e.key === 'Enter') {
                const el = results.querySelector('.pm-item.is-active');
                if (el) { e.preventDefault(); location.href = el.getAttribute('href'); }
            }
        });

        chipsEl.addEventListener('click', e => {
            const b = e.target.closest('button[data-chip]');
            if (!b) return;
            chip = b.dataset.chip;
            active = 0;
            chipsEl.querySelectorAll('button').forEach(x => x.classList.toggle('is-on', x === b));
            render();
            input.focus();
        });

        results.addEventListener('click', e => {
            const s = e.target.closest('[data-suggest]');
            if (s) { input.value = s.dataset.suggest; active = 0; render(); input.focus(); }
        });

        results.addEventListener('mousemove', e => {
            const el = e.target.closest('.pm-item');
            if (el && Number(el.dataset.i) !== active) setActive(Number(el.dataset.i), false);
        });

        closeBtn.addEventListener('click', close);
        root.addEventListener('mousedown', e => { if (e.target === root) close(); });

        root.addEventListener('keydown', e => {
            if (e.key !== 'Tab') return;
            const f = [...root.querySelectorAll('input, button')].filter(x => x.offsetParent !== null);
            if (!f.length) return;
            const first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        });
    }

    const TRIGGERS = '.search-button, #open-search, #header-search, [data-search-open], #hero-search-button';

    document.addEventListener('click', e => {
        if (e.target.closest('.cart, [data-cart-open]')) {
            e.preventDefault();
            e.stopImmediatePropagation();
            openCart();
            return;
        }
        const t = e.target.closest(TRIGGERS);
        if (!t) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        const heroInput = document.getElementById('hero-search-input');
        open(t.id === 'hero-search-button' && heroInput ? heroInput.value : '');
    }, true);

    document.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target && e.target.id === 'hero-search-input') {
            e.preventDefault();
            e.stopImmediatePropagation();
            open(e.target.value);
            return;
        }
        if (e.key === 'Escape') { close(); closeCart(); return; }

        const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName) || (e.target && e.target.isContentEditable);
        if ((e.key === '/' && !typing && !e.ctrlKey && !e.metaKey) ||
            ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
            e.preventDefault();
            open('');
        }
    }, true);

    const CART_KEY = 'polymarket-cart';
    const money = n => '$' + Number(n).toFixed(2);
    const parsePrice = s => { const m = String(s || '').replace(',', '.').match(/\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : 0; };
    const fileOf = u => String(u || '').split(/[?#]/)[0].split('/').pop();
    let cartRoot, cartList, cartLast, noticeTimer, toastEl, toastTimer;

    const store = {
        read() { try { const a = JSON.parse(localStorage.getItem(CART_KEY)); return Array.isArray(a) ? a : []; } catch (_) { return []; } },
        write(a) { try { localStorage.setItem(CART_KEY, JSON.stringify(a)); } catch (_) {} }
    };

    function pageItem() {
        const h1 = document.querySelector('.title-block h1');
        const price = document.getElementById('price-display');
        if (!h1 || !price) return null;
        const lic = document.getElementById('license-name');
        const img = document.getElementById('main-product-image');
        const id = fileOf(location.pathname) || 'product';
        return {
            id, url: id,
            title: h1.textContent.trim(),
            license: lic ? lic.textContent.trim() : 'Standard License',
            price: parsePrice(price.textContent),
            opts: [...document.querySelectorAll('.license-option')].map(b => ({ name: b.dataset.name, price: parseFloat(b.dataset.price) })),
            img: img ? img.getAttribute('src') : ''
        };
    }

    function cardItem(box) {
        const card = box.closest('.asset-card, .small-asset');
        const link = box.querySelector('a[href]');
        const title = card && card.querySelector('h3');
        const priceEl = card && card.querySelector('.asset-bottom strong, .small-info p');
        const img = box.querySelector('img');
        if (!link || !title || !priceEl) return null;
        const url = link.getAttribute('href');
        return { id: fileOf(url), url, title: title.textContent.trim(), license: 'Standard License',
                 price: parsePrice(priceEl.textContent), opts: [], img: img ? img.getAttribute('src') : '' };
    }

    const PolyCart = {
        items() { return store.read(); },
        get() { return this.items().length; },
        total() { return this.items().reduce((s, i) => s + i.price, 0); },

        addItem(it, notify = true) {
            if (!it) return;
            const a = this.items();
            const k = a.findIndex(x => x.id === it.id);
            let msg = 'Added to cart';
            if (k > -1) {
                if (!it.opts.length) msg = 'Already in your cart';
                else { msg = a[k].license === it.license ? 'Already in your cart' : 'License updated'; a[k] = it; }
            } else a.push(it);
            store.write(a);
            this.sync();
            this.bump();
            if (notify) toast(msg);
        },
        add() { this.addItem(pageItem(), false); },
        remove(id) { store.write(this.items().filter(i => i.id !== id)); this.sync(); },
        setLicense(id, name) {
            const a = this.items();
            const it = a.find(i => i.id === id);
            const o = it && (it.opts || []).find(x => x.name === name);
            if (!o) return;
            it.license = o.name; it.price = o.price;
            store.write(a); this.sync();
        },
        clear() { store.write([]); this.sync(); },
        bump() {
            const c = document.querySelector('.cart');
            if (c) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
        },
        sync() {
            document.querySelectorAll('#cart-count').forEach(el => { el.textContent = this.get(); });
            if (cartRoot && cartRoot.classList.contains('is-open')) renderCart();
        },
        open: () => openCart(),
        close: () => closeCart()
    };
    window.PolyCart = PolyCart;
    PolyCart.quickAdd = injectQuickAdd;

    function lineHTML(i) {
        const opts = i.opts || [];
        const lic = opts.length > 1
            ? `<select aria-label="License for ${esc(i.title)}">${opts.map(o =>
                `<option value="${esc(o.name)}"${o.name === i.license ? ' selected' : ''}>${esc(o.name)} — ${money(o.price)}</option>`).join('')}</select>`
            : `<small>${esc(i.license)}</small>`;
        const thumb = i.img ? `<img src="${esc(i.img)}" alt="" onerror="this.style.visibility='hidden'">` : '';
        return `<div class="pm-line" data-id="${esc(i.id)}">
            <a class="pm-line__thumb" href="${esc(i.url)}">${thumb}</a>
            <div class="pm-line__body"><a class="pm-line__title" href="${esc(i.url)}">${esc(i.title)}</a>${lic}</div>
            <strong class="pm-line__price">${money(i.price)}</strong>
            <button type="button" class="pm-line__rm" aria-label="Remove ${esc(i.title)}">×</button>
        </div>`;
    }

    function renderCart() {
        const a = PolyCart.items();
        const n = a.length;
        cartRoot.querySelector('.pm-cart__n').textContent = n ? n + (n === 1 ? ' item' : ' items') : '';
        cartRoot.querySelector('.pm-cart__foot').hidden = !n;
        cartRoot.querySelector('.pm-cart__total').textContent = money(PolyCart.total());
        cartList.innerHTML = n ? a.map(lineHTML).join('')
            : `<div class="pm-empty"><p>Your cart is empty.</p><span>Add a model, material or environment to get started.</span>
               <div class="pm-suggest"><a class="pm-cart__browse" href="shop.html">Browse marketplace</a></div></div>`;
    }

    function openCart() {
        if (!cartRoot) return;
        close();
        cartLast = document.activeElement;
        renderCart();
        cartRoot.querySelector('.pm-cart__notice').classList.remove('is-on');
        cartRoot.classList.add('is-open');
        cartRoot.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        setTimeout(() => cartRoot.querySelector('.pm-search__close').focus(), 40);
    }

    function closeCart() {
        if (!cartRoot || !cartRoot.classList.contains('is-open')) return;
        cartRoot.classList.remove('is-open');
        cartRoot.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (cartLast && cartLast.focus) cartLast.focus();
    }

    function showNotice() {
        const n = cartRoot.querySelector('.pm-cart__notice');
        n.textContent = "Payment isn't ready yet — we're still building it. Please check back soon!";
        n.classList.add('is-on');
        clearTimeout(noticeTimer);
        noticeTimer = setTimeout(() => n.classList.remove('is-on'), 7000);
    }

    function toast(msg) {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.className = 'pm-toast';
            toastEl.setAttribute('role', 'status');
            toastEl.addEventListener('click', () => { toastEl.classList.remove('is-on'); openCart(); });
            document.body.appendChild(toastEl);
        }
        toastEl.innerHTML = esc(msg) + ' · <u>View cart</u>';
        toastEl.classList.add('is-on');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2800);
    }

    function buildCart() {
        cartRoot = document.createElement('div');
        cartRoot.className = 'pm-search pm-cart';
        cartRoot.id = 'pm-cart';
        cartRoot.setAttribute('role', 'dialog');
        cartRoot.setAttribute('aria-modal', 'true');
        cartRoot.setAttribute('aria-label', 'Cart');
        cartRoot.setAttribute('aria-hidden', 'true');
        cartRoot.innerHTML = `
            <div class="pm-search__panel">
                <div class="pm-cart__head">
                    <strong>Your cart</strong><span class="pm-cart__n"></span>
                    <button type="button" class="pm-search__close" aria-label="Close cart">Esc</button>
                </div>
                <div class="pm-cart__list"></div>
                <div class="pm-cart__foot" hidden>
                    <div class="pm-cart__sum"><span>Total</span><strong class="pm-cart__total">$0.00</strong></div>
                    <p class="pm-cart__note">One-time purchase · VAT may apply</p>
                    <div class="pm-cart__notice" role="status"></div>
                    <button type="button" class="pm-cart__pay"><span>PAY</span><b>→</b></button>
                    <button type="button" class="pm-cart__clear">Clear cart</button>
                </div>
            </div>`;
        document.body.appendChild(cartRoot);
        cartList = cartRoot.querySelector('.pm-cart__list');

        cartRoot.addEventListener('click', e => {
            if (e.target === cartRoot || e.target.closest('.pm-search__close')) return closeCart();
            const rm = e.target.closest('.pm-line__rm');
            if (rm) return PolyCart.remove(rm.closest('.pm-line').dataset.id);
            if (e.target.closest('.pm-cart__clear')) return PolyCart.clear();
            if (e.target.closest('.pm-cart__pay')) return showNotice();
            if (e.target.closest('a[href]')) closeCart();
        });
        cartRoot.addEventListener('change', e => {
            const s = e.target.closest('select');
            if (s) PolyCart.setLicense(s.closest('.pm-line').dataset.id, s.value);
        });
        cartRoot.addEventListener('keydown', e => {
            if (e.key !== 'Tab') return;
            const f = [...cartRoot.querySelectorAll('a[href], button, select')].filter(x => x.offsetParent !== null);
            if (!f.length) return;
            const first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        });
    }

    function injectQuickAdd() {
        document.querySelectorAll('.asset-image, .small-image').forEach(box => {
            if (box.querySelector('.pm-quick') || !cardItem(box)) return;
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'pm-quick';
            b.setAttribute('aria-label', 'Add to cart');
            b.innerHTML = '<span>+</span> Add';
            b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); PolyCart.addItem(cardItem(box)); });
            box.appendChild(b);
        });
    }

    function init() {
        build();
        buildCart();
        injectQuickAdd();
        PolyCart.sync();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    window.PolySearch = { open, close };
})();
