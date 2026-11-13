const express = require('express')
const router = express.Router()
const ctrl = require('../controller/admincontroller')
const { verifyToken, allow } = require('../middleware/auth')

// ทุกเส้นทางในไฟล์นี้: ต้อง login และเป็น admin (ฝ่ายบุคลากร) เท่านั้น
router.use(verifyToken, allow('admin'))

router.post('/users', ctrl.createUser)
router.get('/users', ctrl.getUsers)

router.post('/topics', ctrl.createTopic)

router.post('/indicators', ctrl.createIndicator)
router.put('/indicators/:id', ctrl.updateIndicator)
router.delete('/indicators/:id', ctrl.deleteIndicator)

router.post('/periods', ctrl.createPeriod)
router.post('/assignments', ctrl.assign)

router.get('/progress', ctrl.progress)
router.get('/report/:id', ctrl.report)
router.get('/stats', ctrl.stats)

module.exports = router
