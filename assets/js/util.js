/* util.js — hàm tiện ích chung */
"use strict";

var U = {
  el: function (tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === "class") e.className = attrs[k];
        else if (k === "html") e.innerHTML = attrs[k];
        else if (k === "text") e.textContent = attrs[k];
        else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) e.setAttribute(k, attrs[k]);
      }
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c === null || c === undefined) return;
        e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      });
    }
    return e;
  },

  esc: function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  /* bỏ dấu tiếng Việt + thường hóa để so khớp. BẤT BIẾN bắt buộc: chuỗi trả về phải DÀI ĐÚNG BẰNG
     chuỗi vào — U.highlight() và Search.searchNotes() tính offset trên bản đã norm rồi cắt/tô sáng
     ngay trên chuỗi GỐC tại đúng offset đó, nên lệch 1 ký tự là lệch vị trí tô sáng/snippet. */
  norm: function (s) {
    s = String(s || "").toLowerCase();
    var out = s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
    if (out.length === s.length) return out;   // đường nhanh — đúng với tuyệt đại đa số chuỗi
    /* Dữ liệu thật (mô tả biểu thuế + chú giải HS) có DẤU TỔ HỢP MỒ CÔI — ký tự dấu không gắn với
       chữ cái nào (VD lỗi gõ trong PDF/Excel nguồn) — nên NFD rồi xoá dấu làm mất hẳn 1 ký tự thay
       vì gộp 2 ký tự về 1. Đã đo trên dữ liệu: 145 ký tự/29 dòng biểu thuế, 49 ký tự/11 chương chú
       giải, lệch tới 23 ký tự ở Chương 84 (xem SYSTEM-SPEC §10.30). Ánh xạ từng ký tự 1-1 để giữ
       đúng độ dài trong các trường hợp hiếm này. */
    return s.split("").map(function (ch) {
      var d = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
      return (d || ch).replace(/đ/g, "d");
    }).join("");
  },

  /* App đang được phục vụ từ 1 trang web thật (GitHub Pages...) hay mở từ file trên máy?
     Cùng 1 bộ code chạy cả 2 nơi (zip ngoại tuyến + web công khai), nên các câu kiểu "Hoạt động
     ngoại tuyến"/"không cần Internet" chỉ đúng ở bản mở từ file — xem SYSTEM-SPEC §10.35.
     localhost tính là "trên máy": đó là server thử nghiệm, và ảnh hướng dẫn (đi kèm bản zip) chụp
     qua localhost nên phải ra đúng câu chữ của bản ngoại tuyến. Thêm ?web=1 vào URL để ép câu chữ
     bản web khi cần kiểm thử ở localhost. */
  isWeb: function () {
    var l = window.location;
    if (/[?&]web=1\b/.test(l.search)) return true;
    return /^https?:$/.test(l.protocol) && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(l.hostname);
  },

  /* màn hình điện thoại — cùng ngưỡng với khối @media (max-width: 640px) trong base.css */
  isPhone: function () {
    return !!(window.matchMedia && window.matchMedia("(max-width: 640px)").matches);
  },

  /* thêm tabindex=0 + kích hoạt bằng Enter/Space cho div/tr/a (không href) có onclick —
     các phần tử này không tự nhận focus bàn phím như <a href> hay <button> */
  clickable: function (attrs) {
    if (!attrs || !attrs.onclick) return attrs;
    if (attrs.tabindex === undefined) attrs.tabindex = "0";
    if (attrs.role === undefined) attrs.role = "button";
    var onclick = attrs.onclick;
    attrs.onkeydown = function (ev) {
      if (ev.target !== ev.currentTarget) return;   // để nút/link con tự xử lý phím của nó
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onclick(ev); }
    };
    return attrs;
  },

  /* cuộn 1 phần tử vào khoảng giữa khung cuộn gần nhất bao quanh nó.
     KHÔNG dùng scrollIntoView: hàm đó cuộn MỌI khung tổ tiên kể cả cửa sổ, sẽ kéo cả trang
     xuống (xem cảnh báo trong renderNotesReader ở views.js). Ở đây chỉ đặt scrollTop của
     đúng 1 khung cuộn tìm được. Nếu phần tử chưa gắn vào tài liệu thì mọi phép đo bằng 0
     và vòng lặp không tìm ra khung nào -> tự bỏ qua, không làm gì. */
  centerInScrollBox: function (elm) {
    if (!elm || !elm.getBoundingClientRect) return;
    var box = elm.parentNode;
    while (box && box.nodeType === 1 && box !== document.body) {
      if (box.scrollHeight > box.clientHeight + 2) {
        var ov = window.getComputedStyle(box).overflowY;
        if (ov === "auto" || ov === "scroll") break;
      }
      box = box.parentNode;
    }
    if (!box || box.nodeType !== 1 || box === document.body) return;
    var er = elm.getBoundingClientRect(), br = box.getBoundingClientRect();
    /* dùng hiệu getBoundingClientRect thay vì offsetTop vì offsetParent của phần tử
       không chắc chính là khung cuộn; Math.max(0,...) lo mục nằm ở đầu danh sách */
    box.scrollTop = Math.max(0,
      box.scrollTop + (er.top - br.top) - (box.clientHeight - er.height) / 2);
  },

  debounce: function (fn, ms) {
    var t = null;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  },

  /* '01012100' -> '0101.21.00' */
  fmtCode: function (c) {
    c = String(c || "");
    if (c.length <= 4) return c;
    var parts = [c.slice(0, 4)];
    for (var i = 4; i < c.length; i += 2) parts.push(c.slice(i, i + 2));
    return parts.join(".");
  },

  fmtRate: function (v) {
    if (v === "" || v == null) return "–";
    return v;
  },

  // tách phần số ở đầu chuỗi thuế suất khi có kèm ghi chú loại trừ nước (luôn có khoảng
  // trắng) — VD "0 (-BN, KH, ID, MY, CN)" -> "0". Không đụng tới các định dạng gọn sẵn có
  // kiểu phân số/điều kiện không khoảng trắng (không có dấu cách) — giữ nguyên như cũ.
  shortRate: function (v) {
    if (!v || v.indexOf(" ") === -1) return v;
    var m = /^[\d.,]+/.exec(v);
    return m ? m[0] : v;
  },

  /* tô sáng các từ khóa (đã norm) trong chuỗi gốc, trả về HTML */
  highlight: function (text, tokens) {
    if (!tokens || !tokens.length) return U.esc(text);
    var normText = U.norm(text);
    var marks = []; // [start, end]
    tokens.forEach(function (tok) {
      if (!tok) return;
      var idx = 0;
      while ((idx = normText.indexOf(tok, idx)) !== -1) {
        marks.push([idx, idx + tok.length]);
        idx += tok.length;
      }
    });
    if (!marks.length) return U.esc(text);
    marks.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [];
    marks.forEach(function (m) {
      var last = merged[merged.length - 1];
      if (last && m[0] <= last[1]) last[1] = Math.max(last[1], m[1]);
      else merged.push(m.slice());
    });
    // NFD có thể làm lệch chỉ số nếu chuỗi có ký tự tổ hợp; map lại chỉ số. Phải khớp CHÍNH XÁC
    // cùng quy tắc với U.norm ở trên (kể cả nhánh dấu tổ hợp mồ côi -> giữ 1 ký tự thay vì bỏ hẳn,
    // xem SYSTEM-SPEC §10.30) — 2 vòng lặp tách biệt nhưng phải sinh ra CÙNG độ dài, nếu không
    // `map[m[0]]` sẽ trỏ sai/undefined và <mark> vỡ vị trí.
    var map = [], n = 0;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var d = ch.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
      if (!d) d = ch;
      for (var j = 0; j < d.length; j++) map[n++] = i;
    }
    var out = "", pos = 0;
    merged.forEach(function (m) {
      var s = map[m[0]], e = map[m[1] - 1] + 1;
      if (s == null || s < pos) return;
      out += U.esc(text.slice(pos, s)) + "<mark>" + U.esc(text.slice(s, e)) + "</mark>";
      pos = e;
    });
    out += U.esc(text.slice(pos));
    return out;
  },

  downloadCSV: function (filename, rows) {
    var csv = rows.map(function (r) {
      return r.map(function (c) {
        c = String(c == null ? "" : c);
        return /[",;\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
      }).join(";");
    }).join("\r\n");
    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  },

  fmtDateTime: function (iso) {
    var d = new Date(iso);
    if (isNaN(d)) return iso || "";
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear() +
      " " + p(d.getHours()) + ":" + p(d.getMinutes());
  },

  /* tooltip dùng chung: 1 div #hs-tip cố định + delegation trên [data-tip]
     (dùng div riêng thay vì title/CSS ::after để không bị bảng overflow cắt) */
  initTooltip: function () {
    if (document.getElementById("hs-tip")) return;
    var tip = document.createElement("div");
    tip.id = "hs-tip";
    document.body.appendChild(tip);
    var cur = null;
    function hide() { cur = null; tip.classList.remove("show"); }
    document.addEventListener("mouseover", function (ev) {
      var t = ev.target && ev.target.closest ? ev.target.closest("[data-tip]") : null;
      if (!t) { if (cur) hide(); return; }
      if (t === cur) return;
      cur = t;
      tip.textContent = t.getAttribute("data-tip");
      tip.classList.add("show");
      tip.style.left = "0px"; tip.style.top = "0px";
      var r = t.getBoundingClientRect();
      var tw = tip.offsetWidth, th = tip.offsetHeight;
      var x = Math.min(Math.max(8, r.left + r.width / 2 - tw / 2), window.innerWidth - tw - 8);
      var y = r.bottom + 8;
      if (y + th > window.innerHeight - 8) y = r.top - th - 8;
      tip.style.left = x + "px";
      tip.style.top = Math.max(8, y) + "px";
    });
    document.addEventListener("scroll", hide, true);
  },

  /* thông báo ngắn (toast) xác nhận 1 thao tác — tự ẩn sau vài giây */
  toast: function (msg, ms) {
    var t = document.getElementById("hs-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "hs-toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(function () { t.classList.remove("show"); }, ms || 1800);
  }
};
