// Trang Donate — Node.js + Express + SQLite / PostgreSQL.
// Kiến trúc: server phục vụ CẢ trang HTML lẫn API, cùng 1 origin → không còn vướng CORS/JSONP
// như bản Apps Script (xem README.md phần "So với bản Apps Script").
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const nodemailer = require('nodemailer');
const db = require('./lib/db');
const { kiemTraGiaoDich, bamMatKhau, dinhDangTien, ngayVN, thangVN, gomTheoTen } = require('./lib/helpers');
const sess = require('./lib/session');

const MAT_KHAU_MAC_DINH = 'admin123';
const PORT = process.env.PORT || 3000;

// Token bí mật dùng cho link xác nhận trong email (tạo mới mỗi lần server khởi động)
const EMAIL_SECRET = crypto.randomBytes(32).toString('hex');

let database;

const app = express();
app.use(express.json({ limit: '6mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ───────────────────── Gửi email thông báo donate ─────────────────────

function taoTokenEmail(maDon, trangThai) {
  const data = maDon + '|' + trangThai + '|' + EMAIL_SECRET;
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 32);
}

async function guiEmailThongBao(ch, d) {
  const email = ch.emailNhan;
  if (!email) return; // Chưa cấu hình email → bỏ qua

  const smtpUser = ch.smtpUser || email;
  const smtpPass = ch.smtpPass;
  if (!smtpPass) {
    console.log('[Email] Chưa cấu hình SMTP password, bỏ qua gửi email.');
    return;
  }

  // Detect SMTP host from email
  let smtpHost = 'smtp.gmail.com';
  let smtpPort = 587;
  if (email.includes('@outlook.') || email.includes('@hotmail.')) {
    smtpHost = 'smtp-mail.outlook.com';
  } else if (email.includes('@yahoo.')) {
    smtpHost = 'smtp.mail.yahoo.com';
    smtpPort = 465;
  }

  const baseUrl = ch.baseUrl || `http://localhost:${PORT}`;
  const tokenXacNhan = taoTokenEmail(d.maDon, db.TRANG_THAI.DA);
  const tokenTuChoi = taoTokenEmail(d.maDon, db.TRANG_THAI.TU_CHOI);

  const linkXacNhan = `${baseUrl}/api/email-confirm?maDon=${encodeURIComponent(d.maDon)}&tt=${encodeURIComponent(db.TRANG_THAI.DA)}&token=${tokenXacNhan}`;
  const linkTuChoi = `${baseUrl}/api/email-confirm?maDon=${encodeURIComponent(d.maDon)}&tt=${encodeURIComponent(db.TRANG_THAI.TU_CHOI)}&token=${tokenTuChoi}`;

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost, port: smtpPort, secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `"Donate ${ch.tenHienThi}" <${smtpUser}>`,
      to: email,
      subject: `💰 Donate mới: ${d.ten} - ${dinhDangTien(d.soTien)}`,
      html: `
        <div style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:500px;margin:0 auto;background:#1a1730;color:#f5f3fa;padding:24px;border-radius:12px">
          <h2 style="color:#EC4899;margin-top:0">💰 Có donate mới!</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#9C93B5">Người gửi</td><td style="padding:8px 0;font-weight:bold">${d.ten}</td></tr>
            <tr><td style="padding:8px 0;color:#9C93B5">Số tiền</td><td style="padding:8px 0;font-weight:bold;color:#EC4899;font-size:18px">${dinhDangTien(d.soTien)}</td></tr>
            <tr><td style="padding:8px 0;color:#9C93B5">Lời nhắn</td><td style="padding:8px 0">${d.loiNhan || '(không có)'}</td></tr>
            <tr><td style="padding:8px 0;color:#9C93B5">Mã đơn</td><td style="padding:8px 0;font-family:monospace">${d.maDon}</td></tr>
          </table>
          <div style="margin-top:20px;text-align:center">
            <a href="${linkXacNhan}" style="display:inline-block;padding:12px 32px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;margin:4px">✓ Xác nhận đã nhận tiền</a>
            <a href="${linkTuChoi}" style="display:inline-block;padding:12px 32px;background:#ef4444;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;margin:4px">✕ Từ chối</a>
          </div>
          <p style="margin-top:16px;font-size:12px;color:#9C93B5;text-align:center">Nhấn nút ở trên để xác nhận hoặc từ chối giao dịch này.</p>
        </div>
      `,
    });
    console.log(`[Email] Đã gửi thông báo donate ${d.maDon} tới ${email}`);
  } catch (err) {
    console.error(`[Email] Lỗi gửi email:`, err.message);
  }
}

