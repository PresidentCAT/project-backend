const pool = require('../config/db')

// ================= ผู้รับการประเมิน =================

// สถานะ (ไม่มีแถว = draft)
const getStatus = async (evaluatee_id) => {
    const [rows] = await pool.query('SELECT status FROM evaluations WHERE evaluatee_id = ?', [evaluatee_id])
    return rows[0] ? rows[0].status : 'draft'
}

const setStatus = async (evaluatee_id, status) => {
    await pool.query(
        `INSERT INTO evaluations (evaluatee_id, status) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status)`,
        [evaluatee_id, status]
    )
}

// บันทึกคำตอบ: ยังไม่มี = INSERT / มีแล้ว = UPDATE  (ไม่แนบไฟล์ใหม่ = ใช้ไฟล์เดิม)
const saveAnswer = async (evaluatee_id, indicator_id, self_score, evidence_url, evidence_file) => {
    await pool.query(
        `INSERT INTO answers (evaluatee_id, indicator_id, self_score, evidence_url, evidence_file)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE self_score = VALUES(self_score), evidence_url = VALUES(evidence_url),
                                 evidence_file = COALESCE(VALUES(evidence_file), evidence_file)`,
        [evaluatee_id, indicator_id, self_score, evidence_url, evidence_file]
    )
}

// ความคืบหน้าแยกตามหัวข้อ
const myProgress = async (evaluatee_id) => {
    const [rows] = await pool.query(
        `SELECT t.name AS topic, COUNT(i.id) AS total, COUNT(a.id) AS answered
         FROM topics t
         JOIN indicators i ON i.topic_id = t.id
         LEFT JOIN answers a ON a.indicator_id = i.id AND a.evaluatee_id = ?
         GROUP BY t.id, t.name`,
        [evaluatee_id]
    )
    return rows
}

// ความเห็นของกรรมการ
const myComments = async (evaluatee_id) => {
    const [rows] = await pool.query(
        `SELECT i.name AS indicator, u.fullname AS committee, s.score, s.comment
         FROM scores s
         JOIN indicators i ON i.id = s.indicator_id
         JOIN users u ON u.id = s.committee_id
         WHERE s.evaluatee_id = ?`,
        [evaluatee_id]
    )
    return rows
}

// ขอประเมินใหม่: ล้างลายเซ็นทุกคนของคนนี้
const clearSignatures = async (evaluatee_id) => {
    await pool.query('UPDATE assignments SET signature = NULL WHERE evaluatee_id = ?', [evaluatee_id])
}

// ================= รายงานผล (ใช้ร่วม: ฝ่ายบุคลากร / กรรมการ / export) =================
const report = async (evaluatee_id) => {
    const [rows] = await pool.query(
        `SELECT i.id, i.name, i.weight, a.self_score, a.evidence_url, a.evidence_file,
                ROUND(AVG(s.score), 2) AS board_avg
         FROM indicators i
         LEFT JOIN answers a ON a.indicator_id = i.id AND a.evaluatee_id = ?
         LEFT JOIN scores s ON s.indicator_id = i.id AND s.evaluatee_id = ?
         GROUP BY i.id, i.name, i.weight, a.self_score, a.evidence_url, a.evidence_file`,
        [evaluatee_id, evaluatee_id]
    )
    return rows
}

// ================= กรรมการ =================

// รายชื่อคนที่กรรมการต้องประเมิน
const assignedEvaluatees = async (committee_id) => {
    const [rows] = await pool.query(
        `SELECT u.id, u.fullname, a.board_role, (a.signature IS NOT NULL) AS signed,
                COALESCE(e.status, 'draft') AS status
         FROM assignments a
         JOIN users u ON u.id = a.evaluatee_id
         LEFT JOIN evaluations e ON e.evaluatee_id = u.id
         WHERE a.committee_id = ?`,
        [committee_id]
    )
    return rows
}

// กรรมการคนนี้ได้รับมอบหมายให้ประเมินคนนี้ไหม (ไม่ใช่ = undefined)
const getAssignment = async (committee_id, evaluatee_id) => {
    const [rows] = await pool.query(
        'SELECT * FROM assignments WHERE committee_id = ? AND evaluatee_id = ?',
        [committee_id, evaluatee_id]
    )
    return rows[0]
}

// รายละเอียดที่กรรมการต้องเห็น: ตัวชี้วัด + คะแนนที่เจ้าตัวให้ + หลักฐาน + คะแนนที่กรรมการให้ไว้
const detailForCommittee = async (committee_id, evaluatee_id) => {
    const [rows] = await pool.query(
        `SELECT i.id, i.name, i.detail, i.weight, i.score_type,
                a.self_score, a.evidence_url, a.evidence_file, s.score, s.comment
         FROM indicators i
         LEFT JOIN answers a ON a.indicator_id = i.id AND a.evaluatee_id = ?
         LEFT JOIN scores s ON s.indicator_id = i.id AND s.evaluatee_id = ? AND s.committee_id = ?`,
        [evaluatee_id, evaluatee_id, committee_id]
    )
    return rows
}

const saveScore = async (committee_id, evaluatee_id, indicator_id, score, comment) => {
    await pool.query(
        `INSERT INTO scores (committee_id, evaluatee_id, indicator_id, score, comment)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE score = VALUES(score), comment = VALUES(comment)`,
        [committee_id, evaluatee_id, indicator_id, score, comment]
    )
}

// ลงนาม = เก็บชื่อไฟล์ลายเซ็น / ยกเลิก = ใส่ NULL
const setSignature = async (committee_id, evaluatee_id, filename) => {
    await pool.query(
        'UPDATE assignments SET signature = ? WHERE committee_id = ? AND evaluatee_id = ?',
        [filename, committee_id, evaluatee_id]
    )
}

module.exports = {
    getStatus, setStatus, saveAnswer, myProgress, myComments, clearSignatures, report,
    assignedEvaluatees, getAssignment, detailForCommittee, saveScore, setSignature
}
