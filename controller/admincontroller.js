const bcrypt = require('bcrypt')
const authmodel = require('../model/authmodel')
const model = require('../model/adminmodel')
const evalmodel = require('../model/evalmodel')
const { emailOk } = require('../config/helper')

const serverError = (res, error) => {
    console.log(error)
    res.status(500).json({ status: 'error', message: 'something wrong in server' })
}

// POST /api/admin/users   body: username, password, fullname, email, role(evaluatee|committee|admin)
exports.createUser = async (req, res) => {
    const { username, password, fullname, email, role } = req.body
    try {
        if (!username || !password || !fullname || !email || !role)
            return res.status(400).json({ status: 'error', message: 'please fill all field' })
        if (!['evaluatee', 'committee', 'admin'].includes(role))
            return res.status(400).json({ status: 'error', message: 'role must be evaluatee, committee or admin' })
        if (!emailOk(email))
            return res.status(400).json({ status: 'error', message: 'email format is wrong' })
        if (await authmodel.checkusername(username))
            return res.status(400).json({ status: 'error', message: 'this username already use' })

        const hash = await bcrypt.hash(password, 10)
        const result = await authmodel.register(username, hash, email, fullname, role)
        res.status(201).json({ status: 'success', message: 'user created', data: { id: result.insertId } })
    } catch (error) { serverError(res, error) }
}

// GET /api/admin/users?role=committee   (query param)
exports.getUsers = async (req, res) => {
    try {
        const data = await model.getUsers(req.query.role)
        res.json({ status: 'success', message: 'ok', data })
    } catch (error) { serverError(res, error) }
}

// ---------- หัวข้อ ----------
// POST /api/admin/topics   body: name
exports.createTopic = async (req, res) => {
    const { name } = req.body
    try {
        if (!name) return res.status(400).json({ status: 'error', message: 'please fill all field' })
        const result = await model.createTopic(name)
        res.status(201).json({ status: 'success', message: 'topic created', data: { id: result.insertId } })
    } catch (error) { serverError(res, error) }
}

// GET /api/topics   (ทุก role ดูได้)
exports.getTopics = async (req, res) => {
    try {
        const data = await model.getTopics()
        res.json({ status: 'success', message: 'ok', data })
    } catch (error) { serverError(res, error) }
}

// ---------- ตัวชี้วัด ----------
// POST /api/admin/indicators   body: topic_id, name, detail, weight, evidence_note, score_type(scale|yesno)
exports.createIndicator = async (req, res) => {
    const { topic_id, name, detail, weight, evidence_note, score_type } = req.body
    try {
        if (!topic_id || !name || !weight)
            return res.status(400).json({ status: 'error', message: 'please fill all field' })
        if (score_type && !['scale', 'yesno'].includes(score_type))
            return res.status(400).json({ status: 'error', message: 'score_type must be scale or yesno' })

        const result = await model.createIndicator(topic_id, name, detail || null, weight, evidence_note || null, score_type || 'scale')
        res.status(201).json({ status: 'success', message: 'indicator created', data: { id: result.insertId } })
    } catch (error) { serverError(res, error) }
}

// GET /api/indicators?topic_id=1   (ทุก role ดูได้)
exports.getIndicators = async (req, res) => {
    try {
        const data = await model.getIndicators(req.query.topic_id)
        res.json({ status: 'success', message: 'ok', data })
    } catch (error) { serverError(res, error) }
}

// PUT /api/admin/indicators/:id   body: name, detail, weight, evidence_note, score_type
exports.updateIndicator = async (req, res) => {
    const { name, detail, weight, evidence_note, score_type } = req.body
    try {
        if (!name || !weight || !score_type)
            return res.status(400).json({ status: 'error', message: 'please fill all field' })
        const result = await model.updateIndicator(req.params.id, name, detail || null, weight, evidence_note || null, score_type)
        if (result.affectedRows === 0)
            return res.status(404).json({ status: 'error', message: 'indicator not found' })
        res.json({ status: 'success', message: 'indicator updated', data: null })
    } catch (error) { serverError(res, error) }
}

// DELETE /api/admin/indicators/:id
exports.deleteIndicator = async (req, res) => {
    try {
        const result = await model.deleteIndicator(req.params.id)
        if (result.affectedRows === 0)
            return res.status(404).json({ status: 'error', message: 'indicator not found' })
        res.json({ status: 'success', message: 'indicator deleted', data: null })
    } catch (error) { serverError(res, error) }
}

// ---------- ช่วงเวลา ----------
// POST /api/admin/periods   body: name, start_date, end_date (YYYY-MM-DD)
exports.createPeriod = async (req, res) => {
    const { name, start_date, end_date } = req.body
    try {
        if (!name || !start_date || !end_date)
            return res.status(400).json({ status: 'error', message: 'please fill all field' })
        if (start_date > end_date)
            return res.status(400).json({ status: 'error', message: 'start_date must be before end_date' })
        const result = await model.createPeriod(name, start_date, end_date)
        res.status(201).json({ status: 'success', message: 'period created', data: { id: result.insertId } })
    } catch (error) { serverError(res, error) }
}

// GET /api/period   (ทุก role) -> open = true/false
exports.getPeriod = async (req, res) => {
    try {
        const period = await model.getCurrentPeriod()
        res.json({ status: 'success', message: period ? 'evaluation is open' : 'evaluation is closed', data: { open: !!period, period: period || null } })
    } catch (error) { serverError(res, error) }
}

