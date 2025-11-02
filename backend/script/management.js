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
    const username = localStorage.getItem('username');
    if (username) {
        document.getElementById('currentUser').textContent = username;
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
        // ค้นหา
        const matchSearch = !searchText || 
            user.username.toLowerCase().includes(searchText) ||
            (user.email && user.email.toLowerCase().includes(searchText)) ||
            user.role.toLowerCase().includes(searchText);
        
        // กรองบทบาท
        const matchRole = !roleFilter || user.role === roleFilter;
        
        // กรองสถานะ
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
        
        return `
            <tr>
                <td>${rowNumber}</td>
                <td>${escapeHtml(user.username)}</td>
                <td>${escapeHtml(user.email || '-')}</td>
                <td><span class="badge ${getRoleBadgeClass(user.role)}">${roleText}</span></td>
                <td>${statusBadge}</td>
                <td>${createdDate}</td>
                <td>
                    <button class="btn-icon btn-edit" onclick="openEditUserModal('${user._id}')" title="แก้ไข">
                        ✏️
                    </button>
                    <button class="btn-icon btn-delete" onclick="openDeleteModal('${user._id}', '${escapeHtml(user.username)}')" title="ลบ">
                        🗑️
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
    document.getElementById('userModal').style.display = 'flex';
}

async function openEditUserModal(userId) {
    try {
        const user = allUsers.find(u => u._id === userId);
        if (!user) throw new Error('User not found');
        
        document.getElementById('modalTitle').textContent = 'แก้ไขข้อมูลผู้ใช้งาน';
        document.getElementById('userId').value = user._id;
        document.getElementById('userName').value = user.username;
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('userPassword').value = '';
        document.getElementById('userRole').value = user.role;
        document.getElementById('userStatus').value = user.isActive ? 'active' : 'inactive';
        
        document.getElementById('passwordRequired').style.display = 'none';
        document.getElementById('passwordHint').style.display = 'block';
        document.getElementById('userPassword').required = false;
        
        document.getElementById('userModal').style.display = 'flex';
    } catch (error) {
        console.error('Load user error:', error);
        showError('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
    }
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    document.getElementById('userForm').reset();
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
// CRUD Operations
// =========================
async function handleUserSubmit(e) {
    e.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const userData = {
        username: document.getElementById('userName').value.trim(),
        email: document.getElementById('userEmail').value.trim(),
        password: document.getElementById('userPassword').value,
        role: document.getElementById('userRole').value,
        isActive: document.getElementById('userStatus').value === 'active'
    };
    
    // ถ้าเป็นการแก้ไขและไม่ได้กรอกรหัสผ่านใหม่ ให้ลบ password ออก
    if (userId && !userData.password) {
        delete userData.password;
    }
    
    try {
        const url = userId ? `${api}/api/users/${userId}` : `${api}/api/users`;
        const method = userId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
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

async function confirmDelete() {
    if (!deleteUserId) return;
    
    try {
        const response = await fetch(`${api}/api/users/${deleteUserId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.message || 'Delete failed');
        }
        
        showSuccess('ลบผู้ใช้สำเร็จ');
        closeDeleteModal();
        await loadUsers();
    } catch (error) {
        console.error('Delete user error:', error);
        showError(error.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้');
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