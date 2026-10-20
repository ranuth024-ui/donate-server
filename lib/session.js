// Phiên đăng nhập quản trị — lưu trong bộ nhớ (mất khi restart server, chấp nhận được với quy mô 1 trang cá nhân).
// Cùng luật với Code.gs: phiên 6 giờ, gia hạn khi còn thao tác; khoá 15 phút sau 5 lần sai mật khẩu.
const crypto = require('crypto');

const THOI_GIAN_PHIEN_MS = 6 * 60 * 60 * 1000;
const KHOA_SAU_SO_LAN_SAI = 5;
const THOI_GIAN_KHOA_MS = 15 * 60 * 1000;

const phiensHoatDong = new Map(); // token -> hết hạn lúc (ms)
let dangNhapSai = { dem: 0, hetHanKhoaLuc: 0 };

function taoPhien() {
  const token = crypto.randomUUID();
  phiensHoatDong.set(token, Date.now() + THOI_GIAN_PHIEN_MS);
  return token;
}

function kiemTraPhien(token) {
  if (!token) return false;
  const hetHan = phiensHoatDong.get(token);
  if (!hetHan || hetHan < Date.now()) { phiensHoatDong.delete(token); return false; }
  phiensHoatDong.set(token, Date.now() + THOI_GIAN_PHIEN_MS); // gia hạn phiên, giống yeuCauQuanTri_()
  return true;
}

function xoaPhien(token) { phiensHoatDong.delete(token); }

function dangBiKhoaDangNhap() {
  return dangNhapSai.dem >= KHOA_SAU_SO_LAN_SAI && dangNhapSai.hetHanKhoaLuc > Date.now();
}

function ghiNhanDangNhapSai() {
  const demMoi = (dangNhapSai.hetHanKhoaLuc > Date.now() ? dangNhapSai.dem : 0) + 1;
  dangNhapSai = { dem: demMoi, hetHanKhoaLuc: Date.now() + THOI_GIAN_KHOA_MS };
}

function xoaDangNhapSai() { dangNhapSai = { dem: 0, hetHanKhoaLuc: 0 }; }

module.exports = { taoPhien, kiemTraPhien, xoaPhien, dangBiKhoaDangNhap, ghiNhanDangNhapSai, xoaDangNhapSai };
