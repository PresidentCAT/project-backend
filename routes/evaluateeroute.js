const express = require('express')
const router = express.Router()
const ctrl = require('../controller/evaluateecontroller')
const { verifyToken, allow } = require('../middleware/auth')
const upload = require('../middleware/upload')

router.use(verifyToken, allow('evaluatee'))

router.post('/answers', upload.single('file'), ctrl.saveAnswer)   // อัปโหลดหลักฐาน
router.get('/progress', ctrl.progress)
router.get('/comments', ctrl.comments)
router.post('/submit', ctrl.submit)
router.post('/retry', ctrl.retry)
router.get('/export', ctrl.exportCsv)

module.exports = router
