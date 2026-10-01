/* search.js — tìm kiếm mã HS, mô tả (không dấu, thông minh) và chú giải */
"use strict";

var Search = (function () {
  var D = window.__HSDATA;

  /* Số dòng tối đa 1 lượt tìm trả về (mã hoặc mô tả). Đo trên dữ liệu thật: mọi truy vấn có ý
     nghĩa nghiệp vụ đều nằm dưới ngưỡng này (chương "84" — nặng nhất — ra 1.951 dòng; tìm mô tả
     "máy" ra 949) — chỉ truy vấn 1 chữ số kiểu "8" (5.247 dòng) mới chạm trần, và đó vốn không
     phải đơn vị tra cứu thực tế. Trước đây byCode/byText cap riêng 500/300 và cắt HOÀN TOÀN ÂM
     THẦM (không báo, không có cờ) — xem SYSTEM-SPEC §10.22. */
  var MAX_HITS = 2000;

  function isCodeQuery(q) {
    return /^[\d.\s]+$/.test(q.trim()) && /\d/.test(q);
  }

  /* Tìm theo mã: khớp tiền tố. '0102.21' -> '010221'.
     Dòng phụ đề không mã (VD "- - - Công suất không quá 125 kW:") nằm XEN GIỮA các mã khớp được giữ
     lại qua bộ đệm `pending` — chỉ ghép vào kết quả khi có mã khớp tiếp theo ngay sau (tức phụ đề đó
     thật sự thuộc nhóm đang xem); gặp 1 mã KHÔNG khớp thì xoá đệm vì phụ đề đó thuộc nhóm khác.
     Trả kèm `truncated` — chỉ `run()` gọi hàm này, không export ra ngoài. */
  function byCode(q, limit) {
    var digits = q.replace(/[^\d]/g, "");
    if (!digits) return { hits: [], truncated: false };
    var out = [], pending = [], truncated = false;
    // mã đủ 8 số đã là 1 mã lá cụ thể (không còn con bên dưới) — không cần kèm phụ đề cha, giữ
    // đúng hành vi cũ (tra 1 mã 8 số ra đúng 1 dòng); chỉ tra theo tiền tố ngắn hơn (nhóm/phân
    // nhóm) mới cần dựng lại cả cây phân cấp bằng phụ đề xen giữa
    var mergeHeadings = digits.length < 8;
    var gi = Store.goodsIdx;
    for (var n = 0; n < gi.length; n++) {
      var i = gi[n];
      var code = D.rows[i][1];
      if (!code) { if (mergeHeadings) pending.push(i); continue; }
      if (code.slice(0, digits.length) === digits) {
        if (pending.length) { out = out.concat(pending); pending = []; }
        out.push(i);
        if (out.length >= limit) { truncated = true; break; }
      } else {
        pending = [];
      }
    }
    return { hits: out, truncated: truncated };
  }

  /* Mô tả ĐẦY ĐỦ (dòng + chuỗi cha, qua fullDesc) đã norm, cho mỗi dòng hàng. Dòng con trong biểu
     thuế không lặp lại ngữ cảnh của nhóm cha (VD "Cá, đông lạnh" nằm ở nhóm 03.03, mã con 0303.24
     chỉ ghi "Cá da trơn") nên nếu chỉ soi mô tả của chính dòng thì không bao giờ tìm được mã con
     bằng từ của nhóm cha — xem SYSTEM-SPEC §10.32. Dựng LƯỜI ở lần tìm theo mô tả đầu tiên
     (~100-200ms/toàn bộ 17,6k dòng), không làm chậm khởi động; tra theo mã số không kích hoạt. */
  var normFull = null;
  function ensureNormFull() {
    if (normFull) return;
    normFull = [];
    var gi = Store.goodsIdx;
    for (var n = 0; n < gi.length; n++) normFull[gi[n]] = U.norm(fullDesc(gi[n]));
  }

  /* Ký tự có phải chữ/số không. Dùng được cho cả chuỗi đã norm lẫn chuỗi CÒN DẤU: ký tự ASCII
     xét thẳng, ký tự có dấu (à, ê, đ…) đưa qua U.norm về a-z rồi mới xét. */
  function isWordCh(ch) {
    var c = ch.charCodeAt(0);
    if (c < 128) return (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || (c >= 65 && c <= 90);
    return /[a-z0-9]/.test(U.norm(ch));
  }

  /* Vị trí đầu tiên `needle` xuất hiện TRỌN TỪ trong `hay` (2 đầu không dính chữ/số khác), -1 nếu
     không có. */
  function wordIndex(hay, needle) {
    var p = -1;
    while ((p = hay.indexOf(needle, p + 1)) !== -1) {
      var e = p + needle.length;
      if ((p === 0 || !isWordCh(hay[p - 1])) && (e >= hay.length || !isWordCh(hay[e]))) return p;
    }
    return -1;
  }

  /* Bản CÒN DẤU (chữ thường, NFC) của mô tả 1 dòng / của mô tả đầy đủ kèm chuỗi cha — chỉ dùng để
     xét "khớp đúng dấu" khi người dùng gõ có dấu. Tính theo nhu cầu cho các dòng đã lọt vòng khớp
     không dấu (vài chục tới vài nghìn dòng), không dựng sẵn cho cả 17,6k dòng. */
  function lowOwn(i) {
    var r = D.rows[i];
    return (r[3] + " " + (r[4] || "")).toLowerCase().normalize("NFC");
  }
  var lowFullCache = {};
  function lowFull(i) {
    return lowFullCache[i] || (lowFullCache[i] = fullDesc(i).toLowerCase().normalize("NFC"));
  }
  function wordCount(hay, tokens) {
    var n = 0;
    for (var t = 0; t < tokens.length; t++) if (wordIndex(hay, tokens[t]) !== -1) n++;
    return n;
  }

  /* Số từ khóa xuất hiện với ranh giới 2 đầu (không nằm lọt giữa 1 chữ khác). Tiếng Việt viết rời
     từng âm tiết, đầy âm tiết 2 ký tự, nên so khớp indexOf thuần rất dễ trúng nhầm: "ca" là chuỗi
     con của "cầy"/"các", "ba" của "bảo"/"bàn", "sa" của "sản"/"sang" — khiến truy vấn nhiều từ như
     "Cá ba sa đông lạnh" xếp hạng đầu 1 dòng hoàn toàn không liên quan (xem SYSTEM-SPEC §10.32).
     Đây là tín hiệu phân biệt mạnh: đếm chỉ những lần khớp KHÔNG lọt giữa chữ khác. */
  function boundaryCount(hay, tokens) {
    var n = 0;
    for (var t = 0; t < tokens.length; t++) {
      var tok = tokens[t], p = -1;
      while ((p = hay.indexOf(tok, p + 1)) !== -1) {
        var b = p === 0 ? " " : hay[p - 1];
        var a = p + tok.length >= hay.length ? " " : hay[p + tok.length];
        if (!/[a-z0-9]/.test(b) && !/[a-z0-9]/.test(a)) { n++; break; }
      }
    }
    return n;
  }

  /* Tìm theo mô tả: exact = cụm từ; smart = mọi từ khóa (AND), fallback OR */
  function byText(q, opts) {
    opts = opts || {};
    var limit = opts.limit || MAX_HITS;
    var nq = U.norm(q).trim();
    if (!nq) return { hits: [], tokens: [], truncated: false };
    var tokens = nq.split(/\s+/).filter(Boolean);
    nq = tokens.join(" ");   // gõ thừa dấu cách giữa các từ vẫn khớp nguyên cụm
    /* Bản NGUYÊN CHỮ (còn dấu) của truy vấn. Tìm kiếm vẫn KHÔNG phân biệt dấu (gõ "ca phe" ra "cà
       phê"), nhưng dòng khớp ĐÚNG NGUYÊN CHỮ người dùng gõ phải đứng trước: bỏ dấu đi thì "bơ" =
       "bò" = "bộ", "sắt" = "sát", "đường" = "dương", "giày" = "giấy"… Áp dụng cả khi gõ không dấu:
       "cam" ra quả cam trước "gia cầm"; còn "ca phe" không có dòng nào khớp nguyên chữ nên thứ tự
       như cũ — xem SYSTEM-SPEC §10.37. */
    var lqTokens = q.toLowerCase().normalize("NFC").trim().split(/\s+/).filter(Boolean);
    var lq = lqTokens.join(" ");
    if (tokens.length > 1) ensureNormFull();
    var gi = Store.goodsIdx, rows = D.rows;
    var phrase = [], andHits = [], orHits = [];
    for (var n = 0; n < gi.length; n++) {
      var i = gi[n];
      // dòng phụ đề không mã cũng được tìm theo đúng mô tả của chính nó (Store.normVi/normEn đã có
      // sẵn text thật cho mọi dòng type 0, kể cả không mã) — không loại trừ nữa
      var vi = Store.normVi[i], en = Store.normEn[i];
      var own = vi + " " + en;
      // khớp cụm nguyên văn CHỈ soi mô tả của chính dòng — chuỗi nối " › " của fullDesc không được
      // lẫn vào đây, kẻo 1 cụm bắc cầu qua ranh giới cha/con bị tính là "khớp nguyên cụm"
      if (own.indexOf(nq) !== -1) {
        /* hạng trong tầng khớp nguyên cụm: 3 = trọn từ + đúng nguyên chữ; 2 = trọn từ (không xét dấu);
           1 = cụm lọt giữa chữ khác ("o to" trong "cho tôm", "che" trong "ostriches") — vẫn giữ
           trong kết quả để gõ dở 1 từ vẫn ra, nhưng xếp sau cùng */
        var rank = 1;
        if (wordIndex(own, nq) !== -1) {
          rank = wordIndex(lowOwn(i), lq) !== -1 ? 3 : 2;
        }
        phrase.push([i, rank, n]);
        continue;
      }
      if (tokens.length > 1) {
        var full = normFull[i];
        var sub = 0;
        for (var t = 0; t < tokens.length; t++) if (full.indexOf(tokens[t]) !== -1) sub++;
        if (sub === 0) continue;
        // điểm chính: số từ khớp trọn âm tiết trong mô tả ĐẦY ĐỦ (kể cả nhóm cha); điểm phụ (gỡ
        // hòa): ưu tiên dòng TỰ NÓ khớp hơn dòng chỉ khớp nhờ mô tả cha
        var score = boundaryCount(full, tokens) * 10 + boundaryCount(own, tokens);
        if (sub === tokens.length) {
          // số từ khớp đúng nguyên chữ là tiêu chí cao nhất (chỉ tính cho dòng đã lọt tầng AND)
          score += wordCount(lowFull(i), lqTokens) * 100;
          andHits.push([i, score]);
        }
        else if (!opts.exact) orHits.push([i, sub * 1000 + score]);
      }
    }
    /* Nhánh OR là hạ sách khi phrase+AND quá ít — không đổi ngưỡng "hits.length < 20" hay tổng số
       kết quả/`truncated` (giữ nguyên ngữ nghĩa đã có ở SYSTEM-SPEC §10.30), chỉ đổi phạm vi khớp
       (kèm mô tả cha) và cách xếp hạng bên trong từng tầng. */
    // cùng hạng thì giữ thứ tự biểu thuế (n) — không dựa vào việc sort() có ổn định hay không
    phrase.sort(function (a, b) { return b[1] - a[1] || a[2] - b[2]; });
    phrase = phrase.map(function (h) { return h[0]; });
    andHits.sort(function (a, b) { return b[1] - a[1]; });
    orHits.sort(function (a, b) { return b[1] - a[1]; });
    var hits = phrase.concat(andHits.map(function (h) { return h[0]; }));
    if (!opts.exact && hits.length < 20) {
      hits = hits.concat(orHits.map(function (h) { return h[0]; }));
    }
    // cắt trần SAU khi đã xếp hạng — 2.000 dòng giữ lại là 2.000 dòng liên quan nhất, không phải
    // 2.000 dòng đầu theo thứ tự tài liệu
    var truncated = hits.length > limit;
    if (truncated) hits.length = limit;
    return { hits: hits, tokens: tokens, truncated: truncated };
  }

  function run(q, opts) {
    opts = opts || {};
    q = q.trim();
    if (!q) return { hits: [], tokens: [], mode: "none", truncated: false, limit: MAX_HITS };
    var limit = opts.limit || MAX_HITS;
    if (isCodeQuery(q)) {
      var rc = byCode(q, limit);
      return { hits: rc.hits, tokens: [], mode: "code", truncated: rc.truncated, limit: limit };
    }
    var r = byText(q, opts);
    return { hits: r.hits, tokens: r.tokens, mode: "text", truncated: r.truncated, limit: limit };
  }

  /* mô tả đầy đủ của một dòng: nối các dòng cha (mức thụt đầu dòng nhỏ hơn) */
  function fullDesc(rowIdx) {
    var rows = D.rows;
    var r = rows[rowIdx];
    var parts = [r[3]];
    var lvl = r[2];
    for (var i = rowIdx - 1; i >= 0 && lvl > 0; i--) {
      var p = rows[i];
      if (p[0] !== 0) break;
      if (p[2] < lvl) {
        parts.unshift(p[3]);
        lvl = p[2];
      }
    }
    return parts.join(" › ");
  }

  /* ------------- tìm trong chú giải ------------- */
  var notesNorm = {};   // cid -> norm text cache
  function searchNotes(q, cb, progressCb) {
    var nq = U.norm(q).trim();
    if (!nq) { cb([]); return; }
    var tokens = nq.split(/\s+/).filter(Boolean);
    Store.loadAllNotes(progressCb, function () {
      var results = [];
      D.notesIdx.forEach(function (e) {
        var text = D.notes[e.c] || "";
        if (!notesNorm[e.c]) notesNorm[e.c] = U.norm(text);
        var hay = notesNorm[e.c];
        var idx = hay.indexOf(nq);
        var mode = "phrase";
        if (idx === -1 && tokens.length > 1) {
          var ok = tokens.every(function (t) { return hay.indexOf(t) !== -1; });
          if (ok) { idx = hay.indexOf(tokens[0]); mode = "and"; }
        }
        if (idx !== -1) {
          // đếm số lần xuất hiện — nhánh "and" khớp theo cụm rải rác nên KHÔNG dùng nq nguyên cụm
          // (luôn ra 0, trước đây bị "|| 1" che thành hiện cứng "1 vị trí" dù chương có hàng chục
          // chỗ khớp thật); đếm theo tokens[0] — cùng token đã dùng để định vị idx/snippet ở trên,
          // nên count > 0 luôn đúng (tokens.every đã đảm bảo tokens[0] xuất hiện ít nhất 1 lần)
          var countTarget = mode === "and" ? tokens[0] : nq;
          var count = 0, p = 0;
          while ((p = hay.indexOf(countTarget, p)) !== -1) { count++; p += countTarget.length; }
          var snipStart = Math.max(0, idx - 90);
          var snippet = text.slice(snipStart, idx + 160);
          results.push({ c: e.c, count: count, snippet: (snipStart ? "…" : "") + snippet + "…", mode: mode });
        }
      });
      results.sort(function (a, b) { return b.count - a.count; });
      cb(results, tokens);
    });
  }

  return { run: run, isCodeQuery: isCodeQuery, fullDesc: fullDesc, searchNotes: searchNotes };
})();
