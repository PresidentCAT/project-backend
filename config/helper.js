// ฟังก์ชันช่วยตรวจข้อมูล ใช้ร่วมกันหลาย controller

// รูปแบบอีเมล เช่น abc@mail.com
exports.emailOk = (email) => /^\S+@\S+\.\S+$/.test(email)

// scale ต้อง 1-4 / yesno ต้อง 0 หรือ 1
exports.scoreOk = (type, score) => {
    const n = Number(score)
    if (!Number.isInteger(n)) return false
    return type === 'yesno' ? (n === 0 || n === 1) : (n >= 1 && n <= 4)
}
