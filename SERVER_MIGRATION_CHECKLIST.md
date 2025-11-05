# Server Migration Checklist

## เตรียมการ (เครื่องเก่า)

- [ ] Backup MongoDB Database
  ```powershell
  mongodump --db project_warehouse --out C:\backup_mongodb
  ```

- [ ] Backup โฟลเดอร์ uploads/profiles (รูปโปรไฟล์)
  ```powershell
  Copy-Item -Path "uploads\profiles" -Destination "C:\backup_uploads" -Recurse
  ```

- [ ] บันทึกชื่อเครื่องเดิม
  ```powershell
  hostname > server_name.txt
  ```

- [ ] Export PM2 process list
  ```powershell
  pm2 save
  pm2 list
  ```

## ติดตั้ง (เครื่องใหม่)

- [ ] ติดตั้ง Node.js (version ตาม package.json)
- [ ] ติดตั้ง MongoDB
  ```powershell
  # Download จาก: https://www.mongodb.com/try/download/community
  ```

- [ ] ติดตั้ง PM2 global
  ```powershell
  npm install -g pm2
  ```

- [ ] Clone/Copy โปรเจกต์
  ```powershell
  git clone <repository-url>
  # หรือ Copy โฟลเดอร์
  ```

- [ ] ติดตั้ง dependencies
  ```powershell
  cd Project_warehouse
  npm install
  ```

## Restore ข้อมูล

- [ ] Restore MongoDB
  ```powershell
  mongorestore --db project_warehouse C:\backup_mongodb\project_warehouse
  ```

- [ ] Copy รูปโปรไฟล์
  ```powershell
  Copy-Item -Path "C:\backup_uploads\*" -Destination "uploads\profiles\" -Recurse
  ```

## ตั้งค่าเครื่องใหม่

### วิธีที่ 1: ใช้ชื่อเครื่องเดิม (แนะนำ)

- [ ] เปลี่ยนชื่อเครื่องให้เหมือนเดิม
  - Settings → System → About → Rename this PC
  - ใส่ชื่อจาก `server_name.txt`
  - Restart เครื่อง

- [ ] ตรวจสอบชื่อ
  ```powershell
  hostname
  # ต้องได้ชื่อเดิม
  ```

### วิธีที่ 2: ใช้ชื่อใหม่

- [ ] ดูชื่อเครื่องใหม่
  ```powershell
  hostname
  ```

- [ ] บันทึกชื่อใหม่เพื่อแจ้งทีม

## เปิด Firewall

- [ ] เปิด Windows Firewall
  - Windows Defender Firewall with Advanced Security
  - Inbound Rules → New Rule
  - Port → TCP → 3000
  - Allow the connection
  - ตั้งชื่อ: project_warehouse

- [ ] ทดสอบจากเครื่องอื่น
  ```
  Test-NetConnection -ComputerName <ชื่อเครื่อง> -Port 3000
  ```

## รัน Server

- [ ] Start MongoDB Service
  ```powershell
  net start MongoDB
  ```

- [ ] รัน Server ด้วย PM2
  ```powershell
  npm run pm2
  # หรือ
  pm2 start server.js --name project-warehouse
  ```

- [ ] ตรวจสอบสถานะ
  ```powershell
  pm2 status
  pm2 logs project-warehouse
  ```

## ทดสอบ

- [ ] ทดสอบบนเครื่อง Server
  ```
  http://localhost:3000/login.html
  ```

- [ ] ทดสอบด้วย IP
  ```powershell
  # ดู IP
  ipconfig | Select-String "IPv4"
  # เปิด browser
  http://<IP>:3000/login.html
  ```

- [ ] ทดสอบด้วยชื่อเครื่อง
  ```powershell
  hostname
  # เปิด browser
  http://<ชื่อเครื่อง>:3000/login.html
  ```

- [ ] ทดสอบจากเครื่องลูก
  - Login ได้
  - ดึงข้อมูลสินค้าได้
  - รูปโปรไฟล์แสดงถูกต้อง

## แจ้งทีม (ถ้าใช้วิธีที่ 2)

- [ ] แจ้ง URL ใหม่ให้ทีม
  ```
  URL ใหม่: http://<ชื่อเครื่องใหม่>:3000/login.html
  ```

- [ ] อัปเดต Bookmark ในเบราว์เซอร์

## PM2 Startup (Production)

- [ ] ตั้งค่า PM2 auto-start
  ```powershell
  pm2 startup
  pm2 save
  ```

## สำรอง (Optional)

- [ ] ตั้งค่า Static IP
  - Settings → Network → Ethernet → Edit IP settings
  - Manual: ใส่ IP, Subnet, Gateway, DNS

- [ ] สร้างไฟล์ hosts (สำหรับเครื่องลูก)
  ```
  <IP-Server>    warehouse.local
  ```

## ตรวจสอบหลังย้าย 1 สัปดาห์

- [ ] Server ยังรันอยู่
  ```powershell
  pm2 status
  ```

- [ ] MongoDB มี disk space เพียงพอ
  ```powershell
  Get-PSDrive C
  ```

- [ ] ไม่มี error log
  ```powershell
  pm2 logs --lines 100
  ```

