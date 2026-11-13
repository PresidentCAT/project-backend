const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const model = require('../model/authmodel')
const { emailOk } = require('../config/helper')

// POST /api/auth/register   body: username, password, fullname, email
// ผู้รับการประเมินสมัครเองได้ (role = evaluatee เสมอ)
exports.register = async (req, res) => {
    const { username, password, fullname, email } = req.body
    try {
        if (!username || !password || !fullname || !email)
            return res.status(400).json({ status: 'error', message: 'please fill all field' })
        if (!emailOk(email))
            return res.status(400).json({ status: 'error', message: 'email format is wrong' })
        if (password.length < 6)
            return res.status(400).json({ status: 'error', message: 'password must be at least 6 characters' })

        const check = await model.checkusername(username)
        if (check) return res.status(400).json({ status: 'error', message: 'this username already use' })

        const hash = await bcrypt.hash(password, 10)
        const result = await model.register(username, hash, email, fullname, 'evaluatee')
        return res.status(201).json({ status: 'success', message: 'register success', data: { id: result.insertId } })
    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 'error', message: 'something wrong in server' })
    }
}

// POST /api/auth/login   body: username, password   -> token
exports.login = async (req, res) => {
    const { username, password } = req.body
    try {
        if (!username || !password)
            return res.status(400).json({ status: 'error', message: 'please fill all field' })

        const user = await model.findByUsername(username)
        if (!user) return res.status(401).json({ status: 'error', message: 'username or password is wrong' })

        const match = await bcrypt.compare(password, user.password)
        if (!match) return res.status(401).json({ status: 'error', message: 'username or password is wrong' })

        // ลงนาม (sign) token ด้วย JWT_SECRET
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        )
        return res.json({
            status: 'success', message: 'login success',
            data: { token, user: { id: user.id, fullname: user.fullname, role: user.role } }
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 'error', message: 'something wrong in server' })
    }
}
