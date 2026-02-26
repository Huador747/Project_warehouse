// =========================
// Global Variables
// =========================
const api = (typeof BACKEND_URL !== 'undefined' && BACKEND_URL) ? BACKEND_URL : '';
let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
const usersPerPage = 10;
let deleteUserId = null;

// =========================
// Initial Load
// =========================
document.addEventListener('DOMContentLoaded', () => {
    loadCurrentUser();
    loadUsers();
    setupEventListeners();
});

// =========================
// Event Listeners
// =========================
function setupEventListeners() {
    // ค้นหา
    document.getElementById('searchInput').addEventListener('input', filterUsers);
    
    // กรอง
    document.getElementById('filterRole').addEventListener('change', filterUsers);
    document.getElementById('filterStatus').addEventListener('change', filterUsers);
    
    // Pagination
    document.getElementById('prevPage').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPage').addEventListener('click', () => changePage(1));
    
    // Form submit
    document.getElementById('userForm').addEventListener('submit', handleUserSubmit);
    
    // Close modal เมื่อคลิกนอก modal
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeUserModal();
            closeDeleteModal();
        }
    });
}

// =========================
// Load Data
// =========================
async function loadCurrentUser() {
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    
    if (username) {
        document.getElementById('currentUserName').textContent = username;
    }
    
    // โหลดรูปโปรไฟล์จาก API
    if (userId) {
        try {
            const response = await fetch(`${api}/api/users/all`);
            if (response.ok) {
                const users = await response.json();
                const currentUser = users.find(u => u._id === userId);
                
                if (currentUser) {
                    const avatarElement = document.getElementById('currentUserAvatar');
                    
                    if (currentUser.profileImage) {
                        avatarElement.src = currentUser.profileImage;
                        avatarElement.style.display = 'block';
                    } else {
                        // ใช้ placeholder ถ้าไม่มีรูป
                        avatarElement.style.display = 'none';
                        const userProfile = document.querySelector('.user-profile');
                        const existingPlaceholder = userProfile.querySelector('.user-avatar-placeholder');
                        
                        if (!existingPlaceholder) {
                            const placeholder = document.createElement('div');
                            placeholder.className = 'user-avatar-placeholder';
                            placeholder.textContent = username.charAt(0).toUpperCase();
                            userProfile.insertBefore(placeholder, userProfile.firstChild);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Load current user error:', error);
        }
    }
}

async function loadUsers() {
    try {
        const response = await fetch(`${api}/api/users/all`);
        if (!response.ok) throw new Error('Failed to load users');
        
        allUsers = await response.json();
        filteredUsers = [...allUsers];
        renderUsers();
    } catch (error) {
        console.error('Load users error:', error);
        showError('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
    }
}

// =========================
// Filter & Search
// =========================
function filterUsers() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const roleFilter = document.getElementById('filterRole').value;
    const statusFilter = document.getElementById('filterStatus').value;
    
    filteredUsers = allUsers.filter(user => {
        const matchSearch = !searchText || 
            user.username.toLowerCase().includes(searchText) ||
            user.role.toLowerCase().includes(searchText);
        
        const matchRole = !roleFilter || user.role === roleFilter;
        
        const matchStatus = !statusFilter || 
            (statusFilter === 'active' && user.isActive) ||
            (statusFilter === 'inactive' && !user.isActive);
        
        return matchSearch && matchRole && matchStatus;
    });
    
    currentPage = 1;
    renderUsers();
}

// =========================
// Render Users
// =========================
function renderUsers() {
    const tbody = document.getElementById('usersTableBody');
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    const start = (currentPage - 1) * usersPerPage;
    const end = start + usersPerPage;
    const usersToShow = filteredUsers.slice(start, end);
    
    if (usersToShow.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">ไม่พบข้อมูลผู้ใช้</td></tr>';
        updatePagination(0, 0);
        return;
    }
    
    tbody.innerHTML = usersToShow.map((user, index) => {
        const rowNumber = start + index + 1;
        const createdDate = formatThaiDate(user.createdAt);
        const roleText = getRoleText(user.role);
        const statusBadge = user.isActive 
            ? '<span class="badge success">ใช้งาน</span>' 
            : '<span class="badge danger">ระงับการใช้งาน</span>';
        
        const profileHtml = user.profileImage
            ? `<img src="${escapeHtml(user.profileImage)}" alt="${escapeHtml(user.username)}" class="profile-img" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2245%22 height=%2245%22%3E%3Ccircle cx=%2222.5%22 cy=%2222.5%22 r=%2222.5%22 fill=%22%23ccc%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23fff%22 font-size=%2220%22 font-weight=%22700%22%3E${escapeHtml(user.username).charAt(0).toUpperCase()}%3C/text%3E%3C/svg%3E'">`
            : `<div class="profile-placeholder">${escapeHtml(user.username).charAt(0).toUpperCase()}</div>`;
        
        return `
            <tr>
                <td>${rowNumber}</td>
                <td>${profileHtml}</td>
                <td>${escapeHtml(user.username)}</td>
                <td><span class="badge ${getRoleBadgeClass(user.role)}">${roleText}</span></td>
                <td>${statusBadge}</td>
                <td>${createdDate}</td>
                <td>
                    <button class="btn-icon btn-edit" onclick="window.openEditUserModal('${user._id}')" title="แก้ไข">
                        ✏️
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    updatePagination(currentPage, totalPages);
}

// =========================
// Pagination
// =========================
function updatePagination(current, total) {
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    
    prevBtn.disabled = current <= 1;
    nextBtn.disabled = current >= total || total === 0;
    pageInfo.textContent = `หน้า ${total === 0 ? 0 : current} จาก ${total}`;
}

function changePage(direction) {
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderUsers();
    }
}

// =========================
// Modal Functions
// =========================
function openAddUserModal() {
    document.getElementById('modalTitle').textContent = 'เพิ่มผู้ใช้งานใหม่';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('passwordRequired').style.display = 'inline';
    document.getElementById('passwordHint').style.display = 'none';
    document.getElementById('userPassword').required = true;
    
    // ล้าง preview รูปเดิม
    const previewContainer = document.getElementById('profileImagePreview');
    if (previewContainer) {
        previewContainer.innerHTML = '';
    }
    
    document.getElementById('userModal').style.display = 'flex';
}

async function openEditUserModal(userId) {
    try {
        const user = allUsers.find(u => u._id === userId);
        if (!user) throw new Error('User not found');
        
        document.getElementById('modalTitle').textContent = 'แก้ไขข้อมูลผู้ใช้งาน';
        document.getElementById('userId').value = user._id;
        document.getElementById('userName').value = user.username;
        document.getElementById('userPassword').value = '';
        document.getElementById('userRole').value = user.role;
        document.getElementById('userStatus').value = user.isActive ? 'active' : 'inactive';
        
        document.getElementById('passwordRequired').style.display = 'none';
        document.getElementById('passwordHint').style.display = 'block';
        document.getElementById('userPassword').required = false;
        
        // แสดงรูปปัจจุบัน
        const previewContainer = document.getElementById('profileImagePreview');
        if (user.profileImage) {
            previewContainer.innerHTML = `
                <div class="current-profile-image">
                    <img src="${escapeHtml(user.profileImage)}" alt="Current profile">
                    <div class="image-info">
                        <span class="image-label">รูปปัจจุบัน</span>
                    </div>
                </div>
            `;
        } else {
            previewContainer.innerHTML = `
                <div class="no-profile-image">
                    <div class="profile-placeholder-large">${escapeHtml(user.username).charAt(0).toUpperCase()}</div>
                    <span class="image-label">ยังไม่มีรูปโปรไฟล์</span>
                </div>
            `;
        }
        
        document.getElementById('userModal').style.display = 'flex';
    } catch (error) {
        console.error('Load user error:', error);
        showError('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
    }
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    document.getElementById('userForm').reset();
    const previewContainer = document.getElementById('profileImagePreview');
    if (previewContainer) {
        previewContainer.innerHTML = '';
    }
}

function openDeleteModal(userId, username) {
    deleteUserId = userId;
    document.getElementById('deleteUserName').textContent = username;
    document.getElementById('deleteModal').style.display = 'flex';
}

function closeDeleteModal() {
    deleteUserId = null;
    document.getElementById('deleteModal').style.display = 'none';
}

// =========================
// Image Preview Function
// =========================
function previewProfileImage(input) {
    const previewContainer = document.getElementById('profileImagePreview');
    
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        
        if (file.size > 5 * 1024 * 1024) {
            showError('ขนาดไฟล์ใหญ่เกินไป (สูงสุด 5MB)');
            input.value = '';
            previewContainer.innerHTML = '';
            return;
        }
        
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            showError('รองรับเฉพาะไฟล์ JPG, PNG, GIF เท่านั้น');
            input.value = '';
            previewContainer.innerHTML = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            previewContainer.innerHTML = `
                <div class="new-profile-image">
                    <img src="${e.target.result}" alt="Preview">
                    <div class="image-info">
                        <span class="image-label">🆕 รูปใหม่</span>
                        <span class="image-size">${fileSize} MB</span>
                        <button type="button" class="btn-remove-image" onclick="window.clearImagePreview()">
                            ❌ ลบ
                        </button>
                    </div>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    }
}

function clearImagePreview() {
    const fileInput = document.getElementById('userProfileImage');
    const previewContainer = document.getElementById('profileImagePreview');
    
    fileInput.value = '';
    previewContainer.innerHTML = '';
}

// =========================
// CRUD Operations
// =========================
async function handleUserSubmit(e) {
    e.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const formData = new FormData();
    
    formData.append('username', document.getElementById('userName').value.trim());
    formData.append('role', document.getElementById('userRole').value);
    formData.append('isActive', document.getElementById('userStatus').value === 'active');
    
    const password = document.getElementById('userPassword').value;
    if (password) {
        formData.append('password', password);
    }
    
    const fileInput = document.getElementById('userProfileImage');
    if (fileInput.files.length > 0) {
        formData.append('profileImage', fileInput.files[0]);
    }
    
    try {
        const url = userId ? `${api}/api/users/${userId}` : `${api}/api/users`;
        const method = userId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            body: formData
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Operation failed');
        }
        
        showSuccess(userId ? 'แก้ไขข้อมูลสำเร็จ' : 'เพิ่มผู้ใช้สำเร็จ');
        closeUserModal();
        await loadUsers();
    } catch (error) {
        console.error('Save user error:', error);
        showError(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
}

// =========================
// Utility Functions
// =========================
function formatThaiDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date)) return '-';
    
    const thaiYear = date.getFullYear() + 543;
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${thaiYear} ${hours}:${minutes}`;
}

function getRoleText(role) {
    const roles = {
        'admin': 'ผู้ดูแลระบบ',
        'manager': 'ผู้จัดการ',
        'staff': 'พนักงาน',
        'user': 'ผู้ใช้งาน'
    };
    return roles[role] || role;
}

function getRoleBadgeClass(role) {
    const classes = {
        'admin': 'admin',
        'manager': 'warning',
        'staff': 'info',
        'user': 'neutral'
    };
    return classes[role] || 'neutral';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showSuccess(message) {
    alert('✅ ' + message);
}

function showError(message) {
    alert('❌ ' + message);
}

function logout() {
    localStorage.clear();
    window.location.href = '/login.html';
}

// =========================
// Export ทุกฟังก์ชันไปยัง Global Scope
// =========================
window.openAddUserModal = openAddUserModal;
window.openEditUserModal = openEditUserModal;
window.closeUserModal = closeUserModal;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDelete = confirmDelete;
window.previewProfileImage = previewProfileImage;
window.clearImagePreview = clearImagePreview;
window.logout = logout;