---

**หมายเหตุ:** 
- ถ้าใช้วิธีที่ 1 (ชื่อเครื่องเดิม) เครื่องลูกไม่ต้องทำอะไร
- ถ้าใช้วิธีที่ 2 (ชื่อใหม่) เครื่องลูกแค่เปลี่ยน Bookmark
- IP เปลี่ยนไม่กระทบ เพราะใช้ชื่อเครื่อง

---

## 📝 คำตอบคำถามที่พบบ่อย (FAQ)

### Q1: ใช้ชื่อเครื่อง (NetBIOS) แก้ไขเรื่อง IP เปลี่ยนได้ใช่มั้ย?
**✅ ใช่ครับ! แก้ได้เลย**

**ทำไมถึงแก้ได้:**
- ชื่อเครื่อง Windows **ไม่เปลี่ยน** (ยกเว้นคุณเปลี่ยนเอง)
- Windows มีระบบ NetBIOS/LLMNR แปลงชื่อเครื่อง → IP อัตโนมัติ
- โค้ดใช้ `window.location.hostname` รับได้ทั้ง IP และชื่อเครื่อง

**ตัวอย่าง:**
```
เครื่องปัจจุบัน: DESKTOP-B6BG1LO
IP วันนี้: 192.168.2.61
IP พรุ่งนี้: 192.168.2.100 (เปลี่ยนไป)

✅ ยังใช้ได้: http://DESKTOP-B6BG1LO:3000/login.html
❌ ใช้ไม่ได้: http://192.168.2.61:3000/login.html (IP เก่า)
```

---

### Q2: สามารถใช้ร่วมกับ PM2 ได้ไหม?
**✅ ใช้ได้เลยครับ! ไม่ต้องแก้ไขอะไร**

`server.js` bind ที่ `0.0.0.0:3000` ซึ่งรับทุก network interface:
```javascript
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
});
```

`0.0.0.0` หมายถึง รับการเชื่อมต่อจาก:
- ✅ `localhost` (127.0.0.1)
- ✅ IP ของเครื่อง (192.168.2.61)
- ✅ ชื่อเครื่อง (DESKTOP-B6BG1LO)
- ✅ ชื่อ domain กำหนดเอง (warehouse.local)

**รันด้วย PM2:**
```powershell
npm run pm2
# หรือ
pm2 start server.js --name project-warehouse
pm2 save
```

---

### Q3: เปิดให้ใช้ได้ 2 ทางพร้อมกันได้ไหม (IP + ชื่อเครื่อง)?
**✅ ได้เลยครับ! โค้ดรองรับอยู่แล้ว**

`scripts/config.js` ใช้ `window.location.hostname` ซึ่งรับอะไรก็ได้:
```javascript
export const BACKEND_URL = `http://${window.location.hostname}:3000`;
```

**ตารางเปรียบเทียบ:**

| วิธีเข้า | URL ที่พิมพ์ | BACKEND_URL ที่ได้ | ใช้ได้หรือไม่ |
|---------|-------------|-------------------|--------------|
| **IP** | `http://192.168.2.61:3000/login.html` | `http://192.168.2.61:3000` | ✅ ใช้ได้ |
| **ชื่อเครื่อง** | `http://DESKTOP-B6BG1LO:3000/login.html` | `http://DESKTOP-B6BG1LO:3000` | ✅ ใช้ได้ |
| **Localhost** | `http://localhost:3000/login.html` | `http://localhost:3000` | ✅ ใช้ได้ (เฉพาะบนเครื่อง Server) |

**ข้อดี:**
- ทั้ง 3 วิธีใช้งานได้พร้อมกัน
- ไม่ต้องแก้ไขโค้ดอะไร
- เครื่องลูกเลือกวิธีไหนก็ได้

**แนะนำ:**
- ✨ ใช้ **ชื่อเครื่อง** เป็นหลัก → IP เปลี่ยนไม่กระทบ
- เก็บ **IP** ไว้เป็น backup → กรณีชื่อเครื่องเข้าไม่ได้

---

### Q4: แล้วถ้าต้องการเปลี่ยนเครื่อง Server ล่ะ?
**มี 2 วิธี:**

#### **✨ วิธีที่ 1: ตั้งชื่อเครื่องใหม่เหมือนเดิม (แนะนำ)**

**ขั้นตอน:**
1. Backup ข้อมูลจากเครื่องเก่า
2. บันทึกชื่อเครื่องเดิม: `DESKTOP-B6BG1LO`
3. ติดตั้งเครื่องใหม่
4. เปลี่ยนชื่อเครื่องใหม่เป็น: `DESKTOP-B6BG1LO`
5. Restore ข้อมูล + รัน Server

**ผลลัพธ์:**
- ✅ เครื่องลูก**ไม่ต้องแก้อะไรเลย!**
- ✅ ยังใช้ URL เดิม: `http://DESKTOP-B6BG1LO:3000/login.html`
- ✅ IP จะเป็นเท่าไหร่ก็ไม่กระทบ

---

#### **วิธีที่ 2: ใช้ชื่อเครื่องใหม่**

