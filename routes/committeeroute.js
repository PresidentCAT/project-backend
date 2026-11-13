const express = require('express')
const router = express.Router()
const ctrl = require('../controller/committeecontroller')
const { verifyToken, allow } = require('../middleware/auth')
const upload = require('../middleware/upload')

router.use(verifyToken, allow('committee'))

router.get('/evaluatees', ctrl.getEvaluatees)
router.get('/evaluatees/:id', ctrl.getDetail)
router.post('/scores', ctrl.saveScore)
router.get('/result/:id', ctrl.getResult)
router.post('/sign/:id', upload.single('signature'), ctrl.sign)
router.delete('/sign/:id', ctrl.unsign)

module.exports = router
