/* store.js — tầng dữ liệu: truy cập __HSDATA + localStorage */
"use strict";

var Store = (function () {
  var D = window.__HSDATA;
  var LS_PREFIX = "hs2026.";

  /* ---------------- localStorage ---------------- */
  function lsGet(key, def) {
    try {
      var v = localStorage.getItem(LS_PREFIX + key);
      return v === null ? def : JSON.parse(v);
    } catch (e) { return def; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(val)); } catch (e) {}
  }

  var settings = lsGet("settings", {});
  /* mặc định cho mọi thiết lập (các key mới tự bổ sung khi nâng cấp) */
  var SET_DEF = {
    layout: 4, mode: "auto",   // GD4 mặc định từ v1.3.48 (trước đó GD2); ai đã tự chọn GD thì giữ nguyên
    panelOpen: true,     // panel chú giải kèm màn hình kết quả
    hlMatch: true,       // GD2: tô sáng phần khớp
    sideCollapsed: false,// GD1/GD3: thu gọn sidebar
    split3: 52,          // GD3: % chiều cao bảng trên splitter
    zoom4: 100,          // GD4: cỡ chữ khung đọc (%)
    pageSize: 50         // GD2/GD4: số dòng mỗi trang
  };
  for (var sk in SET_DEF) if (settings[sk] === undefined) settings[sk] = SET_DEF[sk];
  var favorites = lsGet("favorites", []).filter(function (c) { return typeof c === "string" && c; });
  // lọc bỏ phần tử rác (null/""/không phải chuỗi) từng lọt vào do toggleFav() thiếu kiểm
  // tra đầu vào ở các bản trước — nếu không, favCount() đếm cả rác trong khi renderFavorites
  // bỏ qua chúng, gây mâu thuẫn số đếm trên tiêu đề vs. số mục thực hiện trên trang.
  var userNotes = lsGet("notes", {});       // {code: text}
  var history = lsGet("history", []);       // [{t:'q'|'c', v, time}]

  /* ---------------- chỉ mục biểu thuế ---------------- */
  var codeMap = {};      // code -> rowIdx
  var goodsIdx = [];     // rowIdx của các dòng có mã
  var normVi = [], normEn = [];  // norm cache theo goodsIdx thứ tự
  var chapterOfRow = []; // rowIdx -> chapter index (trong D.chapters)
  var removedSet = {}, addedSet = {};
  var pl1Set = {};
  var groupList = [];    // [{head4, row, label}] mỗi nhóm 4 số duy nhất, theo đúng thứ tự trong biểu thuế
  var groupPos = {};     // head4 -> vị trí trong groupList

  function buildIndex() {
    var rows = D.rows, chapters = D.chapters;
    var ci = -1;
    for (var i = 0; i < rows.length; i++) {
      while (ci + 1 < chapters.length && i >= chapters[ci + 1].row) ci++;
      chapterOfRow[i] = ci;
      var r = rows[i];
      if (r[0] === 0) {
        goodsIdx.push(i);
        if (r[1]) codeMap[r[1]] = i;
        normVi.push(U.norm(r[3]));
        normEn.push(U.norm(r[4]));
        if (r[1] && r[1].length >= 4) {
          var h4 = r[1].slice(0, 4);
          if (groupPos[h4] === undefined) {
            groupPos[h4] = groupList.length;
            groupList.push({ head4: h4, row: i, label: r[3] });
          }
        }
      } else {
        normVi.push("");
        normEn.push("");
      }
    }
    (D.removed || []).forEach(function (x) { removedSet[x[0]] = x[1]; });
    (D.added || []).forEach(function (x) { addedSet[x[0]] = x[1]; });
    ((D.pl1 && D.pl1.codes) || []).forEach(function (c) { pl1Set[c] = true; });
  }

  /* ---------------- thuế suất ---------------- */
  function taxOf(rowIdx) {
    /* trả về [{k, label, rate, doc, date}] cho dòng hàng */
    var r = D.rows[rowIdx];
    if (!r || r[0] !== 0 || !r[7]) return [];
    var rates = r[7].split("|");
    var code = r[1];
    var out = [];
    for (var ci = 0; ci < D.taxcols.length; ci++) {
      var rate = rates[ci] || "";
      var doc = "", date = "";
      if (rate !== "") {
        var exc = D.taxexc[String(ci)] && D.taxexc[String(ci)][code];
        var pair = exc || D.taxdef[ci];
        doc = pair[0] >= 0 ? D.dict[pair[0]] : "";
        date = pair[1] >= 0 ? D.dict[pair[1]] : "";
      }
      out.push({ k: D.taxcols[ci][0], label: D.taxcols[ci][1], rate: rate, doc: doc, date: date });
    }
    return out;
  }

  function rateOf(rowIdx, key) {
    var r = D.rows[rowIdx];
    if (!r || r[0] !== 0 || !r[7]) return "";
    var ci = taxColIdx(key);
    return ci < 0 ? "" : (r[7].split("|")[ci] || "");
  }

  var _taxColIdx = null;
  function taxColIdx(key) {
    if (!_taxColIdx) {
      _taxColIdx = {};
      D.taxcols.forEach(function (tc, i) { _taxColIdx[tc[0]] = i; });
    }
    return key in _taxColIdx ? _taxColIdx[key] : -1;
  }

  /* nhóm 4 số liền trước/sau (dir = -1/+1), tự động nối liền qua ranh giới chương */
  function adjacentGroup(head4, dir) {
    var pos = groupPos[head4];
    if (pos === undefined) return null;
    var np = pos + dir;
    return np >= 0 && np < groupList.length ? groupList[np] : null;
  }

  /* mã đầu tiên có số liệu thuế (r[7]) trong nhóm 4 số — nhóm bản thân chỉ là tiêu đề, không có thuế */
  function firstTaxedCodeOf(head4) {
    var pos = groupPos[head4];
    if (pos === undefined) return null;
    var start = groupList[pos].row;
    var end = pos + 1 < groupList.length ? groupList[pos + 1].row : D.rows.length;
    for (var i = start; i < end; i++) {
      var r = D.rows[i];
      if (r[0] === 0 && r[1] && r[1].slice(0, 4) === head4 && r[7]) return r[1];
    }
    return null;
  }

  /* nhóm liền trước/sau CÓ ít nhất 1 mã tính thuế — dùng khi cần nhảy sang 1 mã cụ thể (trang chi tiết);
     tự bỏ qua các nhóm chỉ có tiêu đề mà không có dòng thuế nào */
  function nextTaxedGroupCode(head4, dir) {
    var h = head4, tries = 0;
    while (tries < 30) {
      var g = adjacentGroup(h, dir);
      if (!g) return null;
      var code = firstTaxedCodeOf(g.head4);
      if (code) return { head4: g.head4, code: code, label: g.label };
      h = g.head4; tries++;
    }
    return null;
  }

  /* thông tin 1 nhóm 4 số / phân nhóm 6 số đã lưu vào Yêu thích: dòng tiêu đề + số mã con.
     Duyệt trong đúng [start,end) của nhóm 4 số cha (giống firstTaxedCodeOf) thay vì quét cả bảng
     — prefix có thể dài 4 (nhóm) hoặc 6 (phân nhóm), luôn tra groupPos theo 4 số đầu. */
  function groupInfo(prefix) {
    var pos = groupPos[prefix.slice(0, 4)];
    if (pos === undefined) return null;
    var start = groupList[pos].row;
    var end = pos + 1 < groupList.length ? groupList[pos + 1].row : D.rows.length;
    var self = -1, n = 0;
    for (var i = start; i < end; i++) {
      var r = D.rows[i];
      if (r[0] !== 0 || !r[1] || r[1].slice(0, prefix.length) !== prefix) continue;
      if (r[1].length === prefix.length) self = i; else n++;
    }
    if (self < 0) return null;
    return { code: prefix, row: self, label: D.rows[self][3], count: n };
  }

  /* tách Yêu thích thành 3 phần để renderFavorites hiển thị đúng: nhóm/phân nhóm (thẻ gọn),
     mã 8 số (dòng thuế đầy đủ như cũ), và số mục không còn khớp dòng nào trong biểu 2026
     (đã bị xóa khỏi biểu thuế) — dùng để tiêu đề đếm đúng số mục THẬT SỰ hiện ra, không lệch
     như trước (xem SYSTEM-SPEC §10.21) */
  function favEntries() {
    var groups = [], codes = [], missing = 0;
    favorites.forEach(function (code) {
      if (code.length >= 8) {
        var row = codeMap[code];
        if (row === undefined) { missing++; return; }
        codes.push(row);
      } else {
        var g = groupInfo(code);
        if (!g) { missing++; return; }
        groups.push(g);
      }
    });
    return { groups: groups, codes: codes, missing: missing };
  }

  function policyOf(rowIdx) {
    var r = D.rows[rowIdx];
    if (r && r[0] === 0 && r.length > 8 && r[8] >= 0) return D.dict[r[8]];
    return "";
  }
  function giamVatOf(rowIdx) {
    var r = D.rows[rowIdx];
    return r && r[0] === 0 && r.length > 9 ? r[9] : "";
  }

  /* FTA: nước không được hưởng ưu đãi */
  function ftaExclOf(code) {
    var out = [];
    var labels = {};
    D.taxcols.forEach(function (tc) { labels[tc[0]] = tc[1]; });
    for (var k in (D.ftaExcl || {})) {
      var e = D.ftaExcl[k];
      if (e.map[code] !== undefined) {
        out.push({ k: k, label: labels[k] || k, countries: e.vals[e.map[code]] });
      }
    }
    return out;
  }

  /* ---------------- chú giải (lazy load) ---------------- */
  var notesLoading = {};
  function loadNotes(cid, cb) {
    D.notes = D.notes || {};
    if (D.notes[cid] !== undefined) { cb(D.notes[cid]); return; }
    if (notesLoading[cid]) { notesLoading[cid].push(cb); return; }
    notesLoading[cid] = [cb];
    var s = document.createElement("script");
    s.src = "data/notes/ch" + cid + ".js?v=" + ((D.meta && D.meta.version) || "0");
    s.onload = function () {
      var cbs = notesLoading[cid]; delete notesLoading[cid];
      cbs.forEach(function (f) { f(D.notes[cid] || ""); });
    };
    s.onerror = function () {
      var cbs = notesLoading[cid]; delete notesLoading[cid];
      D.notes[cid] = "";
      cbs.forEach(function (f) { f(""); });
    };
    document.head.appendChild(s);
  }

  function loadAllNotes(progressCb, doneCb) {
    var ids = D.notesIdx.map(function (e) { return e.c; });
    var left = ids.length, done = 0;
    if (!left) { doneCb(); return; }
    ids.forEach(function (cid) {
      loadNotes(cid, function () {
        done++; left--;
        if (progressCb) progressCb(done, ids.length);
        if (!left) doneCb();
      });
    });
  }

  function notesIdxOf(cid) {
    for (var i = 0; i < D.notesIdx.length; i++)
      if (D.notesIdx[i].c === cid) return D.notesIdx[i];
    return null;
  }

  /* ---------------- yêu thích / ghi chú / lịch sử ---------------- */
  function toggleFav(code) {
    if (!code || typeof code !== "string") return false;   // chặn null/""/kiểu lạ lọt vào danh sách
    var i = favorites.indexOf(code);
    if (i >= 0) favorites.splice(i, 1); else favorites.unshift(code);
    lsSet("favorites", favorites);
    return i < 0;
  }
  function isFav(code) { return favorites.indexOf(code) >= 0; }

  function setNote(code, text) {
    if (text) userNotes[code] = text; else delete userNotes[code];
    lsSet("notes", userNotes);
  }

  function addHistory(type, val) {
    history = history.filter(function (h) { return !(h.t === type && h.v === val); });
    history.unshift({ t: type, v: val, time: Date.now() });
    if (history.length > 200) history.length = 200;
    lsSet("history", history);
  }
  function clearHistory() { history = []; lsSet("history", history); }

  function saveSettings() { lsSet("settings", settings); }

  return {
    D: D,
    buildIndex: buildIndex,
    codeMap: codeMap,
    goodsIdx: goodsIdx,
    normVi: normVi,
    normEn: normEn,
    chapterOf: function (rowIdx) { return chapterOfRow[rowIdx]; },
    taxOf: taxOf,
    rateOf: rateOf,
    taxColIdx: taxColIdx,
    policyOf: policyOf,
    adjacentGroup: adjacentGroup,
    firstTaxedCodeOf: firstTaxedCodeOf,
    nextTaxedGroupCode: nextTaxedGroupCode,
    groupInfo: groupInfo,
    favEntries: favEntries,
    giamVatOf: giamVatOf,
    ftaExclOf: ftaExclOf,
    removedSet: removedSet,
    addedSet: addedSet,
    pl1Set: pl1Set,
    loadNotes: loadNotes,
    loadAllNotes: loadAllNotes,
    notesIdxOf: notesIdxOf,
    settings: settings,
    saveSettings: saveSettings,
    favorites: favorites,
    toggleFav: toggleFav,
    isFav: isFav,
    favCount: function () { return favorites.length; },
    userNotes: userNotes,
    setNote: setNote,
    history: function () { return history; },
    addHistory: addHistory,
    clearHistory: clearHistory
  };
})();
