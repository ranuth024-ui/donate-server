# Donate server (Node.js + Express + SQLite)

Bản thay thế cho backend Google Apps Script + Google Sheet trước đây. Server này tự phục vụ
cả trang HTML lẫn API trên cùng 1 địa chỉ (cùng origin), nên không còn vướng CORS/JSONP như
bản Apps Script.

## Chạy thử trên máy

```
npm install
npm start
```

Mặc định chạy ở `http://localhost:3000`:
- Trang donate công khai: `http://localhost:3000/`
- Trang quản trị: `http://localhost:3000/admin.html` (mật khẩu mặc định: `admin123`)

**Đổi mật khẩu quản trị ngay sau lần đăng nhập đầu tiên** — trang quản trị có cảnh báo và
form đổi mật khẩu sẵn ở cuối trang.

## ⚠ Vị trí file database (donate.db)

Mặc định, server tạo file `donate.db` ngay trong thư mục này. Vì thư mục `donate` đang nằm
trong OneDrive (đồng bộ đám mây), việc để file database SQLite ở đây **có rủi ro thật**:
SQLite dùng chế độ WAL (ghi file phụ `.db-wal`/`.db-shm` liên tục khi có giao dịch), và
OneDrive có thể đồng bộ/khoá các file này giữa chừng, gây xung đột hoặc hỏng dữ liệu — đây là
vấn đề đã biết giữa SQLite và các dịch vụ đồng bộ đám mây (OneDrive, Dropbox, Google Drive...),
không phải riêng dự án này.

**Khuyến nghị:** đặt file database ở một thư mục KHÔNG đồng bộ OneDrive, ví dụ
`C:\donate-data\donate.db`, bằng biến môi trường `DB_PATH` (server đã hỗ trợ sẵn):

```
set DB_PATH=C:\donate-data\donate.db
npm start
```

(Trên PowerShell dùng `$env:DB_PATH = "C:\donate-data\donate.db"` thay vì `set`.)

Mã nguồn (các file .js/.html) nằm trong OneDrive thì hoàn toàn an toàn — chỉ riêng file
database đang GHI LIÊN TỤC mới có rủi ro này.

## Cấu trúc

```
server.js         — Express app, định tuyến API
lib/db.js         — lớp dữ liệu SQLite (thay Google Sheet)
lib/helpers.js     — hàm kiểm tra dữ liệu, băm mật khẩu, định dạng
lib/session.js     — phiên đăng nhập quản trị (lưu trong bộ nhớ)
public/index.html — trang donate công khai
public/admin.html — trang quản trị (xác nhận/từ chối giao dịch)
public/common.js  — hàm dùng chung giữa 2 trang trên
```

## Đổi thông tin ngân hàng / tên hiển thị / mốc VIP...

Chưa có giao diện chỉnh trong trang quản trị — hiện sửa qua API (ví dụ bằng curl hoặc
Postman) tới `POST /api/admin/config` kèm header `Authorization: Bearer <token đăng nhập>`.
Hỏi lại nếu cần giao diện chỉnh sửa cấu hình ngay trong trang quản trị.

## ⚠ Trang này CHƯA có địa chỉ công khai

Chạy `npm start` chỉ khiến trang xem được từ chính máy này (`localhost`). Để người xem TikTok
donate được, cần một bước riêng để đưa server này lên một địa chỉ họ truy cập được — đây là
quyết định cần bàn thêm, chưa nằm trong phạm vi đã làm.
