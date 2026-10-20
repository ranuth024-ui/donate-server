// Các hàm thuần (dễ test) — port từ Code.gs, giữ đúng luật xác thực gốc.
const crypto = require('crypto');

function cat(v, max) {
  return (v === undefined || v === null) ? '' : String(v).trim().slice(0, max);
}

/** Kiểm tra dữ liệu donate gửi lên — đúng luật với kiemTraGiaoDich_() trong Code.gs (chỉ giữ nhánh DONATE, bỏ Vòng quay). */
function kiemTraGiaoDich(t, ch) {
  if (!t || typeof t !== 'object') throw new Error('Dữ liệu gửi lên không hợp lệ.');
  const ten = cat(t.ten, 50);
  if (!ten) throw new Error('Thiếu tên hiển thị.');
  const loiNhan = cat(t.loiNhan, 255);

  const maDon = String(t.maDon || '').trim().toUpperCase();
  if (!/^DN[A-Z0-9]{6,20}$/.test(maDon)) throw new Error('Mã đơn hàng không hợp lệ.');

  const soTien = Math.round(Number(t.soTien));
  if (!isFinite(soTien) || soTien < ch.tienToiThieu || soTien > ch.tienToiDa) {
    throw new Error('Số tiền không hợp lệ.');
  }
  return { ten, loiNhan, maDon, soTien };
}

/** SHA-256(salt + mk) base64 — giống hệt bamMatKhau_() trong Code.gs để 2 bản tương thích ý tưởng. */
function bamMatKhau(mk, salt) {
  return crypto.createHash('sha256').update(salt + mk, 'utf8').digest('base64');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function dinhDangTien(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' ₫';
}

// Ngày/tháng theo giờ Việt Nam, không phụ thuộc múi giờ máy chủ đang chạy ở đâu
// (giống lý do Code.gs hardcode Asia/Ho_Chi_Minh thay vì dùng giờ máy chủ).
function ngayVN(ms) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}
function thangVN(ms) {
  return ngayVN(ms).slice(0, 7);
}

function gomTheoTen(ds) {
  const m = {};
  ds.forEach((g) => {
    const k = g.ten.trim().toLowerCase();
    if (!m[k]) m[k] = { ten: g.ten, tong: 0 };
    m[k].tong += g.so_tien;
  });
  return Object.values(m).sort((a, b) => b.tong - a.tong);
}

module.exports = { cat, kiemTraGiaoDich, bamMatKhau, escapeHtml, dinhDangTien, ngayVN, thangVN, gomTheoTen };
