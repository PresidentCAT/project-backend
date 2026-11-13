-- สร้างฐานข้อมูล pntc  (utf8mb4 เพื่อรองรับภาษาไทย)
CREATE DATABASE IF NOT EXISTS pntc2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pntc2;

-- 1) ผู้ใช้ทุกบทบาท: admin = ฝ่ายบุคลากร, evaluatee = ผู้รับการประเมิน, committee = กรรมการ
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL,
    fullname VARCHAR(100) NOT NULL,
    role ENUM('admin','evaluatee','committee') NOT NULL DEFAULT 'evaluatee'
);

-- 2) ช่วงเวลาประเมิน (เปิด-ปิดระบบ ดูจากวันที่)
CREATE TABLE periods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL
);

-- 3) หัวข้อการประเมิน
CREATE TABLE topics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL
);

-- 4) ตัวชี้วัดในแต่ละหัวข้อ (ชื่อ, รายละเอียด, น้ำหนักคะแนน, หลักฐาน, รูปแบบการให้คะแนน)
CREATE TABLE indicators (
    id INT AUTO_INCREMENT PRIMARY KEY,
    topic_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    detail TEXT,
    weight DECIMAL(5,2) NOT NULL DEFAULT 1,
    evidence_note VARCHAR(255),
    score_type ENUM('scale','yesno') NOT NULL DEFAULT 'scale',  -- scale = 1-4, yesno = 0/1 (ไม่มี/มี)
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

-- 5) กรรมการ 1 คน ประเมินผู้รับการประเมิน 1 คน (+ บทบาท + ลายเซ็น)
CREATE TABLE assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evaluatee_id INT NOT NULL,
    committee_id INT NOT NULL,
    board_role ENUM('chair','member') NOT NULL DEFAULT 'member',
    signature VARCHAR(255) NULL,          -- NULL = ยังไม่ลงนาม
    UNIQUE (evaluatee_id, committee_id),
    FOREIGN KEY (evaluatee_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (committee_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6) สถานะของผู้รับการประเมิน: draft / submitted / retry (ขอประเมินใหม่)
CREATE TABLE evaluations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evaluatee_id INT NOT NULL UNIQUE,
    status ENUM('draft','submitted','retry') NOT NULL DEFAULT 'draft',
    FOREIGN KEY (evaluatee_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7) คำตอบของผู้รับการประเมิน (คะแนนตัวเอง + หลักฐาน url/ไฟล์)
CREATE TABLE answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evaluatee_id INT NOT NULL,
    indicator_id INT NOT NULL,
    self_score INT NOT NULL,
    evidence_url VARCHAR(255) NULL,
    evidence_file VARCHAR(255) NULL,
    UNIQUE (evaluatee_id, indicator_id),
    FOREIGN KEY (evaluatee_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE
);

-- 8) คะแนน + ความเห็นของกรรมการ
CREATE TABLE scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    committee_id INT NOT NULL,
    evaluatee_id INT NOT NULL,
    indicator_id INT NOT NULL,
    score INT NOT NULL,
    comment TEXT NULL,
    UNIQUE (committee_id, evaluatee_id, indicator_id),
    FOREIGN KEY (committee_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (evaluatee_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE
);

-- ผู้ดูแลเริ่มต้น: username = admin  password = admin1234
INSERT INTO users (username, password, email, fullname, role)
VALUES ('admin', '$2b$10$BwLame1a9jh4OreMX.cXlOWH/oeOVH7ChwvFs7K1oCDGZ6QqLeI8S', 'admin@pntc.ac.th', 'ฝ่ายบุคลากร', 'admin');
