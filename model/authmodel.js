const pool = require('../config/db')

// หา username ซ้ำ
const checkusername = async (username) => {
    let conn = await pool.getConnection()
    try {
        const [rows] = await conn.query('SELECT id FROM users WHERE username = ?', [username])
        return rows[0]
    } finally {
        conn.release()
    }
}

// สมัคร / เพิ่มผู้ใช้
const register = async (username, password, email, fullname, role) => {
    let conn = await pool.getConnection()
    try {
        const [row] = await conn.query(
            `INSERT INTO users (username, password, email, fullname, role) VALUES (?, ?, ?, ?, ?)`,
            [username, password, email, fullname, role]
        )
        return row
    } finally {
        conn.release()
    }
}

// ดึงผู้ใช้ตาม username (ใช้ตอน login)
const findByUsername = async (username) => {
    let conn = await pool.getConnection()
    try {
        const [rows] = await conn.query('SELECT * FROM users WHERE username = ?', [username])
        return rows[0]
    } finally {
        conn.release()
    }
}

module.exports = { checkusername, register, findByUsername }
