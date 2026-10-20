// Script test các endpoint Donate server
// Cách chạy: node test.js
async function testEndpoints() {
  const base = process.env.BASE_URL || 'http://localhost:3000';
  console.log('--- 1. Testing GET /api/data ---');
  const res1 = await fetch(`${base}/api/data`);
  console.log('Status:', res1.status);
  const data1 = await res1.json();
  console.log('Tên hiển thị:', data1.cauHinh?.tenHienThi);
  console.log('Số giao dịch xác nhận:', data1.thongKe?.soLuot);

  console.log('\n--- 2. Testing POST /api/admin/login ---');
  const res2 = await fetch(`${base}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matKhau: 'admin123' }),
  });
  console.log('Status:', res2.status);
  const data2 = await res2.json();
  console.log('Login result:', data2);
  const token = data2.token;

  console.log('\n--- 3. Testing GET /api/admin/list with Bearer token ---');
  const res3 = await fetch(`${base}/api/admin/list`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Status:', res3.status);
  const data3 = await res3.json();
  console.log('Danh sách giao dịch count:', data3.giaoDich?.length);
  console.log('Thành công (ok):', data3.ok);
}

testEndpoints().catch((e) => console.error('Lỗi khi test:', e));