// ---------- มอบหมายกรรมการ ----------
// POST /api/admin/assignments   body: evaluatee_id, committee_id, board_role(chair|member)
exports.assign = async (req, res) => {
    const { evaluatee_id, committee_id, board_role } = req.body
    try {
        if (!evaluatee_id || !committee_id)
            return res.status(400).json({ status: 'error', message: 'please fill all field' })
        const role = board_role || 'member'
        if (!['chair', 'member'].includes(role))
            return res.status(400).json({ status: 'error', message: 'board_role must be chair or member' })

        const ev = await model.getUser(evaluatee_id)
        const cm = await model.getUser(committee_id)
        if (!ev || ev.role !== 'evaluatee' || !cm || cm.role !== 'committee')
            return res.status(404).json({ status: 'error', message: 'evaluatee or committee not found' })

        await model.assign(evaluatee_id, committee_id, role)
        res.status(201).json({ status: 'success', message: 'assigned', data: null })
    } catch (error) { serverError(res, error) }
}

// ---------- ติดตาม / รายงาน / สถิติ ----------
// GET /api/admin/progress
exports.progress = async (req, res) => {
    try {
        const evaluatees = await model.progressEvaluatees()
        const committees = await model.progressCommittees()
        res.json({ status: 'success', message: 'ok', data: { evaluatees, committees } })
    } catch (error) { serverError(res, error) }
}

// GET /api/admin/report/:id   (path param = id ผู้รับการประเมิน)
exports.report = async (req, res) => {
    try {
        const user = await model.getUser(req.params.id)
        if (!user || user.role !== 'evaluatee')
            return res.status(404).json({ status: 'error', message: 'evaluatee not found' })

        const rows = await evalmodel.report(req.params.id)
        // คะแนนรวม = ผลรวม (คะแนนเฉลี่ยกรรมการ x น้ำหนัก)
        const total = rows.reduce((sum, r) => sum + Number(r.board_avg || 0) * Number(r.weight), 0)
        res.json({ status: 'success', message: 'ok', data: { indicators: rows, total_score: Number(total.toFixed(2)) } })
    } catch (error) { serverError(res, error) }
}

// GET /api/admin/stats
exports.stats = async (req, res) => {
    try {
        const data = await model.stats()
        res.json({ status: 'success', message: 'ok', data })
    } catch (error) { serverError(res, error) }
}

// PUT /api/admin/users/:id   body: fullname, email
exports.updateUser = async (req, res) => {
    const { fullname, email } = req.body
    try {
        if (!fullname || !email) return res.status(400).json({ status: 'error', message: 'please fill all field' })
        if (!emailOk(email)) return res.status(400).json({ status: 'error', message: 'email format is wrong' })
        const result = await model.updateUser(req.params.id, fullname, email)
        if (result.affectedRows === 0) return res.status(404).json({ status: 'error', message: 'user not found' })
        res.json({ status: 'success', message: 'user updated', data: null })
    } catch (error) { serverError(res, error) }
}

// DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
    try {
        if (Number(req.params.id) === req.user.id)
            return res.status(400).json({ status: 'error', message: 'cannot delete yourself' })
        const result = await model.deleteUser(req.params.id)
        if (result.affectedRows === 0) return res.status(404).json({ status: 'error', message: 'user not found' })
        res.json({ status: 'success', message: 'user deleted', data: null })
    } catch (error) { serverError(res, error) }
}

// PUT /api/admin/topics/:id   body: name
exports.updateTopic = async (req, res) => {
    const { name } = req.body
    try {
        if (!name) return res.status(400).json({ status: 'error', message: 'please fill all field' })
        const result = await model.updateTopic(req.params.id, name)
        if (result.affectedRows === 0) return res.status(404).json({ status: 'error', message: 'topic not found' })
        res.json({ status: 'success', message: 'topic updated', data: null })
    } catch (error) { serverError(res, error) }
}

// DELETE /api/admin/topics/:id
exports.deleteTopic = async (req, res) => {
    try {
        const result = await model.deleteTopic(req.params.id)
        if (result.affectedRows === 0) return res.status(404).json({ status: 'error', message: 'topic not found' })
        res.json({ status: 'success', message: 'topic deleted', data: null })
    } catch (error) { serverError(res, error) }
}

// GET /api/admin/periods   -> ช่วงเวลาทั้งหมด
exports.getPeriods = async (req, res) => {
    try {
        const data = await model.getPeriods()
        res.json({ status: 'success', message: 'ok', data })
    } catch (error) { serverError(res, error) }
}

// GET /api/admin/backup   -> ดาวน์โหลดข้อมูลทั้งระบบเป็นไฟล์ JSON
exports.backup = async (req, res) => {
    try {
        const data = await model.backupAll()
        res.setHeader('Content-Disposition', 'attachment; filename=backup.json')
        res.json({ status: 'success', message: 'backup success', data })
    } catch (error) { serverError(res, error) }
}

// POST /api/admin/restore   body: ข้อมูลจากไฟล์ backup (ส่วน data) -> ลบของเดิมแล้วใส่ตาม backup
exports.restore = async (req, res) => {
    try {
        const body = req.body.data || req.body          // รับทั้งไฟล์ backup ทั้งก้อน หรือเฉพาะส่วน data
        const ok = model.TABLES.every(t => Array.isArray(body[t]))
        if (!ok) return res.status(400).json({ status: 'error', message: 'backup data is invalid' })
        await model.restoreAll(body)
        res.json({ status: 'success', message: 'restore success', data: null })
    } catch (error) { serverError(res, error) }
}
