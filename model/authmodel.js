const pool = require('../config/db')

// หา username ซ้ำ
const checkusername = async (username) => {
    const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [username])
    return rows[0]
}

// สมัคร / เพิ่มผู้ใช้
const register = async (username, password, email, fullname, role, status = 0) => {
    const [row] = await pool.query(
        `INSERT INTO users (username, password, email, fullname, role, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [username, password, email, fullname, role, status]
    )
    return row
}

const findById = async (id) => {
    const [rows] = await pool.query(`SELECT * FROM users WHERE id = ?`, [id])
    return rows[0]
}

// ดึงผู้ใช้ตาม username (ใช้ตอน login)
const findByUsername = async (username) => {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username])
    return rows[0]
}

const changePassword = async (id, hash) => {
    await pool.query(`UPDATE users SET password = ?, status = 1 WHERE id = ?`,[hash, id])
}

module.exports = { checkusername, register, findByUsername, changePassword, findById }
