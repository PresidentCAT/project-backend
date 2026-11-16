const pool = require('../config/db')

// ---------- หัวข้อ ----------
const createTopic = async (name) => {
    const [row] = await pool.query('INSERT INTO topics (name) VALUES (?)', [name])
    return row
}

const getTopics = async () => {
    const [rows] = await pool.query('SELECT * FROM topics')
    return rows
}

// ---------- ตัวชี้วัด ----------
const createIndicator = async (topic_id, name, detail, weight, evidence_note, score_type) => {
    const [row] = await pool.query(
        `INSERT INTO indicators (topic_id, name, detail, weight, evidence_note, score_type)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [topic_id, name, detail, weight, evidence_note, score_type]
    )
    return row
}

// topic_id ไม่ส่งมา = เอาทั้งหมด
const getIndicators = async (topic_id) => {
    const [rows] = topic_id
        ? await pool.query('SELECT * FROM indicators WHERE topic_id = ?', [topic_id])
        : await pool.query('SELECT * FROM indicators')
    return rows
}

const getIndicator = async (id) => {
    const [rows] = await pool.query('SELECT * FROM indicators WHERE id = ?', [id])
    return rows[0]
}

const updateIndicator = async (id, name, detail, weight, evidence_note, score_type) => {
    const [row] = await pool.query(
        `UPDATE indicators SET name = ?, detail = ?, weight = ?, evidence_note = ?, score_type = ? WHERE id = ?`,
        [name, detail, weight, evidence_note, score_type, id]
    )
    return row
}

const deleteIndicator = async (id) => {
    const [row] = await pool.query('DELETE FROM indicators WHERE id = ?', [id])
    return row
}

// ---------- ช่วงเวลาประเมิน ----------
const createPeriod = async (name, start_date, end_date) => {
    const [row] = await pool.query(
        'INSERT INTO periods (name, start_date, end_date) VALUES (?, ?, ?)',
        [name, start_date, end_date]
    )
    return row
}

// ช่วงที่ "วันนี้" อยู่ระหว่างวันเริ่ม-สิ้นสุด = ระบบเปิด / ไม่เจอ = ปิด
const getCurrentPeriod = async () => {
    const [rows] = await pool.query(
        'SELECT * FROM periods WHERE CURDATE() BETWEEN start_date AND end_date LIMIT 1'
    )
    return rows[0]
}

// ---------- ผู้ใช้ / กรรมการ ----------
const getUsers = async (role) => {
    const [rows] = role
        ? await pool.query('SELECT id, username, email, fullname, role FROM users WHERE role = ?', [role])
        : await pool.query('SELECT id, username, email, fullname, role FROM users')
    return rows
}

const getUser = async (id) => {
    const [rows] = await pool.query('SELECT id, role FROM users WHERE id = ?', [id])
    return rows[0]
}

// มอบหมายกรรมการ + บทบาท (ซ้ำ = อัปเดตบทบาท)
const assign = async (evaluatee_id, committee_id, board_role) => {
    const [row] = await pool.query(
        `INSERT INTO assignments (evaluatee_id, committee_id, board_role) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE board_role = VALUES(board_role)`,
        [evaluatee_id, committee_id, board_role]
    )
    return row
}

// ---------- ติดตาม / สถิติ ----------
const progressEvaluatees = async () => {
    const [rows] = await pool.query(
        `SELECT u.id, u.fullname, COALESCE(e.status, 'draft') AS status,
                (SELECT COUNT(*) FROM answers a WHERE a.evaluatee_id = u.id) AS answered,
                (SELECT COUNT(*) FROM indicators) AS total
         FROM users u LEFT JOIN evaluations e ON e.evaluatee_id = u.id
         WHERE u.role = 'evaluatee'`
    )
    return rows
}

const progressCommittees = async () => {
    const [rows] = await pool.query(
        `SELECT c.fullname AS committee, ev.fullname AS evaluatee, a.board_role,
                (a.signature IS NOT NULL) AS signed,
                (SELECT COUNT(*) FROM scores s
                  WHERE s.committee_id = a.committee_id AND s.evaluatee_id = a.evaluatee_id) AS scored
         FROM assignments a
         JOIN users c ON c.id = a.committee_id
         JOIN users ev ON ev.id = a.evaluatee_id`
    )
    return rows
}

const stats = async () => {
    const [rows] = await pool.query(
        `SELECT t.name AS topic, ROUND(AVG(s.score), 2) AS avg_score
         FROM topics t
         JOIN indicators i ON i.topic_id = t.id
         JOIN scores s ON s.indicator_id = i.id
         GROUP BY t.id, t.name`
    )
    const [all] = await pool.query('SELECT ROUND(AVG(score), 2) AS avg_all FROM scores')
    return { by_topic: rows, avg_all: all[0].avg_all }
}

// ---------- แก้ไข / ลบ ----------
const updateTopic = async (id, name) => {
    const [row] = await pool.query('UPDATE topics SET name = ? WHERE id = ?', [name, id])
    return row
}

const deleteTopic = async (id) => {
    const [row] = await pool.query('DELETE FROM topics WHERE id = ?', [id])   // ตัวชี้วัดในหัวข้อถูกลบตาม (CASCADE)
    return row
}

const updateUser = async (id, fullname, email) => {
    const [row] = await pool.query('UPDATE users SET fullname = ?, email = ? WHERE id = ?', [fullname, email, id])
    return row
}

const deleteUser = async (id) => {
    const [row] = await pool.query('DELETE FROM users WHERE id = ?', [id])
    return row
}

const getPeriods = async () => {
    const [rows] = await pool.query('SELECT * FROM periods ORDER BY start_date DESC')
    return rows
}

// ---------- Backup / Restore ----------
// เรียงตามลำดับที่ foreign key อนุญาต (แม่ก่อนลูก)
const TABLES = ['users', 'periods', 'topics', 'indicators', 'assignments', 'evaluations', 'answers', 'scores']

// backup = อ่านทุกตารางออกมาเป็น object เดียว
const backupAll = async () => {
    const data = {}
    for (const t of TABLES) {
        const [rows] = await pool.query('SELECT * FROM ??', [t])
        data[t] = rows
    }
    return data
}

// restore = ลบของเดิมทั้งหมดแล้วใส่ข้อมูลจาก backup (ทำใน transaction: พังกลางทางจะย้อนกลับ)
const restoreAll = async (data) => {
    let conn = await pool.getConnection()
    try {
        await conn.beginTransaction()
        await conn.query('SET FOREIGN_KEY_CHECKS = 0')
        for (const t of [...TABLES].reverse()) await conn.query('DELETE FROM ??', [t])
        for (const t of TABLES) {
            for (const row of data[t]) await conn.query('INSERT INTO ?? SET ?', [t, row])
        }
        await conn.query('SET FOREIGN_KEY_CHECKS = 1')
        await conn.commit()
    } catch (error) {
        await conn.rollback()
        throw error
    } finally {
        conn.release()
    }
}

module.exports = {
    createTopic, getTopics, createIndicator, getIndicators, getIndicator, updateIndicator, deleteIndicator,
    createPeriod, getCurrentPeriod, getUsers, getUser, assign, progressEvaluatees, progressCommittees, stats,
    updateTopic, deleteTopic, updateUser, deleteUser, getPeriods, backupAll, restoreAll
}
