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
          : '<span class="badge neutral">ผู้ใช้</span>';

        const onlineHtml = u.isOnline
          ? '<span class="badge online">อยู่ในระบบ</span>'
          : '<span class="badge offline">ออฟไลน์</span>';

        tr.innerHTML = `
          <td>${'' /* รูป/ไอคอนถ้ามี */}</td>
          <td>${esc(u.username)}</td>
          <td>${roleHtml}</td>
          <td>${formatDate(u.createdAt)}</td>
          <td>${u.isActive
              ? '<span class="badge success">เปิดใช้งาน</span>'
              : '<span class="badge danger">ปิดใช้งาน</span>'}</td>
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