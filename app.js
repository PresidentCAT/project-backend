require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { verifyToken } = require('./middleware/auth')
const common = require('./controller/admincontroller')

const app = express()

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static('uploads'))      // เปิดให้ดูไฟล์ที่อัปโหลด

// เส้นทางที่ทุก role ที่ login แล้วดูได้
app.get('/api/topics', verifyToken, common.getTopics)
app.get('/api/indicators', verifyToken, common.getIndicators)
app.get('/api/period', verifyToken, common.getPeriod)

app.use('/api/auth', require('./routes/authroute'))
app.use('/api/admin', require('./routes/adminroute'))
app.use('/api/evaluatee', require('./routes/evaluateeroute'))
app.use('/api/committee', require('./routes/committeeroute'))

// ไม่พบ endpoint -> 404
app.use((req, res) => res.status(404).json({ status: 'error', message: 'not found' }))

// error จาก multer (ไฟล์ผิดชนิด / ใหญ่เกิน) -> 400
app.use((err, req, res, next) => {
    res.status(400).json({ status: 'error', message: err.message })
})

app.listen(process.env.PORT, () => console.log('server running on port ' + process.env.PORT))
