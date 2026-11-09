/* ==========================================================================
   Ольха — интерактивность
   ========================================================================== */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const TAG_LABELS = {
    veg: { text: "Вег", cls: "tag--veg" },
    spicy: { text: "Остро", cls: "tag--spicy" },
    new: { text: "Новинка", cls: "tag--new" }
  };

  /* ---------- Шапка: фон при прокрутке ---------- */
  const header = $("#header");

  function updateHeader() {
    header.classList.toggle("is-scrolled", window.scrollY > 40);
  }

  /* ---------- Мобильное меню ---------- */
  const burger = $("#burger");

  function setNav(open) {
    document.body.classList.toggle("nav-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  }

  burger.addEventListener("click", () => {
    setNav(!document.body.classList.contains("nav-open"));
  });

  $$(".nav a").forEach((link) => link.addEventListener("click", () => setNav(false)));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("nav-open")) {
      setNav(false);
      burger.focus();
    }
  });

  window.matchMedia("(min-width: 961px)").addEventListener("change", (e) => {
    if (e.matches) setNav(false);
  });

  /* ---------- Подсветка активного пункта навигации ---------- */
  const navLinks = $$(".nav__link");
  const sections = navLinks
    .map((link) => document.getElementById(link.getAttribute("href").slice(1)))
    .filter(Boolean);

  function updateActiveLink() {
    const marker = window.scrollY + window.innerHeight * 0.35;
    let current = sections[0];
    sections.forEach((section) => {
      if (section.offsetTop <= marker) current = section;
    });
    // У самого низа страницы активны «Контакты»
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
      current = sections[sections.length - 1];
    }
    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === "#" + current.id);
    });
  }

  /* ---------- Меню: вкладки и карточки ---------- */
  const tabsEl = $("#menu-tabs");
  const tabsWrap = $(".tabs-wrap");
  const gridEl = $("#menu-grid");
  const panelEl = $("#menu-panel");
  const categoryEl = $("#menu-category");
  const noteEl = $("#menu-note");
  let activeId = null;

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[ch]);
  }

  function dishTemplate(item, index) {
    const tags = (item.tags || [])
      .map((t) => TAG_LABELS[t])
      .filter(Boolean)
      .map((t) => `<span class="tag ${t.cls}">${t.text}</span>`)
      .join("");

    return `
      <article class="dish" style="animation-delay:${index * 60}ms">
        <div class="dish__media">
          <img src="assets/img/menu/${item.img}.jpg" alt="${escapeHtml(item.name)}"
               loading="lazy" decoding="async" width="720" height="540">
          ${tags ? `<div class="dish__tags">${tags}</div>` : ""}
        </div>
        <div class="dish__body">
          <div class="dish__head">
            <h4 class="dish__name">${escapeHtml(item.name)}</h4>
            <span class="dish__price">${item.price.toLocaleString("ru-RU")}<small>₽</small></span>
          </div>
          <p class="dish__desc">${escapeHtml(item.desc)}</p>
          ${item.weight ? `<p class="dish__meta">${escapeHtml(item.weight)}</p>` : ""}
        </div>
      </article>`;
  }

  function renderTabs() {
    tabsEl.innerHTML = MENU.map((cat) => `
      <button class="tab" type="button" role="tab" id="tab-${cat.id}"
              aria-controls="menu-panel" aria-selected="false" tabindex="-1" data-id="${cat.id}">
        ${escapeHtml(cat.title)}
        <span class="tab__count">${cat.items.length}</span>
      </button>`).join("");
  }

  function fillPanel(cat) {
    categoryEl.textContent = cat.title;
    noteEl.textContent = cat.note || "";
    gridEl.innerHTML = cat.items.map(dishTemplate).join("");
  }

  function selectCategory(id, { focus = false, animate = true } = {}) {
    const cat = MENU.find((c) => c.id === id);
    if (!cat || id === activeId) return;
    activeId = id;

    $$(".tab", tabsEl).forEach((tab) => {
      const selected = tab.dataset.id === id;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected) {
        if (focus) tab.focus();
        // Держим выбранную вкладку в поле зрения на узких экранах
        const left = tab.offsetLeft - (tabsEl.clientWidth - tab.offsetWidth) / 2;
        tabsEl.scrollTo({ left, behavior: prefersReducedMotion ? "auto" : "smooth" });
      }
    });
    panelEl.setAttribute("aria-labelledby", "tab-" + id);

    if (!animate || prefersReducedMotion) {
      fillPanel(cat);
      return;
    }

    gridEl.classList.add("is-leaving");
    window.setTimeout(() => {
      fillPanel(cat);
      gridEl.classList.remove("is-leaving");

      // Если панель ушла выше экрана — аккуратно возвращаемся к началу категории
      const panelTop = panelEl.getBoundingClientRect().top;
      const offset = header.offsetHeight + tabsWrap.offsetHeight;
      if (panelTop < offset) {
        window.scrollTo({ top: window.scrollY + panelTop - offset - 8, behavior: "smooth" });
      }
    }, 220);
  }

  tabsEl.addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (tab) selectCategory(tab.dataset.id);
  });

  // Навигация стрелками по вкладкам (паттерн WAI-ARIA Tabs)
  tabsEl.addEventListener("keydown", (e) => {
    const tabs = $$(".tab", tabsEl);
    const index = tabs.findIndex((t) => t.dataset.id === activeId);
    let next = null;

    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = tabs.length - 1;

    if (next !== null) {
      e.preventDefault();
      selectCategory(tabs[next].dataset.id, { focus: true });
    }
  });

  // Тень у закреплённой панели вкладок
  function updateStuckTabs() {
    const top = tabsWrap.getBoundingClientRect().top;
    const panelBottom = panelEl.getBoundingClientRect().bottom;
    tabsWrap.classList.toggle("is-stuck", top <= header.offsetHeight + 1 && panelBottom > top + 80);
  }

  /* ---------- Часы работы и статус «открыто» ---------- */
  const SCHEDULE = {
    0: [9, 21], // вс
    1: [8, 22], 2: [8, 22], 3: [8, 22], 4: [8, 22], 5: [8, 22],
    6: [9, 23]  // сб
  };

  function warsawNow() {
    // Время кафе — московское, независимо от часового пояса посетителя
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Moscow", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type).value;
    const days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { day: days[get("weekday")], minutes: Number(get("hour")) * 60 + Number(get("minute")) };
  }

  function updateHours() {
    let now;
    try {
      now = warsawNow();
    } catch (err) {
      const d = new Date();
      now = { day: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() };
    }

    const [open, close] = SCHEDULE[now.day];
    const isOpen = now.minutes >= open * 60 && now.minutes < close * 60;

    $$("#hours li").forEach((li) => {
      const days = li.dataset.days.split(",").map(Number);
      li.classList.toggle("is-today", days.includes(now.day));
    });

    const todayLabel = $("#today-label");
    const todayHours = $("#today-hours");
    if (todayLabel && todayHours) {
      todayLabel.textContent = "Сегодня";
      todayHours.textContent = `${open}:00 — ${close}:00`;
    }

    const status = $("#open-status");
    const text = $(".status__text", status);
    status.classList.toggle("is-open", isOpen);
    status.classList.toggle("is-closed", !isOpen);

    if (isOpen) {
      text.textContent = `Сейчас открыто · до ${close}:00`;
    } else if (now.minutes < open * 60) {
      text.textContent = `Сейчас закрыто · откроемся в ${open}:00`;
    } else {
      const nextOpen = SCHEDULE[(now.day + 1) % 7][0];
      text.textContent = `Сейчас закрыто · завтра с ${nextOpen}:00`;
    }
  }

  /* ---------- Плавное появление блоков ---------- */
  function initReveal() {
    const items = $$(".reveal");
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    items.forEach((el) => observer.observe(el));
  }

  /* ---------- Прокрутка: один обработчик через rAF ---------- */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      updateHeader();
      updateActiveLink();
      updateStuckTabs();
      ticking = false;
    });
  }

  /* ---------- Старт ---------- */
  renderTabs();
  selectCategory(MENU[0].id, { animate: false });
  updateHours();
  initReveal();
  onScroll();

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.setInterval(updateHours, 60 * 1000);

  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();
})();