// Route xác nhận giao dịch qua link trong email (không cần đăng nhập)
app.get('/api/email-confirm', async (req, res) => {
  try {
    const { maDon, tt, token: emailToken } = req.query;
    const ma = String(maDon || '').trim().toUpperCase();
    const trangThai = String(tt || '');

    // Kiểm tra token
    const tokenDung = taoTokenEmail(ma, trangThai);
    if (emailToken !== tokenDung) {
      return res.send('<html><body style="background:#0d0b1a;color:#f87171;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><h2>❌ Link không hợp lệ hoặc đã hết hạn.</h2></body></html>');
    }

    const hopLe = [db.TRANG_THAI.DA, db.TRANG_THAI.TU_CHOI];
    if (hopLe.indexOf(trangThai) < 0) {
      return res.send('<html><body style="background:#0d0b1a;color:#f87171;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><h2>❌ Trạng thái không hợp lệ.</h2></body></html>');
    }

    const hang = await db.timTheoMaDon(database, ma);
    if (!hang) {
      return res.send('<html><body style="background:#0d0b1a;color:#f87171;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><h2>❌ Không tìm thấy mã đơn này.</h2></body></html>');
    }

    await db.capNhatTrangThai(database, hang.id, trangThai);

    const mau = trangThai === db.TRANG_THAI.DA ? '#10b981' : '#ef4444';
    const icon = trangThai === db.TRANG_THAI.DA ? '✅' : '❌';
    res.send(`<html><body style="background:#0d0b1a;color:${mau};font-family:'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column">
      <h1 style="font-size:48px;margin:0">${icon}</h1>
      <h2>Đã cập nhật: ${trangThai}</h2>
      <p style="color:#9C93B5">Mã đơn: ${ma}</p>
      <p style="color:#9C93B5;font-size:14px">Bạn có thể đóng tab này.</p>
    </body></html>`);
  } catch (err) {
    console.error(err);
    res.status(500).send('<html><body style="background:#0d0b1a;color:#f87171;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><h2>❌ Lỗi server.</h2></body></html>');
  }
});

// ───────────────────────────── API công khai ─────────────────────────────

app.get('/api/data', async (req, res) => {
  try {
    const ch = await db.docCauHinh(database);
    const tatCa = await db.tatCaGiaoDich(database);

    const hienThi = tatCa.filter((g) => g.trang_thai === db.TRANG_THAI.DA || (ch.hienChuaXacNhan && g.trang_thai === db.TRANG_THAI.CHO));
    const daXacNhan = tatCa.filter((g) => g.trang_thai === db.TRANG_THAI.DA);

    const homNay = ngayVN(Date.now());
    const thangNay = thangVN(Date.now());

    res.json({
      cauHinh: db.congKhai(ch),
      ganDay: hienThi.slice(0, 30).map((g) => ({
        ten: g.ten, soTien: g.so_tien, loiNhan: g.loi_nhan,
        trangThai: g.trang_thai, thoiGian: g.thoi_gian,
      })),
      xepHang: {
        ngay: gomTheoTen(daXacNhan.filter((g) => ngayVN(g.thoi_gian) === homNay)).slice(0, 10),
        thang: gomTheoTen(daXacNhan.filter((g) => thangVN(g.thoi_gian) === thangNay)).slice(0, 10),
        tong: gomTheoTen(daXacNhan).slice(0, 10),
      },
      thongKe: {
        tongTien: daXacNhan.reduce((s, g) => s + g.so_tien, 0),
        soLuot: daXacNhan.length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, loi: 'Lỗi server.' });
  }
});

app.post('/api/submit', async (req, res) => {
  try {
    const ch = await db.docCauHinh(database);
    const d = kiemTraGiaoDich(req.body, ch);

    const daCo = await db.timTheoMaDon(database, d.maDon);
    if (daCo) {
      return res.json({ ok: true, maDon: daCo.ma_don, trungLap: true });
    }

    await db.themGiaoDich(database, {
      thoiGian: Date.now(),
      ten: d.ten,
      soTien: d.soTien,
      loiNhan: d.loiNhan,
      maDon: d.maDon,
    });

    // Gửi email thông báo cho admin nếu có cấu hình email
    guiEmailThongBao(ch, d);

    res.json({ ok: true, maDon: d.maDon, trungLap: false });
  } catch (err) {
    res.status(400).json({ ok: false, loi: err.message });
  }
});

app.get('/api/status/:maDon', async (req, res) => {
  try {
    const ma = String(req.params.maDon || '').trim().toUpperCase();
    const hang = await db.timTheoMaDon(database, ma);
    if (!hang) return res.json({ ok: true, timThay: false });
    res.json({ ok: true, timThay: true, trangThai: hang.trang_thai, daXacNhan: hang.trang_thai === db.TRANG_THAI.DA });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, loi: 'Lỗi server.' });
  }
});

