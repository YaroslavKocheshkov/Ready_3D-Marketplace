(function () {
    "use strict";

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    function wrapWords(root) {
        var counter = { i: 0 };

        function walk(node) {
            var children = Array.prototype.slice.call(node.childNodes);

            children.forEach(function (child) {
                if (child.nodeType === Node.TEXT_NODE) {
                    if (!child.textContent.trim()) return;

                    var frag = document.createDocumentFragment();
                    var tokens = child.textContent.split(/(\s+)/);

                    tokens.forEach(function (token) {
                        if (token === "") return;

                        if (/^\s+$/.test(token)) {
                            frag.appendChild(document.createTextNode(token));
                            return;
                        }

                        var outer = document.createElement("span");
                        outer.className = "word";

                        var inner = document.createElement("span");
                        inner.className = "word-inner";
                        inner.style.setProperty("--i", counter.i);
                        inner.textContent = token;

                        outer.appendChild(inner);
                        frag.appendChild(outer);

                        counter.i += 1;
                    });

                    child.parentNode.replaceChild(frag, child);
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    walk(child);
                }
            });
        }

        walk(root);
    }

    function initReveal() {
        var items = document.querySelectorAll("[data-reveal]");
        if (!items.length) return;

        if (reduceMotion || !("IntersectionObserver" in window)) {
            items.forEach(function (el) {
                el.classList.add("is-visible");
            });
            return;
        }

        items.forEach(function (el) {
            var delay = el.getAttribute("data-reveal-delay");
            if (delay) {
                el.style.setProperty("--reveal-delay", delay + "ms");
            }

            if (el.getAttribute("data-reveal") === "words") {
                wrapWords(el);
            }
        });

        var observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
        );

        items.forEach(function (el) {
            observer.observe(el);
        });
    }

    function initHeaderAndProgress() {
        var header = document.querySelector(".site-header");
        var progress = document.querySelector(".scroll-progress");
        if (!header && !progress) return;

        var ticking = false;

        function update() {
            var scrollY = window.scrollY || window.pageYOffset;

            if (header) {
                header.classList.toggle("is-scrolled", scrollY > 40);
            }

            if (progress) {
                var docHeight = document.documentElement.scrollHeight - window.innerHeight;
                var pct = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
                progress.style.width = pct + "%";
            }

            ticking = false;
        }

        window.addEventListener(
            "scroll",
            function () {
                if (!ticking) {
                    window.requestAnimationFrame(update);
                    ticking = true;
                }
            },
            { passive: true }
        );

        update();
    }

    function initSpotlight() {
        if (!canHover || reduceMotion) return;

        var hero = document.querySelector(".hero");
        var spotlight = document.querySelector(".hero-spotlight");
        if (!hero || !spotlight) return;

        hero.addEventListener("pointermove", function (event) {
            var rect = hero.getBoundingClientRect();
            var x = ((event.clientX - rect.left) / rect.width) * 100;
            var y = ((event.clientY - rect.top) / rect.height) * 100;
            hero.style.setProperty("--x", x + "%");
            hero.style.setProperty("--y", y + "%");
        });
    }

    function initMagnetic() {
        if (!canHover || reduceMotion) return;

        var buttons = document.querySelectorAll(".button");

        buttons.forEach(function (btn) {
            var strength = 0.28;

            btn.addEventListener("pointermove", function (event) {
                var rect = btn.getBoundingClientRect();
                var relX = event.clientX - rect.left - rect.width / 2;
                var relY = event.clientY - rect.top - rect.height / 2;

                btn.style.transform = "translate(" + relX * strength + "px, " + relY * strength + "px)";
            });

            btn.addEventListener("pointerleave", function () {
                btn.style.transform = "";
            });
        });
    }

    function initTilt() {
        if (!canHover || reduceMotion) return;

        var tiltEls = document.querySelectorAll("[data-tilt]");

        tiltEls.forEach(function (el) {
            var maxTilt = 6;

            el.addEventListener("pointermove", function (event) {
                var rect = el.getBoundingClientRect();
                var px = (event.clientX - rect.left) / rect.width - 0.5;
                var py = (event.clientY - rect.top) / rect.height - 0.5;

                var rotateX = (-py * maxTilt).toFixed(2);
                var rotateY = (px * maxTilt).toFixed(2);

                el.style.transform =
                    "perspective(900px) rotateX(" + rotateX + "deg) rotateY(" + rotateY + "deg) scale3d(1.015, 1.015, 1.015)";
            });

            el.addEventListener("pointerleave", function () {
                el.style.transform = "";
            });
        });
    }

    function easeOutExpo(t) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function animateCount(el) {
        var target = parseFloat(el.getAttribute("data-count-to"));
        var suffix = el.getAttribute("data-suffix") || "";
        var format = el.getAttribute("data-format");
        var duration = 1300;
        var start = null;

        if (reduceMotion || isNaN(target)) {
            el.textContent = formatValue(target, format) + suffix;
            return;
        }

        function frame(timestamp) {
            if (start === null) start = timestamp;
            var progress = Math.min((timestamp - start) / duration, 1);
            var eased = easeOutExpo(progress);
            var value = Math.round(target * eased);

            el.textContent = formatValue(value, format) + suffix;

            if (progress < 1) {
                window.requestAnimationFrame(frame);
            }
        }

        window.requestAnimationFrame(frame);
    }

    function formatValue(value, format) {
        if (format === "pad2") {
            return String(value).padStart(2, "0");
        }
        return String(value);
    }

    function initCounters() {
        var stats = document.querySelectorAll("[data-count-to]");
        if (!stats.length) return;

        if (!("IntersectionObserver" in window)) {
            stats.forEach(animateCount);
            return;
        }

        var observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        animateCount(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.6 }
        );

        stats.forEach(function (el) {
            observer.observe(el);
        });
    }

    function initModelFadeIn() {
        var model = document.querySelector(".hero-model");
        if (!model) return;

        model.addEventListener("load", function () {
            model.classList.add("is-loaded");
        });

        window.setTimeout(function () {
            model.classList.add("is-loaded");
        }, 2500);
    }

    document.addEventListener("DOMContentLoaded", function () {
        initReveal();
        initHeaderAndProgress();
        initSpotlight();
        initMagnetic();
        initTilt();
        initCounters();
        initModelFadeIn();
    });
})();
