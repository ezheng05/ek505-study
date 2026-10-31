// app.js 10/31/26 ek505 study site

(function () {
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* theme */
  const root = document.documentElement;
  const savedTheme = store.get("ek505-theme", null);
  if (savedTheme) root.dataset.theme = savedTheme;
  const themeBtn = document.getElementById("theme-btn");
  themeBtn.addEventListener("click", () => {
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    store.set("ek505-theme", root.dataset.theme);
    window.dispatchEvent(new Event("themechange"));
  });

  /* youtube + link parsing */
  function parseTime(t) {
    if (!t) return 0;
    if (/^\d+$/.test(t)) return +t;
    const m = t.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
    return m ? (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0)) : 0;
  }
  function ytInfo(url) {
    let u;
    try { u = new URL(url); } catch (e) { return null; }
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id = null;
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (host.endsWith("youtube.com")) {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else { const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/); if (m) id = m[1]; }
    }
    const list = u.searchParams.get("list");
    if (!id && !list) return null;
    return { id, list, start: parseTime(u.searchParams.get("t") || u.searchParams.get("start")) };
  }
  function esc(s) { return String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  function renderResource(r) {
    const yt = ytInfo(r.url);
    if (yt) {
      let src;
      if (yt.id) {
        src = "https://www.youtube-nocookie.com/embed/" + yt.id + "?rel=0" + (yt.start ? "&start=" + yt.start : "") + (yt.list ? "&list=" + yt.list : "");
      } else {
        src = "https://www.youtube-nocookie.com/embed/videoseries?list=" + yt.list;
      }
      return '<div class="vid"><div class="frame"><iframe loading="lazy" src="' + src + '" title="' + esc(r.title || "YouTube video") +
        '" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>' +
        (r.title || r.note ? '<div class="meta"><b>' + esc(r.title) + '</b>' + (r.note ? '<span>' + esc(r.note) + '</span>' : "") + '</div>' : "") + '</div>';
    }
    let dom = "";
    try { dom = new URL(r.url).hostname.replace(/^www\./, ""); } catch (e) {}
    return '<a class="link-card" href="' + esc(r.url) + '" target="_blank" rel="noopener"><span class="dom">' + esc(dom) + '</span><b>' + esc(r.title || r.url) + '</b>' +
      (r.note ? '<span>' + esc(r.note) + '</span>' : "") + '</a>';
  }

  const RES = window.RESOURCES || {};
  const lessons = [...document.querySelectorAll("section.lesson")];
  lessons.forEach(sec => {
    const box = document.createElement("div");
    box.className = "resources";
    const items = RES[sec.id] || [];
    box.innerHTML = "<h5>Videos &amp; resources</h5>" + (items.length
      ? '<div class="res-grid">' + items.map(renderResource).join("") + "</div>"
      : '<p class="res-empty">No videos yet for this one.</p>');
    sec.appendChild(box);
  });

  /* nav + progress */
  const done = store.get("ek505-done", {});
  const nav = document.getElementById("nav");
  const topics = [...document.querySelectorAll(".topic")];
  topics.forEach(t => {
    const g = document.createElement("div");
    g.innerHTML = "<h4>" + esc(t.dataset.short) + "</h4><ul></ul>";
    const ul = g.querySelector("ul");
    t.querySelectorAll("section.lesson").forEach(sec => {
      const n = (RES[sec.id] || []).length;
      const li = document.createElement("li");
      li.innerHTML = '<a href="#' + sec.id + '" data-id="' + sec.id + '"><span class="dot"></span><span>' + esc(sec.dataset.nav || sec.querySelector("h3").textContent) + "</span>" +
        (n ? '<span class="vc">' + n + " vid</span>" : "") + "</a>";
      ul.appendChild(li);
    });
    nav.appendChild(g);
  });

  function refreshProgress() {
    let c = 0;
    lessons.forEach(sec => {
      const on = !!done[sec.id];
      if (on) c++;
      const a = nav.querySelector('a[data-id="' + sec.id + '"]');
      if (a) a.classList.toggle("done", on);
      const b = sec.querySelector(".done-toggle");
      if (b) { b.setAttribute("aria-pressed", on); b.textContent = on ? "✓ got it" : "mark as got it"; }
    });
    document.getElementById("prog-text").textContent = c + " / " + lessons.length + " sections";
    document.getElementById("prog-bar").style.width = (100 * c / lessons.length) + "%";
  }
  lessons.forEach(sec => {
    const head = sec.querySelector(".lesson-head");
    const b = document.createElement("button");
    b.className = "done-toggle";
    b.type = "button";
    b.addEventListener("click", () => { done[sec.id] = !done[sec.id]; store.set("ek505-done", done); refreshProgress(); });
    head.appendChild(b);
  });
  refreshProgress();

  /* scrollspy */
  const links = {};
  nav.querySelectorAll("a").forEach(a => links[a.dataset.id] = a);
  const io = new IntersectionObserver(es => {
    es.forEach(e => {
      if (e.isIntersecting) {
        Object.values(links).forEach(a => a.classList.remove("active"));
        const a = links[e.target.id];
        if (a) { a.classList.add("active"); a.scrollIntoView({ block: "nearest" }); }
      }
    });
  }, { rootMargin: "-20% 0px -70% 0px" });
  lessons.forEach(s => io.observe(s));

  /* mobile menu */
  const rail = document.querySelector(".rail");
  document.getElementById("menu-btn").addEventListener("click", () => rail.classList.toggle("open"));
  nav.addEventListener("click", e => { if (e.target.closest("a")) rail.classList.remove("open"); });

  /* math */
  function renderMath() {
    if (window.renderMathInElement) {
      renderMathInElement(document.querySelector("main"), {
        delimiters: [{ left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }],
        throwOnError: false,
        output: "html"
      });
    }
  }
  if (document.readyState === "complete") renderMath(); else window.addEventListener("load", renderMath);
})();
