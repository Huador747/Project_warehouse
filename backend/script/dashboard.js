document.addEventListener('DOMContentLoaded', () => {
  const api = (typeof BACKEND_URL !== 'undefined' && BACKEND_URL) ? BACKEND_URL : '';
  const userId = localStorage.getItem('userId');

  // ส่ง heartbeat ทุก 30 วิ
  if (userId) {
    const beat = () => fetch(`${api}/api/presence/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    }).catch(()=>{});
    beat();
    setInterval(beat, 30_000);
  }

  // โหลดรายการผู้ใช้ (ใช้ /api/presence เพื่อได้ isOnline)
  fetch(`${api}/api/presence`)
    .then(r => r.json())
    .then(users => {
      const tbody = document.getElementById('user-list');
      tbody.innerHTML = '';

      // คำนวณสถิติ
      const totalUsers = users.length;
      const adminCount = users.filter(u => u.role === 'admin').length;

      // อัปเดตการ์ดสถิติ
      document.getElementById('total-users').textContent = totalUsers.toLocaleString('th-TH');
      document.getElementById('admin-users').textContent = adminCount.toLocaleString('th-TH');

      const formatDate = (val) => {
        if (!val) return '-';
        const d = new Date(val); if (isNaN(d)) return '-';
        const y = d.getFullYear() + 543, mm = String(d.getMonth()+1).padStart(2,'0'),
              dd = String(d.getDate()).padStart(2,'0'), hh = String(d.getHours()).padStart(2,'0'),
              mi = String(d.getMinutes()).padStart(2,'0');
        return `${dd}/${mm}/${y} ${hh}:${mi}`;
      };
      const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

      users.forEach(u => {
        const tr = document.createElement('tr');
        const roleHtml = u.role === 'admin'
          ? '<span class="badge admin">ผู้ดูแลระบบ</span>'
          : '<span class="badge neutral">ผู้ใชงาน</span>';

        const onlineHtml = u.isOnline
          ? '<span class="badge online">อยู่ในระบบ</span>'
          : '<span class="badge offline">ออฟไลน์</span>';

        // สร้าง HTML สำหรับรูปโปรไฟล์
        const profileHtml = u.profileImage
          ? `<img src="${esc(u.profileImage)}" alt="${esc(u.username)}" class="profile-img" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22%3E%3Ccircle cx=%2220%22 cy=%2220%22 r=%2220%22 fill=%22%23ccc%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23fff%22 font-size=%2220%22%3E${esc(u.username).charAt(0).toUpperCase()}%3C/text%3E%3C/svg%3E'">`
          : `<div class="profile-placeholder">${esc(u.username).charAt(0).toUpperCase()}</div>`;

        tr.innerHTML = `
          <td>${profileHtml}</td>
          <td>${esc(u.username)}</td>
          <td>${roleHtml}</td>
          <td>${formatDate(u.createdAt)}</td>
          <td>${u.isActive
              ? '<span class="badge success">ใช้งาน</span>'
              : '<span class="badge danger">ระงับการใช้งาน</span>'}</td>
          <td>${onlineHtml}</td>
          <td>${formatDate(u.lastLogin)}</td>
        `;
        tbody.appendChild(tr);
      });
    })
    .catch(() => {
      const tbody = document.getElementById('user-list');
      tbody.innerHTML = '<tr><td colspan="7">โหลดข้อมูลผู้ใช้ไม่สำเร็จ</td></tr>';
    });
});