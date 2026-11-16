const express = require('express')
const router = express.Router()
const ctrl = require('../controller/authcontroller')
const { verifyToken } = require('../middleware/auth')

router.post('/register', ctrl.register)
router.post('/login', ctrl.login)
router.put('/change-password', verifyToken, ctrl.changePassword)

module.exports = router