// ───────────────────────────── API quản trị ─────────────────────────────

function xacThuc(req, res, next) {
  const auth = req.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!sess.kiemTraPhien(token)) return res.status(401).json({ ok: false, loi: 'Phiên đăng nhập đã hết hạn.' });
  next();
}

app.post('/api/admin/login', async (req, res) => {
  try {
    if (sess.dangBiKhoaDangNhap()) {
      return res.status(429).json({ ok: false, loi: 'Sai mật khẩu quá nhiều lần. Vui lòng thử lại sau 15 phút.' });
    }
    const matKhau = String((req.body && req.body.matKhau) || '');
    const ch = await db.docCauHinh(database);
    const salt = ch.QT_SALT;
    const hash = ch.QT_HASH;
    const dung = hash ? bamMatKhau(matKhau, salt) === hash : matKhau === MAT_KHAU_MAC_DINH;

    if (!dung) {
      sess.ghiNhanDangNhapSai();
      return res.status(401).json({ ok: false, loi: 'Mật khẩu không đúng.' });
    }
    sess.xoaDangNhapSai();
    const token = sess.taoPhien();
    res.json({ ok: true, token, canDoiMatKhau: !hash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, loi: 'Lỗi server.' });
  }
});

app.post('/api/admin/logout', xacThuc, (req, res) => {
  try {
    const auth = req.get('authorization') || '';
    sess.xoaPhien(auth.slice(7));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, loi: 'Lỗi server.' });
  }
});

app.get('/api/admin/list', xacThuc, async (req, res) => {
  try {
    const tatCa = await db.tatCaGiaoDich(database);
    const ds = tatCa.map((g) => ({
      id: g.id, ten: g.ten, soTien: g.so_tien, loiNhan: g.loi_nhan,
      maDon: g.ma_don, trangThai: g.trang_thai, thoiGian: g.thoi_gian,
    }));
    res.json({ ok: true, giaoDich: ds });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, loi: 'Lỗi server.' });
  }
});

// Trả config đầy đủ (bao gồm khóa riêng tư) cho admin
app.get('/api/admin/config', xacThuc, async (req, res) => {
  try {
    const ch = await db.docCauHinh(database);
    // Chỉ trả các khóa liên quan, loại bỏ QT_SALT/QT_HASH
    const { QT_SALT, QT_HASH, ...cauHinh } = ch;
    res.json({ ok: true, cauHinh });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, loi: 'Lỗi server.' });
  }
});

app.post('/api/admin/confirm', xacThuc, async (req, res) => {
  try {
    const { maDon, trangThai } = req.body || {};
    const hopLe = [db.TRANG_THAI.CHO, db.TRANG_THAI.DA, db.TRANG_THAI.TU_CHOI];
    if (hopLe.indexOf(trangThai) < 0) return res.status(400).json({ ok: false, loi: 'Trạng thái không hợp lệ.' });

    const hang = await db.timTheoMaDon(database, String(maDon || '').trim().toUpperCase());
    if (!hang) return res.status(404).json({ ok: false, loi: 'Không tìm thấy mã đơn ' + maDon + '.' });

    await db.capNhatTrangThai(database, hang.id, trangThai);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, loi: 'Lỗi server.' });
  }
});

