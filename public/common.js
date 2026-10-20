// Hàm dùng chung giữa index.html (trang donate công khai) và admin.html (trang quản trị).
// Tách riêng để không lặp code — 2 trang đều nạp file này qua <script src="/common.js">.
(function(global){
  function dinhDangTien(n){
    n = Math.round(Number(n) || 0);
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ';
  }

  function thoiGianNgan(ms){
    try {
      return new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      }).format(new Date(ms));
    } catch (e) { return ''; }
  }

  function copy(text, btn){
    function marked(){
      var old = btn.textContent;
      btn.textContent = 'Đã chép ✓';
      btn.classList.add('done');
      setTimeout(function(){ btn.textContent = old; btn.classList.remove('done'); }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(marked, marked);
    } else {
      try {
        var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      } catch (e) {}
      marked();
    }
  }

  // ---------- Gọi API cùng origin bằng fetch() ----------
  // Không cần JSONP: server này phục vụ cả trang HTML lẫn API trên cùng 1 origin, nên trình
  // duyệt không chặn đọc kết quả như khi gọi sang script.google.com (bản Apps Script trước đây).
  function goi(url, opts){
    opts = opts || {};
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = setTimeout(function(){ if (ctrl) ctrl.abort(); }, opts.timeoutMs || 15000);
    var fetchOpts = { method: opts.method || 'GET', headers: opts.headers };
    if (ctrl) fetchOpts.signal = ctrl.signal;
    if (opts.body !== undefined) fetchOpts.body = opts.body;
    return fetch(url, fetchOpts).then(function(res){
      return res.json().catch(function(){ return null; }).then(function(body){
        if (!res.ok) {
          var err = new Error((body && body.loi) || ('Máy chủ trả lỗi (' + res.status + ').'));
          err.status = res.status;
          throw err;
        }
        return body;
      });
    }).catch(function(err){
      if (err && err.name === 'AbortError') throw new Error('Máy chủ phản hồi quá lâu, thử lại sau ít giây.');
      if (err instanceof TypeError) throw new Error('Không kết nối được máy chủ, kiểm tra mạng và thử lại.');
      throw err;
    }).finally(function(){ clearTimeout(timer); });
  }

  global.DonateCommon = { dinhDangTien: dinhDangTien, thoiGianNgan: thoiGianNgan, copy: copy, goi: goi };
})(window);
