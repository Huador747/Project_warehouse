const mongoose = require('mongoose');

// เปลี่ยนชื่อฐานข้อมูลตามที่ต้องการ
mongoose.connect('mongodb://localhost:27017/project_warehouse', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('เชื่อมต่อ MongoDB สำเร็จ');
}).catch((err) => {
  console.error('เชื่อมต่อ MongoDB ไม่สำเร็จ:', err);
});

// ตัวอย่าง Schema
const ProductSchema = new mongoose.Schema({
  name: String,
  price: Number,
  quantity: Number
});

const Product = mongoose.model('Product', ProductSchema);

// ตัวอย่างการเพิ่มข้อมูล
async function addProduct() {
  const product = new Product({ name: 'สินค้าใหม่', price: 100, quantity: 5 });
  await product.save();
  console.log('บันทึกข้อมูลสินค้าแล้ว');
}

addProduct();