app.post('/api/admin/config', xacThuc, async (req, res) => {
  try {
    const cho_phep = ['tenHienThi', 'gioiThieu', 'anhDaiDien', 'anhBia', 'nganHang', 'tenNganHang',
      'soTaiKhoan', 'tenTaiKhoan', 'tienToiThieu', 'tienToiDa', 'mucTienNhanh', 'mocVip',
      'hienChuaXacNhan', 'mangXaHoi', 'emailNhan', 'smtpUser', 'smtpPass', 'baseUrl'];
    const chMoi = {};
    cho_phep.forEach((k) => { if (req.body && req.body[k] !== undefined) chMoi[k] = req.body[k]; });
    await db.ghiCauHinh(database, chMoi);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, loi: 'Lỗi server.' });
  }
});

// Upload ảnh (base64) → lưu vào public/uploads/ → trả URL
app.post('/api/admin/upload', xacThuc, express.json({ limit: '5mb' }), (req, res) => {
  try {
    const { data, loai } = req.body || {};
    if (!data) return res.status(400).json({ ok: false, loi: 'Thiếu dữ liệu ảnh.' });

    // data = "data:image/png;base64,iVBOR..." hoặc raw base64
    let base64 = data;
    let ext = 'png';
    const m = data.match(/^data:image\/(png|jpe?g|gif|webp);base64,(.+)$/i);
    if (m) { ext = m[1] === 'jpeg' ? 'jpg' : m[1]; base64 = m[2]; }

    const buf = Buffer.from(base64, 'base64');
    if (buf.length > 4 * 1024 * 1024) return res.status(400).json({ ok: false, loi: 'Ảnh quá lớn (tối đa 4MB).' });

    const fs = require('fs');
    const ten = (loai || 'img') + '_' + Date.now() + '.' + ext;
    const duongDan = path.join(__dirname, 'public', 'uploads', ten);
    fs.mkdirSync(path.dirname(duongDan), { recursive: true });
    fs.writeFileSync(duongDan, buf);

    const url = '/uploads/' + ten;
    res.json({ ok: true, url });
  } catch (err) {
    res.status(500).json({ ok: false, loi: 'Lỗi lưu ảnh: ' + err.message });
  }
});

app.post('/api/admin/change-password', xacThuc, async (req, res) => {
  try {
    const { matKhauCu, matKhauMoi } = req.body || {};
    const ch = await db.docCauHinh(database);
    const dung = ch.QT_HASH ? bamMatKhau(String(matKhauCu || ''), ch.QT_SALT) === ch.QT_HASH : String(matKhauCu || '') === MAT_KHAU_MAC_DINH;
    if (!dung) return res.status(401).json({ ok: false, loi: 'Mật khẩu hiện tại không đúng.' });

    const moi = String(matKhauMoi || '');
    if (moi.length < 6 || moi.length > 64) return res.status(400).json({ ok: false, loi: 'Mật khẩu mới phải từ 6 đến 64 ký tự.' });
    if (moi === MAT_KHAU_MAC_DINH) return res.status(400).json({ ok: false, loi: 'Không dùng lại mật khẩu mặc định.' });

    const salt = crypto.randomUUID();
    await db.ghiCauHinh(database, { QT_SALT: salt, QT_HASH: bamMatKhau(moi, salt) });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, loi: 'Lỗi server.' });
  }
});

async function main() {
  database = await db.moDb(process.env.DB_PATH);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Donate server đang chạy tại http://localhost:${PORT}`);
    console.log(`Quản trị tại http://localhost:${PORT}/admin (mật khẩu mặc định: ${MAT_KHAU_MAC_DINH} — đổi ngay sau khi đăng nhập lần đầu)`);
  });
}

main().catch((err) => {
  console.error('Lỗi khởi động:', err);
  process.exit(1);
});
