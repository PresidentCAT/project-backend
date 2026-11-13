const pool = require('../config/db')

// ---------- หัวข้อ ----------
const createTopic = async (name) => {
    let conn = await pool.getConnection()
    try {
        const [row] = await conn.query('INSERT INTO topics (name) VALUES (?)', [name])
        return row
    } finally {
        conn.release()
    }
}

const getTopics = async () => {
    let conn = await pool.getConnection()
    try {
        const [rows] = await conn.query('SELECT * FROM topics')
        return rows
    } finally {
        conn.release()
    }
}

// ---------- ตัวชี้วัด ----------
const createIndicator = async (topic_id, name, detail, weight, evidence_note, score_type) => {
    let conn = await pool.getConnection()
    try {
        const [row] = await conn.query(
            `INSERT INTO indicators (topic_id, name, detail, weight, evidence_note, score_type)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [topic_id, name, detail, weight, evidence_note, score_type]
        )
        return row
    } finally {
        conn.release()
    }
}

// topic_id ไม่ส่งมา = เอาทั้งหมด
const getIndicators = async (topic_id) => {
    let conn = await pool.getConnection()
    try {
        const [rows] = topic_id
            ? await conn.query('SELECT * FROM indicators WHERE topic_id = ?', [topic_id])
            : await conn.query('SELECT * FROM indicators')
        return rows
    } finally {
        conn.release()
    }
}

const getIndicator = async (id) => {
    let conn = await pool.getConnection()
    try {
        const [rows] = await conn.query('SELECT * FROM indicators WHERE id = ?', [id])
        return rows[0]
    } finally {
        conn.release()
    }
}

const updateIndicator = async (id, name, detail, weight, evidence_note, score_type) => {
    let conn = await pool.getConnection()
    try {
        const [row] = await conn.query(
            `UPDATE indicators SET name = ?, detail = ?, weight = ?, evidence_note = ?, score_type = ? WHERE id = ?`,
            [name, detail, weight, evidence_note, score_type, id]
        )
        return row
    } finally {
        conn.release()
    }
}

const deleteIndicator = async (id) => {
    let conn = await pool.getConnection()
    try {
        const [row] = await conn.query('DELETE FROM indicators WHERE id = ?', [id])
        return row
    } finally {
        conn.release()
    }
}

// ---------- ช่วงเวลาประเมิน ----------
const createPeriod = async (name, start_date, end_date) => {
    let conn = await pool.getConnection()
    try {
        const [row] = await conn.query(
            'INSERT INTO periods (name, start_date, end_date) VALUES (?, ?, ?)',
            [name, start_date, end_date]
        )
        return row
    } finally {
        conn.release()
    }
}

// ช่วงที่ "วันนี้" อยู่ระหว่างวันเริ่ม-สิ้นสุด = ระบบเปิด / ไม่เจอ = ปิด
const getCurrentPeriod = async () => {
    let conn = await pool.getConnection()
    try {
        const [rows] = await conn.query(
            'SELECT * FROM periods WHERE CURDATE() BETWEEN start_date AND end_date LIMIT 1'
        )
        return rows[0]
    } finally {
        conn.release()
    }
}

// ---------- ผู้ใช้ / กรรมการ ----------
const getUsers = async (role) => {
    let conn = await pool.getConnection()
    try {
        const [rows] = role
            ? await conn.query('SELECT id, username, email, fullname, role FROM users WHERE role = ?', [role])
            : await conn.query('SELECT id, username, email, fullname, role FROM users')
        return rows
    } finally {
        conn.release()
    }
}

const getUser = async (id) => {
    let conn = await pool.getConnection()
    try {
        const [rows] = await conn.query('SELECT id, role FROM users WHERE id = ?', [id])
        return rows[0]
    } finally {
        conn.release()
    }
}

// มอบหมายกรรมการ + บทบาท (ซ้ำ = อัปเดตบทบาท)
const assign = async (evaluatee_id, committee_id, board_role) => {
    let conn = await pool.getConnection()
    try {
        const [row] = await conn.query(
            `INSERT INTO assignments (evaluatee_id, committee_id, board_role) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE board_role = VALUES(board_role)`,
            [evaluatee_id, committee_id, board_role]
        )
        return row
    } finally {
        conn.release()
    }
}

// ---------- ติดตาม / สถิติ ----------
const progressEvaluatees = async () => {
    let conn = await pool.getConnection()
    try {
        const [rows] = await conn.query(
            `SELECT u.id, u.fullname, COALESCE(e.status, 'draft') AS status,
                    (SELECT COUNT(*) FROM answers a WHERE a.evaluatee_id = u.id) AS answered,
                    (SELECT COUNT(*) FROM indicators) AS total
             FROM users u LEFT JOIN evaluations e ON e.evaluatee_id = u.id
             WHERE u.role = 'evaluatee'`
        )
        return rows
    } finally {
        conn.release()
    }
}

const progressCommittees = async () => {
    let conn = await pool.getConnection()
    try {
        const [rows] = await conn.query(
            `SELECT c.fullname AS committee, ev.fullname AS evaluatee, a.board_role,
                    (a.signature IS NOT NULL) AS signed,
                    (SELECT COUNT(*) FROM scores s
                      WHERE s.committee_id = a.committee_id AND s.evaluatee_id = a.evaluatee_id) AS scored
             FROM assignments a
             JOIN users c ON c.id = a.committee_id
             JOIN users ev ON ev.id = a.evaluatee_id`
        )
        return rows
    } finally {
        conn.release()
    }
}

const stats = async () => {
    let conn = await pool.getConnection()
    try {
        const [rows] = await conn.query(
            `SELECT t.name AS topic, ROUND(AVG(s.score), 2) AS avg_score
             FROM topics t
             JOIN indicators i ON i.topic_id = t.id
             JOIN scores s ON s.indicator_id = i.id
             GROUP BY t.id, t.name`
        )
        const [all] = await conn.query('SELECT ROUND(AVG(score), 2) AS avg_all FROM scores')
        return { by_topic: rows, avg_all: all[0].avg_all }
    } finally {
        conn.release()
    }
}

module.exports = {
    createTopic, getTopics, createIndicator, getIndicators, getIndicator, updateIndicator, deleteIndicator,
    createPeriod, getCurrentPeriod, getUsers, getUser, assign, progressEvaluatees, progressCommittees, stats
}
