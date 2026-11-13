const mysql = require('mysql2/promise')
require('dotenv').config()

// pool = กลุ่มการเชื่อมต่อฐานข้อมูล ใช้ซ้ำได้ ไม่ต้องเปิดใหม่ทุกครั้ง
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
})

module.exports = pool
