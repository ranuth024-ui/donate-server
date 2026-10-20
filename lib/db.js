// Lớp dữ liệu — hỗ trợ SQLite (local dev) và PostgreSQL (cloud deployment Render.com).
// Cùng tên trường với Code.gs (MAC_DINH, TRANG_THAI...) để dễ đối chiếu giữa 2 bản.
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const usePostgres = !!process.env.DATABASE_URL;
let Pool;
if (usePostgres) {
  ({ Pool } = require('pg'));
}

const TRANG_THAI = { CHO: 'Chờ xác nhận', DA: 'Đã xác nhận', TU_CHOI: 'Từ chối' };

const MAC_DINH = {
  tenThuongHieu: 'Donate',
  tenHienThi: 'Minh Thư',
  tenDangNhap: 'minhthu',
  diaDiem: 'VN',
  gioiThieu: 'Cảm ơn bạn đã ghé qua và tiếp thêm năng lượng cho kênh 💜',
  anhDaiDien: '',
  anhBia: '',
  mangXaHoi: { youtube: '', tiktok: '', facebook: '', instagram: '', twitch: '', discord: '' },
  nganHang: 'TCB',
  tenNganHang: 'Techcombank',
  soTaiKhoan: '19050313331014',
  tenTaiKhoan: 'Minh Thư',
  tienToiThieu: 10000,
  tienToiDa: 100000000,
  mucTienNhanh: [10000, 50000, 100000],
  mocVip: [100000, 500000, 2000000, 5000000, 10000000],
  hienChuaXacNhan: true,
};

// Khoá riêng tư — không bao giờ trả ra API công khai (giống KHOA_RIENG_TU trong Code.gs).
// QT_SALT/QT_HASH PHẢI có trong danh sách này: change-password ghi 2 khoá đó vào CHUNG
// bảng config với các trường công khai (tenHienThi, nganHang...), nên nếu thiếu ở đây,
// /api/data sẽ vô tình trả public salt+hash mật khẩu quản trị cho mọi khách xem trang.
const KHOA_RIENG_TU = ['emailNhan', 'smtpUser', 'smtpPass', 'baseUrl', 'guiMailDonate', 'QT_SALT', 'QT_HASH'];

