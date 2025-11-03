const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer'); // ++ เพิ่ม
const fs = require('fs');         // ++ เพิ่ม

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // เพิ่ม limit สำหรับรูปภาพ

/*http://127.0.0.1:5500/src/main.html*/

// ++ สร้างโฟลเดอร์สำหรับเก็บรูป
const uploadDir = path.join(__dirname, 'uploads', 'profiles');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ++ ตั้งค่า multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const mimetype = allowedTypes.test(file.mimetype);
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, GIF)'));
    }
});

// เชื่อมต่อ MongoDB
mongoose.connect('mongodb://localhost:27017/project_warehouse', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// อัปเดต User Schema ให้รองรับ email
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  profileImage: { type: String, default: null }, // ← เก็บ Base64 string
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// สร้าง Schema และ Model สำหรับสินค้า
const ProductSchema = new mongoose.Schema({
    product_code: String,
    model: String,
    product_name: String,
    maker: String,
    category: String,
    condition: String,
    sale_status: { type: String, default: "ขายปกติ" }, // เพิ่มบรรทัดนี้
    price: Number,
    sale_price: Number, 
    unit: String,
    location: String,
    controls: String,
    image: String,
    updatedDate: String,
    updatedTime: String,
    createdDate: String,
    createdTime: String,
    quantity: Number,
    total: Number,
    buyindate: Date,
    note: String,
});
const Product = mongoose.model('Product', ProductSchema);

// สร้าง Schema และ Model สำหรับการขายสินค้า
const SaleProductSchema = new mongoose.Schema({
    product_code: String,
    model: String,
    product_name: String,
    maker: String,
    category: String,
    condition: String,
    price: Number,
    sale_price: Number, 
    unit: String,
    saleoutdate: Date,
    vat: Number,
    total: Number,   
    total_vat: Number,
    profit: Number,
    salequantity: Number,
    notesale: String,
    customerName: String
    // เพิ่มฟิลด์อื่นๆ ตามต้องการ
});
const SaleProduct = mongoose.model('SaleProduct', SaleProductSchema, 'sale_product');

// สร้าง Schema และ Model สำหรับการรับสินค้า
const BuyinProductSchema = new mongoose.Schema({
    product_code: String,
    model: String,
    product_name: String,
    maker: String,
    category: String,
    condition: String,
    price: Number,
    unit: String,
    quantity: Number,
    total: Number,
    buyindate: Date,
    note: String
    // เพิ่มฟิลด์อื่นๆ ตามต้องการ
});
const BuyinProduct = mongoose.model('BuyinProduct', BuyinProductSchema, 'buyin_product');

// รายชื่อผู้ใช้ (ซ่อนรหัสผ่าน)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({})
      .select('username role createdAt lastLogin') // ลบ profileImage ออก
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('load users error:', err);
    res.status(500).json({ message: 'Failed to load users' });
  }
});

app.get('/api/users/stats', async (req, res) => {
  try {
    const [total, admins] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'admin' }),
    ]);
    res.json({ total, admins });
  } catch (err) {
    console.error('load stats error:', err);
    res.status(500).json({ message: 'Failed to load stats' });
  }
});

// route สำหรับการ register - ไม่ใช้ Multer
app.post('/register', async (req, res) => {
  try {
    const { username, password, profileImage } = req.body;

    console.log('📥 Register request:', {
      username,
      password: '***',
      hasProfileImage: !!profileImage,
      imageSize: profileImage ? `${(profileImage.length / 1024).toFixed(2)} KB` : 'N/A'
    });

    // ตรวจสอบว่ามีชื่อผู้ใช้นี้แล้วหรือไม่
    const existing = await User.findOne({ username });
    if (existing) {
      console.log('❌ Username already exists:', username);
      return res.status(400).json({ message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' });
    }

    // Validate Base64 image format (ถ้ามีรูป)
    if (profileImage) {
      if (!profileImage.startsWith('data:image/')) {
        console.log('❌ Invalid image format');
        return res.status(400).json({ message: 'รูปภาพไม่ถูกต้อง' });
      }
      
      // ตรวจสอบขนาด Base64 (ไม่เกิน ~7MB = 5MB file * 1.33)
      if (profileImage.length > 7 * 1024 * 1024) {
        console.log('❌ Image too large');
        return res.status(400).json({ message: 'รูปภาพใหญ่เกินไป' });
      }
    }

    // สร้าง user ใหม่
    const user = new User({
      username,
      password,
      role: 'user',
      profileImage: profileImage || null, // Base64 string หรือ null
      isActive: true,
      lastLogin: new Date(),
      lastSeen: new Date()
    });

    await user.save();
    console.log('✅ User registered successfully:', username, '| Image:', profileImage ? 'Yes' : 'No');

    res.status(201).json({ 
      message: 'ลงทะเบียนสำเร็จ',
      username: user.username,
      role: user.role
    });
  } catch (err) {
    console.error('❌ Register error:', err);
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการลงทะเบียน',
      error: err.message 
    });
  }
});

