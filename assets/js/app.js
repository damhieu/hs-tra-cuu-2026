/* app.js — khởi động, router, chuyển giao diện & chế độ màu */
"use strict";

var App = (function () {
  var el = U.el;
  var D = window.__HSDATA;
  var state = { q: "", exact: false, sel: null, ftaFilter: "" };
  var layoutCtx = null;   // {content, style, onRoute, below?, asideRight?, rail?, compMode?}
  var lastInfo = { kind: "other" };   // thông tin cho vùng companion

  /* chọn dòng: cập nhật companion không rời trang; trả false nếu giao diện không có vùng kèm */
  function select(i, tr) {
    if (!layoutCtx || (!layoutCtx.below && !layoutCtx.asideRight && !layoutCtx.rail)) return false;
    state.sel = i;
    document.querySelectorAll("tr.row-selected").forEach(function (x) {
      x.classList.remove("row-selected");
    });
    if (i != null && tr && tr.classList) tr.classList.add("row-selected");
    Views.renderCompanion(layoutCtx, lastInfo);
    return true;
  }

  /* ---------------- chế độ màu ---------------- */
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function applyMode() {
    var mode = Store.settings.mode;
    var eff = mode === "auto" ? (mq && mq.matches ? "dark" : "light") : mode;
    document.documentElement.setAttribute("data-mode", eff);
    document.documentElement.setAttribute("data-mode-setting", mode);
  }
  if (mq) {
    var mqHandler = function () { if (Store.settings.mode === "auto") applyMode(); };
    if (mq.addEventListener) mq.addEventListener("change", mqHandler);
    else if (mq.addListener) mq.addListener(mqHandler);
  }

  function setMode(m) {
    Store.settings.mode = m;
    Store.saveSettings();
    applyMode();
    renderLayout();   // cập nhật nhãn nút
    route();
  }

  /* ---------------- giao diện ---------------- */
  function setLayout(n) {
    /* chỉ GD3 (n===3) có nút bật/tắt "Chính xác" (layouts.js .l3-exact) — nếu không reset thì
       bật "Chính xác" ở GD3 rồi chuyển sang GD1/2/4 sẽ để state.exact=true âm thầm chạy ngầm,
       không có dấu hiệu nào trên giao diện và không có cách tắt ngoài quay lại GD3 (xem
       SYSTEM-SPEC §10.30) */
    if (n !== 3) state.exact = false;
    Store.settings.layout = n;
    Store.saveSettings();
    renderLayout();
    route();
  }

  function renderLayout() {
    var rootEl = document.getElementById("app");
    rootEl.innerHTML = "";
    var n = Store.settings.layout || 2;
    document.documentElement.setAttribute("data-theme", "t" + n);
    layoutCtx = Layouts[n](rootEl);
  }

  /* ---------------- router ---------------- */
  function go(hash, replace) {
    if (replace) location.replace(hash);
    else location.hash = hash;
    if (location.hash === hash) route(); // hashchange không bắn khi giống nhau
  }

  function safeDecode(s) {
    try { return decodeURIComponent(s); } catch (e) { return s; }
  }

  function parseHash() {
    var h = location.hash || "#/";
    var qs = "";
    var qi = h.indexOf("?");
    if (qi >= 0) { qs = h.slice(qi + 1); h = h.slice(0, qi); }
    var parts = h.replace(/^#\//, "").split("/").map(safeDecode);
    var params = {};
    qs.split("&").forEach(function (p) {
      var kv = p.split("=");
      if (kv[0]) params[kv[0]] = safeDecode(kv[1] || "");
    });
    return { parts: parts, params: params, raw: h };
  }

  /* dòng hàng đầu tiên của một chương (cho companion ở route #/chapter) */
  function firstRowOfChapter(cid) {
    for (var i = 0; i < D.rows.length; i++) {
      var r = D.rows[i];
      if (r[0] === 0 && r[1] && r[1].slice(0, 2) === cid && r[1].length >= 8) return r[1];
    }
    return null;
  }

  function route() {
    if (!layoutCtx) return;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    var r = parseHash();
    var c = layoutCtx.content;
    var p = r.parts;
    c.innerHTML = "";
    state.sel = null;
    lastInfo = { kind: "other" };
    window.scrollTo(0, 0);

    switch (p[0]) {
      case "":
      case undefined:
        renderHome(c);
        break;
      case "q":
        state.q = p[1] || "";
        Store.addHistory("q", state.q);
        var res = Search.run(state.q, { exact: state.exact });
        /* nếu tìm đúng theo mã số (≥4 chữ số) thì đang xem trọn 1 nhóm 4 số ->
           cho phép lật sang nhóm kế/trước, tự nối liền qua ranh giới chương */
        if (res.mode === "code") {
          var qDigits = state.q.replace(/[^\d]/g, "");
          if (qDigits.length >= 4) {
            var navHead4 = qDigits.slice(0, 4);
            var prevG = Store.adjacentGroup(navHead4, -1);
            var nextG = Store.adjacentGroup(navHead4, 1);
            if (prevG || nextG) c.appendChild(Views.groupNavBar(navHead4, prevG, nextG,
              function (g) { go("#/q/" + g.head4); }));
          }
        }
        if (res.truncated) c.appendChild(el("div", { class: "result-truncated" },
          "Đang hiển thị " + res.hits.length + " kết quả đầu tiên (giới hạn " + res.limit +
          " dòng). Hãy thu hẹp từ khóa hoặc tra theo mã cụ thể hơn để thấy đủ kết quả."));
        var box = el("div"); c.appendChild(box);
        if (layoutCtx.style === "full") Views.resultTableFull(box, res.hits, res.tokens);
        else if (layoutCtx.style === "lib") Views.renderLibResults(box, res.hits, res.tokens);
        else Views.renderResults(box, res.hits, res.tokens, layoutCtx.style === "cards" ? "cards" : "table");
        var st = document.getElementById("l3-status");
        if (st) st.textContent = "Kết quả: " + res.hits.length + " dòng";
        lastInfo = { kind: "results", hits: res.hits, tokens: res.tokens };
        state.lastHits = res.hits;
        break;
      case "code":
        state.q = "";
        var codeArg = (p[1] || "").replace(/[^\d]/g, "");
        Views.renderDetail(c, codeArg);
        lastInfo = { kind: "detail", code: codeArg, tokens: [] };
        break;
      case "chapters":
        Views.renderChapters(c);
        break;
      case "chapter":
        Views.renderChapterRows(c, p[1], layoutCtx.style);
        lastInfo = { kind: "results", hits: null, tokens: [], code: firstRowOfChapter(p[1]) };
        break;
      case "notes":
        renderNotesBrowser(c, p[1], p[2], r.params.hl);
        break;
      case "notes-search":
        Views.renderNotesSearch(c, p[1] || "");
        break;
      case "fav":
        Views.renderFavorites(c, layoutCtx.style === "cards" ? "cards" : "table");
        /* companion chỉ nên bám mã lẻ 8 số (favEntries().codes) — nhóm/phân nhóm đã lưu
           không có dữ liệu thuế để companion hiển thị (xem groupInfo trong store.js) */
        var favCodes = Store.favEntries().codes;
        if (favCodes.length) lastInfo = { kind: "results", hits: favCodes, tokens: [] };
        break;
      case "history":
        Views.renderHistory(c);
        break;
      case "mynotes":
        Views.renderMyNotes(c);
        break;
      case "calc":
        Views.renderCalc(c, p[1]);
        break;
      case "refs":
        Views.renderRef(c, p[1]);
        break;
      case "settings":
        Views.renderSettings(c);
        break;
      default:
        renderHome(c);
    }
    layoutCtx.onRoute(("#/" + p[0]).replace(/#\/$/, "#/") + (p[1] ? "/" + p[1] : ""));
    Views.renderCompanion(layoutCtx, lastInfo);
  }

  /* trang chủ: giới thiệu + lối tắt */
  function renderHome(c) {
    var meta = D.meta || {};
    var wrap = el("div", { class: "home" });
    wrap.appendChild(el("h2", { class: "page-title" }, "Tra cứu Biểu thuế XNK 2026 & Chú giải HS 2022"));
    wrap.appendChild(el("p", { class: "muted" },
      "Nhập mã HS (VD: 8471, 0102.21) hoặc mô tả hàng hóa (VD: máy vi tính) vào ô tìm kiếm phía trên. " +
      (U.isWeb() ? "Đánh dấu, ghi chú và lịch sử tra cứu được lưu ngay trong trình duyệt của bạn."
        : "Toàn bộ dữ liệu chạy trên máy của bạn — không cần Internet.")));
    var stats = el("div", { class: "home-stats" }, [
      statCard(meta.stats ? meta.stats.code8 : "…", "mã HS chi tiết"),
      statCard(D.chapters ? D.chapters.length : "97", "chương"),
      statCard(Views.ftaCount(), "hiệp định FTA"),
      statCard(D.notesIdx ? D.notesIdx.length : 0, "chương chú giải"),
      statCard(D.added ? D.added.length : 0, "mã mới 2026"),
      statCard(D.removed ? D.removed.length : 0, "mã hết hiệu lực")
    ]);
    wrap.appendChild(stats);
    var quick = el("div", { class: "home-quick" });
    [["#/chapters", "📚 Duyệt danh mục " + (D.chapters ? D.chapters.length : 97) + " chương"],
     ["#/notes", "📖 Đọc Chú giải HS 2022"],
     ["#/refs/changes", "🔁 Thay đổi danh mục 2026"],
     ["#/calc", "🧮 Ước tính thuế nhập khẩu"],
     ["#/refs/qt6", "📐 6 Quy tắc phân loại"],
     ["#/fav", "⭐ Danh sách yêu thích"]].forEach(function (q) {
      quick.appendChild(el("a", { class: "quick-card", href: q[0] }, q[1]));
    });
    wrap.appendChild(quick);
    var hist = Store.history().slice(0, 8);
    if (hist.length) {
      wrap.appendChild(el("h3", null, "Tra cứu gần đây"));
      var hl = el("div", { class: "home-hist" });
      hist.forEach(function (h) {
        hl.appendChild(el("a", {
          class: "chip",
          href: h.t === "c" ? "#/code/" + h.v : "#/q/" + encodeURIComponent(h.v)
        }, h.t === "c" ? U.fmtCode(h.v) : h.v));
      });
      wrap.appendChild(hl);
    }
    c.appendChild(wrap);
  }
  function statCard(num, label) {
    return el("div", { class: "stat-card" }, [el("b", null, String(num)), el("span", null, label)]);
  }

  /* trình duyệt chú giải: cây bên trái + nội dung bên phải */
  function renderNotesBrowser(c, cid, anchor4, hl) {
    var tree = el("div", { class: "notes-tree-pane" });
    var reader = el("div", { class: "notes-reader-pane" });
    c.appendChild(el("div", { class: "notes-browser" }, [tree, reader]));
    var active = cid || "intro";
    Views.renderNotesTree(tree, active, function (pick) {
      go("#/notes/" + pick);
    });
    var tokens = hl ? U.norm(hl).split(/\s+/).filter(Boolean) : [];
    Views.renderNotesReader(reader, active, anchor4, tokens);
  }

  /* ---------------- khởi động ---------------- */
  function boot() {
    /* tắt cơ chế tự khôi phục cuộn trang của trình duyệt — router tự quản lý cuộn
       (window.scrollTo(0,0) trong route()); nếu không tắt, mở thẳng 1 link có hash
       sẵn (F5, dán link) có thể bị trình duyệt tự cuộn xuống vị trí cũ, đè lên đó */
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    var splash = document.getElementById("splash");
    var prog = document.getElementById("splash-progress");
    if (prog) prog.style.width = "60%";
    setTimeout(function () {
      Store.buildIndex();
      U.initTooltip();
      if (prog) prog.style.width = "100%";
      applyMode();
      renderLayout();
      document.getElementById("app").hidden = false;
      splash.style.display = "none";
      route();
    }, 30);
    window.addEventListener("hashchange", route);
  }

  document.addEventListener("DOMContentLoaded", boot);

  return { go: go, state: state, setLayout: setLayout, setMode: setMode, select: select };
})();