async function moDb(dbPath) {
  if (usePostgres) {
    if (!Pool) {
      ({ Pool } = require('pg'));
    }
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    pool.isPostgres = true;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS donations (
        id SERIAL PRIMARY KEY,
        thoi_gian BIGINT NOT NULL,
        ten TEXT NOT NULL,
        so_tien BIGINT NOT NULL,
        loi_nhan TEXT NOT NULL DEFAULT '',
        ma_don TEXT NOT NULL UNIQUE,
        trang_thai TEXT NOT NULL DEFAULT '${TRANG_THAI.CHO}'
      );
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_donations_ma_don ON donations(ma_don);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_donations_trang_thai ON donations(trang_thai);');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS config (
        khoa TEXT PRIMARY KEY,
        gia_tri TEXT NOT NULL
      );
    `);

    // Khởi tạo cấu hình mặc định nếu chưa có
    const demRes = await pool.query('SELECT COUNT(*) AS n FROM config');
    const demCauHinh = parseInt(demRes.rows[0].n, 10);
    if (demCauHinh === 0) {
      for (const k of Object.keys(MAC_DINH)) {
        await pool.query(
          'INSERT INTO config (khoa, gia_tri) VALUES ($1, $2)',
          [k, JSON.stringify(MAC_DINH[k])]
        );
      }
    }

    return pool;
  }

  // SQLite (khi DATABASE_URL không có)
  const db = new DatabaseSync(dbPath || path.join(__dirname, '..', 'donate.db'));
  db.isPostgres = false;
  db.exec('PRAGMA journal_mode = WAL');
  db.transaction = (fn) => (...args) => {
    db.exec('BEGIN');
    try {
      const ketQua = fn(...args);
      db.exec('COMMIT');
      return ketQua;
    } catch (loi) {
      db.exec('ROLLBACK');
      throw loi;
    }
  };

  db.exec(`
    CREATE TABLE IF NOT EXISTS donations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thoi_gian INTEGER NOT NULL,
      ten TEXT NOT NULL,
      so_tien INTEGER NOT NULL,
      loi_nhan TEXT NOT NULL DEFAULT '',
      ma_don TEXT NOT NULL UNIQUE,
      trang_thai TEXT NOT NULL DEFAULT '${TRANG_THAI.CHO}'
    );
    CREATE INDEX IF NOT EXISTS idx_donations_ma_don ON donations(ma_don);
    CREATE INDEX IF NOT EXISTS idx_donations_trang_thai ON donations(trang_thai);

    CREATE TABLE IF NOT EXISTS config (
      khoa TEXT PRIMARY KEY,
      gia_tri TEXT NOT NULL
    );
  `);

  // Khởi tạo cấu hình mặc định nếu chưa có (chỉ chạy 1 lần, giống caiDatLanDau trong Code.gs)
  const demCauHinh = db.prepare('SELECT COUNT(*) AS n FROM config').get().n;
  if (demCauHinh === 0) {
    const ghi = db.prepare('INSERT INTO config (khoa, gia_tri) VALUES (?, ?)');
    const giao = db.transaction(() => {
      Object.keys(MAC_DINH).forEach((k) => ghi.run(k, JSON.stringify(MAC_DINH[k])));
    });
    giao();
  }

  return db;
}

async function docCauHinh(db) {
  const isPg = db?.isPostgres ?? usePostgres;
  let rows;
  if (isPg) {
    const res = await db.query('SELECT khoa, gia_tri FROM config');
    rows = res.rows;
  } else {
    rows = db.prepare('SELECT khoa, gia_tri FROM config').all();
  }

  const ch = Object.assign({}, MAC_DINH);
  rows.forEach((r) => {
    try { ch[r.khoa] = JSON.parse(r.gia_tri); } catch (e) { /* bỏ qua giá trị hỏng */ }
  });
  return ch;
}

async function ghiCauHinh(db, chMoi) {
  const isPg = db?.isPostgres ?? usePostgres;
  if (isPg) {
    for (const k of Object.keys(chMoi)) {
      await db.query(
        'INSERT INTO config (khoa, gia_tri) VALUES ($1, $2) ON CONFLICT (khoa) DO UPDATE SET gia_tri = EXCLUDED.gia_tri',
        [k, JSON.stringify(chMoi[k])]
      );
    }
  } else {
    const ghi = db.prepare('INSERT INTO config (khoa, gia_tri) VALUES (?, ?) ON CONFLICT(khoa) DO UPDATE SET gia_tri = excluded.gia_tri');
    const giao = db.transaction((obj) => {
      Object.keys(obj).forEach((k) => ghi.run(k, JSON.stringify(obj[k])));
    });
    giao(chMoi);
  }
}

function congKhai(ch) {
  const r = Object.assign({}, ch);
  KHOA_RIENG_TU.forEach((k) => delete r[k]);
  return r;
}

async function timTheoMaDon(db, maDon) {
  const isPg = db?.isPostgres ?? usePostgres;
  if (isPg) {
    const res = await db.query('SELECT * FROM donations WHERE ma_don = $1', [maDon]);
    const hang = res.rows[0];
    if (!hang) return null;
    return {
      ...hang,
      thoi_gian: Number(hang.thoi_gian),
      so_tien: Number(hang.so_tien),
    };
  }
  return db.prepare('SELECT * FROM donations WHERE ma_don = ?').get(maDon) || null;
}

async function tatCaGiaoDich(db) {
  const isPg = db?.isPostgres ?? usePostgres;
  if (isPg) {
    const res = await db.query('SELECT * FROM donations ORDER BY thoi_gian DESC');
    return res.rows.map((g) => ({
      ...g,
      thoi_gian: Number(g.thoi_gian),
      so_tien: Number(g.so_tien),
    }));
  }
  return db.prepare('SELECT * FROM donations ORDER BY thoi_gian DESC').all();
}

async function themGiaoDich(db, data) {
  const isPg = db?.isPostgres ?? usePostgres;
  const thoiGian = data.thoiGian || Date.now();
  const loiNhan = data.loiNhan || '';
  const trangThai = data.trangThai || TRANG_THAI.CHO;

  if (isPg) {
    await db.query(
      'INSERT INTO donations (thoi_gian, ten, so_tien, loi_nhan, ma_don, trang_thai) VALUES ($1, $2, $3, $4, $5, $6)',
      [thoiGian, data.ten, data.soTien, loiNhan, data.maDon, trangThai]
    );
  } else {
    db.prepare(
      'INSERT INTO donations (thoi_gian, ten, so_tien, loi_nhan, ma_don, trang_thai) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(thoiGian, data.ten, data.soTien, loiNhan, data.maDon, trangThai);
  }
}

async function capNhatTrangThai(db, id, trangThai) {
  const isPg = db?.isPostgres ?? usePostgres;
  if (isPg) {
    await db.query('UPDATE donations SET trang_thai = $1 WHERE id = $2', [trangThai, id]);
  } else {
    db.prepare('UPDATE donations SET trang_thai = ? WHERE id = ?').run(trangThai, id);
  }
}

module.exports = {
  moDb,
  docCauHinh,
  ghiCauHinh,
  congKhai,
  timTheoMaDon,
  tatCaGiaoDich,
  themGiaoDich,
  capNhatTrangThai,
  TRANG_THAI,
  MAC_DINH,
  KHOA_RIENG_TU,
};
