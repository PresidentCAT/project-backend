const multer = require('multer')
const path = require('path')
const fs = require('fs')

fs.mkdirSync('uploads', { recursive: true })

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
})

// รับเฉพาะ pdf / png / jpg ขนาดไม่เกิน 5MB
module.exports = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ok = ['application/pdf', 'image/png', 'image/jpeg'].includes(file.mimetype)
        cb(ok ? null : new Error('only pdf, png, jpg allowed'), ok)
    }
})
