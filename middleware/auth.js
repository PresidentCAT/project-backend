const jwt = require('jsonwebtoken')

// 1) ตรวจ token  (header: Authorization: Bearer <token>)
exports.verifyToken = (req, res, next) => {
    const header = req.headers.authorization
    if (!header) return res.status(401).json({ status: 'error', message: 'no token' })
    try {
        req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET)  // {id, username, role}
        next()
    } catch (error) {
        return res.status(401).json({ status: 'error', message: 'token invalid or expired' })
    }
}

// 2) ตรวจสิทธิ์ตาม role เช่น allow('admin')
exports.allow = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role))
        return res.status(403).json({ status: 'error', message: 'no permission' })
    next()
}