**ขั้นตอน:**
1. Backup + ติดตั้งเครื่องใหม่
2. ดูชื่อเครื่องใหม่: สมมติได้ `NEW-SERVER`
3. Restore ข้อมูล + รัน Server
4. แจ้งทีมใช้ URL ใหม่: `http://NEW-SERVER:3000/login.html`

**ผลลัพธ์:**
- ⚠️ เครื่องลูกต้องเปลี่ยน Bookmark (แจ้งครั้งเดียว)
- ✅ หลังจากนั้น IP เปลี่ยนไม่กระทบ

---

## 🎯 สรุป Quick Guide

### **สถานการณ์ 1: IP เปลี่ยนบ่อย**
**วิธีแก้:** ให้ทีมเข้าด้วยชื่อเครื่อง
```powershell
# ดูชื่อเครื่อง
hostname

# แจกลิงก์นี้ให้ทีม
http://DESKTOP-B6BG1LO:3000/login.html
```

---

### **สถานการณ์ 2: ต้องการชื่อที่จดจำง่าย**
**วิธีแก้:** เปลี่ยนชื่อเครื่อง Server
```
Settings → System → About → Rename this PC
ตั้งชื่อ: WAREHOUSE-SERVER

แจกลิงก์: http://WAREHOUSE-SERVER:3000/login.html
```

---

### **สถานการณ์ 3: เปลี่ยนเครื่อง Server**
**วิธีแก้:** ตั้งชื่อเครื่องใหม่เหมือนเดิม
```powershell
# เครื่องเก่า
hostname > server_name.txt
mongodump --db project_warehouse --out C:\backup

# เครื่องใหม่
# 1. ตั้งชื่อเครื่องเหมือนเดิม
# 2. mongorestore --db project_warehouse C:\backup\project_warehouse
# 3. npm run pm2

# ✅ เครื่องลูกไม่ต้องทำอะไร!
```

---

### **สถานการณ์ 4: ต้องการ URL ที่ดูดีกว่า**
**วิธีแก้:** ใช้ Hosts File
```powershell
# แก้ไขทุกเครื่องลูก
# C:\Windows\System32\drivers\etc\hosts
192.168.2.61    warehouse.local

# เข้าผ่าน
http://warehouse.local:3000/login.html

# ถ้า IP เปลี่ยน แค่แก้ไฟล์ hosts
192.168.2.100   warehouse.local  # IP ใหม่
```

---

## ⚠️ ข้อควรระวัง

### **ชื่อเครื่องใช้ได้เมื่อ:**
- ✅ เครื่องทั้งหมดอยู่ใน LAN เดียวกัน
- ✅ Windows Workgroup เดียวกัน (default: WORKGROUP)
- ✅ Firewall ไม่บล็อก NetBIOS (port 137-139, 445)

### **ชื่อเครื่องใช้ไม่ได้เมื่อ:**
- ❌ เครื่องลูกอยู่คนละ subnet
- ❌ IT ปิดระบบ NetBIOS ที่ Router
- ❌ ต้องการเข้าจากอินเทอร์เน็ต (ต้องใช้ DDNS)

### **การทดสอบว่าใช้ได้หรือไม่:**
```powershell
# บนเครื่องลูก
ping DESKTOP-B6BG1LO

# ถ้าได้ Reply → ใช้ได้
# ถ้าได้ "could not find host" → ใช้ไม่ได้ (ต้องใช้ IP)
```

---

## 📱 ข้อมูลเครื่องปัจจุบัน

```
ชื่อเครื่อง:  DESKTOP-B6BG1LO
IP Address:   192.168.2.61
Port:         3000

URL สำหรับทีม (แนะนำ):
http://DESKTOP-B6BG1LO:3000/login.html

URL สำรอง (กรณีชื่อเครื่องใช้ไม่ได้):
http://192.168.2.61:3000/login.html
```

---

## 🔧 คำสั่งที่ใช้บ่อย

```powershell
# ดูชื่อเครื่อง + IP
hostname
ipconfig | Select-String "IPv4"

# ตรวจสอบ PM2
pm2 status
pm2 logs project-warehouse

# Restart Server
pm2 restart project-warehouse

# ดู MongoDB
mongo
> show dbs
> use project_warehouse
> db.products.count()

# ตรวจสอบว่า port 3000 เปิดอยู่
netstat -ano | findstr :3000

# ทดสอบการเชื่อมต่อจากเครื่องอื่น
Test-NetConnection -ComputerName DESKTOP-B6BG1LO -Port 3000
```

---

## 📞 Support

หากมีปัญหา:
1. ตรวจสอบ Firewall เปิด port 3000
2. ตรวจสอบ MongoDB รันอยู่: `net start MongoDB`
3. ตรวจสอบ PM2: `pm2 status`
4. ดู log: `pm2 logs project-warehouse --lines 50`

---

**สรุป:** โค้ดของคุณรองรับทั้ง IP และชื่อเครื่องอยู่แล้ว ไม่ต้องแก้อะไร! แค่แจกลิงก์แบบชื่อเครื่องให้ทีม แล้ว IP จะเปลี่ยนยังไงก็ไม่กระทบ ✨
