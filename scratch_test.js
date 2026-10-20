async function testEndpoints() {
  const base = 'http://localhost:3000';
  console.log('--- 1. Testing GET /api/data ---');
  const res1 = await fetch(`${base}/api/data`);
  console.log('Status:', res1.status);
  const data1 = await res1.json();
  console.log('tenHienThi:', data1.cauHinh?.tenHienThi);
  console.log('soLuot:', data1.thongKe?.soLuot);

  console.log('\n--- 2. Testing POST /api/admin/login ---');
  const res2 = await fetch(`${base}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matKhau: 'admin123' })
  });
  console.log('Status:', res2.status);
  const data2 = await res2.json();
  console.log('Login result:', data2);
  const token = data2.token;

  console.log('\n--- 3. Testing GET /api/admin/list with Bearer token ---');
  const res3 = await fetch(`${base}/api/admin/list`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Status:', res3.status);
  const data3 = await res3.json();
  console.log('List count:', data3.giaoDich?.length);
  console.log('List ok:', data3.ok);

  console.log('\n--- 4. Testing POST /api/submit ---');
  const testMaDon = 'DNTST' + Math.floor(100000 + Math.random() * 900000);
  const res4 = await fetch(`${base}/api/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ten: 'Nguyen Van A',
      soTien: 50000,
      loiNhan: 'Chuc ban mot ngay tot lanh',
      maDon: testMaDon
    })
  });
  console.log('Status:', res4.status);
  const data4 = await res4.json();
  console.log('Submit result:', data4);

  console.log('\n--- 5. Testing GET /api/status/:maDon ---');
  const res5 = await fetch(`${base}/api/status/${testMaDon}`);
  console.log('Status:', res5.status);
  const data5 = await res5.json();
  console.log('Status result:', data5);

  console.log('\n--- 6. Testing POST /api/admin/confirm ---');
  const res6 = await fetch(`${base}/api/admin/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      maDon: testMaDon,
      trangThai: 'Đã xác nhận'
    })
  });
  console.log('Status:', res6.status);
  const data6 = await res6.json();
  console.log('Confirm result:', data6);

  console.log('\n--- 7. Re-check GET /api/status/:maDon after confirm ---');
  const res7 = await fetch(`${base}/api/status/${testMaDon}`);
  const data7 = await res7.json();
  console.log('Status result after confirm:', data7);
}

testEndpoints().catch(e => console.error('Test failed:', e));
