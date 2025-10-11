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

// ใช้งาน static file
app.use(express.static(path.join(__dirname, 'src')));
app.use('/styles', express.static(path.join(__dirname, 'styles')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));

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

// เริ่ม server
const port = 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
});