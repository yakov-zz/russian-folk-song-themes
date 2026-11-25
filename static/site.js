// What Russians Sang: progressive enhancement. All content is pre-rendered; this adds tooltips, the map and the song browser.
(() => {
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // tooltips on [data-tip] (mouse and keyboard focus)
  const tip = $(".tip");
  const show = (el, x, y) => { tip.innerHTML = el.dataset.tip; tip.style.display = "block"; tip.style.left = Math.min(x + 12, innerWidth - 310) + "px"; tip.style.top = Math.min(y + 12, innerHeight - tip.offsetHeight - 8) + "px"; };
  const hide = () => tip.style.display = "none";
  document.addEventListener("mousemove", e => { const el = e.target.closest?.("[data-tip]"); el ? show(el, e.clientX, e.clientY) : hide(); });
  document.addEventListener("focusin", e => { const el = e.target.closest?.("[data-tip]"); if (el) { const r = el.getBoundingClientRect(); show(el, r.left, r.bottom); } });
  document.addEventListener("focusout", hide);

  const loaded = {}, load = src => loaded[src] ||= new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  const D3 = "https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js", CLOUD = "https://cdn.jsdelivr.net/npm/d3-cloud@1.2.7/build/d3.layout.cloud.min.js";
  const root = document.documentElement, reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // narrow screens: the menu folds behind a button so every item is reachable without sideways scrolling
  const navbtn = $(".navbtn");
  if (navbtn) navbtn.addEventListener("click", () => { const open = navbtn.getAttribute("aria-expanded") !== "true";
    navbtn.setAttribute("aria-expanded", open); $("#sitenav").classList.toggle("open", open); });

  // theme toggle: Gzhel <-> Khokhloma, remembered; the motif grows on the first page of a visit
  document.querySelectorAll(".langs a").forEach(a => a.addEventListener("click", () => { try { localStorage.setItem("wrs-lang", a.getAttribute("href").split("/").filter(Boolean).find(x => /^[a-z]{2}$/.test(x))); } catch {} }));
  const tg = $(".theme-toggle");
  if (tg) {
    try { if (!sessionStorage.getItem("wrs-grown")) { tg.classList.add("grow"); sessionStorage.setItem("wrs-grown", "1"); } } catch { tg.classList.add("grow"); }
    const box = tg.closest(".tg"), ring = box && box.querySelector(".tg-ring");
    tg.addEventListener("click", () => { root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark"; try { localStorage.setItem("wrs-theme", root.dataset.theme); } catch {}
      tg.classList.remove("grow"); void tg.offsetWidth; tg.classList.add("grow");
      if (box && !reduce) { box.classList.remove("spin"); void box.offsetWidth; box.classList.add("spin"); } });
    if (ring) ["gz", "kh"].forEach(k => fetch(box.dataset.ring + k + "-bloom.svg").then(r => r.ok ? r.text() : "").then(svg => {
      if (!svg) return;
      const p = "tg" + k + "-";  // prefix every id so the two rings and the page never share one
      ring.insertAdjacentHTML("beforeend", svg.replace(/id="([^"]+)"/g, `id="${p}$1"`).replace(/(href="#|url\(#)([^")]+)/g, `$1${p}$2`).replace("<svg ", `<svg class="${k}" `));
    }).catch(() => {}));
  }

  // method: the three votes arrive one by one when the song scrolls into view
  $$(".method.anim").forEach(el => { $$(".vote", el).forEach((v, i) => v.style.transitionDelay = (.4 + .7 * i) + "s");
    new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { el.classList.add("play"); o.disconnect(); } }), { threshold: .35 }).observe(el); });

  // hero: the words of every theme family gather, dance a khorovod, and become a word cloud on click
  const stage = $(".kh-stage");
  if (stage) (async () => {
    await load(D3); await load(CLOUD);
    const C = JSON.parse(stage.dataset.cfg), font = "Monomakh";
    await document.fonts.load(`40px "${font}"`, "ая").catch(() => {});
    const W = 760, H = 520, cx = W / 2, cy = H / 2, sq = C.fams.map(f => Math.sqrt(C.shares[f])), ssum = sq.reduce((a, b) => a + b, 0);
    const words = [];
    C.fams.forEach((f, fi) => C.words[f].slice(0, Math.max(4, Math.round(54 * sq[fi] / ssum))).forEach(([w, n], r) => words.push({ w, n, f, fi, r })));
    // size follows how often a word is used, softened by a square root so small families stay legible
    const nmax = Math.max(...words.map(d => d.n)), size = n => 14 + 50 * Math.sqrt(n / nmax);
    words.forEach(d => d.size = size(d.n));
    words.sort((a, b) => a.r - b.r || a.fi - b.fi);
    stage.innerHTML = `<div class="kh-inner" style="width:${W}px;height:${H}px"></div>`;
    const inner = stage.firstChild, fit = () => { const k = Math.min(1, stage.clientWidth / W); inner.style.transform = `scale(${k})`; stage.style.height = H * k + "px"; };
    fit(); addEventListener("resize", fit);
    const half = Math.ceil(words.length / 2);
    words.forEach((d, i) => {
      const a = document.createElement("a"); a.className = "kh-w"; a.textContent = d.w; a.lang = "ru"; a.dataset.fam = d.f;
      a.href = `${C.rel}en/songs/?q=${encodeURIComponent(d.w)}`; a.style.fontSize = d.size + "px"; a.style.color = `var(--cat${d.fi})`;
      a.title = `${C.names[d.f]}: ${C.uses.replace("{n}", d.n.toLocaleString(document.documentElement.lang || "en"))}`; inner.appendChild(a); d.el = a;
      const outer = i % 2; d.R = outer ? 232 : 160; d.a0 = 2 * Math.PI * (outer ? (i - 1) / 2 : i / 2) / half + (outer ? .2 : 0);
      d.home = { x: cx + (Math.random() - .5) * 110, y: cy + (Math.random() - .5) * 70 }; d.cloud = d.home;
    });
    d3.layout.cloud().size([W, H]).words(words.map(d => ({ text: d.w, size: d.size, d }))).padding(4).rotate(0).font(font).fontSize(x => x.size)
      .random(d3.randomLcg(11)).on("end", out => out.forEach(o => o.d.cloud = { x: cx + o.x, y: cy + o.y })).start();
    const ease = t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    let angle = 0, b = reduce ? 1 : 0, target = b, openT = reduce ? 1 : 0, t0 = performance.now(), last = t0;
    const frame = now => {
      const dt = Math.min(2000, now - last); last = now;
      if (now - t0 > 700) openT = Math.min(1, openT + dt / 1500);
      angle += dt * 2 * Math.PI / 90000 * (1 - b);
      b += (target - b) * (1 - Math.exp(-dt / 260));
      const o = ease(openT), e = ease(b);
      for (const d of words) {
        const a = d.a0 + angle * (d.R > 200 ? 1 : -1.3), rx = cx + d.R * 1.3 * Math.cos(a), ry = cy + d.R * .92 * Math.sin(a);
        const gx = d.home.x + (rx - d.home.x) * o, gy = d.home.y + (ry - d.home.y) * o;
        d.el.style.transform = `translate(${gx + (d.cloud.x - gx) * e}px,${gy + (d.cloud.y - gy) * e}px) translate(-50%,-50%) scale(${.6 + .4 * e})`;
        d.el.style.opacity = .35 + .65 * Math.max(o, e);
      }
      if (!reduce) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    stage.addEventListener("click", e => { if (e.target.closest(".kh-w") && target === 1) return; e.preventDefault(); target = target ? 0 : 1; if (reduce) frame(performance.now()); });
    // hovering a family block lights up its words and opens the cloud
    $$(".blk[data-fam]").forEach(blk => {
      const on = () => { target = 1; $$(".kh-w", stage).forEach(w => w.classList.toggle("dim", w.dataset.fam !== blk.dataset.fam)); blk.classList.add("on"); };
      const off = () => { $$(".kh-w", stage).forEach(w => w.classList.remove("dim")); blk.classList.remove("on"); };
      blk.addEventListener("mouseenter", on); blk.addEventListener("focus", on); blk.addEventListener("mouseleave", off); blk.addEventListener("blur", off);
    });
  })().catch(() => {});

  // map: circles at guberniya/oblast centres, area ∝ songs, colour = main language
  const mapEl = $(".map");
  if (mapEl) (async () => {
    await load(D3);
    await load("https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js");
    const world = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json").then(r => r.json());
    const pts = JSON.parse(mapEl.dataset.points), L = JSON.parse(mapEl.dataset.labels), LV = { ru: "var(--cat0)", uk: "var(--cat1)", be: "var(--cat2)" };
    const W = 1000, H = 500, svg = d3.select(mapEl).append("svg").attr("viewBox", `0 0 ${W} ${H}`);
    const pad = { type: "MultiPoint", coordinates: [[22, 42], [135, 42], [22, 66], [135, 66]] };
    const proj = d3.geoConicEqualArea().parallels([45, 62]).rotate([-80, 0]).fitExtent([[10, 10], [W - 10, H - 10]], pad), path = d3.geoPath(proj);
    const g = svg.append("g");
    g.append("path").datum(topojson.feature(world, world.objects.countries)).attr("d", path).style("fill", "var(--land)").style("stroke", "var(--land-edge)")
      .attr("stroke-width", .6).attr("vector-effect", "non-scaling-stroke");
    let cur = p => p.n;  // songs a circle stands for: all, or one collection's
    const r = d3.scaleSqrt().domain([0, d3.max(pts, p => p.n)]).range([0, 28]), rad = p => Math.max(4, r(cur(p)));
    const langFill = p => LV[Object.entries(p.lang).sort((a, b) => b[1] - a[1])[0][0]];
    const baseTip = p => `<b>${esc(p.name)}</b><br>${p.n.toLocaleString(document.documentElement.lang || "en")} ${esc(L.songs)}<br>${Object.entries(p.lang).map(([l, n]) => esc(L.langs[l]) + " " + n).join(", ")}<br>${p.sources} ${esc(L.colls)}`
      + (p.region_only ? `<br>${esc(L.region_only.replace("{n}", p.region_only.toLocaleString(document.documentElement.lang || "en")))}` : "");
    pts.sort((a, b) => b.n - a.n).forEach(p => [p.x, p.y] = proj([p.lon, p.lat]));
    const dots = g.append("g").selectAll("circle").data(pts).join("circle").attr("cx", p => p.x).attr("cy", p => p.y).attr("r", rad)
      .style("fill", langFill).attr("fill-opacity", .8)
      .style("stroke", "var(--surface)").attr("stroke-width", 2).attr("tabindex", 0).attr("data-tip", baseTip);
    // a place with songs in more than one language is split into slices by language share (the tooltip has the counts)
    const arc = d3.arc().innerRadius(0), segs = pts.filter(p => Object.keys(p.lang).length > 1).flatMap(p => {
      const tot = d3.sum(Object.values(p.lang)); let a = 0;
      return Object.entries(p.lang).sort((x, y) => y[1] - x[1]).map(([l, n]) => ({ p, l, a0: a, a1: a += 2 * Math.PI * n / tot }));
    });
    const mix = g.append("g").attr("class", "mix").selectAll("path").data(segs).join("path").attr("transform", s => `translate(${s.p.x},${s.p.y})`)
      .style("fill", s => LV[s.l]).attr("fill-opacity", .8).style("pointer-events", "none");
    const drawMix = k => mix.attr("d", s => arc.outerRadius(Math.max(0, rad(s.p) / Math.sqrt(k) - 1 / k)).startAngle(s.a0).endAngle(s.a1)());
    drawMix(1);
    if (!mapEl.classList.contains("zoomable")) return;

    // full map: zoom and pan (wheel, pinch, drag, buttons, keys); circles keep their screen size so crowded ones separate;
    // names appear as you zoom in, and choosing a circle lists its collections below the map
    const labels = g.append("g").attr("class", "maplabels").selectAll("text").data(pts).join("text").attr("x", p => p.x).attr("y", p => p.y).text(p => p.name);
    const zoom = d3.zoom().scaleExtent([1, 12]).translateExtent([[0, 0], [W, H]]).on("zoom", ({ transform: t }) => {
      g.attr("transform", t);
      dots.attr("r", p => rad(p) / Math.sqrt(t.k)).attr("stroke-width", 2 / t.k);
      drawMix(t.k);
      // a name shows once its circle is big enough on screen or the map is zoomed in far enough
      // names a little larger where the map is drawn small (phones)
      labels.attr("font-size", 13 * Math.sqrt(Math.max(1, W / svg.node().clientWidth)) / t.k).attr("dx", p => rad(p) / Math.sqrt(t.k) + 3 / t.k).attr("dy", 5 / t.k)
        .style("display", p => cur(p) && (t.k >= 4 || (t.k >= 2 && cur(p) >= 150) || (t.k >= 1.5 && cur(p) >= 600)) ? null : "none")
        .text(p => t.k >= 6 ? `${p.name} · ${cur(p).toLocaleString(document.documentElement.lang || "en")}` : p.name);
    });
    svg.call(zoom).attr("tabindex", 0).attr("aria-label", L.hint);
    zoom.scaleTo(svg, 1);
    const tot = d3.sum(pts, p => p.n), mid = [d3.sum(pts, p => p.x * p.n) / tot, d3.sum(pts, p => p.y * p.n) / tot];
    const box = mapEl.closest(".card"), detail = $(".mapdetail", box), dur = reduce ? 0 : 300;
    $$(".mapbar [data-z]", box).forEach(b => b.addEventListener("click", () => {
      const z = b.dataset.z, s = svg.transition().duration(dur);
      // from the whole map, zoom in towards where the songs are (their song-weighted centre), not the empty middle of Siberia
      const at = d3.zoomTransform(svg.node()).k === 1 && z === "in" ? mid : undefined;  // undefined = the view's centre
      z === "reset" ? zoom.transform(s, d3.zoomIdentity) : zoom.scaleBy(s, z === "in" ? 1.6 : 1 / 1.6, at);
    }));
    svg.on("keydown", e => {
      const step = 60, k = { "+": ["in"], "=": ["in"], "-": ["out"], "0": ["reset"], ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
      if (!k) return;
      e.preventDefault();
      if (typeof k[0] === "string") return $(`.mapbar [data-z=${k[0]}]`, box).click();
      zoom.translateBy(svg.transition().duration(dur / 2), k[0] / d3.zoomTransform(svg.node()).k, k[1] / d3.zoomTransform(svg.node()).k);
    });
    const pick = p => {
      const mx = p.by[0][2];
      detail.innerHTML = `<h3>${esc(p.name)}</h3><p class="note">${esc(L.from.replace("{n}", p.n.toLocaleString(document.documentElement.lang || "en")).replace("{k}", p.by.length))}</p><div class="bars compact">`
        + p.by.map(([, c, n]) => `<div class="bar" style="--c:var(--accent)"><span class="name">${esc(c)}</span><span class="track"><span class="fill" style="width:${(100 * n / mx).toFixed(1)}%"></span><span class="val">${n.toLocaleString(document.documentElement.lang || "en")}</span></span></div>`).join("") + "</div>";
      dots.classed("picked", d => d === p);
    };
    dots.on("click", (e, p) => { e.stopPropagation(); pick(p); }).on("keydown", (e, p) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(p); } });

    // colour by a theme (share of the place's themed main songs, the heatmaps' 5-point steps; too few songs = blank),
    // and show one collection: only its places, sized by its songs there
    const colour = $(".mapctl [name=colour]", box), coll = $(".mapctl [name=coll]", box), ramp = $(".legend.ramp", box), langLeg = $(".legend.lang", box);
    const restyle = () => {
      const th = colour.value, c = coll.value;
      cur = c ? p => (p.by.find(x => x[0] === c) || [0, 0, 0])[2] : p => p.n;
      dots.style("display", p => cur(p) ? null : "none")
        .style("fill", p => !th ? langFill(p) : p.themed >= L.min ? `var(--q${Math.min(7, 1 + Math.floor((p.th[th] || 0) / 5))})` : "var(--q0)")
        .style("stroke", th ? "var(--muted)" : "var(--surface)").attr("fill-opacity", th ? 1 : .8)
        .attr("data-tip", p => baseTip(p) + (c ? `<br>${esc(L.coll_tip.replace("{n}", cur(p).toLocaleString(document.documentElement.lang || "en")))}` : "")
          + (th ? `<br>${p.themed >= L.min ? esc(L.theme_tip.replace("{share}", (p.th[th] || 0).toLocaleString(document.documentElement.lang || "en")).replace("{n}", p.themed.toLocaleString(document.documentElement.lang || "en"))) : esc(L.too_few || "")}` : ""));
      ramp.hidden = !th; langLeg.hidden = !!th;
      mix.style("display", th || c ? "none" : null);  // slices show the language mix of all songs, not of a theme or one collection
      zoom.transform(svg, d3.zoomTransform(svg.node()));  // re-run sizes and names for the new counts
    };
    colour.addEventListener("change", restyle); coll.addEventListener("change", restyle);
  })().catch(() => mapEl.insertAdjacentHTML("beforeend", "<p class=note>Map could not load.</p>"));

  // song browser
  const box = $(".songs");
  if (box) (async () => {
    const C = JSON.parse(box.dataset.cfg), f = $("form", box), out = $(".results", box), count = $(".count", box), more = $(".showmore", box);
    count.textContent = C.loading_index;
    let idx;
    try { idx = await fetch(C.rel + "data/songs_index.json").then(r => { if (!r.ok) throw r; return r.json(); }); }
    catch { count.textContent = C.failed; return; }
    let texts = null, shown = 50, hits = [];
    const keys = ["q", "theme", "region", "collection", "lang"], sel = { theme: C.themes, region: C.regions, collection: C.collections, lang: C.langs };
    // filters live in the address, so a search can be linked to and survives the back button
    const params = new URLSearchParams(location.search);
    keys.forEach(k => { const v = params.get(k); if (v && (k === "q" || f[k].querySelector(`option[value="${CSS.escape(v)}"]`))) f[k].value = v; });
    // spelling-blind search: pre-reform ѣ і ѳ ѵ and ё match е и ф и е, and a word-final ъ is ignored. Every swap is one letter for one
    // (the final ъ becomes "·"), so a match in the folded text sits at the same place in the printed text for the snippet
    const fold = x => x.replace(/[ѣіѳѵё]/g, c => ({ ѣ: "е", і: "и", ѳ: "ф", ѵ: "и", ё: "е" }[c])).replace(/ъ(?![а-яё])/g, "·");
    const query = () => fold(f.q.value.trim().toLowerCase()).replace(/·/g, "");
    // between words the printed text may carry a dropped final ъ ("·"): "в поле" finds "въ поле"
    const rx = q => new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ +/g, "·? +"));
    let folded = null;
    const run = async () => {
      const q = query(), re = q && rx(q);
      if (q && !texts) { count.textContent = C.loading; texts = await fetch(C.rel + "data/songs_text.json").then(r => r.json()); folded = texts.map(fold); }
      hits = idx.map((s, i) => [s, i]).filter(([s, i]) => (!f.theme.value || s[7].includes(f.theme.value)) && (!f.region.value || s[3] === f.region.value)
        && (!f.collection.value || s[4] === f.collection.value) && (!f.lang.value || s[5] === f.lang.value) && (!q || re.test(folded[i])));
      const u = new URLSearchParams(); keys.forEach(k => f[k].value.trim() && u.set(k, f[k].value.trim()));
      history.replaceState(null, "", location.pathname + (String(u) ? "?" + u : ""));
      shown = 50; draw(q);
    };
    // a few words either side of the first match, so a word search shows why each song came up
    const snip = (i, q) => { const t = texts[i], m = folded[i].match(rx(q)), at = m.index, len = m[0].length, a = Math.max(0, t.lastIndexOf(" ", Math.max(0, at - 40))), b = t.indexOf(" ", at + len + 40);
      return (a ? "…" : "") + esc(t.slice(a, at)).replace(/\s+/g, " ") + "<mark>" + esc(t.slice(at, at + len)) + "</mark>" + esc(t.slice(at + len, b < 0 ? undefined : b)).replace(/\s+/g, " ") + (b < 0 ? "" : "…"); };
    const draw = (q = query()) => {
      count.textContent = C.results.replace("{n}", hits.length.toLocaleString(document.documentElement.lang || "en"));
      out.innerHTML = hits.slice(0, shown).map(([s, i]) => {
        const other = s[7].filter(t => t !== s[2]).map(t => C.themes[t] || t);
        return `<li><a href="${C.rel}song/${s[0]}/" lang="${s[5]}">${esc(s[1] || s[0])}</a>${s[6] === "chastushka" ? ` <span class="pill">${esc(C.chastushka)}</span>` : ""}
        <div class="meta"><b>${esc(C.themes[s[2]] || s[2])}</b>${other.length ? " + " + esc(other.join(", ")) : ""} · ${esc(C.regions[s[3]] || C.no_region)} · ${esc(C.collections[s[4]])} · ${esc(C.langs[s[5]])}</div>
        ${q ? `<div class="snip" lang="${s[5]}">${snip(i, q)}</div>` : ""}</li>`; }).join("");
      if (!hits.length) {
        const on = keys.filter(k => f[k].value.trim());
        out.innerHTML = `<li class="empty"><p>${esc(C.empty)}</p>${on.length ? `<p>${on.map(k => `<button type="button" class="drop" data-k="${k}">${esc(C.remove.replace("{v}", k === "q" ? f.q.value.trim() : sel[k][f[k].value]))} ×</button>`).join(" ")}</p>` : ""}`
          + `${q ? `<p class="note">${esc(C.empty_hint)}</p>` : ""}<button type="button" class="reset">${esc(C.reset)}</button></li>`;
      }
      more.hidden = hits.length <= shown;
    };
    more.onclick = () => { shown += 100; draw(); };
    out.addEventListener("click", e => {
      const d = e.target.closest(".drop"); if (d) { f[d.dataset.k].value = ""; run(); }
      if (e.target.closest(".reset")) { f.reset(); run(); } });
    let tm; f.addEventListener("input", () => { clearTimeout(tm); tm = setTimeout(run, 200); });
    run();
  })();

  // recordings: one player at a time; nothing loads from YouTube before a click
  (() => {
    const recs = document.querySelectorAll(".rec, .chrec");
    if (!recs.length) return;
    const stopAll = () => document.querySelectorAll(".pl iframe").forEach(f => { f.previousElementSibling.hidden = false; f.remove(); });
    const play = fc => {
      stopAll();
      const f = document.createElement("iframe");
      f.src = `https://www.youtube-nocookie.com/embed/${fc.dataset.yt}?autoplay=1&start=${fc.dataset.start}`;
      f.title = fc.getAttribute("aria-label"); f.allow = "autoplay; encrypted-media; picture-in-picture"; f.allowFullscreen = true;
      fc.hidden = true; fc.after(f);
    };
    document.addEventListener("click", e => {
      const fc = e.target.closest(".pl .facade"); if (fc) { play(fc); return; }
      const row = e.target.closest(".rec"); if (!row) return;
      const rx = row.querySelector(".rx"), wb = row.querySelector(".words-t");
      const lb = row.querySelector(".listen");
      lb.dataset.listen ??= lb.textContent;
      // the open row's Listen button becomes Close: it stops the player and folds the row
      const open = on => { rx.hidden = !on; wb.setAttribute("aria-expanded", on); lb.textContent = on ? lb.dataset.close : lb.dataset.listen; if (!on && row.querySelector("iframe")) stopAll(); };
      const cur = () => row.querySelector(".rx .rv:not([hidden])");
      if (e.target.closest(".words-t")) open(rx.hidden);
      else if (e.target.closest(".listen")) { if (!rx.hidden) open(false); else { open(true); play(cur().querySelector(".facade")); } }
      else if (e.target.closest(".alt button")) {
        const i = e.target.closest("button").dataset.i;
        if (cur().querySelector("iframe")) stopAll();
        row.querySelectorAll(".rv").forEach(v => v.hidden = v.dataset.i !== i);
        row.querySelectorAll(".alt button").forEach(b => b.setAttribute("aria-pressed", b.dataset.i === i));
      }
    });
  })();
})();