// route สำหรับการ login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (!user) return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });

  user.lastLogin = new Date();
  user.lastSeen = new Date(); // ++ เพิ่ม lastSeen ตอน login
  await user.save();

  res.json({ 
    message: 'เข้าสู่ระบบสำเร็จ', 
    username: user.username, 
    role: user.role,
    userId: user._id // ++ เพิ่ม userId
  });
});

// เพิ่ม route สำหรับดึงข้อมูลสินค้า
app.get('/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า' });
    }
});

// เพิ่ม route สำหรับแก้ไขสินค้า
app.put('/products/:id', async (req, res) => {
    try {
        // req.body.quantity จะถูกอัปเดตหรือเพิ่มใหม่ถ้ายังไม่มี
        const updated = await Product.findByIdAndUpdate(
            req.params.id,
            { $set: { ...req.body, quantity: Number(req.body.quantity) || 0 } },
            { new: true, upsert: false }
        );
        if (!updated) return res.status(404).json({ message: 'ไม่พบสินค้า' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
    }
});

// เพิ่ม route สำหรับเพิ่มสินค้า
app.post('/products', async (req, res) => {
    try {
        console.log('POST /products', req.body); // log ข้อมูลที่รับมา
        const product = new Product(req.body);
        await product.save();
        res.status(201).json(product);
    } catch (err) {
        console.error('Save error:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกสินค้า', error: err.message });
    }
});

// เพิ่ม route สำหรับค้นหาสินค้า
app.get('/products/search', async (req, res) => {
    try {
        const q = req.query.q || '';
        // ค้นหาด้วย product_code, product_name หรือ model (ไม่สนตัวพิมพ์เล็กใหญ่)
        const products = await Product.find({
            $or: [
                { product_code: { $regex: q, $options: 'i' } },
                { product_name: { $regex: q, $options: 'i' } },
                { model: { $regex: q, $options: 'i' } }
            ]
        });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการค้นหา' });
    }
});

// เพิ่ม route สำหรับตรวจสอบการทำงานของ server
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// === Presence API ต้องวาง "ก่อน" express.static ===
app.post('/api/presence/heartbeat', express.json(), async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ ok: false, error: 'missing userId' });
    await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
    res.json({ ok: true });
  } catch (e) {
    console.error('heartbeat error:', e);
    res.status(500).json({ ok: false });
  }
});

// ใช้ค่า ONLINE_WINDOW_MS จาก ENV ได้
const ONLINE_WINDOW_MS = Number(process.env.PRESENCE_WINDOW_MS || 60_000);

app.get('/api/presence', async (_req, res) => {
  const now = Date.now();
  const users = await User.find({}, 'username role isActive createdAt lastLogin lastSeen profileImage').lean();
  res.json(users.map(u => ({
    username: u.username,
    role: u.role,
    isActive: u.isActive !== false,
    createdAt: u.createdAt,
    lastLogin: u.lastLogin,
    profileImage: u.profileImage,
    isOnline: !!u.lastSeen && (now - new Date(u.lastSeen).getTime() <= ONLINE_WINDOW_MS)
  })));
});

// Serve static files
app.use(express.static(path.join(__dirname, 'src')));
app.use(express.static(path.join(__dirname, 'styles')));
app.use(express.static(path.join(__dirname, 'scripts')));
app.use(express.static(path.join(__dirname, 'assets')));
app.use('/backend', express.static(path.join(__dirname, 'backend')));
app.use(express.static(__dirname));

