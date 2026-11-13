const evalmodel = require('../model/evalmodel')
const adminmodel = require('../model/adminmodel')
const { scoreOk } = require('../config/helper')

const serverError = (res, error) => {
    console.log(error)
    res.status(500).json({ status: 'error', message: 'something wrong in server' })
}

// GET /api/committee/evaluatees   -> คนที่ต้องประเมิน
exports.getEvaluatees = async (req, res) => {
    try {
        const data = await evalmodel.assignedEvaluatees(req.user.id)
        res.json({ status: 'success', message: 'ok', data })
    } catch (error) { serverError(res, error) }
}

// GET /api/committee/evaluatees/:id   -> รายละเอียด + คะแนนตัวเอง + หลักฐาน + คะแนนที่กรรมการให้
exports.getDetail = async (req, res) => {
    try {
        const assignment = await evalmodel.getAssignment(req.user.id, req.params.id)
        if (!assignment) return res.status(403).json({ status: 'error', message: 'you are not assigned to this evaluatee' })
        const data = await evalmodel.detailForCommittee(req.user.id, req.params.id)
        res.json({ status: 'success', message: 'ok', data })
    } catch (error) { serverError(res, error) }
}

// POST /api/committee/scores   body: evaluatee_id, indicator_id, score, comment
exports.saveScore = async (req, res) => {
    const { evaluatee_id, indicator_id, score, comment } = req.body
    try {
        if (!evaluatee_id || !indicator_id || score === undefined || score === '')
            return res.status(400).json({ status: 'error', message: 'please fill all field' })

        const assignment = await evalmodel.getAssignment(req.user.id, evaluatee_id)
        if (!assignment) return res.status(403).json({ status: 'error', message: 'you are not assigned to this evaluatee' })
        if (assignment.signature)
            return res.status(400).json({ status: 'error', message: 'already signed, cancel signature first' })

        const indicator = await adminmodel.getIndicator(indicator_id)
        if (!indicator) return res.status(404).json({ status: 'error', message: 'indicator not found' })
        if (!scoreOk(indicator.score_type, score))
            return res.status(400).json({ status: 'error', message: 'score out of range' })

        await evalmodel.saveScore(req.user.id, evaluatee_id, indicator_id, score, comment || null)
        res.status(201).json({ status: 'success', message: 'score saved', data: null })
    } catch (error) { serverError(res, error) }
}

// GET /api/committee/result/:id   -> ผลการประเมินของผู้รับการประเมิน
exports.getResult = async (req, res) => {
    try {
        const assignment = await evalmodel.getAssignment(req.user.id, req.params.id)
        if (!assignment) return res.status(403).json({ status: 'error', message: 'you are not assigned to this evaluatee' })
        const rows = await evalmodel.report(req.params.id)
        const total = rows.reduce((sum, r) => sum + Number(r.board_avg || 0) * Number(r.weight), 0)
        res.json({ status: 'success', message: 'ok', data: { indicators: rows, total_score: Number(total.toFixed(2)) } })
    } catch (error) { serverError(res, error) }
}

// POST /api/committee/sign/:id   (multipart/form-data)  file: signature (รูปลายเซ็น)
exports.sign = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ status: 'error', message: 'please attach signature image' })
        const assignment = await evalmodel.getAssignment(req.user.id, req.params.id)
        if (!assignment) return res.status(403).json({ status: 'error', message: 'you are not assigned to this evaluatee' })
        await evalmodel.setSignature(req.user.id, req.params.id, req.file.filename)
        res.json({ status: 'success', message: 'signed', data: { signature: req.file.filename } })
    } catch (error) { serverError(res, error) }
}

// DELETE /api/committee/sign/:id   -> ยกเลิกการลงนาม
exports.unsign = async (req, res) => {
    try {
        const assignment = await evalmodel.getAssignment(req.user.id, req.params.id)
        if (!assignment) return res.status(403).json({ status: 'error', message: 'you are not assigned to this evaluatee' })
        if (!assignment.signature) return res.status(400).json({ status: 'error', message: 'not signed yet' })
        await evalmodel.setSignature(req.user.id, req.params.id, null)
        res.json({ status: 'success', message: 'signature cancelled', data: null })
    } catch (error) { serverError(res, error) }
}
