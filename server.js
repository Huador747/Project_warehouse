const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // เพิ่ม limit สำหรับรูปภาพ

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
    username: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    profileImage: String
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
    price: Number,
    sale_price: String,
    unit: String,
    location: String,
    image: String, // base64 หรือ url
    updatedDate: String,
    updatedTime: String,
    createdDate: String,
    createdTime: String
    // เพิ่มฟิลด์อื่นๆ ตามต้องการ
});
const Product = mongoose.model('Product', ProductSchema);

// เพิ่ม route สำหรับการลงทะเบียน
app.post('/register', async (req, res) => {
    try {
        console.log('Register attempt:', req.body);
        const { username, password, profileImage } = req.body;

        // ตรวจสอบว่ามีผู้ใช้นี้แล้วหรือไม่
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' });
        }

        // สร้างผู้ใช้ใหม่
        const user = new User({
            username,
            password,
            profileImage
        });

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
    try {
        const { username, password } = req.body;
        console.log('Login attempt for username:', username);

        // ตรวจสอบว่ามีข้อมูลครบหรือไม่
        if (!username || !password) {
            console.log('Missing username or password');
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }

        // ค้นหาผู้ใช้
        const user = await User.findOne({ username });
        console.log('Found user:', user ? 'Yes' : 'No');

        if (!user) {
            console.log('User not found:', username);
            return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        }

        // ตรวจสอบรหัสผ่าน
        console.log('Checking password...');
        if (user.password !== password) {
            console.log('Invalid password for user:', username);
            return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        }

        console.log('Login successful for user:', username);
        res.json({
            message: 'เข้าสู่ระบบสำเร็จ',
            username: user.username
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
    }
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

// เพิ่ม route สำหรับเพิ่มสินค้า
app.post('/products', async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.status(201).json(product);
    } catch (err) {
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

// เริ่ม server
const port = 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
});