// ++ เพิ่มก่อน express.static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// เพิ่ม route สำหรับลบสินค้า
app.delete('/products/:id', async (req, res) => {
    try {
        const deleted = await Product.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'ไม่พบสินค้า' });
        res.json({ message: 'ลบสินค้าเรียบร้อย' });
    } catch (err) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
    }
});

// เพิ่ม route สำหรับบันทึกการขายสินค้า
app.post('/sale_product', async (req, res) => {
    try {
        console.log('POST /sale_product', req.body);
        const sale = new SaleProduct(req.body);
        await sale.save();
        res.status(201).json(sale);
    } catch (err) {
        console.error('Save sale error:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกการขาย', error: err.message });
    }
});

// เพิ่ม route สำหรับบันทึกการรับสินค้า
app.post('/buyin_product', async (req, res) => {
    try {
        console.log('POST /buyin_product', req.body);
        const buyin = new BuyinProduct(req.body);
        await buyin.save();
        res.status(201).json(buyin);
    } catch (err) {
        console.error('Save buyin error:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกซื้อเข้า', error: err.message });
    }
});

// ดึงข้อมูลซื้อเข้า
app.get('/buyin_product', async (req, res) => {
    const items = await BuyinProduct.find();
    res.json(items);
});

// ดึงข้อมูลขาย
app.get('/sale_product', async (req, res) => {
    const items = await SaleProduct.find();
    res.json(items);
});

// ดึงรายการผู้ใช้ทั้งหมด (สำหรับหน้า management)
app.get('/api/users/all', async (req, res) => {
  try {
    const users = await User.find({})
      .select('username profileImage role isActive createdAt lastLogin')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('load all users error:', err);
    res.status(500).json({ message: 'Failed to load users' });
  }
});

// สร้างผู้ใช้ใหม่ (รองรับรูปโปรไฟล์)
app.post('/api/users', upload.single('profileImage'), async (req, res) => {
  try {
    console.log('POST /api/users - Body:', req.body);
    console.log('POST /api/users - File:', req.file);
    
    const { username, password, role, isActive } = req.body;
    
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' });
    }
    
    const user = new User({
      username,
      password,
      role: role || 'user',
      isActive: isActive === 'true' || isActive === true,
      profileImage: req.file ? `/uploads/profiles/${req.file.filename}` : null
    });
    
    await user.save();
    console.log('User created successfully:', user.username);
    res.status(201).json({ message: 'สร้างผู้ใช้สำเร็จ', user });
  } catch (err) {
    console.error('create user error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างผู้ใช้', error: err.message });
  }
});

// อัปเดตผู้ใช้ (รองรับรูปโปรไฟล์)
app.put('/api/users/:id', upload.single('profileImage'), async (req, res) => {
  try {
    console.log('PUT /api/users/:id - Body:', req.body);
    console.log('PUT /api/users/:id - File:', req.file);
    
    const { username, password, role, isActive } = req.body;
    const updateData = { 
      username, 
      role, 
      isActive: isActive === 'true' || isActive === true 
    };
    
    // อัปเดตรูปถ้ามีการอัปโหลดใหม่
    if (req.file) {
      const oldUser = await User.findById(req.params.id);
      if (oldUser && oldUser.profileImage) {
        const oldPath = path.join(__dirname, oldUser.profileImage);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      updateData.profileImage = `/uploads/profiles/${req.file.filename}`;
    }
    
    // อัปเดต password ถ้ามี
    if (password && password.trim() !== '') {
      updateData.password = password;
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    }
    
    console.log('User updated successfully:', user.username);
    res.json({ message: 'อัปเดตผู้ใช้สำเร็จ', user });
  } catch (err) {
    console.error('update user error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตผู้ใช้', error: err.message });
  }
});

// ลบผู้ใช้ (ลบรูปด้วย)
app.delete('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    }
    
    // ลบรูปโปรไฟล์
    if (user.profileImage) {
      const imagePath = path.join(__dirname, user.profileImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await User.findByIdAndDelete(req.params.id);
    console.log('User deleted successfully:', user.username);
    res.json({ message: 'ลบผู้ใช้สำเร็จ' });
  } catch (err) {
    console.error('delete user error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบผู้ใช้', error: err.message });
  }
});

// เริ่ม server
const port = 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
});