document.addEventListener("DOMContentLoaded", () => {
  const api =
    typeof BACKEND_URL !== "undefined" && BACKEND_URL ? BACKEND_URL : "";

  // ========== Pagination Variables ==========
  let allUsers = [];
  let currentPage = 1;
  const usersPerPage = 10;

  // ========== Load Current User Profile ==========
  async function loadCurrentUser() {
    const userId = localStorage.getItem("userId");
    const username = localStorage.getItem("username");

    if (username) {
      document.getElementById("currentUserName").textContent = username;
    }

    if (userId) {
      try {
        const response = await fetch(`${api}/api/users/all`);
        if (response.ok) {
          const users = await response.json();
          const currentUser = users.find((u) => u._id === userId);

          if (currentUser) {
            const avatarElement = document.getElementById("currentUserAvatar");

            if (currentUser.profileImage) {
              avatarElement.src = currentUser.profileImage;
              avatarElement.style.display = "block";
            } else {
              avatarElement.style.display = "none";
              const userProfile = document.querySelector(".user-profile");
              const existingPlaceholder = userProfile.querySelector(
                ".user-avatar-placeholder"
              );

              if (!existingPlaceholder) {
                const placeholder = document.createElement("div");
                placeholder.className = "user-avatar-placeholder";
                placeholder.textContent = username.charAt(0).toUpperCase();
                userProfile.insertBefore(placeholder, userProfile.firstChild);
              }
            }
          }
        }
      } catch (error) {
        console.error("Load current user error:", error);
      }
    }
  }

  // ========== Heartbeat for online presence ==========
  const userId = localStorage.getItem("userId");

  if (userId) {
    const beat = () =>
      fetch(`${api}/api/presence/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      }).catch(() => {});
    beat();
    setInterval(beat, 30_000);
  }

  // ========== Render Users Table ==========
  function renderUsers() {
    const tbody = document.getElementById("user-list");
    tbody.innerHTML = "";

    // คำนวณ index เริ่มต้นและสิ้นสุดของหน้าปัจจุบัน
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const usersToDisplay = allUsers.slice(startIndex, endIndex);

    if (usersToDisplay.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align:center;color:#999">ไม่พบข้อมูลผู้ใช้</td></tr>';
      return;
    }

    usersToDisplay.forEach((u) => {
      const tr = document.createElement("tr");
      const roleHtml =
        u.role === "admin"
          ? '<span class="badge admin">ผู้ดูแลระบบ</span>'
          : '<span class="badge neutral">ผู้ใช้งาน</span>';

      const onlineHtml = u.isOnline
        ? '<span class="badge online">อยู่ในระบบ</span>'
        : '<span class="badge offline">ออฟไลน์</span>';

      const profileHtml = u.profileImage
        ? `<img src="${escapeHtml(u.profileImage)}" alt="${escapeHtml(
            u.username
          )}" class="profile-img" onerror="this.onerror=null; this.style.display='none'; this.parentNode.innerHTML='<div class=\\'profile-placeholder\\'>${escapeHtml(
            u.username
          )
            .charAt(0)
            .toUpperCase()}</div>'">`
        : `<div class="profile-placeholder">${escapeHtml(u.username)
            .charAt(0)
            .toUpperCase()}</div>`;

      const createdDate = formatThaiDate(u.createdAt);
      const lastLoginDate = formatThaiDate(u.lastLogin);
      const statusHtml = u.isActive
        ? '<span class="badge success">ใช้งาน</span>'
        : '<span class="badge danger">ระงับการใช้งาน</span>';

      tr.innerHTML = `
        <td style="text-align:center">${profileHtml}</td>
        <td>${escapeHtml(u.username)}</td>
        <td>${roleHtml}</td>
        <td>${createdDate}</td>
        <td>${statusHtml}</td>
        <td>${onlineHtml}</td>
        <td>${lastLoginDate}</td>
      `;
      tbody.appendChild(tr);
    });

    updatePaginationUI();
  }

  // ========== Update Pagination UI ==========
  function updatePaginationUI() {
    const totalPages = Math.ceil(allUsers.length / usersPerPage);
    const pageInfo = document.getElementById("pageInfo");
    const prevBtn = document.getElementById("prevPage");
    const nextBtn = document.getElementById("nextPage");

    pageInfo.textContent = `หน้า ${currentPage} จาก ${totalPages}`;

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
  }

  // ========== Pagination Event Listeners ==========
  document.getElementById("prevPage").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderUsers();
    }
  });

  document.getElementById("nextPage").addEventListener("click", () => {
    const totalPages = Math.ceil(allUsers.length / usersPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderUsers();
    }
  });

  // ========== Load and Display Users ==========
  loadCurrentUser();

  fetch(`${api}/api/presence`)
    .then((r) => r.json())
    .then((users) => {
      allUsers = users;
      document.getElementById("total-users").textContent = users.length;
      document.getElementById("admin-users").textContent = users.filter(
        (u) => u.role === "admin"
      ).length;

      renderUsers();
    })
    .catch(() => {
      document.getElementById("user-list").innerHTML =
        '<tr><td colspan="7" style="text-align:center;color:#999">ไม่สามารถโหลดข้อมูลได้</td></tr>';
    });
});

// ========== Utility Functions ==========
function formatThaiDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date)) return "-";

  const thaiYear = date.getFullYear() + 543;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${thaiYear} ${hours}:${minutes}`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function logout() {
  localStorage.clear();
  window.location.href = "/src/login.html";
}
