const evalmodel = require('../model/evalmodel')
const adminmodel = require('../model/adminmodel')
const { scoreOk } = require('../config/helper')

const serverError = (res, error) => {
    console.log(error)
    res.status(500).json({ status: 'error', message: 'something wrong in server' })
}

// POST /api/evaluatee/answers   (multipart/form-data)
// body: indicator_id, self_score, evidence_url (ไม่บังคับ)   file: file (pdf/png/jpg ไม่บังคับ)
exports.saveAnswer = async (req, res) => {
    const { indicator_id, self_score, evidence_url } = req.body
    const evaluatee_id = req.user.id
    try {
        if (!indicator_id || self_score === undefined || self_score === '')
            return res.status(400).json({ status: 'error', message: 'please fill all field' })

        const period = await adminmodel.getCurrentPeriod()
        if (!period) return res.status(403).json({ status: 'error', message: 'evaluation is closed' })

        const status = await evalmodel.getStatus(evaluatee_id)
        if (status === 'submitted')
            return res.status(400).json({ status: 'error', message: 'already submitted, request re-evaluation first' })

        const indicator = await adminmodel.getIndicator(indicator_id)
        if (!indicator) return res.status(404).json({ status: 'error', message: 'indicator not found' })
        if (!scoreOk(indicator.score_type, self_score))
            return res.status(400).json({ status: 'error', message: 'score out of range' })

        const filename = req.file ? req.file.filename : null
        await evalmodel.saveAnswer(evaluatee_id, indicator_id, self_score, evidence_url || null, filename)
        res.status(201).json({ status: 'success', message: 'answer saved', data: { file: filename } })
    } catch (error) { serverError(res, error) }
}

// GET /api/evaluatee/progress   -> status + ความคืบหน้าแยกหัวข้อ
exports.progress = async (req, res) => {
    try {
        const status = await evalmodel.getStatus(req.user.id)
        const topics = await evalmodel.myProgress(req.user.id)
        res.json({ status: 'success', message: 'ok', data: { status, topics } })
    } catch (error) { serverError(res, error) }
}

// GET /api/evaluatee/comments   -> ความเห็นกรรมการ
exports.comments = async (req, res) => {
    try {
        const data = await evalmodel.myComments(req.user.id)
        res.json({ status: 'success', message: 'ok', data })
    } catch (error) { serverError(res, error) }
}

// POST /api/evaluatee/submit   -> ส่งแบบประเมิน
exports.submit = async (req, res) => {
    try {
        const period = await adminmodel.getCurrentPeriod()
        if (!period) return res.status(403).json({ status: 'error', message: 'evaluation is closed' })
        await evalmodel.setStatus(req.user.id, 'submitted')
        res.json({ status: 'success', message: 'submitted', data: null })
    } catch (error) { serverError(res, error) }
}

// POST /api/evaluatee/retry   -> ขอรับการประเมินใหม่ (กลับมาแก้ได้ + ล้างลายเซ็นกรรมการ)
exports.retry = async (req, res) => {
    try {
        const status = await evalmodel.getStatus(req.user.id)
        if (status !== 'submitted')
            return res.status(400).json({ status: 'error', message: 'you have not submitted yet' })
        await evalmodel.setStatus(req.user.id, 'retry')
        await evalmodel.clearSignatures(req.user.id)
        res.json({ status: 'success', message: 'request re-evaluation success', data: null })
    } catch (error) { serverError(res, error) }
}

// GET /api/evaluatee/export   -> ดาวน์โหลดไฟล์ CSV
exports.exportCsv = async (req, res) => {
    try {
        const rows = await evalmodel.report(req.user.id)
        let csv = '\ufeffindicator,weight,self_score,board_avg\n'   // \ufeff = ให้ Excel อ่านภาษาไทยได้
        rows.forEach(r => {
            csv += `"${r.name}",${r.weight},${r.self_score ?? ''},${r.board_avg ?? ''}\n`
        })
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', 'attachment; filename=result.csv')
        res.send(csv)
    } catch (error) { serverError(res, error) }
}
