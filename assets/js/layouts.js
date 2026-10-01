/* layouts.js — khung (chrome) của 4 giao diện */
"use strict";

var Layouts = (function () {
  var el = U.el;

  var CREDIT = "Thiết kế bởi Đàm Mạnh Hiếu — Hải quan Khu vực II";
  var MAILTO = "mailto:dammanhhieu@gmail.com?subject=" +
    encodeURIComponent("Góp ý ứng dụng Tra cứu Biểu thuế XNK 2026");

  var NAV = [
    ["#/", "🔍", "Tra cứu"],
    ["#/chapters", "📚", "Danh mục"],
    ["#/notes", "📖", "Chú giải HS"],
    ["#/fav", "⭐", "Ưa thích"],
    ["#/mynotes", "📝", "Ghi chú"],
    ["#/history", "🕐", "Lịch sử"],
    ["#/calc", "🧮", "Tính thuế"],
    ["#/settings", "⚙", "Cài đặt"]
  ];
  var REF_MENU = [
    ["#/refs/xk", "Biểu thuế xuất khẩu"],
    ["#/refs/xk-cptpp", "XK ưu đãi CPTPP"],
    ["#/refs/xk-ev", "XK ưu đãi EVFTA"],
    ["#/refs/xk-ukv", "XK ưu đãi UKVFTA"],
    ["#/refs/ttdb", "Thuế TTĐB 2026"],
    ["#/refs/bvmt", "Thuế BVMT 2026"],
    ["#/refs/pl1", "Không giảm VAT (PL I)"],
    ["#/refs/pl2", "Danh mục TTĐB (PL II)"],
    ["#/refs/qt6", "6 Quy tắc tổng quát"],
    ["#/refs/changes", "Mã mới/bỏ 2026"],
    ["#/refs/bang", "Bảng kèm theo"],
    ["#/refs/ht", "Văn bản pháp luật"]
  ];

  function creditBar(rightEls) {
    return el("div", { class: "credit-bar" }, [
      el("em", null, CREDIT),
      rightEls ? el("span", { class: "credit-right" }, rightEls) : null
    ]);
  }

  function logoImg() {
    return el("a", { class: "logo-link", href: "#/", title: "Về trang chủ", "aria-label": "Về trang chủ" },
      el("img", { class: "logo", src: "assets/img/logo.jpg", alt: "Hải quan Việt Nam" }));
  }

  /* nút "Trang chủ" — KHÔNG gán data-route: mục NAV "🔍 Tra cứu" đã dùng data-route="#/" để sáng
     khi đang ở khu vực tra cứu (bao gồm cả #/q/* và #/code/*, xem markActive) — nếu nút này cũng
     gán data-route thì 2 nút sẽ cùng sáng song song, gây khó hiểu. Nút này chỉ đơn thuần điều
     hướng, không tham gia trạng thái active. */
  function homeBtn(iconOnly) {
    return el("a", { class: "head-link home-link", href: "#/", title: "Về trang chủ" },
      iconOnly ? "🏠" : "🏠 Trang chủ");
  }

  /* nút thu gọn/mở rộng sidebar — dùng chung cho GD1 (.l1-collapse) và GD3 (.l3-collapse).
     Nhãn/tooltip/aria-expanded phải đổi theo Store.settings.sideCollapsed cả lúc dựng ban đầu
     LẪN lúc bấm (tránh lệch trạng thái sau F5, khi sideCollapsed đã lưu sẵn true) — cùng khuôn
     mẫu "1 hàm sinh nhãn dùng lại ở cả 2 nơi" như only8Label() bên dưới.
     `getBody` là 1 THUNK, không nhận thẳng biến `body`: ở layout1, `body` được khai báo TRƯỚC nút
     nên truyền thẳng được, nhưng ở layout3 nó khai báo SAU nút (dòng ~420, nhờ hoisting `var` mà
     closure vẫn đúng lúc click) — truyền thẳng biến lúc đó sẽ chụp phải `undefined`. */
  function sideCollapseBtn(cls, getBody) {
    function label() { return Store.settings.sideCollapsed ? "›" : "‹ Thu gọn"; }
    function tip() { return Store.settings.sideCollapsed ? "Mở rộng danh mục" : "Thu gọn danh mục"; }
    var b = el("button", {
      class: cls, title: tip(), "aria-expanded": String(!Store.settings.sideCollapsed),
      onclick: function () {
        Store.settings.sideCollapsed = !Store.settings.sideCollapsed;
        Store.saveSettings();
        var body = getBody();
        if (body) body.classList.toggle("side-collapsed", Store.settings.sideCollapsed);
        b.textContent = label();
        b.title = tip();
        b.setAttribute("aria-expanded", String(!Store.settings.sideCollapsed));
      }
    }, label());
    return b;
  }

  function layoutSwitcher() {
    var n = Store.settings.layout;
    return el("div", { class: "lay-switch" }, [
      el("button", { class: "ls-btn", title: "Giao diện trước", onclick: function () { App.setLayout(n === 1 ? 4 : n - 1); } }, "‹"),
      el("span", { class: "ls-label", onclick: function () { App.go("#/settings"); } }, "Giao diện " + n + " / 4"),
      el("button", { class: "ls-btn", title: "Giao diện sau", onclick: function () { App.setLayout(n === 4 ? 1 : n + 1); } }, "›")
    ]);
  }

  function modeSwitcher() {
    var labels = { light: "☀ Sáng", dark: "🌙 Tối", auto: "🌗 Tự động" };
    var order = ["light", "dark", "auto"];
    var b = el("button", {
      class: "mode-switch", title: "Chế độ màu: Sáng / Tối / Tự động",
      onclick: function () {
        var cur = order.indexOf(Store.settings.mode);
        App.setMode(order[(cur + 1) % 3]);
      }
    }, labels[Store.settings.mode]);
    return b;
  }

  function searchBox(opts) {
    opts = opts || {};
    var input = el("input", {
      class: "search-input", type: "search",
      placeholder: opts.placeholder || "Nhập mã HS hoặc mô tả hàng hóa…",
      value: App.state.q || ""
    });
    function go() {
      var q = input.value.trim();
      if (!q) return;
      App.go("#/q/" + encodeURIComponent(q));
      input.select();   // bôi đen sẵn để lượt tìm tiếp theo gõ đè, không cần tự xóa
    }
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
    var box = el("div", { class: "search-box" }, [
      el("span", { class: "search-ico" }, "🔍"), input,
      opts.button !== false ? el("button", { class: "btn btn-primary", onclick: go }, opts.buttonLabel || "Tìm kiếm") : null,
      opts.notesBtn ? el("button", {
        class: "btn", title: "Tìm trong toàn văn Chú giải HS 2022",
        onclick: function () {
          var q = input.value.trim();
          if (q) App.go("#/notes-search/" + encodeURIComponent(q));
        }
      }, "Tìm trong chú giải") : null
    ]);
    box.focusInput = function () { input.focus(); };
    return box;
  }

  function footer() {
    var meta = window.__HSDATA.meta || {};
    return el("footer", { class: "app-footer" }, [
      el("div", { class: "footer-cards" }, [
        el("details", { class: "gopy-card" }, [
          el("summary", null, [el("span", { class: "gopy-ico" }, "💬"), " Góp ý"]),
          el("div", { class: "footer-card-body" },
            el("a", { href: MAILTO }, "Gửi góp ý để cải thiện ứng dụng »"))
        ]),
        el("details", { class: "donate-card" }, [
          el("summary", null, [el("span", { class: "gopy-ico" }, "☕"), " Ủng hộ tác giả"]),
          el("div", { class: "footer-card-body donate-body" }, [
            el("img", { class: "donate-qr", src: "assets/img/qr-bidv.jpg", alt: "QR ủng hộ BIDV" }),
            el("div", { class: "donate-text" }, [
              el("div", null, "Nếu bạn thấy ứng dụng hữu ích, hãy ủng hộ tôi một tách cà phê nhé!"),
              el("div", { class: "donate-acc" }, "ĐÀM MẠNH HIẾU · BIDV · 2220289471")
            ])
          ])
        ])
      ]),
      el("div", { class: "version-line" },
        "Phiên bản " + (meta.version || "?") + "  ·  Build " + U.fmtDateTime(meta.built) +
        (U.isWeb() ? "" : "  ·  Dữ liệu chạy hoàn toàn trên máy"))
    ]);
  }

  function navList(cls, withRefs) {
    var nav = el("nav", { class: cls });
    NAV.forEach(function (n) {
      nav.appendChild(el("a", { class: "nav-item", href: n[0], "data-route": n[0] },
        [el("span", { class: "nav-ico" }, n[1]), el("span", { class: "nav-label" }, n[2])]));
    });
    if (withRefs) {
      var det = el("details", { class: "nav-refs" }, [
        el("summary", null, [el("span", { class: "nav-ico" }, "📑"), el("span", { class: "nav-label" }, "Biểu thuế khác")])]);
      REF_MENU.forEach(function (r) {
        det.appendChild(el("a", {
          class: "nav-item sub", href: r[0], "data-route": r[0],
          onclick: function () { det.open = false; det._skipAutoOpen = true; }
        }, r[1]));
      });
      nav.appendChild(det);
    }
    return nav;
  }

  function markActive(root, route) {
    root.querySelectorAll("[data-route]").forEach(function (a) {
      var r = a.getAttribute("data-route");
      var active = r === "#/" ? (route === "#/" || route.indexOf("#/q/") === 0 || route.indexOf("#/code/") === 0)
        : (route === r || route.indexOf(r + "/") === 0);
      a.classList.toggle("active", active);
      if (active) {
        var det = a.closest("details");
        if (det) {
          if (det._skipAutoOpen) det._skipAutoOpen = false;
          else det.open = true;
        }
      }
    });
  }

  /* ============ GIAO DIỆN 1 — xanh dương "TRA CỨU MÃ HS" ============ */
  function layout1(root) {
    var content = el("main", { class: "content" });
    var below = el("div", { class: "comp-panel l1-panel" });
    var refDet;
    var sidebar = el("aside", { class: "l1-sidebar" });
    sidebar.appendChild(el("div", { class: "l1-side-title" }, "DANH MỤC CHƯƠNG"));
    var chList = el("div", { class: "l1-chapters" });
    window.__HSDATA.chapters.forEach(function (c) {
      chList.appendChild(el("a", {
        class: "l1-ch", href: "#/chapter/" + c.c, "data-route": "#/chapter/" + c.c
      }, [el("span", { class: "l1-ch-num" }, c.c), el("span", { class: "l1-ch-title" }, c.vi), el("span", { class: "l1-ch-arr" }, "›")]));
    });
    sidebar.appendChild(chList);
    var body = el("div", { class: "l1-body" + (Store.settings.sideCollapsed ? " side-collapsed" : "") });
    sidebar.appendChild(sideCollapseBtn("l1-collapse", function () { return body; }));

    var header = el("header", { class: "l1-header" }, [
      logoImg(),
      el("h1", null, "Biểu thuế XNK 2026 và Chú giải HS"),
      el("div", { class: "head-tools" }, [
        homeBtn(), layoutSwitcher(), modeSwitcher(),
        el("a", { class: "head-link", href: "#/notes", "data-route": "#/notes" }, "📖 Chú giải HS"),
        el("a", { class: "head-link", href: "#/fav", "data-route": "#/fav" }, "🔖 Danh sách yêu thích"),
        el("a", { class: "head-link", href: "#/history", "data-route": "#/history" }, "🕐 Lịch sử tra cứu"),
        el("a", { class: "head-link", href: "#/settings", "data-route": "#/settings" }, "⚙ Cài đặt")
      ])
    ]);

    /* hàng chip bộ lọc như ảnh 1 */
    var chips = el("div", { class: "l1-chips" });
    function buildChips() {
      chips.innerHTML = "";
      chips.appendChild(el("span", { class: "chip chip-f" }, "Năm: 2026"));
      var chSel = el("select", { class: "chip-select" });
      chSel.appendChild(el("option", { value: "" }, "Chương: tất cả"));
      window.__HSDATA.chapters.forEach(function (c) {
        chSel.appendChild(el("option", { value: c.c }, "Chương " + c.c));
      });
      chSel.addEventListener("change", function () {
        if (chSel.value) App.go("#/chapter/" + chSel.value);
      });
      chips.appendChild(el("span", { class: "chip chip-f" }, ["📂 ", chSel]));
      function only8Label() {
        return body.classList.contains("only8") ? "Tất cả các mã" : "Chỉ mã 8 số";
      }
      var only8 = el("a", {
        class: "chip chip-f" + (body.classList.contains("only8") ? " on" : ""),
        onclick: function () {
          body.classList.toggle("only8");
          only8.classList.toggle("on", body.classList.contains("only8"));
          only8.textContent = only8Label();
        }
      }, only8Label());
      chips.appendChild(only8);
      chips.appendChild(el("a", {
        class: "chip-clear",
        onclick: function () { body.classList.remove("only8"); buildChips(); App.go("#/"); }
      }, "↻ Xóa bộ lọc"));
      refDet = el("details", { class: "chip chip-menu" }, [
        el("summary", null, "Biểu thuế khác ▾"),
        el("div", { class: "chip-drop" }, REF_MENU.map(function (r) {
          return el("a", { href: r[0], onclick: function () { refDet.open = false; } }, r[1]);
        }))]);
      chips.appendChild(refDet);
    }
    var filterBtn = el("button", {
      class: "btn", onclick: function () { chips.hidden = !chips.hidden; }
    }, "☰ Bộ lọc");
    buildChips();
    var searchRow = el("div", { class: "l1-search-row" }, [
      el("div", { class: "l1-search-line" }, [searchBox({ notesBtn: true }), filterBtn]),
      chips
    ]);

    var main = el("div", { class: "l1-main" }, [content, below]);
    body.appendChild(sidebar);
    body.appendChild(main);
    root.appendChild(creditBar());
    root.appendChild(header);
    root.appendChild(searchRow);
    root.appendChild(body);
    root.appendChild(footer());
    return {
      content: content, below: below, compMode: "l1", style: "table",
      onRoute: function (route) { markActive(root, route); if (refDet) refDet.open = false; }
    };
  }

  /* ============ GIAO DIỆN 2 — xanh lá "HS Việt Nam" ============ */
  function layout2(root) {
    var content = el("main", { class: "content" });
    var below = el("div", { class: "comp-panel l2-panel" });
    var actionRail = el("div", { class: "l2-action-rail" });
    var header = el("header", { class: "l2-header" }, [
      el("div", { class: "l2-brand" }, [logoImg(), el("h1", null, "Biểu thuế XNK 2026 và Chú giải HS")]),
      el("div", { class: "head-tools" }, [
        homeBtn(), layoutSwitcher(),
        // từng có badge "✓ Mặc định" ở đây (luôn hiện vì GD2 là mặc định) — bỏ từ v1.3.48 khi GD4 thành mặc định
        modeSwitcher(),
        el("span", { class: "l2-badge green" }, U.isWeb() ? "✓ Bản trực tuyến" : "✓ Dữ liệu trên máy"),
        el("a", { class: "head-link", href: "#/settings", "data-route": "#/settings" }, "⚙")
      ])
    ]);

    /* Tìm nâng cao: dropdown bộ lọc như ảnh 2 */
    var advPanel = el("div", { class: "l2-adv", hidden: true });
    var advCh = el("select", { class: "inp" });
    advCh.appendChild(el("option", { value: "" }, "Tất cả chương"));
    window.__HSDATA.chapters.forEach(function (c) {
      advCh.appendChild(el("option", { value: c.c }, "Chương " + c.c + " — " + c.vi.slice(0, 36)));
    });
    advCh.addEventListener("change", function () { if (advCh.value) App.go("#/chapter/" + advCh.value); });
    var advNotes = el("button", {
      class: "btn",
      onclick: function () {
        var q = App.state.q || root.querySelector(".search-input").value.trim();
        if (q) App.go("#/notes-search/" + encodeURIComponent(q));
      }
    }, "📖 Tìm trong toàn văn chú giải");
    advPanel.appendChild(el("label", null, ["Duyệt theo chương: ", advCh]));
    advPanel.appendChild(advNotes);
    var advBtn = el("button", {
      class: "btn btn-outline", onclick: function () { advPanel.hidden = !advPanel.hidden; }
    }, "▼ Tìm nâng cao");

    var sb = searchBox({ placeholder: "Bạn muốn tra cứu mặt hàng nào?", buttonLabel: "✨ Tìm thông minh" });
    sb.appendChild(advBtn);
    var search = el("div", { class: "l2-search-row" }, [sb, advPanel]);
    var rail = navList("l2-rail", true);

    root.appendChild(creditBar());
    root.appendChild(header);
    root.appendChild(el("div", { class: "l2-body" }, [
      rail,
      el("div", { class: "l2-main" }, [search, content, below]),
      actionRail
    ]));
    root.appendChild(footer());
    return {
      content: content, below: below, rail: actionRail, compMode: "l2", style: "cards",
      onRoute: function (route) { markActive(root, route); }
    };
  }

  /* ============ GIAO DIỆN 3 — chuyên sâu nền tối ============ */
  function layout3(root) {
    var content = el("main", { class: "content" });
    var below = el("div", { class: "comp-panel l3-panel" });
    var sidebar = el("aside", { class: "l3-sidebar" }, [
      el("div", { class: "l3-brand" }, [logoImg(), el("div", null, [el("b", null, "Biểu thuế XNK 2026 và Chú giải HS")])]),
      navList("l3-nav", true)
    ]);
    /* badge đếm yêu thích trên mục "Ưa thích" */
    var favBadge = el("span", { class: "nav-badge" }, String(Store.favCount()));
    sidebar.querySelectorAll(".nav-item").forEach(function (a) {
      if (a.getAttribute("data-route") === "#/fav") a.appendChild(favBadge);
    });
    sidebar.appendChild(sideCollapseBtn("l3-collapse", function () { return body; }));

    var exactToggle = el("div", { class: "l3-exact" }, [
      el("button", { class: "tab" + (!App.state.exact ? "" : " active"), onclick: function () { App.state.exact = true; refreshToggle(); reSearch(); } }, "Chính xác"),
      el("button", { class: "tab" + (App.state.exact ? "" : " active"), onclick: function () { App.state.exact = false; refreshToggle(); reSearch(); } }, "Tương tự")
    ]);
    function refreshToggle() {
      exactToggle.children[0].classList.toggle("active", !!App.state.exact);
      exactToggle.children[1].classList.toggle("active", !App.state.exact);
    }
    function reSearch() { if (App.state.q) App.go("#/q/" + encodeURIComponent(App.state.q), true); }
    refreshToggle();

    /* dropdown Hiệp định/Chế độ -> lọc cột FTA của bảng */
    var ftaSel = el("select", { class: "inp l3-fta" });
    ftaSel.appendChild(el("option", { value: "" }, "Hiệp định: Tất cả"));
    window.__HSDATA.taxcols.forEach(function (tc) {
      if (["nktt", "nkud", "vat", "ttdb", "bvmt", "xk", "xkcptpp", "xkev", "xkukv"].indexOf(tc[0]) >= 0) return;
      ftaSel.appendChild(el("option", { value: tc[0] }, tc[1]));
    });
    ftaSel.addEventListener("change", function () {
      App.state.ftaFilter = ftaSel.value;
      reSearch();
    });
    var yearSel = el("select", { class: "inp l3-year-sel" },
      el("option", null, "Năm áp dụng: 2026"));
    var toolbar = el("div", { class: "l3-toolbar" }, [
      homeBtn(),
      el("span", { class: "l3-lb" }, "Tìm kiếm mã HS"),
      searchBox({ placeholder: "Nhập mã hoặc mô tả…" }), exactToggle,
      ftaSel, yearSel,
      el("button", {
        class: "btn", onclick: function () {
          App.state.ftaFilter = ""; ftaSel.value = "";
          App.state.exact = false; refreshToggle();
          App.go("#/");
        }
      }, "Xóa lọc"),
      el("button", {
        class: "btn", onclick: function () {
          if (App.state.lastHits && App.state.lastHits.length) Views.exportHits(App.state.lastHits, "ket-qua-l3.csv");
        }
      }, "⬇ Xuất")
    ]);

    /* splitter kéo đổi chiều cao tối đa của khung bảng thuế. Trước v1.3.40 nó set flex-basis %
       trên .content để chia đôi 1 màn hình khóa cứng — nay trang cuộn tự do (xem base.css §GD3),
       nên splitter chuyển sang đặt biến CSS --l3-table-max (đơn vị vh) tiêu thụ bởi
       .table-full { max-height: var(--l3-table-max, 68vh) }. */
    var splitter = el("div", { class: "l3-splitter", title: "Kéo để thay đổi kích thước" },
      "⇕ Kéo để thay đổi kích thước");
    var mainCol = el("div", { class: "l3-main" }, [content, splitter, below]);
    function applySplit() {
      content.style.setProperty("--l3-table-max", (Store.settings.split3 || 52) + "vh");
    }
    applySplit();
    splitter.addEventListener("mousedown", function (ev) {
      ev.preventDefault();
      var startY = ev.clientY, startPct = Store.settings.split3 || 52;
      var h = window.innerHeight || 600;   // trang cuộn tự do -> dùng chiều cao viewport làm mẫu số
      function mv(e) {
        var pct = startPct + (e.clientY - startY) / h * 100;
        Store.settings.split3 = Math.max(20, Math.min(80, pct));
        applySplit();
      }
      function up() {
        document.removeEventListener("mousemove", mv);
        document.removeEventListener("mouseup", up);
        Store.saveSettings();
      }
      document.addEventListener("mousemove", mv);
      document.addEventListener("mouseup", up);
    });

    var statusLeft = el("span", null, "Cơ sở dữ liệu: Biểu thuế Việt Nam HS 2022 (sửa đổi, bổ sung 2026)");
    var statusMid = el("span", { id: "l3-status" }, "");
    var meta = window.__HSDATA.meta || {};
    var status = el("div", { class: "l3-status" }, [
      statusLeft, statusMid,
      el("span", null, "Phiên bản " + (meta.version || "?") + " · Build " + U.fmtDateTime(meta.built) + (U.isWeb() ? " · ● Trực tuyến" : " · ● Ngoại tuyến"))
    ]);
    var body = el("div", { class: "l3-body" + (Store.settings.sideCollapsed ? " side-collapsed" : "") },
      [sidebar, mainCol]);
    root.appendChild(creditBar([layoutSwitcher(), modeSwitcher()]));
    root.appendChild(toolbar);
    root.appendChild(body);
    root.appendChild(footer());
    root.appendChild(status);
    return {
      content: content, below: below, compMode: "l3", style: "full",
      onRoute: function (route) {
        markActive(root, route);
        favBadge.textContent = String(Store.favCount());
      }
    };
  }

  /* ============ GIAO DIỆN 4 — đỏ đô "THƯ VIỆN HS & BIỂU THUẾ" (mặc định) ============ */
  function layout4(root) {
    var content = el("main", { class: "content" });
    var asideRight = el("aside", { class: "l4-detail", hidden: true });
    var below = el("div", { class: "comp-panel l4-panel" });
    var header = el("header", { class: "l4-header" }, [
      logoImg(), el("h1", null, "Biểu thuế XNK 2026 và Chú giải HS"),
      searchBox({ placeholder: "Tìm kiếm mã HS, mô tả hàng hóa, chú giải…", notesBtn: true }),
      el("div", { class: "head-tools" }, [
        homeBtn(true),
        el("span", { class: "l4-badge" }, U.isWeb() ? "● Bản trực tuyến" : "● Hoạt động ngoại tuyến"),
        el("a", { class: "head-link", href: "#/mynotes", "data-route": "#/mynotes", title: "Ghi chú" }, "📝 Ghi chú"),
        el("a", { class: "head-link", href: "#/fav", "data-route": "#/fav", title: "Đánh dấu" }, "🔖 Đánh dấu"),
        el("a", { class: "head-link", href: "#/history", "data-route": "#/history", title: "Lịch sử" }, "🕐 Lịch sử"),
        el("a", { class: "head-link", href: "#/settings", "data-route": "#/settings", title: "Cài đặt" }, "⚙ Cài đặt")
      ])
    ]);
    var menu = el("aside", { class: "l4-menu" });
    var groups = [
      ["#/", "Tra cứu biểu thuế"], ["#/notes", "Chú giải HS"],
      ["#/refs/ht", "Văn bản pháp luật"], ["#/chapters", "Danh mục chương"],
      ["#/refs/xk", "Biểu thuế xuất khẩu"], ["#/refs/ttdb", "Thuế TTĐB"],
      ["#/refs/bvmt", "Thuế BVMT"], ["#/refs/pl1", "Không giảm VAT"],
      ["#/refs/qt6", "6 Quy tắc tổng quát"], ["#/refs/changes", "Mã mới/bỏ 2026"],
      ["#/calc", "Công cụ tính thuế"], ["#/fav", "Đã đánh dấu"],
      ["#/mynotes", "Ghi chú của tôi"], ["#/history", "Lịch sử"], ["#/settings", "Cài đặt"]
    ];
    groups.forEach(function (g) {
      menu.appendChild(el("a", { class: "nav-item", href: g[0], "data-route": g[0] }, g[1]));
    });
    var meta = window.__HSDATA.meta || {};
    menu.appendChild(el("div", { class: "l4-menu-note" },
      "Cơ sở dữ liệu cập nhật " + U.fmtDateTime(meta.built).slice(0, 10)));
    root.appendChild(creditBar([layoutSwitcher(), modeSwitcher()]));
    root.appendChild(header);
    root.appendChild(el("div", { class: "l4-body" }, [menu, content, asideRight]));
    root.appendChild(below);
    root.appendChild(footer());
    return {
      content: content, below: below, asideRight: asideRight, compMode: "l4", style: "lib",
      onRoute: function (route) { markActive(root, route); }
    };
  }

  return { 1: layout1, 2: layout2, 3: layout3, 4: layout4 };
})();
