const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // เพิ่ม limit สำหรับรูปภาพ

/*http://127.0.0.1:5500/src/main.html*/

// เชื่อมต่อ MongoDB
mongoose.connect('mongodb://localhost:27017/project_warehouse', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// สร้าง Schema และ Model
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profileImage: String,
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  lastSeen: Date
}, { timestamps: true });  // สร้าง createdAt/updatedAt อัตโนมัติ

const User = mongoose.model('User', UserSchema);

// สร้าง Schema และ Model สำหรับสินค้า
const ProductSchema = new mongoose.Schema({
    product_code: String,
    model: String,
    product_name: String,
    maker: String,
    category: String,
    condition: String,
    price: Number,
    sale_price: Number, 
    unit: String,
    location: String,
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

// เพิ่ม route สำหรับการลงทะเบียน
app.post('/register', async (req, res) => {
  try {
    console.log('Register attempt:', req.body);
    const { username, password } = req.body; // ตัด profileImage ออก

    // ตรวจสอบว่ามีผู้ใช้นี้แล้วหรือไม่
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' });
    }

    // สร้างผู้ใช้ใหม่ (ไม่เก็บรูป)
    const user = new User({ username, password });

    await user.save();
    console.log('User registered successfully:', username);
    res.status(201).json({ message: 'ลงทะเบียนสำเร็จ' });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลงทะเบียน' });
  }
});

// route สำหรับการ login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (!user) return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });

  user.lastLogin = new Date();
  await user.save();

  res.json({ message: 'เข้าสู่ระบบสำเร็จ', username: user.username, role: user.role });
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
  const users = await User.find({}, 'username role isActive createdAt lastLogin lastSeen').lean();
  res.json(users.map(u => ({
    username: u.username,
    role: u.role,
    isActive: u.isActive !== false,
    createdAt: u.createdAt,
    lastLogin: u.lastLogin,
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

// เริ่ม server
const port = 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
});