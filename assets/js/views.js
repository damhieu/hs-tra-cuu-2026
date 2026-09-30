/* views.js — các màn hình nội dung dùng chung cho cả 4 giao diện */
"use strict";

var Views = (function () {
  var D = window.__HSDATA;
  var el = U.el;

  /* ================= KẾT QUẢ TÌM KIẾM ================= */

  /* các cột thuế hiển thị nhanh ở bảng kết quả */
  var QUICK_COLS = [["nktt", "NK TT"], ["nkud", "NK ưu đãi"], ["vat", "VAT"], ["acfta", "ACFTA"],
                    ["atiga", "ATIGA"], ["cptpp", "CPTPP"], ["evfta", "EVFTA"]];

  /* tên đầy đủ của từng loại thuế/hiệp định — lấy theo tiêu đề các bảng FTA của biểu thuế,
     dùng cho tooltip khi hover tiêu đề cột viết tắt */
  var TAX_TIP = {
    nktt: "Thuế suất nhập khẩu thông thường — áp dụng khi hàng hóa không đủ điều kiện hưởng thuế ưu đãi/ưu đãi đặc biệt",
    nkud: "Thuế suất nhập khẩu ưu đãi (MFN) — áp dụng theo nguyên tắc Tối huệ quốc (WTO)",
    vat: "Thuế giá trị gia tăng",
    acfta: "ACFTA — Hiệp định Thương mại Hàng hóa ASEAN – Trung Quốc",
    atiga: "ATIGA — Hiệp định Thương mại Hàng hóa ASEAN",
    ajcep: "AJCEP — Hiệp định Đối tác Kinh tế Toàn diện ASEAN – Nhật Bản",
    vjepa: "VJEPA — Hiệp định Đối tác Kinh tế Việt Nam – Nhật Bản",
    akfta: "AKFTA — Hiệp định Thương mại Hàng hóa ASEAN – Hàn Quốc",
    aanzfta: "AANZFTA — Hiệp định Khu vực Thương mại Tự do ASEAN – Australia – New Zealand",
    aifta: "AIFTA — Hiệp định Thương mại Hàng hóa ASEAN – Ấn Độ",
    vkfta: "VKFTA — Hiệp định Thương mại Tự do Việt Nam – Hàn Quốc",
    vcfta: "VCFTA — Hiệp định Thương mại Tự do Việt Nam – Chile",
    eaeu: "VN-EAEU — Hiệp định Thương mại Tự do Việt Nam – Liên minh Kinh tế Á-Âu",
    cptpp: "CPTPP — Hiệp định Đối tác Toàn diện và Tiến bộ xuyên Thái Bình Dương",
    ahkfta: "AHKFTA — Hiệp định Thương mại Tự do ASEAN – Hồng Kông, Trung Quốc",
    vncu: "VN-Cuba — Hiệp định Thương mại Việt Nam – Cuba",
    evfta: "EVFTA — Hiệp định Thương mại Tự do Việt Nam – Liên minh châu Âu",
    ukvfta: "UKVFTA — Hiệp định Thương mại Tự do Việt Nam – Vương quốc Anh",
    vnlao: "VN-Lào — Hiệp định Thương mại Việt Nam – Lào",
    vncam: "VN-CAM — Thỏa thuận thương mại Việt Nam – Campuchia giai đoạn 2025-2026",
    vifta: "VIFTA — Hiệp định Thương mại Tự do Việt Nam – Israel",
    rceptA: "RCEP (nhóm A) — Thuế suất RCEP áp dụng cho hàng hóa xuất xứ ASEAN",
    rceptB: "RCEP (nhóm B) — Thuế suất RCEP áp dụng cho hàng hóa xuất xứ Australia",
    rceptC: "RCEP (nhóm C) — Thuế suất RCEP áp dụng cho hàng hóa xuất xứ Trung Quốc",
    rceptD: "RCEP (nhóm D) — Thuế suất RCEP áp dụng cho hàng hóa xuất xứ Nhật Bản",
    rceptE: "RCEP (nhóm E) — Thuế suất RCEP áp dụng cho hàng hóa xuất xứ Hàn Quốc",
    rceptF: "RCEP (nhóm F) — Thuế suất RCEP áp dụng cho hàng hóa xuất xứ New Zealand",
    ttdb: "Thuế tiêu thụ đặc biệt",
    xk: "Thuế xuất khẩu",
    xkcptpp: "Thuế xuất khẩu ưu đãi theo CPTPP",
    xkev: "Thuế xuất khẩu ưu đãi theo EVFTA",
    xkukv: "Thuế xuất khẩu ưu đãi theo UKVFTA",
    bvmt: "Thuế bảo vệ môi trường"
  };
  function colTip(key) { return TAX_TIP[key] || null; }

  /* tooltip "VB … • HL …" cho một mục thuế từ Store.taxOf */
  function taxTip(t) {
    if (!t || t.rate === "" || !t.doc) return null;
    return t.label + " — VB: " + t.doc + (t.date ? " • HL: " + t.date : "");
  }

  /* map key -> mục thuế của một dòng (1 lần gọi taxOf dùng chung mọi cột) */
  function taxByKey(i) {
    var m = {};
    Store.taxOf(i).forEach(function (t) { m[t.k] = t; });
    return m;
  }

  /* đồng bộ mọi nút ★/rail "Ưa thích" cùng 1 mã — có thể có nhiều nút cho cùng mã cùng lúc
     (VD giao diện 4: bảng + khung chi tiết + thanh công cụ khung chương), bấm 1 nút phải
     cập nhật hết các nút còn lại thay vì chỉ tự cập nhật chính nó */
  var favListeners = {};   // code -> [{fn, el}, ...]
  function watchFav(code, fn, el) {
    (favListeners[code] = favListeners[code] || []).push({ fn: fn, el: el });
  }
  /* mỗi lần thông báo cũng dọn luôn các mục đã bị gỡ khỏi DOM (nút cũ từ lần render
     trước) — tránh mảng phình to vô hạn qua thời gian dùng dài */
  function notifyFav(code) {
    var list = favListeners[code];
    if (!list) return;
    list = list.filter(function (item) { return item.el && item.el.isConnected; });
    favListeners[code] = list;
    list.forEach(function (item) { try { item.fn(); } catch (e) {} });
  }

  function starBtn(code) {
    var b = el("button", {
      class: "star-btn" + (Store.isFav(code) ? " on" : ""),
      title: "Đánh dấu yêu thích",
      onclick: function (ev) {
        ev.stopPropagation();
        var on = Store.toggleFav(code);
        notifyFav(code);
        if (code.length >= 8) {
          U.toast(on ? "★ Đã thêm " + U.fmtCode(code) + " vào Yêu thích"
                     : "☆ Đã bỏ " + U.fmtCode(code) + " khỏi Yêu thích");
        } else {
          /* mã < 8 số là tiêu đề nhóm/phân nhóm — báo rõ số mã con để không tưởng nhầm
             chỉ lưu mỗi dòng tiêu đề (xem SYSTEM-SPEC §10.21) */
          var g = Store.groupInfo(code);
          var label = (code.length <= 4 ? "nhóm " : "phân nhóm ") + U.fmtCode(code) +
            (g ? " (" + g.count + " mã)" : "");
          U.toast(on ? "★ Đã lưu " + label + " vào Yêu thích"
                     : "☆ Đã bỏ " + label + " khỏi Yêu thích");
        }
      }
    }, Store.isFav(code) ? "★" : "☆");
    b.update = function () {
      b.textContent = Store.isFav(code) ? "★" : "☆";
      b.classList.toggle("on", Store.isFav(code));
    };
    watchFav(code, b.update, b);
    return b;
  }

  /* thanh điều hướng "‹ Nhóm trước / Nhóm sau ›" dùng chung cho trang chi tiết & trang danh sách.
     prevG/nextG: {head4, label, code?} hoặc null nếu đã ở đầu/cuối. onNav(g) tự quyết định điều
     hướng tới đâu (trang danh sách dùng g.head4, trang chi tiết dùng g.code). */
  function groupNavBar(curHead4, prevG, nextG, onNav) {
    function btn(g, dir) {
      return el("button", {
        class: "btn group-nav-btn",
        disabled: g ? null : "",
        "data-tip": g ? ("Nhóm " + U.fmtCode(g.head4) + " — " + g.label) : null,
        onclick: g ? function () { onNav(g); } : null
      }, dir < 0 ? "‹ Nhóm trước" : "Nhóm sau ›");
    }
    return el("div", { class: "group-nav" }, [
      btn(prevG, -1),
      el("span", { class: "group-nav-cur" }, "Nhóm " + U.fmtCode(curHead4)),
      btn(nextG, 1)
    ]);
  }

  function badgeFor(code) {
    if (Store.addedSet[code]) return el("span", { class: "tag tag-new", title: "Mã HS mới bổ sung từ 2026" }, "MỚI 2026");
    if (Store.removedSet[code]) return el("span", { class: "tag tag-removed", title: "Mã HS không còn áp dụng trong biểu thuế 2026" }, "HẾT HIỆU LỰC");
    return null;
  }

  /* cờ "Quản lý chuyên ngành" cho dòng có chính sách mặt hàng */
  function policyTag(i, full) {
    var pol = i == null ? "" : Store.policyOf(i);
    if (!pol) return null;
    var tip = pol.length > 400 ? pol.slice(0, 400) + "…" : pol;
    return el("span", { class: "tag tag-policy", "data-tip": tip },
      "⚑ " + (full ? "Quản lý chuyên ngành" : "QLCN"));
  }

  /* ---------- chọn dòng (click = chọn + cập nhật companion, dblclick = chi tiết) ---------- */
  function rowClickAttrs(i, code) {
    if (!code) return {};
    return U.clickable({
      onclick: function (ev) {
        if (App.select(i, ev.currentTarget) === false) App.go("#/code/" + code);
      },
      ondblclick: function () { App.go("#/code/" + code); },
      title: "Bấm để xem nhanh · Bấm đúp để mở trang chi tiết"
    });
  }

  /* Phần/Chương/Nhóm của một dòng — cho breadcrumb */
  function pathOf(i) {
    var r = D.rows[i];
    var code = r && r[1] || "";
    var cid = code.slice(0, 2);
    var chapter = null, section = null;
    D.chapters.forEach(function (c) { if (c.c === cid) chapter = c; });
    if (chapter != null) section = D.sections[chapter.sec];
    return { code: code, cid: cid, head4: code.slice(0, 4), chapter: chapter, section: section };
  }

  /* gom các văn bản pháp lý của một dòng (khử trùng lặp) */
  function legalRefsOf(i) {
    var seen = {}, out = [];
    Store.taxOf(i).forEach(function (t) {
      if (t.rate === "" || !t.doc) return;
      var key = t.doc + "|" + t.date;
      if (seen[key]) { seen[key].labels.push(t.label); return; }
      seen[key] = { doc: t.doc, date: t.date, labels: [t.label] };
      out.push(seen[key]);
    });
    return out;
  }

  /* các FTA có thuế suất 0% của một dòng — cột FTA giao diện 1 */
  var FTA_KEYS = ["acfta", "atiga", "ajcep", "vjepa", "akfta", "aanzfta", "aifta", "vkfta",
    "vcfta", "eaeu", "cptpp", "ahkfta", "vncu", "evfta", "ukvfta", "vnlao", "vncam", "vifta",
    "rceptA", "rceptB", "rceptC", "rceptD", "rceptE", "rceptF"];
  /* số hiệp định FTA thực tế — RCEP tính 1 dù có 6 mức theo nhóm nước (rceptA..rceptF) */
  function ftaCount() {
    var n = 0, hasRcept = false;
    FTA_KEYS.forEach(function (k) {
      if (k.indexOf("rcept") === 0) hasRcept = true;
      else n++;
    });
    return n + (hasRcept ? 1 : 0);
  }

  function ftaZeroOf(byKey) {
    var names = [];
    FTA_KEYS.forEach(function (k) {
      var t = byKey[k];
      if (t && (t.rate === "0" || t.rate === "0.0")) names.push(t.label.replace(/\s*\(.*\)/, ""));
    });
    return names;
  }

  function ftaLabel(k) {
    var label = null;
    D.taxcols.forEach(function (tc) { if (tc[0] === k) label = tc[1]; });
    return label || k;
  }

  /* điểm để xếp hạng "mức thuế đáng chú ý nhất": ký hiệu điều kiện đặc biệt (dấu sao,
     chữ Q, dạng phân số...) luôn cao nhất, rồi tới % giảm dần, rỗng (không áp dụng) thấp nhất.
     Dùng U.shortRate để bỏ ghi chú loại trừ nước phía sau số (VD "0 (-BN, KH...)" tính là 0%,
     không phải "đặc biệt"); số thập phân dùng dấu phẩy (VD "16,4") cũng được nhận diện đúng. */
  function ftaRateScore(v) {
    if (v === "" || v == null) return -1;
    var s = U.shortRate(v).replace(",", ".");
    return /^[\d.]+$/.test(s) ? parseFloat(s) : 1e9;
  }

  /* 2 FTA ưu tiên hiển thị trên thẻ kết quả — khi hoà, sắp xếp ổn định giữ nguyên thứ tự
     khai báo trong FTA_KEYS (acfta, atiga đứng đầu) nên tự rơi về đúng mặc định cũ */
  function topFtaKeys(byKey) {
    return FTA_KEYS.slice().sort(function (a, b) {
      return ftaRateScore((byKey[b] || {}).rate) - ftaRateScore((byKey[a] || {}).rate);
    }).slice(0, 2);
  }

  /* trích đoạn chú giải nhóm 4 số vào box (tokens = từ khóa tô sáng). Trả về TRỌN VẸN chú giải
     của đúng nhóm — trước v1.3.42 có cắt cứng theo số ký tự (maxLen khác nhau ở mỗi màn hình),
     khiến 35-69% số nhóm bị cắt cụt giữa câu (nhóm dài nhất 62.443 ký tự chỉ hiện được ~2%),
     xem SYSTEM-SPEC §10.27. Bỏ hẳn giới hạn vì GD3/GD4 đã render toàn văn CẢ CHƯƠNG (lớn hơn
     1 nhóm rất nhiều) qua renderNotesReader mà không có vấn đề gì. */
  function notesExcerptInto(box, cid, head4, tokens) {
    var idx = Store.notesIdxOf(cid);
    if (!idx) { box.textContent = "Chưa có chú giải cho chương này."; return; }
    Store.loadNotes(cid, function (text) {
      if (!text) { box.textContent = "Chưa có chú giải cho chương này."; return; }
      box.innerHTML = "";
      var h = idx.heads.filter(function (x) { return x[0] === head4; })[0];
      if (!h) {
        /* nhóm này không có neo riêng trong chương -> phần "TỔNG QUÁT"/lời mở đầu áp dụng
           chung cho cả chương, không phải chú giải riêng của nhóm đang tra. Nói rõ để người
           dùng không hiểu nhầm (trước đây hiện lặng lẽ, dễ tưởng đây đúng là chú giải nhóm). */
        box.appendChild(el("div", { class: "muted" },
          "Chương " + cid + " không có mục chú giải riêng cho nhóm " + U.fmtCode(head4) +
          " — dưới đây là phần mở đầu áp dụng chung cho cả chương:"));
        var sub = el("div");
        box.appendChild(sub);
        chapterPreambleInto(sub, cid, tokens);
        return;
      }
      var next = idx.heads.filter(function (x) { return x[1] > h[1]; })[0];
      box.appendChild(notesToDom(text.slice(h[1], next ? next[1] : text.length), tokens || []));
    });
  }

  /* phần đầu chương trước neo nhóm đầu tiên = chú giải chung của cả chương (các khoản 1-, 2-,
     "TỔNG QUÁT"). Áp dụng pháp lý cho MỌI nhóm trong chương nên phải cho người dùng đọc được,
     không chỉ dùng làm nội dung dự phòng khi nhóm không có neo riêng (xem notesExcerptInto ở trên). */
  function chapterPreambleInto(box, cid, tokens) {
    var idx = Store.notesIdxOf(cid);
    if (!idx) { box.textContent = "Chưa có chú giải cho chương này."; return; }
    Store.loadNotes(cid, function (text) {
      if (!text) { box.textContent = "Chưa có chú giải cho chương này."; return; }
      var first = idx.heads[0];
      box.innerHTML = "";
      box.appendChild(notesToDom(text.slice(0, first ? first[1] : text.length), tokens || []));
    });
  }

  /* dòng chú giải/tiêu đề (VD "PHÂN CHƯƠNG I", chú thích (SEN)/TCVN...) xen giữa bảng kết quả —
     không phải dòng hàng (r[0] !== 0), chỉ hiện nguyên văn mô tả trên cả bề ngang bảng */
  function ctxNoteRow(r, colspan) {
    return el("tr", { class: "ctx-note-row" },
      el("td", { class: "ctx-note", colspan: colspan }, r[3]));
  }

  function renderResults(root, hits, tokens, style) {
    root.innerHTML = "";
    if (!hits.length) {
      root.appendChild(el("div", { class: "empty" }, "Không tìm thấy kết quả phù hợp."));
      return;
    }
    var info = el("div", { class: "result-info" },
      "Kết quả tìm kiếm: " + hits.length + " dòng phù hợp");
    root.appendChild(info);

    if (style === "cards") {
      /* phân trang giống hệt renderLibResults (GD4) — chương dài (VD 98) có thể ra hàng
         nghìn dòng, dựng hết 1 lần từng gây hàng chục nghìn nút DOM và trang cuộn hàng
         trăm màn hình; tái dùng đúng pageSize/class .lib-pager đã có sẵn */
      var pageSize = Store.settings.pageSize || 50;
      var page = 0;
      var listBox = el("div");
      var pagerBox = el("div", { class: "lib-pager" });
      root.appendChild(listBox);
      root.appendChild(pagerBox);
      function build() {
        var total = hits.length;
        var pages = Math.max(1, Math.ceil(total / pageSize));
        if (page >= pages) page = pages - 1;
        var start = page * pageSize, end = Math.min(start + pageSize, total);
        var list = el("div", { class: "result-cards" });
        hits.slice(start, end).forEach(function (i) {
          var r = D.rows[i];
          list.appendChild(r[0] !== 0 ? el("div", { class: "ctx-note" }, r[3]) : resultCard(i, tokens));
        });
        listBox.innerHTML = "";
        listBox.appendChild(list);

        var sizeSel = el("select", { class: "inp" });
        [20, 50, 100].forEach(function (n) {
          var o = el("option", { value: n }, n + " / trang");
          if (n === pageSize) o.selected = true;
          sizeSel.appendChild(o);
        });
        sizeSel.addEventListener("change", function () {
          pageSize = +sizeSel.value; Store.settings.pageSize = pageSize;
          Store.saveSettings(); page = 0; build();
        });
        pagerBox.innerHTML = "";
        pagerBox.appendChild(el("span", null,
          "Hiển thị " + (start + 1) + " đến " + end + " của " + total + " kết quả"));
        pagerBox.appendChild(el("span", { class: "pager-ctl" }, [
          el("button", { class: "btn", disabled: page === 0 ? "" : null,
            onclick: function () { if (page > 0) { page--; build(); } } }, "‹"),
          el("span", { class: "pager-num" }, String(page + 1) + " / " + pages),
          el("button", { class: "btn", disabled: page >= pages - 1 ? "" : null,
            onclick: function () { if (page < pages - 1) { page++; build(); } } }, "›"),
          sizeSel
        ]));
      }
      build();
    } else {
      root.appendChild(resultTable(hits, tokens, info));
    }
  }

  /* 1 pill thuế suất — dùng chung cho cả 4 ô nhanh và khu vực "Xem thêm FTA".
     Chỉ hiện phần số ở đầu (U.shortRate) để pill không bao giờ quá dài/lệch dòng; nếu giá trị
     gốc có ghi chú thêm (VD loại trừ nước) thì toàn văn được đưa vào tooltip thay vì hiện trên pill. */
  function ratePill(key, label, t) {
    var v = t.rate;
    var disp = v === "" || v == null ? v : U.shortRate(v);
    var tip = taxTip(t);
    if (v && disp !== v) {
      var note = (t.label || label) + ": " + v;
      tip = tip ? note + " — " + tip : note;
    }
    return el("span", {
      class: "rate-pill " + rateClass(v),
      "data-tip": tip
    }, [el("small", { "data-tip": colTip(key) }, label + " "),
        U.fmtRate(disp) + (disp !== "" && /^[\d.]+$/.test(disp) ? "%" : "")]);
  }

  /* thuế suất ghi tham chiếu "Chương 98" (264 mã, chủ yếu bộ linh kiện ô tô CKD) — Chương 98 chứa
     mức thuế NK ưu đãi RIÊNG cho nhóm hàng đó, app đã có sẵn 666 dòng dữ liệu. Biến cụm chữ thành
     link để người dùng không phải tự mò sang tra tay; trả DocumentFragment nếu không khớp thì trả
     text node thuần — cả 2 dùng được thẳng làm children của el(). */
  function rateWithRef(rate) {
    var m = /Chương\s*98/.exec(rate || "");
    if (!m) return document.createTextNode(U.fmtRate(rate));
    var f = document.createDocumentFragment();
    f.appendChild(document.createTextNode(rate.slice(0, m.index)));
    f.appendChild(el("a", { href: "#/chapter/98",
      title: "Mở Chương 98 — mức thuế nhập khẩu ưu đãi riêng" }, m[0]));
    f.appendChild(document.createTextNode(rate.slice(m.index + m[0].length)));
    return f;
  }

  function resultCard(i, tokens) {
    var r = D.rows[i];
    var code = r[1];
    var cells = el("div", { class: "rc-rates" });
    var byKey = code && code.length >= 8 ? taxByKey(i) : {};
    /* NK ưu đãi + VAT cố định; 2 ô FTA còn lại tự chọn mức "đáng chú ý nhất" trong các FTA
       (xem ftaRateScore/topFtaKeys) thay vì luôn cố định ACFTA/ATIGA */
    var topFta = code && code.length >= 8 ? topFtaKeys(byKey) : ["acfta", "atiga"];
    [QUICK_COLS[1], QUICK_COLS[2]].forEach(function (qc) {
      cells.appendChild(ratePill(qc[0], qc[1], byKey[qc[0]] || { rate: "" }));
    });
    topFta.forEach(function (k) {
      cells.appendChild(ratePill(k, ftaLabel(k), byKey[k] || { rate: "" }));
    });

    /* "Xem thêm FTA": các hiệp định ngoài 2 ô đã hiện sẵn ở trên, chỉ hiện khi có giá trị */
    var moreWrap = null;
    if (code && code.length >= 8) {
      var moreCells = el("div", { class: "rc-rates-more", hidden: true });
      var shown = {};
      topFta.forEach(function (k) { shown[k] = true; });
      FTA_KEYS.forEach(function (k) {
        if (shown[k]) return;
        var t = byKey[k];
        if (!t || t.rate === "") return;
        moreCells.appendChild(ratePill(k, ftaLabel(k), t));
      });
      if (moreCells.children.length) {
        var n = moreCells.children.length;
        var toggle = el("button", {
          class: "rc-more-toggle",
          onclick: function (ev) {
            ev.stopPropagation();
            moreCells.hidden = !moreCells.hidden;
            toggle.textContent = moreCells.hidden ? "▾ Xem thêm FTA (" + n + ")" : "▴ Thu gọn";
          }
        }, "▾ Xem thêm FTA (" + n + ")");
        moreWrap = el("div", { class: "rc-more" }, [toggle, moreCells]);
      }
    }

    var cardChildren = [
      el("div", { class: "rc-code" }, [
        el("div", { class: "rc-codetxt" }, code ? U.fmtCode(code) : "•"),
        code ? el("div", { class: "rc-len" }, code.length + " số") : null
      ]),
      code ? starBtn(code) : el("span"),
      el("div", { class: "rc-desc" }, [
        el("div", { class: "rc-vi", html: U.highlight(r[3], tokens) }),
        r[4] ? el("div", { class: "rc-en", html: U.highlight(r[4], tokens) }) : null,
        badgeFor(code || ""),
        policyTag(i, true)
      ]),
      code && code.length >= 8 ? cells : el("span"),
      el("div", { class: "rc-unit" }, r[5] || ""),
      code ? el("div", { class: "rc-arrow" }, "›") : el("span")
    ];
    if (moreWrap) cardChildren.push(moreWrap);
    /* thụt lề theo cấp (r[2]) đúng như 3 giao diện bảng đã làm (tr.lvl1..lvl5) — để cây phân cấp
       (nhóm/phân nhóm/phụ đề không mã) đọc được nhất quán ở cả 4 giao diện, không chỉ ở bảng */
    var card = el("div", U.clickable({
      class: "result-card lvl" + r[2] + (code ? "" : " heading-row"),
      onclick: code ? function () { App.go("#/code/" + code); } : null
    }), cardChildren);
    return card;
  }

  function rateClass(v) {
    if (v === "" || v == null) return "none";
    if (v === "0" || v === "0.0") return "zero";
    if (/^\*|\//.test(v)) return "cond";
    return "pos";
  }

  function resultTable(hits, tokens, infoEl) {
    /* cột: mã, mô tả, các cột thuế nhanh, FTA 0%, ĐVT — header bấm để sắp xếp */
    var sortKey = null, sortDir = 1;
    var cols = [{ k: "code", label: "Mã HS", sort: true },
                { k: "desc", label: "Mô tả hàng hóa", cls: "col-desc", sort: true }];
    QUICK_COLS.forEach(function (qc) {
      cols.push({ k: qc[0], label: qc[1], cls: "num", tax: true, sort: true });
    });
    cols.push({ k: "fta", label: "FTA 0%", cls: "col-fta" });
    cols.push({ k: "unit", label: "ĐVT" });
    cols.push({ k: "fav", label: "★", cls: "col-fav" });

    var thead = el("thead"), tbody = el("tbody");
    /* phân trang — tái dùng đúng mẫu đã có ở renderResults nhánh "cards" (v1.3.35), cùng
       Store.settings.pageSize và bộ nút ‹/›/select 20-50-100 (xem SYSTEM-SPEC §10.22: bảng
       chương/nhóm lớn (VD "84") có thể ra ~2.000 dòng, dựng hết 1 lần từng gây hàng chục
       nghìn nút DOM ở GD1 tương tự lỗi đã sửa ở GD2) */
    var pageSize = Store.settings.pageSize || 50;
    var page = 0;
    var pagerBox = el("div", { class: "lib-pager" });
    function sortVal(i, c) {
      var r = D.rows[i];
      if (c.k === "code") return r[1];
      if (c.k === "desc") return U.norm(r[3]);
      var v = Store.rateOf(i, c.k);
      var n = parseFloat(v);
      return isNaN(n) ? 1e9 : n;   // rate rỗng/điều kiện xếp cuối
    }
    function build() {
      var trh = el("tr");
      cols.forEach(function (c) {
        trh.appendChild(el("th", {
          class: (c.cls || "") + (c.sort ? " sortable" : ""),
          "data-tip": colTip(c.k),
          onclick: c.sort ? function () {
            if (sortKey === c.k) sortDir = -sortDir; else { sortKey = c.k; sortDir = 1; }
            page = 0;   // đổi cột sắp xếp: về trang 1, tránh đang ở trang giữa danh sách cũ
            build();
          } : null
        }, [c.label, c.sort ? el("span", { class: "sort-arr" },
          sortKey === c.k ? (sortDir > 0 ? " ▲" : " ▼") : " ⇅") : null]));
      });
      thead.innerHTML = ""; thead.appendChild(trh);

      var list = hits;
      if (sortKey) {
        var c = null;
        cols.forEach(function (x) { if (x.k === sortKey) c = x; });
        list = hits.filter(function (i) { return D.rows[i][1]; });   // bỏ dòng tiêu đề khi sắp xếp
        list = list.slice().sort(function (a, b) {
          var va = sortVal(a, c), vb = sortVal(b, c);
          return (va < vb ? -1 : va > vb ? 1 : 0) * sortDir;
        });
      }
      /* sắp xếp bỏ dòng tiêu đề khỏi "list" nên số dòng hiển thị có thể ít hơn tổng số
         hits ban đầu — cập nhật lại dòng đếm phía trên để khớp đúng số dòng đang thấy */
      if (infoEl) {
        infoEl.textContent = list.length === hits.length
          ? "Kết quả tìm kiếm: " + hits.length + " dòng phù hợp"
          : "Kết quả tìm kiếm: " + list.length + " / " + hits.length + " dòng phù hợp (đã ẩn dòng tiêu đề khi sắp xếp)";
      }

      var total = list.length;
      var pages = Math.max(1, Math.ceil(total / pageSize));
      if (page >= pages) page = pages - 1;
      var start = page * pageSize, end = Math.min(start + pageSize, total);
      var pageList = list.slice(start, end);

      tbody.innerHTML = "";
      pageList.forEach(function (i) {
        var r = D.rows[i];
        if (r[0] !== 0) { tbody.appendChild(ctxNoteRow(r, cols.length)); return; }
        var code = r[1];
        var attrs = rowClickAttrs(i, code);
        attrs.class = (code ? "row-code lvl" + r[2] : "row-heading lvl" + r[2]) +
          (App.state.sel === i ? " row-selected" : "");
        attrs["data-row"] = i;
        if (code) attrs["data-len"] = code.length;
        var tr = el("tr", attrs);
        tr.appendChild(el("td", { class: "cell-code" }, code ? [
          el("span", null, U.fmtCode(code)), badgeFor(code)] : ""));
        var tdDesc = el("td", { class: "cell-desc", html: U.highlight(r[3], tokens) });
        var pt = policyTag(i, false);
        if (pt) tdDesc.appendChild(pt);
        tr.appendChild(tdDesc);
        var byKey = code && code.length >= 8 ? taxByKey(i) : {};
        QUICK_COLS.forEach(function (qc) {
          var t = byKey[qc[0]];
          tr.appendChild(el("td", { class: "num", "data-tip": taxTip(t) },
            t ? U.fmtRate(t.rate) : ""));
        });
        var fta = code && code.length >= 8 ? ftaZeroOf(byKey) : [];
        tr.appendChild(el("td", { class: "col-fta" }, fta.length ? el("span", {
          "data-tip": fta.join(", ")
        }, fta.slice(0, 3).join(", ") + (fta.length > 3 ? " +" + (fta.length - 3) : "")) : ""));
        tr.appendChild(el("td", null, r[5] || ""));
        tr.appendChild(el("td", { class: "col-fav" }, code ? starBtn(code) : ""));
        tbody.appendChild(tr);
      });

      var sizeSel = el("select", { class: "inp" });
      [20, 50, 100].forEach(function (n) {
        var o = el("option", { value: n }, n + " / trang");
        if (n === pageSize) o.selected = true;
        sizeSel.appendChild(o);
      });
      sizeSel.addEventListener("change", function () {
        pageSize = +sizeSel.value; Store.settings.pageSize = pageSize;
        Store.saveSettings(); page = 0; build();
      });
      pagerBox.innerHTML = "";
      pagerBox.appendChild(el("span", null,
        total ? "Hiển thị " + (start + 1) + " đến " + end + " của " + total + " kết quả" : "Không có kết quả"));
      pagerBox.appendChild(el("span", { class: "pager-ctl" }, [
        el("button", { class: "btn", disabled: page === 0 ? "" : null,
          onclick: function () { if (page > 0) { page--; build(); } } }, "‹"),
        el("span", { class: "pager-num" }, String(page + 1) + " / " + pages),
        el("button", { class: "btn", disabled: page >= pages - 1 ? "" : null,
          onclick: function () { if (page < pages - 1) { page++; build(); } } }, "›"),
        sizeSel
      ]));
    }
    build();
    return el("div", null, [
      el("div", { class: "table-wrap" }, el("table", { class: "result-table" }, [thead, tbody])),
      pagerBox
    ]);
  }

  /* bảng đầy đủ mọi cột thuế (giao diện 3): header gộp 2 hàng + cột Ghi chú */
  var FULL_GROUPS = [
    ["Thuế NK & VAT (%)", ["nktt", "nkud", "vat"]],
    ["Thuế NK ưu đãi đặc biệt theo FTA (%)", FTA_KEYS],
    ["Xuất khẩu (%)", ["xk", "xkcptpp", "xkev", "xkukv"]],
    ["Khác", ["ttdb", "bvmt"]]
  ];
  function resultTableFull(root, hits, tokens) {
    root.innerHTML = "";
    if (!hits.length) {
      root.appendChild(el("div", { class: "empty" }, "Không tìm thấy kết quả phù hợp."));
      return;
    }
    root.appendChild(el("div", { class: "result-info" }, "Kết quả: " + hits.length + " dòng"));

    /* lọc FTA từ dropdown "Hiệp định/Chế độ" của giao diện 3 */
    var ftaFilter = App.state.ftaFilter || "";
    function visible(k) {
      if (!ftaFilter) return true;
      return FTA_KEYS.indexOf(k) === -1 || k === ftaFilter;
    }
    var colIdx = {};   // key -> chỉ số trong taxcols
    D.taxcols.forEach(function (tc, ci) { colIdx[tc[0]] = ci; });

    var trGroup = el("tr", { class: "th-group" }, [
      el("th", { class: "sticky-col", rowspan: 2 }, "Mã HS"),
      el("th", { class: "col-desc", rowspan: 2 }, "Mô tả")
    ]);
    var trCols = el("tr", { class: "th-cols" });
    var flatKeys = [];
    FULL_GROUPS.forEach(function (g) {
      var keys = g[1].filter(function (k) { return k in colIdx && visible(k); });
      if (!keys.length) return;
      trGroup.appendChild(el("th", { colspan: keys.length, class: "grp" }, g[0]));
      keys.forEach(function (k) {
        flatKeys.push(k);
        trCols.appendChild(el("th", { class: "num", "data-tip": colTip(k) }, D.taxcols[colIdx[k]][1]));
      });
    });
    trGroup.appendChild(el("th", { rowspan: 2, class: "col-note" }, "Ghi chú"));

    var tbody = el("tbody");
    /* phân trang — tái dùng đúng mẫu ở resultTable/renderResults nhánh "cards"; bảng chương/nhóm
       lớn (VD chương "84" ~1.955 dòng, tra "84" ~1.951 dòng) từng dựng hết 1 lần gây ~72.700 nút
       DOM (xem SYSTEM-SPEC §10.22). `hits` không có cột nào để sắp xếp ở GD3 nên phân trang thẳng
       trên mảng gốc, không cần reset trang khi đổi sắp xếp như resultTable. */
    var pageSize = Store.settings.pageSize || 50;
    var page = 0;
    var pagerBox = el("div", { class: "lib-pager" });
    function build() {
      var total = hits.length;
      var pages = Math.max(1, Math.ceil(total / pageSize));
      if (page >= pages) page = pages - 1;
      var start = page * pageSize, end = Math.min(start + pageSize, total);
      var pageList = hits.slice(start, end);

      tbody.innerHTML = "";
      pageList.forEach(function (i) {
        var r = D.rows[i];
        if (r[0] !== 0) { tbody.appendChild(ctxNoteRow(r, flatKeys.length + 3)); return; }
        var code = r[1];
        var attrs = rowClickAttrs(i, code);
        attrs.class = (code ? "row-code lvl" + r[2] : "row-heading lvl" + r[2]) +
          (App.state.sel === i ? " row-selected" : "");
        attrs["data-row"] = i;
        var tr = el("tr", attrs);
        tr.appendChild(el("td", { class: "cell-code sticky-col" }, code ? U.fmtCode(code) : ""));
        var tdDesc = el("td", { class: "cell-desc", html: U.highlight(r[3], tokens) });
        tr.appendChild(tdDesc);
        var taxes = Store.taxOf(i); /* [] với dòng tiêu đề */
        flatKeys.forEach(function (k) {
          var t = taxes[colIdx[k]];
          tr.appendChild(el("td", { class: "num", "data-tip": taxTip(t) },
            t ? U.fmtRate(t.rate) : ""));
        });
        /* Ghi chú: cấp dòng + cờ QLCN */
        var note = [];
        if (!code) note.push(r[3] && /^PHẦN/.test(r[3]) ? "Phần" : "Chương/Chú giải");
        else note.push(code.length <= 4 ? "Nhóm" : code.length <= 6 ? "Phân nhóm" : "Mã 8 số");
        var tdNote = el("td", { class: "col-note" }, [
          code ? starBtn(code) : null,
          note.join(" ")
        ]);
        var pt = policyTag(i, false);
        if (pt) tdNote.appendChild(pt);
        tr.appendChild(tdNote);
        tbody.appendChild(tr);
      });

      var sizeSel = el("select", { class: "inp" });
      [20, 50, 100].forEach(function (n) {
        var o = el("option", { value: n }, n + " / trang");
        if (n === pageSize) o.selected = true;
        sizeSel.appendChild(o);
      });
      sizeSel.addEventListener("change", function () {
        pageSize = +sizeSel.value; Store.settings.pageSize = pageSize;
        Store.saveSettings(); page = 0; build();
      });
      pagerBox.innerHTML = "";
      pagerBox.appendChild(el("span", null,
        total ? "Hiển thị " + (start + 1) + " đến " + end + " của " + total + " kết quả" : "Không có kết quả"));
      pagerBox.appendChild(el("span", { class: "pager-ctl" }, [
        el("button", { class: "btn", disabled: page === 0 ? "" : null,
          onclick: function () { if (page > 0) { page--; build(); } } }, "‹"),
        el("span", { class: "pager-num" }, String(page + 1) + " / " + pages),
        el("button", { class: "btn", disabled: page >= pages - 1 ? "" : null,
          onclick: function () { if (page < pages - 1) { page++; build(); } } }, "›"),
        sizeSel
      ]));
    }
    build();
    /* .rtf-wrap: em ruột trực tiếp của .content để CSS khóa màn hình GD3 (@media
       min-width:901px trong base.css) có thể xếp pager cố định ở đáy + bảng co giãn phần còn
       lại — nếu không, `.table-full { height: 100% }` sẽ chiếm hết khung và đẩy pagerBox ra
       ngoài tầm nhìn. Xem SYSTEM-SPEC §10.22. */
    root.appendChild(el("div", { class: "rtf-wrap" }, [
      el("div", { class: "table-wrap table-full" },
        el("table", { class: "result-table" },
          [el("thead", null, [trGroup, trCols]), tbody])),
      pagerBox
    ]));
  }

  /* ================= CHI TIẾT MÃ HS ================= */

  function renderDetail(root, code) {
    root.innerHTML = "";
    var i = Store.codeMap[code];
    if (i === undefined) {
      root.appendChild(el("div", { class: "empty" }, [
        "Không tìm thấy mã " + U.fmtCode(code) + " trong biểu thuế 2026. ",
        Store.removedSet[code] ? el("div", { class: "warn-box" },
          "⚠ Mã này nằm trong danh sách 833 mã KHÔNG còn áp dụng từ 2026. Mô tả cũ: " + Store.removedSet[code]) : null
      ]));
      return;
    }
    Store.addHistory("c", code);
    var r = D.rows[i];
    var taxes = Store.taxOf(i);

    /* điều hướng nhóm 4 số trước/sau — tự nhảy sang mã đầu tiên có thuế của nhóm kế cận,
       bỏ qua các nhóm chỉ có tiêu đề mà không có dòng thuế nào */
    var head4 = code.slice(0, 4);
    var prevT = Store.nextTaxedGroupCode(head4, -1);
    var nextT = Store.nextTaxedGroupCode(head4, 1);
    root.appendChild(groupNavBar(head4, prevT, nextT, function (g) { App.go("#/q/" + g.head4); }));

    var head = el("div", { class: "detail-head" }, [
      el("div", { class: "dh-left" }, [
        el("div", { class: "dh-code" }, [U.fmtCode(code), starBtn(code)]),
        el("div", { class: "dh-desc" }, Search.fullDesc(i)),
        r[4] ? el("div", { class: "dh-en" }, r[4]) : null,
        el("div", { class: "dh-meta" }, [
          el("span", null, "Đơn vị tính: " + (r[5] || "–")),
          badgeFor(code),
          Store.pl1Set[code] ? el("span", { class: "tag tag-novat", title: "Thuộc danh mục KHÔNG được giảm VAT (NĐ 174/2025)" }, "KHÔNG GIẢM VAT") : null
        ])
      ]),
      el("div", { class: "dh-actions" }, [
        el("button", { class: "btn", onclick: function () { window.print(); } }, "🖨 In"),
        el("button", {
          class: "btn", onclick: function () { exportDetail(code, i, taxes); }
        }, "⬇ Xuất CSV")
      ])
    ]);
    root.appendChild(head);

    /* các nhóm thuế */
    var groups = [
      ["Thuế nhập khẩu & VAT", ["nktt", "nkud", "vat"]],
      ["Thuế NK ưu đãi đặc biệt (FTA)", FTA_KEYS],
      ["Thuế khác (TTĐB, XK, BVMT)", ["ttdb", "xk", "xkcptpp", "xkev", "xkukv", "bvmt"]]
    ];
    var byKey = {};
    taxes.forEach(function (t) { byKey[t.k] = t; });

    groups.forEach(function (g) {
      var rows = g[1].map(function (k) { return byKey[k]; }).filter(function (t) { return t && t.rate !== ""; });
      var sec = el("div", { class: "tax-group" });
      sec.appendChild(el("h3", null, g[0]));
      if (!rows.length) {
        sec.appendChild(el("div", { class: "muted" }, "Không có dữ liệu cho nhóm này."));
      } else {
        var tb = el("tbody");
        rows.forEach(function (t) {
          tb.appendChild(el("tr", null, [
            el("td", null, t.label),
            el("td", { class: "num rate " + rateClass(t.rate) }, rateWithRef(t.rate)),
            el("td", { class: "doc" }, t.doc),
            el("td", { class: "doc" }, t.date)
          ]));
        });
        sec.appendChild(el("div", { class: "table-wrap" }, el("table", { class: "tax-table" }, [
          el("thead", null, el("tr", null, [el("th", null, "Loại thuế"), el("th", { class: "num" }, "Thuế suất (%)"),
            el("th", null, "Văn bản"), el("th", null, "Ngày hiệu lực")])), tb])));
      }
      root.appendChild(sec);
    });

    /* nước không hưởng ưu đãi FTA */
    var excl = Store.ftaExclOf(code);
    if (excl.length) {
      var esec = el("div", { class: "tax-group" });
      esec.appendChild(el("h3", null, "Nước không được hưởng ưu đãi FTA"));
      excl.forEach(function (e) {
        esec.appendChild(el("p", null, [el("b", null, e.label + ": "), e.countries]));
      });
      root.appendChild(esec);
    }

    /* chính sách mặt hàng + giảm VAT */
    var pol = Store.policyOf(i);
    if (pol) {
      root.appendChild(el("div", { class: "tax-group" }, [
        el("h3", null, "Chính sách mặt hàng theo mã HS"),
        el("p", { class: "policy" }, pol)]));
    }
    var gv = Store.giamVatOf(i);
    if (gv || Store.pl1Set[code]) {
      root.appendChild(el("div", { class: "tax-group" }, [
        el("h3", null, "Giảm thuế VAT (NĐ 174/2025)"),
        el("p", null, Store.pl1Set[code]
          ? "⚠ Mặt hàng thuộc Phụ lục I — KHÔNG được giảm thuế GTGT."
          : (gv === "G" || gv ? "Trạng thái theo biểu: " + gv : ""))]));
    }

    /* ghi chú cá nhân */
    var ta = el("textarea", { class: "note-area", placeholder: "Ghi chú cá nhân cho mã này (lưu trong trình duyệt)…" });
    ta.value = Store.userNotes[code] || "";
    ta.addEventListener("input", U.debounce(function () { Store.setNote(code, ta.value.trim()); }, 400));
    root.appendChild(el("div", { class: "tax-group" }, [el("h3", null, "Ghi chú cá nhân"), ta]));

    /* chú giải liên quan */
    var cid = code.slice(0, 2);
    var nsec = el("div", { class: "tax-group notes-related" });
    nsec.appendChild(el("h3", null, "Chú giải HS 2022 liên quan (Chương " + cid + ", Nhóm " + U.fmtCode(head4).replace(".", ".") + ")"));
    var nbody = el("div", { class: "notes-excerpt" }, "Đang nạp chú giải…");
    nsec.appendChild(nbody);
    nsec.appendChild(el("button", {
      class: "btn btn-link",
      onclick: function () { App.go("#/notes/" + cid + "/" + head4); }
    }, "Mở toàn bộ chú giải Chương " + cid + " »"));
    root.appendChild(nsec);
    notesExcerptInto(nbody, cid, head4, []);
  }

  function exportDetail(code, i, taxes) {
    var rows = [["Mã HS", code], ["Mô tả", D.rows[i][3]], ["Mô tả (EN)", D.rows[i][4]],
                ["Đơn vị tính", D.rows[i][5]], []];
    rows.push(["Loại thuế", "Thuế suất (%)", "Văn bản", "Ngày hiệu lực"]);
    taxes.forEach(function (t) {
      if (t.rate !== "") rows.push([t.label, t.rate, t.doc, t.date]);
    });
    U.downloadCSV("HS-" + code + ".csv", rows);
  }

  /* ================= ĐỌC CHÚ GIẢI ================= */

  function notesToDom(text, tokens) {
    var frag = document.createDocumentFragment();
    text.split("\n").forEach(function (line) {
      if (!line.trim()) return;
      var cls = "np";
      if (/^(PHẦN\s+[IVX]+|CHÚ GIẢI PHẦN)/.test(line)) cls = "np-h1";
      else if (/^Ch(ương|uong)\s+\d{1,2}\s*:/i.test(line)) cls = "np-h1";
      else if (/^\d{2}\.\d{2}\s*[-–]/.test(line)) cls = "np-h2";
      else if (/^(TỔNG QUÁT|Chú giải\.?$|CHÚ GIẢI|Chú giải phân nhóm)/.test(line)) cls = "np-h3";
      else if (/^\d{4}\.\d{2}/.test(line)) cls = "np-sub";
      else if (/^\([a-zđ]+\)|^\([ivx]+\)|^\d{1,2}[\.\)]\s/.test(line)) cls = "np-li";
      var p = el("div", { class: cls });
      p.innerHTML = tokens && tokens.length ? U.highlight(line, tokens) : U.esc(line);
      frag.appendChild(p);
    });
    return frag;
  }

  function renderIntro(root) {
    var wrap = el("div", { class: "notes-title" }, el("h2", null, "Giới thiệu Chú giải HS 2022"));
    root.appendChild(wrap);
    var body = el("div", { class: "notes-body" }, [
      el("p", { class: "np" },
        "Chú giải chi tiết Danh mục Hàng hóa xuất khẩu, nhập khẩu Việt Nam dựa trên Hệ thống hài " +
        "hòa mô tả và mã hóa hàng hóa (HS) phiên bản 2022, gồm 21 Phần và 97 Chương, giải thích " +
        "phạm vi, cách phân loại và các trường hợp loại trừ của từng nhóm hàng."),
      el("p", { class: "np" },
        "Chọn một Phần/Chương ở danh sách bên trái để xem toàn văn chú giải, hoặc dùng ô tìm kiếm " +
        "phía trên để tra theo mã HS hay từ khóa mô tả hàng hóa."),
      el("p", { class: "muted" },
        (D.notesIdx ? D.notesIdx.length : 0) + " chương chú giải hiện có trong ứng dụng.")
    ]);
    root.appendChild(body);
  }

  /* giọng đọc tiếng Việt — ưu tiên giọng trực tuyến (voice.localService===false, chất lượng
     Natural cao hơn) nếu máy có cài, không thì dùng tạm giọng cục bộ đã cài trên Windows/macOS
     (nhiều máy cài "Tiếng Việt" qua Cài đặt ngôn ngữ chỉ ra giọng cục bộ, không phải giọng
     Online riêng). Việc yêu cầu phải có Internet do chính onclick kiểm tra navigator.onLine
     trước khi gọi hàm này, không phụ thuộc bản thân giọng có phải giọng đám mây hay không. */
  function pickViVoice() {
    var voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    var vi = voices.filter(function (v) { return v.lang.toLowerCase().indexOf("vi") === 0; });
    var online = vi.filter(function (v) { return v.localService === false; })[0];
    return online || vi[0] || null;
  }

  function renderNotesReader(root, cid, anchor4, tokens, autoScroll) {
    root.innerHTML = "";
    if (cid === "intro") { renderIntro(root); return; }
    var chapter = null;
    D.chapters.forEach(function (c) { if (c.c === cid) chapter = c; });

    var speakBtn = null, notesText = "";
    if ("speechSynthesis" in window) {
      speakBtn = el("button", {
        class: "btn btn-sm speak-btn",
        onclick: function () {
          var synth = window.speechSynthesis;
          if (synth.speaking || synth.pending) {
            synth.cancel();
            speakBtn.textContent = "🔊 Nghe đọc (trực tuyến)";
            return;
          }
          if (!navigator.onLine) { U.toast("⚠ Cần kết nối Internet để dùng tính năng nghe đọc"); return; }
          var voice = pickViVoice();
          if (!voice) {
            U.toast("⚠ Máy chưa cài giọng đọc tiếng Việt — vào Cài đặt Windows › Giờ và Ngôn ngữ › Giọng nói để thêm giọng Tiếng Việt");
            return;
          }
          try {
            var lines = notesText.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
            lines.forEach(function (line) {
              var u = new SpeechSynthesisUtterance(line);
              u.voice = voice; u.lang = voice.lang;
              synth.speak(u);
            });
            speakBtn.textContent = "⏹ Dừng đọc";
            var timer = setInterval(function () {
              /* kiểm tra cả speaking lẫn pending — giữa 2 câu trong hàng đợi, speaking có
                 thể tạm về false dù trình duyệt vẫn còn câu chờ đọc tiếp theo */
              if (!synth.speaking && !synth.pending) {
                speakBtn.textContent = "🔊 Nghe đọc (trực tuyến)"; clearInterval(timer);
              }
            }, 400);
          } catch (e) {
            synth.cancel();
            U.toast("⚠ Không thể phát giọng đọc trực tuyến — thử lại sau");
          }
        }
      }, "🔊 Nghe đọc (trực tuyến)");
      speakBtn.disabled = true;
      var refreshOnline = function () {
        speakBtn.disabled = !notesText || !navigator.onLine;
        speakBtn.title = navigator.onLine ? "Đọc bằng giọng tiếng Việt trực tuyến"
          : "Cần kết nối Internet để dùng giọng đọc trực tuyến";
      };
      refreshOnline();
      window.addEventListener("online", refreshOnline);
      window.addEventListener("offline", refreshOnline);
    }

    var title = el("div", { class: "notes-title" }, [
      el("h2", null, "Chú giải Chương " + cid),
      chapter ? el("div", { class: "muted" }, chapter.vi) : null,
      speakBtn
    ]);
    root.appendChild(title);
    var body = el("div", { class: "notes-body" }, "Đang nạp…");
    root.appendChild(body);
    Store.loadNotes(cid, function (text) {
      body.innerHTML = "";
      if (!text) { body.textContent = "Không có nội dung."; return; }
      notesText = text;
      if (speakBtn) speakBtn.disabled = !navigator.onLine;
      body.appendChild(notesToDom(text, tokens));
      if (anchor4) {
        var idx = Store.notesIdxOf(cid);
        var h = idx && idx.heads.filter(function (x) { return x[0] === anchor4; })[0];
        if (h) {
          // tìm phần tử ứng với offset: đếm ký tự
          var target = findNodeAtOffset(body, text, h[1]);
          if (target) {
            target.classList.add("np-target");
            /* chỉ tự cuộn khi đây là trang Chú giải chính (deep-link) — không cuộn khi
               renderNotesReader chỉ được dùng làm khung xem trước bên trong companion
               (GD3/GD4 ở route #/chapter/:cc), vì lúc đó sẽ cuộn nhầm cả trang xuống dưới */
            if (autoScroll !== false) {
              setTimeout(function () { target.scrollIntoView({ block: "start", behavior: "smooth" }); }, 60);
            }
          }
        }
      }
    });
  }

  function findNodeAtOffset(body, text, offset) {
    var lines = text.split("\n");
    var pos = 0, li = 0;
    for (var k = 0; k < lines.length; k++) {
      if (offset <= pos + lines[k].length) { li = k; break; }
      pos += lines[k].length + 1;
    }
    // body chỉ chứa các dòng không rỗng
    var visIdx = 0;
    for (var k2 = 0; k2 < li; k2++) if (lines[k2].trim()) visIdx++;
    return body.children[visIdx] || null;
  }

  /* cây mục lục chú giải */
  function renderNotesTree(root, activeCid, onPick) {
    root.innerHTML = "";
    var tree = el("div", { class: "notes-tree" });
    tree.appendChild(el("div", {
      class: "nt-item" + (activeCid === "intro" ? " active" : ""),
      onclick: function () { onPick("intro"); }
    }, "Giới thiệu"));
    D.sections.forEach(function (s, si) {
      tree.appendChild(el("div", { class: "nt-sec" }, "PHẦN " + s.r + " — " + s.vi));
      D.chapters.forEach(function (c) {
        if (c.sec !== si) return;
        var has = Store.notesIdxOf(c.c);
        tree.appendChild(el("div", {
          class: "nt-item" + (c.c === activeCid ? " active" : "") + (has ? "" : " disabled"),
          onclick: has ? function () { onPick(c.c); } : null
        }, "Chương " + c.c + " — " + c.vi));
      });
    });
    root.appendChild(tree);
    var act = tree.querySelector(".nt-item.active");
    /* hoãn 1 nhịp: companion GD3/GD4 dựng cây này trước rồi mới gắn vào tài liệu
       (xem companionL4Below/companionL3Below), lúc gọi hàm này cây có thể chưa
       nằm trong DOM nên chưa đo được kích thước để căn giữa đúng chỗ */
    if (act) setTimeout(function () { U.centerInScrollBox(act); }, 0);
  }

  /* ================= DANH MỤC CHƯƠNG ================= */

  function renderChapters(root) {
    root.innerHTML = "";
    root.appendChild(el("h2", { class: "page-title" }, "Danh mục 21 Phần · " + D.chapters.length + " Chương"));
    D.sections.forEach(function (s, si) {
      root.appendChild(el("div", { class: "sec-head" }, "PHẦN " + s.r + " — " + s.vi));
      var grid = el("div", { class: "chapter-grid" });
      D.chapters.forEach(function (c) {
        if (c.sec !== si) return;
        grid.appendChild(el("div", U.clickable({
          class: "chapter-card",
          onclick: function () { App.go("#/chapter/" + c.c); }
        }), [el("span", { class: "cc-num" }, c.c), el("span", { class: "cc-title" }, c.vi)]));
      });
      root.appendChild(grid);
    });
  }

  function renderChapterRows(root, cc, style) {
    root.innerHTML = "";
    var chapter = null, ci = -1;
    D.chapters.forEach(function (c, k) { if (c.c === cc) { chapter = c; ci = k; } });
    if (!chapter) { root.textContent = "Không tìm thấy chương."; return; }
    root.appendChild(el("h2", { class: "page-title" }, "Chương " + cc + " — " + chapter.vi));
    var start = chapter.row;
    var end = ci + 1 < D.chapters.length ? D.chapters[ci + 1].row : D.rows.length;
    /* chú giải đầu chương (dòng ngữ cảnh) — chỉ dòng nằm TRƯỚC dòng hàng đầu tiên mới gom vào khung
       thu gọn này; dòng ngữ cảnh nằm XEN GIỮA bảng (chú thích (SEN)/TCVN, "PHÂN CHƯƠNG I-VI"...) được
       đẩy vào hits để hiện đúng vị trí xen giữa như trong Excel, không bị bỏ rơi như trước */
    var ctx = el("div", { class: "chapter-ctx" });
    var hits = [];
    for (var i = start; i < end; i++) {
      var r = D.rows[i];
      if (r[0] === 0) hits.push(i);
      else if (r[0] >= 5) {
        if (hits.length === 0) ctx.appendChild(el("p", { class: "np-li" }, r[3]));
        else hits.push(i);
      }
    }
    if (ctx.children.length) {
      var det = el("details", { class: "chapter-notes" }, [
        el("summary", null, "Chú giải chương (theo Danh mục biểu thuế)"), ctx]);
      root.appendChild(det);
    }
    var box = el("div");
    root.appendChild(box);
    if (style === "full") resultTableFull(box, hits, []);
    else if (style === "lib") renderLibResults(box, hits, []);
    else renderResults(box, hits, [], style);   // "cards" hoặc "table"
  }

  /* ================= TRANG THAM KHẢO ================= */

  function simpleTable(cols, rows, cls) {
    var thead = el("tr");
    cols.forEach(function (c) { thead.appendChild(el("th", null, c)); });
    var tbody = el("tbody");
    rows.forEach(function (r) {
      var tr = el("tr");
      r.forEach(function (c) { tr.appendChild(el("td", null, String(c == null ? "" : c))); });
      tbody.appendChild(tr);
    });
    return el("div", { class: "table-wrap " + (cls || "") },
      el("table", { class: "ref-table" }, [el("thead", null, thead), tbody]));
  }

  var REF_PAGES = {
    "xk": function (root) {
      root.appendChild(el("h2", { class: "page-title" }, "Biểu thuế xuất khẩu 2026"));
      root.appendChild(el("p", { class: "muted" }, "Theo NĐ 26/2023/NĐ-CP và văn bản sửa đổi. Mặt hàng không liệt kê: thuế XK 0%."));
      root.appendChild(simpleTable(D.xkTables.xk.cols, D.xkTables.xk.rows));
    },
    "xk-cptpp": function (root) {
      root.appendChild(el("h2", { class: "page-title" }, "Biểu thuế XK ưu đãi — CPTPP"));
      root.appendChild(el("p", { class: "muted" }, D.xkTables.cptpp.note));
      root.appendChild(simpleTable(D.xkTables.cptpp.cols, D.xkTables.cptpp.rows));
    },
    "xk-ev": function (root) {
      root.appendChild(el("h2", { class: "page-title" }, "Biểu thuế XK ưu đãi — EVFTA"));
      root.appendChild(el("p", { class: "muted" }, D.xkTables.ev.note));
      root.appendChild(simpleTable(D.xkTables.ev.cols, D.xkTables.ev.rows));
    },
    "xk-ukv": function (root) {
      root.appendChild(el("h2", { class: "page-title" }, "Biểu thuế XK ưu đãi — UKVFTA"));
      root.appendChild(el("p", { class: "muted" }, D.xkTables.ukv.note));
      root.appendChild(simpleTable(D.xkTables.ukv.cols, D.xkTables.ukv.rows));
    },
    "ttdb": function (root) {
      root.appendChild(el("h2", { class: "page-title" }, "Biểu thuế Tiêu thụ đặc biệt 2026"));
      root.appendChild(el("p", { class: "muted" }, "Luật số 66/2025/QH15 ngày 14/6/2025."));
      root.appendChild(simpleTable(["STT", "Hàng hóa, dịch vụ", "Thuế suất (%)", "Mức thuế tuyệt đối"], D.ttdb));
    },
    "bvmt": function (root) {
      root.appendChild(el("h2", { class: "page-title" }, "Biểu thuế Bảo vệ môi trường 2026"));
      root.appendChild(simpleTable(["STT", "Hàng hóa", "ĐVT", "Mức thuế 2026", "Văn bản", "Ngày HL", "Từ 01/01/2027", "Văn bản", "Ngày HL"], D.bvmt));
    },
    "pl1": function (root) {
      root.appendChild(el("h2", { class: "page-title" }, "Danh mục KHÔNG được giảm thuế GTGT"));
      root.appendChild(el("p", { class: "muted" }, "Phụ lục I — NĐ 174/2025/NĐ-CP ngày 30/6/2025. Mã HS cột (10) chỉ để tra cứu."));
      root.appendChild(simpleTable(["Cấp", "Tên sản phẩm", "Nội dung", "Mã HS", "Mã 8 số"],
        D.pl1.rows.map(function (r) { return r.slice(0, 5); })));
    },
    "pl2": function (root) {
      root.appendChild(el("h2", { class: "page-title" }, "Danh mục hàng hóa, dịch vụ chịu thuế TTĐB"));
      root.appendChild(el("p", { class: "muted" }, "Phụ lục II — NĐ 174/2025/NĐ-CP."));
      D.pl2.forEach(function (t) { root.appendChild(el("p", { class: "np-li" }, t)); });
    },
    "qt6": function (root) {
      root.appendChild(el("h2", { class: "page-title" }, "Sáu Quy tắc tổng quát phân loại hàng hóa"));
      root.appendChild(el("p", { class: "muted" }, "Ban hành kèm Thông tư 31/2022/TT-BTC."));
      D.qt6.forEach(function (p) {
        var cls = /^QUY TẮC|^CHÚ GIẢI/.test(p[0]) ? "np-h2" : "np";
        root.appendChild(el("p", { class: cls }, p[0]));
      });
    },
    "bang": function (root) {
      root.appendChild(el("h2", { class: "page-title" }, "Các bảng kèm theo Biểu thuế"));
      root.appendChild(simpleTable(["", "", "", "", ""], D.bang));
    },
    "ht": function (root) {
      root.appendChild(el("h2", { class: "page-title" }, "Danh sách văn bản & lịch sử cập nhật"));
      root.appendChild(simpleTable(D.ht.cols, D.ht.rows));
    },
    "changes": function (root) {
      root.appendChild(el("h2", { class: "page-title" }, "Thay đổi Danh mục 2026"));
      root.appendChild(el("p", { class: "muted" },
        D.added.length + " mã mới bổ sung · " + D.removed.length + " mã không còn áp dụng (so với danh mục HS 2023)."));
      var tabs = el("div", { class: "tabs" });
      var body = el("div");
      function show(kind) {
        body.innerHTML = "";
        var data = kind === "add" ? D.added : D.removed;
        var rows = data.map(function (x) { return [U.fmtCode(x[0]), x[1]]; });
        body.appendChild(simpleTable(["Mã HS", "Mô tả"], rows));
        Array.prototype.forEach.call(tabs.children, function (b) { b.classList.toggle("active", b.dataset.k === kind); });
      }
      tabs.appendChild(el("button", { class: "tab", "data-k": "add", onclick: function () { show("add"); } }, "Mã mới 2026 (" + D.added.length + ")"));
      tabs.appendChild(el("button", { class: "tab", "data-k": "rem", onclick: function () { show("rem"); } }, "Mã hết hiệu lực (" + D.removed.length + ")"));
      root.appendChild(tabs); root.appendChild(body);
      show("add");
    }
  };

  function renderRef(root, key) {
    root.innerHTML = "";
    var fn = REF_PAGES[key];
    if (fn) fn(root); else root.textContent = "Không có trang này.";
  }

  /* ================= YÊU THÍCH / LỊCH SỬ / GHI CHÚ ================= */

  /* thẻ gọn cho 1 nhóm 4 số / phân nhóm 6 số đã lưu — bấm vào mở #/q/<mã> (route sẵn có,
     đã dựng đúng cây phân cấp + thanh Nhóm trước/sau) thay vì liệt kê hết mã con tại đây */
  function favGroupCard(g) {
    var lvl = g.code.length <= 4 ? "Nhóm" : "Phân nhóm";
    return el("div", U.clickable({
      class: "fav-group",
      onclick: function () { App.go("#/q/" + g.code); }
    }), [
      el("div", { class: "fg-main" }, [
        el("span", { class: "fg-code" }, U.fmtCode(g.code)),
        el("span", { class: "fg-lvl" }, lvl),
        el("span", { class: "fg-label" }, g.label)
      ]),
      el("div", { class: "fg-side" }, [
        el("span", { class: "fg-count" }, g.count + " mã"),
        starBtn(g.code),
        el("span", { class: "fg-arrow" }, "›")
      ])
    ]);
  }

  function renderFavorites(root, style) {
    root.innerHTML = "";
    var e = Store.favEntries();
    var total = e.groups.length + e.codes.length;
    root.appendChild(el("h2", { class: "page-title" }, "Danh sách yêu thích (" + total + ")"));
    if (e.missing) {
      root.appendChild(el("div", { class: "muted fav-missing" },
        e.missing + " mục đã lưu trước đây không còn khớp mã nào trong biểu thuế 2026."));
    }
    if (!total) { root.appendChild(el("div", { class: "empty" }, "Chưa có mã nào được đánh dấu ★.")); return; }
    if (e.groups.length) {
      var gbox = el("div", { class: "fav-groups" });
      e.groups.forEach(function (g) { gbox.appendChild(favGroupCard(g)); });
      root.appendChild(gbox);
    }
    if (e.codes.length) {
      var box = el("div"); root.appendChild(box);
      renderResults(box, e.codes, [], style);
    }
  }

  function renderHistory(root) {
    root.innerHTML = "";
    var h = Store.history();
    root.appendChild(el("h2", { class: "page-title" }, "Lịch sử tra cứu"));
    root.appendChild(el("button", {
      class: "btn", onclick: function () { Store.clearHistory(); renderHistory(root); }
    }, "🗑 Xóa lịch sử"));
    if (!h.length) { root.appendChild(el("div", { class: "empty" }, "Chưa có lịch sử.")); return; }
    var list = el("div", { class: "hist-list" });
    h.forEach(function (item) {
      list.appendChild(el("div", U.clickable({
        class: "hist-item",
        onclick: function () {
          App.go(item.t === "c" ? "#/code/" + item.v : "#/q/" + encodeURIComponent(item.v));
        }
      }), [
        el("span", { class: "hist-kind" }, item.t === "c" ? "Mã" : "Tìm"),
        el("span", { class: "hist-val" }, item.t === "c" ? U.fmtCode(item.v) : item.v),
        el("span", { class: "hist-time" }, U.fmtDateTime(item.time))
      ]));
    });
    root.appendChild(list);
  }

  function renderMyNotes(root) {
    root.innerHTML = "";
    var codes = Object.keys(Store.userNotes);
    root.appendChild(el("h2", { class: "page-title" }, "Ghi chú của tôi (" + codes.length + ")"));
    if (!codes.length) { root.appendChild(el("div", { class: "empty" }, "Chưa có ghi chú. Mở chi tiết một mã HS để thêm ghi chú.")); return; }
    codes.sort();
    codes.forEach(function (c) {
      root.appendChild(el("div", U.clickable({ class: "mynote", onclick: function () { App.go("#/code/" + c); } }), [
        el("div", { class: "mn-code" }, U.fmtCode(c)),
        el("div", { class: "mn-text" }, Store.userNotes[c])
      ]));
    });
  }

  /* ================= CÔNG CỤ TÍNH THUẾ ================= */

  function renderCalc(root, presetCode) {
    root.innerHTML = "";
    root.appendChild(el("h2", { class: "page-title" }, "Công cụ ước tính thuế nhập khẩu"));
    root.appendChild(el("p", { class: "muted" },
      "Ước tính theo công thức: Thuế NK = Trị giá tính thuế × thuế suất NK; TTĐB = (Trị giá + thuế NK) × thuế suất TTĐB; VAT = (Trị giá + thuế NK + TTĐB + BVMT) × thuế suất VAT. Kết quả chỉ mang tính tham khảo."));
    var codeIn = el("input", { class: "inp", placeholder: "Mã HS 8 số, VD 84713020", value: presetCode || "" });
    var valIn = el("input", { class: "inp", type: "text", inputmode: "numeric", placeholder: "Trị giá tính thuế (VNĐ)" });
    function fmtVND(raw) {
      var digits = raw.replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
      return digits ? Number(digits).toLocaleString("vi-VN") : "";
    }
    var rateSel = el("select", { class: "inp" });
    var out = el("div", { class: "calc-out" });
    function loadRates() {
      rateSel.innerHTML = "";
      var code = codeIn.value.replace(/[^\d]/g, "");
      var i = Store.codeMap[code];
      if (i === undefined) { out.textContent = code ? "Không tìm thấy mã " + code : ""; return; }
      Store.taxOf(i).forEach(function (t) {
        // "*" = hiệp định này không có cam kết ưu đãi cho mã hàng, không phải 1 mức để chọn
        if (t.rate === "" || t.rate === "*") return;
        if (["ttdb", "xk", "xkcptpp", "xkev", "xkukv", "bvmt", "vat"].indexOf(t.k) !== -1) return;
        // chỉ số thuần mới gắn "%" — giống ratePill; giá trị dạng chữ (VD "Theo hướng dẫn...
        // Chương 98", "150% thuế MFN") đã tự đủ nghĩa, thêm "%" vào cuối sẽ sai/thừa
        var isNum = /^[\d.,]+$/.test(t.rate);
        rateSel.appendChild(el("option", { value: t.rate }, t.label + " — " + t.rate + (isNum ? "%" : "")));
      });
      if (!rateSel.options.length) {
        out.textContent = "Mã này không có mức thuế nhập khẩu nào áp dụng được để ước tính.";
      }
      calc();
    }
    function calc() {
      out.innerHTML = "";
      var code = codeIn.value.replace(/[^\d]/g, "");
      var i = Store.codeMap[code];
      var val = parseFloat(valIn.value.replace(/[^\d]/g, ""));
      if (i === undefined || !(val > 0)) return;
      if (!rateSel.value) return;
      var nk = parseFloat(U.shortRate(rateSel.value).replace(",", "."));
      if (isNaN(nk)) {
        // "*" đã bị loadRates() lọc khỏi dropdown nên nhánh này giờ chỉ còn gặp giá trị dạng chữ
        // (tham chiếu Chương 98, "150% thuế MFN", "40 (NHN: 80)"...) — không phải "điều kiện đặc
        // biệt" chung chung, mà là mức thuế được quy định RIÊNG, không tự tính bằng công thức % đơn.
        var msg = rateSel.value === "*"
          ? "⚠ Hiệp định này không có cam kết ưu đãi cho mã hàng — không thể tự tính."
          : "⚠ Mức thuế “";
        var p = el("p", { class: "muted" });
        if (rateSel.value === "*") {
          p.textContent = msg;
        } else {
          p.appendChild(document.createTextNode(msg));
          p.appendChild(rateWithRef(rateSel.value));
          p.appendChild(document.createTextNode("” không tự tính theo công thức % đơn được — vui lòng xem chi tiết mã HS."));
        }
        out.appendChild(p);
        return;
      }
      var ttdbRate = parseFloat(Store.rateOf(i, "ttdb")) || 0;
      var vatRaw = Store.rateOf(i, "vat");
      var vatNums = (vatRaw.match(/\d+(\.\d+)?/g) || []).map(Number);
      var vat = vatNums.length ? Math.max.apply(null, vatNums) : 10;
      var tNK = val * nk / 100;
      var tTTDB = (val + tNK) * ttdbRate / 100;
      var tVAT = (val + tNK + tTTDB) * vat / 100;
      function money(x) { return Math.round(x).toLocaleString("vi-VN") + " đ"; }
      var rows = [["Trị giá tính thuế", money(val)],
        ["Thuế nhập khẩu (" + nk + "%)", money(tNK)]];
      if (ttdbRate) rows.push(["Thuế TTĐB (" + ttdbRate + "%)", money(tTTDB)]);
      rows.push(["Thuế GTGT (" + vat + "%" + (vatRaw && /\*|\//.test(vatRaw) ? " — biểu ghi “" + vatRaw + "”, lấy mức cao nhất" : "") + ")", money(tVAT)]);
      rows.push(["TỔNG THUẾ ước tính", money(tNK + tTTDB + tVAT)]);
      var tb = el("tbody");
      rows.forEach(function (r, k) {
        tb.appendChild(el("tr", { class: k === rows.length - 1 ? "total" : "" },
          [el("td", null, r[0]), el("td", { class: "num" }, r[1])]));
      });
      out.appendChild(el("table", { class: "calc-table" }, tb));
      if (Store.rateOf(i, "bvmt")) out.appendChild(el("p", { class: "muted" }, "⚠ Mặt hàng có thuế BVMT tuyệt đối theo đơn vị hàng hóa — chưa gồm trong ước tính."));
    }
    codeIn.addEventListener("input", U.debounce(loadRates, 300));
    var calcDebounced = U.debounce(calc, 300);
    valIn.addEventListener("input", function () {
      var rawDigitsBefore = valIn.value.slice(0, valIn.selectionStart).replace(/[^\d]/g, "").length;
      var fullDigits = valIn.value.replace(/[^\d]/g, "");
      var leadingZerosRemoved = fullDigits.length - fullDigits.replace(/^0+(?=\d)/, "").length;
      var digitsBefore = Math.max(0, rawDigitsBefore - leadingZerosRemoved);
      valIn.value = fmtVND(valIn.value);
      var pos = 0, count = 0;
      while (pos < valIn.value.length && count < digitsBefore) {
        if (/\d/.test(valIn.value[pos])) count++;
        pos++;
      }
      valIn.setSelectionRange(pos, pos);
      calcDebounced();
    });
    rateSel.addEventListener("change", calc);
    root.appendChild(el("div", { class: "calc-form" }, [
      el("label", null, ["Mã HS", codeIn]),
      el("label", null, ["Trị giá tính thuế (VNĐ)", valIn]),
      el("label", null, ["Thuế suất NK áp dụng", rateSel])
    ]));
    root.appendChild(out);
    if (presetCode) loadRates();
  }

  /* ================= TÌM TRONG CHÚ GIẢI ================= */

  function renderNotesSearch(root, q) {
    root.innerHTML = "";
    root.appendChild(el("h2", { class: "page-title" }, "Tìm trong Chú giải HS 2022: “" + q + "”"));
    var status = el("div", { class: "muted" }, "Đang nạp dữ liệu chú giải…");
    var list = el("div");
    root.appendChild(status); root.appendChild(list);
    Search.searchNotes(q, function (results, tokens) {
      status.textContent = results.length ? results.length + " chương có nội dung phù hợp:" : "Không tìm thấy.";
      results.forEach(function (r) {
        var chapter = null;
        D.chapters.forEach(function (c) { if (c.c === r.c) chapter = c; });
        list.appendChild(el("div", U.clickable({
          class: "ns-hit",
          onclick: function () { App.go("#/notes/" + r.c + "?hl=" + encodeURIComponent(q)); }
        }), [
          el("div", { class: "ns-head" }, "Chương " + r.c + (chapter ? " — " + chapter.vi : "") + "  (" + r.count + " vị trí)"),
          el("div", { class: "ns-snip", html: U.highlight(r.snippet, tokens) })
        ]));
      });
    }, function (done, total) {
      status.textContent = "Đang nạp chú giải… " + done + "/" + total + " chương";
    });
  }

  /* ================= CÀI ĐẶT ================= */

  function renderSettings(root) {
    root.innerHTML = "";
    root.appendChild(el("h2", { class: "page-title" }, "Cài đặt"));
    var meta = D.meta || {};
    var box = el("div", { class: "settings" });
    box.appendChild(el("h3", null, "Giao diện"));
    var lay = el("div", { class: "set-row" });
    [1, 2, 3, 4].forEach(function (n) {
      lay.appendChild(el("button", {
        class: "btn" + (Store.settings.layout === n ? " active" : ""),
        onclick: function () { App.setLayout(n); }
      }, "Giao diện " + n + (n === 4 ? " (mặc định)" : "")));
    });
    box.appendChild(lay);
    box.appendChild(el("h3", null, "Chế độ màu"));
    var modes = el("div", { class: "set-row" });
    [["light", "☀ Sáng"], ["dark", "🌙 Tối"], ["auto", "🌗 Tự động"]].forEach(function (m) {
      modes.appendChild(el("button", {
        class: "btn" + (Store.settings.mode === m[0] ? " active" : ""),
        onclick: function () { App.setMode(m[0]); }
      }, m[1]));
    });
    box.appendChild(modes);
    box.appendChild(el("h3", null, "Dữ liệu"));
    box.appendChild(el("p", { class: "muted" },
      "Biểu thuế XNK 2026 (" + (meta.stats ? meta.stats.coded + " dòng mã" : "") + ") · Chú giải HS 2022 (" +
      (D.notesIdx ? D.notesIdx.length : 0) + " chương). Toàn bộ dữ liệu, đánh dấu, ghi chú và lịch sử đều nằm trên máy của bạn — không gửi lên Internet."));
    box.appendChild(el("div", { class: "set-row" }, [
      el("button", {
        class: "btn danger", onclick: function () {
          if (confirm("Xóa toàn bộ đánh dấu, ghi chú, lịch sử đã lưu trong trình duyệt?")) {
            Object.keys(localStorage).forEach(function (k) { if (k.indexOf("hs2026.") === 0) localStorage.removeItem(k); });
            location.reload();
          }
        }
      }, "Xóa dữ liệu cá nhân đã lưu")
    ]));
    box.appendChild(el("h3", null, "Thông tin"));
    box.appendChild(el("p", null, "Thiết kế bởi Đàm Mạnh Hiếu — Hải quan Khu vực II."));
    box.appendChild(el("p", { class: "muted" }, "Phiên bản " + (meta.version || "?") + " · Build " + U.fmtDateTime(meta.built)));
    root.appendChild(box);
  }

  /* ================= GIAO DIỆN 4: BẢNG THƯ VIỆN ================= */

  function exportHits(hits, filename) {
    var head = ["Mã HS", "Mô tả hàng hóa", "ĐVT"];
    QUICK_COLS.forEach(function (qc) { head.push(qc[1] + " (%)"); });
    var rows = [head];
    hits.forEach(function (i) {
      var r = D.rows[i];
      if (!r[1]) return;
      var row = [U.fmtCode(r[1]), r[3], r[5] || ""];
      QUICK_COLS.forEach(function (qc) { row.push(Store.rateOf(i, qc[0])); });
      rows.push(row);
    });
    U.downloadCSV(filename || "bieu-thue.csv", rows);
  }

  var LIB_COLS = [["nktt", "NK TT"], ["nkud", "NK ưu đãi"], ["vat", "VAT"], ["ttdb", "TTĐB"]];
  function renderLibResults(root, hits, tokens) {
    root.innerHTML = "";
    var digitFilter = "", page = 0;
    var pageSize = Store.settings.pageSize || 50;

    /* thanh tiêu đề + hàng lọc như ảnh 4 */
    var headRow = el("div", { class: "lib-head" }, [
      el("h2", { class: "lib-title" }, "TRA CỨU BIỂU THUẾ"),
      el("div", { class: "lib-head-btns" }, [
        el("button", { class: "btn", onclick: function () { exportHits(applyFilters(), "bieu-thue-ket-qua.csv"); } }, "⬇ Xuất Excel"),
        el("button", { class: "btn", onclick: function () { window.print(); } }, "🖨 In bảng")
      ])
    ]);
    var chSel = el("select", { class: "inp" });
    chSel.appendChild(el("option", { value: "" }, "Tất cả chương"));
    D.chapters.forEach(function (c) {
      chSel.appendChild(el("option", { value: c.c }, c.c + " — " + c.vi.slice(0, 40)));
    });
    chSel.addEventListener("change", function () {
      // chọn 1 chương cụ thể -> điều hướng thật để lấy đúng dữ liệu chương đó và đồng bộ
      // khung chú giải bên dưới
      if (chSel.value) { App.go("#/chapter/" + chSel.value); return; }
      page = 0; build();
    });
    var qInput = el("input", { class: "inp", value: App.state.q || "", placeholder: "Mã HS hoặc từ khóa" });
    if (qInput.value) qInput.select();   // sẵn sàng gõ đè cho lượt tìm tiếp theo
    qInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && qInput.value.trim()) App.go("#/q/" + encodeURIComponent(qInput.value.trim()));
    });
    var digitSel = el("select", { class: "inp" });
    [["", "Mọi cấp mã"], ["4", "Nhóm 4 số"], ["6", "Phân nhóm 6 số"], ["8", "Mã 8 số"]].forEach(function (o) {
      digitSel.appendChild(el("option", { value: o[0] }, o[1]));
    });
    digitSel.addEventListener("change", function () { digitFilter = digitSel.value; page = 0; build(); });
    var extRow = el("div", { class: "lib-filter-ext", hidden: true }, [
      el("label", null, ["Cấp mã: ", digitSel])]);
    var filterRow = el("div", { class: "lib-filter" }, [
      chSel, qInput,
      el("button", {
        class: "btn btn-primary",
        onclick: function () { if (qInput.value.trim()) App.go("#/q/" + encodeURIComponent(qInput.value.trim())); }
      }, "Tìm kiếm"),
      el("button", {
        class: "btn", onclick: function () { extRow.hidden = !extRow.hidden; }
      }, "☰ Mở rộng bộ lọc")
    ]);

    var tableBox = el("div");
    var pagerBox = el("div", { class: "lib-pager" });
    root.appendChild(headRow);
    root.appendChild(filterRow);
    root.appendChild(extRow);
    root.appendChild(tableBox);
    root.appendChild(pagerBox);

    function applyFilters() {
      return hits.filter(function (i) {
        var r = D.rows[i], code = r[1];
        if (digitFilter) {
          if (!code) return false;
          if (digitFilter === "8" ? code.length < 8 : code.length !== +digitFilter) return false;
        }
        return true;
      });
    }

    function build() {
      var list = applyFilters();
      var total = list.length;
      var start = page * pageSize, end = Math.min(start + pageSize, total);
      var pageList = list.slice(start, end);

      var trGroup = el("tr", { class: "th-group" }, [
        el("th", { rowspan: 2 }, "Mã HS"),
        el("th", { class: "col-desc", rowspan: 2 }, "Mô tả hàng hóa"),
        el("th", { rowspan: 2 }, "ĐVT"),
        el("th", { colspan: LIB_COLS.length, class: "grp" }, "Thuế suất (%)"),
        el("th", { rowspan: 2, class: "col-note" }, "Ghi chú")
      ]);
      var trCols = el("tr", { class: "th-cols" });
      LIB_COLS.forEach(function (c) { trCols.appendChild(el("th", { class: "num", "data-tip": colTip(c[0]) }, c[1])); });

      var tbody = el("tbody");
      pageList.forEach(function (i) {
        var r = D.rows[i];
        if (r[0] !== 0) { tbody.appendChild(ctxNoteRow(r, LIB_COLS.length + 4)); return; }
        var code = r[1];
        var attrs = rowClickAttrs(i, code);
        attrs.class = (code ? "row-code lvl" + r[2] : "row-heading lvl" + r[2]) +
          (App.state.sel === i ? " row-selected" : "");
        attrs["data-row"] = i;
        var tr = el("tr", attrs);
        tr.appendChild(el("td", { class: "cell-code" }, code ? [
          el("span", null, U.fmtCode(code)), badgeFor(code)] : ""));
        tr.appendChild(el("td", { class: "cell-desc", html: U.highlight(r[3], tokens) }));
        tr.appendChild(el("td", null, r[5] || ""));
        var byKey = code && code.length >= 8 ? taxByKey(i) : {};
        LIB_COLS.forEach(function (c) {
          var t = byKey[c[0]];
          tr.appendChild(el("td", { class: "num", "data-tip": taxTip(t) },
            t ? U.fmtRate(t.rate) : ""));
        });
        var tdNote = el("td", { class: "col-note" }, [
          code ? starBtn(code) : null,
          policyTag(i, false)
        ]);
        tr.appendChild(tdNote);
        tbody.appendChild(tr);
      });
      tableBox.innerHTML = "";
      tableBox.appendChild(el("div", { class: "table-wrap" },
        el("table", { class: "result-table" }, [el("thead", null, [trGroup, trCols]), tbody])));

      /* phân trang */
      var pages = Math.max(1, Math.ceil(total / pageSize));
      var sizeSel = el("select", { class: "inp" });
      [20, 50, 100].forEach(function (n) {
        var o = el("option", { value: n }, n + " / trang");
        if (n === pageSize) o.selected = true;
        sizeSel.appendChild(o);
      });
      sizeSel.addEventListener("change", function () {
        pageSize = +sizeSel.value; Store.settings.pageSize = pageSize;
        Store.saveSettings(); page = 0; build();
      });
      pagerBox.innerHTML = "";
      pagerBox.appendChild(el("span", null,
        total ? "Hiển thị " + (start + 1) + " đến " + end + " của " + total + " kết quả" : "Không có kết quả"));
      pagerBox.appendChild(el("span", { class: "pager-ctl" }, [
        el("button", { class: "btn", disabled: page === 0 ? "" : null,
          onclick: function () { if (page > 0) { page--; build(); } } }, "‹"),
        el("span", { class: "pager-num" }, String(page + 1) + " / " + pages),
        el("button", { class: "btn", disabled: page >= pages - 1 ? "" : null,
          onclick: function () { if (page < pages - 1) { page++; build(); } } }, "›"),
        sizeSel
      ]));
    }
    build();
  }

  /* ================= VÙNG COMPANION (khung kèm theo từng giao diện) ================= */

  function targetRowOf(info) {
    if (App.state.sel != null && D.rows[App.state.sel] && D.rows[App.state.sel][1]) return App.state.sel;
    if (info.code && Store.codeMap[info.code] !== undefined) return Store.codeMap[info.code];
    if (info.hits) {
      for (var k = 0; k < info.hits.length; k++) {
        var r = D.rows[info.hits[k]];
        if (r[1] && r[1].length >= 8) return info.hits[k];
      }
      for (var k2 = 0; k2 < info.hits.length; k2++) {
        if (D.rows[info.hits[k2]][1]) return info.hits[k2];
      }
    }
    return null;
  }

  function panelCollapse(zone, onToggle) {
    return el("button", {
      class: "panel-collapse", title: "Thu gọn / mở rộng",
      onclick: function () {
        Store.settings.panelOpen = !Store.settings.panelOpen;
        Store.saveSettings();
        zone.classList.toggle("collapsed", !Store.settings.panelOpen);
        if (onToggle) onToggle();
      }
    }, Store.settings.panelOpen ? "⌄⌄" : "⌃⌃");
  }

  /* GD3: khi panel chú giải dưới bị ẩn hẳn (trang chủ/cài đặt/chi tiết mã HS...) thì splitter
     không còn gì để kéo — đánh dấu bằng class để base.css ẩn thanh splitter khi đó. Từ v1.3.40,
     .content không còn bị ép flex theo % nữa (xem base.css §GD3) nên class này chỉ còn vai trò
     ẩn/hiện splitter, không ảnh hưởng kích thước .content. */
  function syncL3Split(ctx, panelHidden) {
    if (ctx.compMode !== "l3" || !ctx.below || !ctx.below.parentElement) return;
    ctx.below.parentElement.classList.toggle("l3-panel-hidden", panelHidden);
  }

  function renderCompanion(ctx, info) {
    if (!ctx) return;
    var zones = [ctx.below, ctx.asideRight];
    if (info.kind === "other" || info.kind === "detail") {
      // "other": các trang không phải kết quả/chi tiết. "detail": trang chi tiết mã HS đã tự
      // đầy đủ (chú giải liên quan, ghi chú, yêu thích, in/xuất) — companion sẽ chỉ lặp lại.
      zones.forEach(function (z) { if (z) { z.hidden = true; } });
      if (ctx.rail) ctx.rail.hidden = true;
      syncL3Split(ctx, true);
      return;
    }
    zones.forEach(function (z) { if (z) z.hidden = false; });
    if (ctx.rail) ctx.rail.hidden = false;
    syncL3Split(ctx, false);
    var i = targetRowOf(info);
    if (ctx.compMode === "l1" && ctx.below) companionL1(ctx.below, i, info);
    if (ctx.compMode === "l2" && ctx.below) companionL2(ctx.below, i, info);
    if (ctx.compMode === "l3" && ctx.below) companionL3(ctx.below, i, info);
    if (ctx.compMode === "l4") {
      if (ctx.asideRight) companionL4Detail(ctx.asideRight, i, info);
      if (ctx.below) companionL4Below(ctx.below, i, info);
    }
    if (ctx.rail) updateRail(ctx.rail, i, info);
  }

  /* ----- GD1: panel CHÚ GIẢI HS 2022 với 3 tab ----- */
  function companionL1(zone, i, info) {
    zone.innerHTML = "";
    zone.classList.toggle("collapsed", !Store.settings.panelOpen);
    zone.appendChild(panelCollapse(zone));
    if (i == null) { zone.appendChild(el("div", { class: "muted pad" }, "Chọn một dòng để xem chú giải.")); return; }
    var p = pathOf(i);
    var code = p.code;
    var bc = el("div", { class: "comp-bc" }, [
      el("b", null, "CHÚ GIẢI HS 2022"),
      el("span", { class: "bc-path" }, [
        p.section ? el("a", { onclick: function () { App.go("#/chapters"); } }, "Phần " + p.section.r) : null,
        p.section ? " / " : null,
        el("a", { onclick: function () { App.go("#/chapter/" + p.cid); } }, "Chương " + p.cid),
        p.head4.length === 4 ? " / " : null,
        p.head4.length === 4 ? el("a", {
          onclick: function () { App.go("#/notes/" + p.cid + "/" + p.head4); }
        }, "Nhóm " + U.fmtCode(p.head4)) : null
      ])
    ]);
    var actions = el("div", { class: "comp-actions" }, [
      starBtn(code),
      el("button", { class: "btn btn-sm", onclick: function () { window.print(); } }, "🖨 In"),
      el("button", { class: "btn btn-sm", onclick: function () { exportDetail(code, i, Store.taxOf(i)); } }, "⬇ Xuất")
    ]);
    var tabNames = ["Chú giải", "Ghi chú cá nhân", "Nguồn"];
    var tabBar = el("div", { class: "comp-tabs" });
    var body = el("div", { class: "comp-body" });
    function showTab(n) {
      tabBar.querySelectorAll("button").forEach(function (b, bi) { b.classList.toggle("active", bi === n); });
      body.innerHTML = "";
      if (n === 0) {
        // lối thoát ra chú giải toàn chương -> đặt trên cùng, luôn thấy được kể cả khi trích đoạn
        // nhóm dài phải cuộn (GD1 vốn là giao diện duy nhất thiếu nút này, xem SYSTEM-SPEC §10.28)
        body.appendChild(el("button", {
          class: "btn btn-link",
          onclick: function () { App.go("#/notes/" + p.cid + (p.head4.length === 4 ? "/" + p.head4 : "")); }
        }, "📖 Mở toàn bộ chú giải Chương " + p.cid + " »"));
        var box = el("div", { class: "notes-excerpt" }, "Đang nạp…");
        body.appendChild(box);
        notesExcerptInto(box, p.cid, p.head4, info.tokens);
        // chú giải chung của cả chương (các khoản 1-, 2-, "TỔNG QUÁT") áp dụng pháp lý cho mọi
        // nhóm nhưng trích đoạn ở trên chỉ hiện đúng nhóm đang xem -> đóng sẵn để nhóm ngắn vẫn
        // đọc gọn, người dùng cần thì tự mở (xem SYSTEM-SPEC §10.28)
        var det = el("details", { class: "chapter-notes" },
          el("summary", null, "Chú giải chung Chương " + p.cid));
        var cbox = el("div", { class: "notes-excerpt" }, "Đang nạp…");
        det.appendChild(cbox);
        body.appendChild(det);
        chapterPreambleInto(cbox, p.cid, info.tokens);
      } else if (n === 1) {
        var ta = el("textarea", { class: "note-area", placeholder: "Ghi chú cá nhân cho mã " + U.fmtCode(code) + "…" });
        ta.value = Store.userNotes[code] || "";
        ta.addEventListener("input", U.debounce(function () { Store.setNote(code, ta.value.trim()); }, 400));
        body.appendChild(ta);
      } else {
        var refs = legalRefsOf(i);
        if (!refs.length) body.appendChild(el("div", { class: "muted" }, "Không có văn bản."));
        refs.forEach(function (rf) {
          body.appendChild(el("div", { class: "ref-line" }, [
            el("b", null, rf.doc), rf.date ? " · HL " + rf.date : "",
            el("span", { class: "muted" }, " — " + rf.labels.slice(0, 4).join(", ") +
              (rf.labels.length > 4 ? "…" : ""))]));
        });
      }
    }
    tabNames.forEach(function (t, n) {
      tabBar.appendChild(el("button", { class: n === 0 ? "active" : "", onclick: function () { showTab(n); } }, t));
    });
    zone.appendChild(el("div", { class: "comp-head" }, [bc, actions]));
    zone.appendChild(tabBar);
    zone.appendChild(body);
    showTab(0);
  }

  /* ----- GD2: panel "Chú giải liên quan" ----- */
  function companionL2(zone, i, info) {
    zone.innerHTML = "";
    zone.classList.toggle("collapsed", !Store.settings.panelOpen);
    zone.appendChild(panelCollapse(zone));
    if (i == null) { zone.appendChild(el("div", { class: "muted pad" }, "Không có mã nào để hiển thị chú giải.")); return; }
    var p = pathOf(i);
    var hl = el("label", { class: "hl-toggle" }, [
      (function () {
        var cb = el("input", { type: "checkbox" });
        cb.checked = !!Store.settings.hlMatch;
        cb.addEventListener("change", function () {
          Store.settings.hlMatch = cb.checked; Store.saveSettings();
          companionL2(zone, i, info);
        });
        return cb;
      })(), "Tô sáng phần khớp"]);
    zone.appendChild(el("div", { class: "comp-head" }, [
      el("b", null, "Chú giải liên quan"), hl]));
    var grid = el("div", { class: "l2-comp-grid" });
    /* thẻ chương bên trái */
    grid.appendChild(el("div", { class: "l2-ch-card" }, [
      el("div", { class: "l2-ch-num" }, "Chương " + p.cid),
      p.chapter ? el("div", { class: "l2-ch-name" }, p.chapter.vi) : null,
      el("div", { class: "l2-ch-ico" }, "📄"),
      el("button", {
        class: "btn", onclick: function () {
          // nhảy thẳng tới đúng nhóm đang xem, khớp cách renderDetail/GD1 đều làm — trước đây
          // thiếu head4 nên luôn mở đầu chương dù đang xem nhóm nào
          App.go("#/notes/" + p.cid + (p.head4 && p.head4.length === 4 ? "/" + p.head4 : ""));
        }
      }, "Xem toàn bộ chương ›")
    ]));
    /* trích đoạn nhóm bên phải */
    var right = el("div", { class: "l2-comp-right" });
    right.appendChild(el("span", { class: "chip chip-grp" }, "Nhóm " + U.fmtCode(p.head4)));
    var box = el("div", { class: "notes-excerpt" }, "Đang nạp…");
    right.appendChild(box);
    notesExcerptInto(box, p.cid, p.head4,
      Store.settings.hlMatch ? info.tokens : []);
    var pol = Store.policyOf(i);
    if (pol) right.appendChild(el("div", { class: "note-box" }, [
      el("b", null, "Chú thích"), el("div", null, pol)]));
    var refs = legalRefsOf(i).slice(0, 3);
    if (refs.length) {
      var rl = el("div", { class: "ref-links" }, el("b", null, "Tham khảo pháp lý"));
      refs.forEach(function (rf) {
        rl.appendChild(el("div", { class: "ref-line" }, rf.doc + (rf.date ? " · " + rf.date : "")));
      });
      right.appendChild(rl);
    }
    grid.appendChild(right);
    zone.appendChild(grid);
  }

  /* ----- GD3: khung dưới 3 cột (cây + khung đọc + liên kết nhanh) ----- */
  function companionL3(zone, i, info) {
    /* giữ trạng thái cây/khung đọc nếu đã dựng — chỉ cập nhật khi đổi mã */
    var p = i != null ? pathOf(i) : null;
    /* tokens phải nằm trong key — nếu không, 2 lượt tìm khác nhau nhưng cùng trỏ tới
       1 mã/nhóm sẽ giữ nguyên phần từ khóa tô sáng cũ của lượt tìm trước */
    var key = (p ? p.cid + "/" + p.head4 : "intro") + "#" + (info.tokens || []).join(",");
    if (zone.getAttribute("data-key") === key) return;
    zone.setAttribute("data-key", key);
    zone.innerHTML = "";
    var tree = el("div", { class: "l3-tree" });
    var reader = el("div", { class: "l3-reader" });
    var quick = el("div", { class: "l3-quick" });
    var searchIn = el("input", { class: "inp", placeholder: "Tìm trong chú giải…" });
    searchIn.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && searchIn.value.trim())
        App.go("#/notes-search/" + encodeURIComponent(searchIn.value.trim()));
    });
    var treeBox = el("div", { class: "l3-tree-box" });
    tree.appendChild(el("div", { class: "comp-title" }, "Cấu trúc nội dung"));
    tree.appendChild(searchIn);
    tree.appendChild(treeBox);
    function openChapter(cid, anchor) {
      renderNotesTree(treeBox, cid, function (pick) { openChapter(pick); });
      renderNotesReader(reader, cid, anchor, info.tokens, false);
    }
    openChapter(p ? p.cid : "intro", p && p.head4.length === 4 ? p.head4 : null);

    quick.appendChild(el("div", { class: "comp-title" }, "Liên kết nhanh"));
    [["Quy tắc 1", "Phạm vi của Chú giải và phân loại hàng hóa", "#/refs/qt6"],
     ["Quy tắc 6", "Phân loại hàng hóa vào phân nhóm", "#/refs/qt6"]].forEach(function (q) {
      quick.appendChild(el("a", { class: "quick-ref", href: q[2] }, [
        el("b", null, q[0]), el("span", null, q[1])]));
    });
    if (p && p.chapter) {
      quick.appendChild(el("a", U.clickable({
        class: "quick-ref", onclick: function () { openChapter(p.cid); }
      }), [el("b", null, "Chương " + p.cid), el("span", null, p.chapter.vi)]));
      if (p.head4.length === 4) quick.appendChild(el("a", U.clickable({
        class: "quick-ref", onclick: function () { openChapter(p.cid, p.head4); }
      }), [el("b", null, "Nhóm " + U.fmtCode(p.head4)), el("span", null, "Chú giải nhóm hàng")]));
    }
    zone.appendChild(tree);
    zone.appendChild(reader);
    zone.appendChild(quick);
  }

  /* ----- GD4: panel chi tiết bên phải + khung chương dưới ----- */
  function companionL4Detail(zone, i, info) {
    zone.innerHTML = "";
    if (i == null) { zone.hidden = true; return; }
    zone.hidden = false;
    var r = D.rows[i], code = r[1];
    var p = pathOf(i);
    zone.appendChild(el("div", { class: "l4-det-head" }, [
      el("b", null, "CHI TIẾT MÃ HS: " + U.fmtCode(code)),
      starBtn(code),
      el("button", {
        class: "l4-det-close", title: "Đóng",
        onclick: function () { App.select(null); zone.hidden = true; }
      }, "×")
    ]));
    zone.appendChild(el("div", { class: "l4-det-sec" }, [
      el("div", { class: "muted" }, "Mô tả hàng hóa"), el("div", null, r[3]),
      r[5] ? el("div", { class: "l4-det-kv" }, [el("span", null, "Đơn vị tính"), el("b", null, r[5])]) : null
    ]));
    var byKey = taxByKey(i);
    var tx = el("div", { class: "l4-det-sec" }, el("div", { class: "muted" }, "Thuế suất (%)"));
    LIB_COLS.concat([["bvmt", "BVMT"]]).forEach(function (c) {
      var t = byKey[c[0]];
      if (t && t.rate !== "") tx.appendChild(el("div", { class: "l4-det-kv", "data-tip": taxTip(t) },
        [el("span", null, t.label), el("b", null, U.fmtRate(t.rate))]));
    });
    zone.appendChild(tx);

    /* đủ các FTA có giá trị (xem FTA_KEYS) — bảng chính không đủ chỗ hiện hết nên khung chi tiết bù đắp */
    var ftaRows = FTA_KEYS.map(function (k) { return byKey[k]; }).filter(function (t) { return t && t.rate !== ""; });
    if (ftaRows.length) {
      var ftaSec = el("div", { class: "l4-det-sec" }, el("div", { class: "muted" }, "Thuế NK ưu đãi đặc biệt (FTA)"));
      ftaRows.forEach(function (t) {
        var disp = U.shortRate(t.rate);
        var tip = taxTip(t);
        if (disp !== t.rate) {
          var note = t.label + ": " + t.rate;
          tip = tip ? note + " — " + tip : note;
        }
        ftaSec.appendChild(el("div", { class: "l4-det-kv", "data-tip": tip },
          [el("span", null, t.label), el("b", null, U.fmtRate(disp) + (disp !== "" && /^[\d.]+$/.test(disp) ? "%" : ""))]));
      });
      zone.appendChild(ftaSec);
    }
    var pol = Store.policyOf(i);
    if (pol) zone.appendChild(el("div", { class: "l4-det-sec" }, [
      el("div", { class: "muted" }, "Ghi chú"), el("div", null, pol.slice(0, 260) + (pol.length > 260 ? "…" : ""))]));
    zone.appendChild(el("div", { class: "l4-det-sec" }, [
      el("div", { class: "muted" }, "Tham khảo chú giải"),
      el("a", { class: "link", onclick: function () { App.go("#/notes/" + p.cid + "/" + p.head4); } },
        U.fmtCode(p.head4) + " — Chú giải nhóm"),
      el("a", { class: "link", onclick: function () { App.go("#/code/" + code); } }, "Trang chi tiết đầy đủ »")
    ]));
  }

  function companionL4Below(zone, i, info) {
    var p = i != null ? pathOf(i) : null;
    var key = (p ? p.cid : "intro") + "@" + (Store.settings.zoom4 || 100) +
      "#" + (info.tokens || []).join(",");
    if (zone.getAttribute("data-key") === key) return;
    zone.setAttribute("data-key", key);
    zone.innerHTML = "";
    var tree = el("div", { class: "l4-tree" });
    var readerWrap = el("div", { class: "l4-reader" });
    var refs = el("div", { class: "l4-refs" });
    tree.appendChild(el("div", { class: "comp-title" }, "CẤU TRÚC CHƯƠNG"));
    var treeBox = el("div", { class: "l3-tree-box" });
    tree.appendChild(treeBox);
    var reader = el("div", { class: "l4-reader-body" });
    var zoomVal = Store.settings.zoom4 || 100;
    function setZoom(v) {
      zoomVal = Math.max(70, Math.min(180, v));
      Store.settings.zoom4 = zoomVal; Store.saveSettings();
      reader.style.fontSize = zoomVal + "%";
      zoomLabel.textContent = zoomVal + "%";
    }
    var zoomLabel = el("span", { class: "zoom-label" }, zoomVal + "%");
    var toolbar = el("div", { class: "l4-reader-bar" }, [
      el("button", { class: "btn btn-sm", onclick: function () { setZoom(zoomVal - 10); } }, "−"),
      el("button", { class: "btn btn-sm", onclick: function () { setZoom(zoomVal + 10); } }, "+"),
      zoomLabel,
      el("button", { class: "btn btn-sm", onclick: function () { setZoom(100); } }, "Phù hợp chiều rộng"),
      el("span", { class: "spacer" }),
      i != null ? starBtn(D.rows[i][1]) : null,
      el("button", { class: "btn btn-sm", onclick: function () { window.print(); } }, "🖨 In"),
      i != null ? el("button", {
        class: "btn btn-sm",
        onclick: function () { exportDetail(D.rows[i][1], i, Store.taxOf(i)); }
      }, "⬇ Xuất") : null
    ]);
    readerWrap.appendChild(toolbar);
    readerWrap.appendChild(reader);
    function openChapter(cid, anchor) {
      renderNotesTree(treeBox, cid, function (pick) { openChapter(pick); });
      renderNotesReader(reader, cid, anchor, info.tokens, false);
      reader.style.fontSize = zoomVal + "%";
    }
    openChapter(p ? p.cid : "intro", p && p.head4.length === 4 ? p.head4 : null);

    refs.appendChild(el("div", { class: "comp-title" }, "THAM CHIẾU LIÊN QUAN"));
    var list = i != null ? legalRefsOf(i) : [];
    list.slice(0, 4).forEach(function (rf) {
      refs.appendChild(el("div", { class: "l4-ref-card" }, [
        el("b", null, rf.doc),
        el("div", { class: "muted" }, (rf.date ? "HL " + rf.date + " — " : "") +
          rf.labels.slice(0, 3).join(", ") + (rf.labels.length > 3 ? "…" : ""))]));
    });
    refs.appendChild(el("a", { class: "btn btn-block", href: "#/refs/ht" },
      "Xem tất cả văn bản »"));
    zone.appendChild(tree);
    zone.appendChild(readerWrap);
    zone.appendChild(refs);
  }

  /* ----- GD2: rail hành động bên phải ----- */
  function updateRail(rail, i, info) {
    rail.innerHTML = "";
    var code = i != null ? D.rows[i][1] : null;
    var favBtn = null;
    var items = [
      ["⭐", "Ưa thích", code ? function () {
        var on = Store.toggleFav(code);
        notifyFav(code);
        U.toast(on ? "★ Đã thêm " + U.fmtCode(code) + " vào Yêu thích"
                   : "☆ Đã bỏ " + U.fmtCode(code) + " khỏi Yêu thích");
      } : null, code && Store.isFav(code)],
      ["📝", "Ghi chú", code ? function () { App.go("#/code/" + code); } : null],
      ["🖨", "In", function () { window.print(); }],
      ["⬇", "Xuất file", info.hits && info.hits.length
        ? function () { exportHits(info.hits, "ket-qua-tra-cuu.csv"); }
        : (code ? function () { exportDetail(code, i, Store.taxOf(i)); } : null)]
    ];
    items.forEach(function (it, idx) {
      var btn = el("button", {
        class: "rail-btn" + (it[3] ? " on" : ""),
        disabled: it[2] ? null : "",
        onclick: it[2] || null
      }, [el("span", { class: "rail-ico" }, it[0]), el("span", { class: "rail-lb" }, it[1])]);
      if (idx === 0) favBtn = btn;
      rail.appendChild(btn);
    });
    if (code && favBtn) {
      favBtn.update = function () { favBtn.classList.toggle("on", Store.isFav(code)); };
      watchFav(code, favBtn.update, favBtn);
    }
  }

  return {
    renderResults: renderResults,
    groupNavBar: groupNavBar,
    resultTableFull: resultTableFull,
    renderLibResults: renderLibResults,
    renderCompanion: renderCompanion,
    exportHits: exportHits,
    renderDetail: renderDetail,
    renderNotesReader: renderNotesReader,
    renderNotesTree: renderNotesTree,
    renderNotesSearch: renderNotesSearch,
    renderChapters: renderChapters,
    renderChapterRows: renderChapterRows,
    renderRef: renderRef,
    renderFavorites: renderFavorites,
    renderHistory: renderHistory,
    renderMyNotes: renderMyNotes,
    renderCalc: renderCalc,
    renderSettings: renderSettings,
    QUICK_COLS: QUICK_COLS,
    ftaCount: ftaCount
  };
})();
