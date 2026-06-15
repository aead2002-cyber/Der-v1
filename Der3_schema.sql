-- جداول النظام بناءً على مخطط firebase-blueprint.json

-- جدول المستخدمين
CREATE TABLE IF NOT EXISTS User (
    uid VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    displayName VARCHAR(255),
    role ENUM('admin', 'auditor', 'user') NOT NULL,
    teams TEXT,
    departments TEXT
);

-- جدول السياسات
CREATE TABLE IF NOT EXISTS Policy (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nameAr VARCHAR(255) NOT NULL,
    nameEn VARCHAR(255) NOT NULL,
    descriptionAr TEXT,
    descriptionEn TEXT,
    framework ENUM('NCA', 'ISO27001', 'Other')
);

-- جدول المعايير
CREATE TABLE IF NOT EXISTS Standard (
    id INT AUTO_INCREMENT PRIMARY KEY,
    policyId INT NOT NULL,
    nameAr VARCHAR(255) NOT NULL,
    nameEn VARCHAR(255) NOT NULL,
    descriptionAr TEXT,
    descriptionEn TEXT,
    FOREIGN KEY (policyId) REFERENCES Policy(id)
);

-- جدول الإجراءات
CREATE TABLE IF NOT EXISTS Procedure (
    id INT AUTO_INCREMENT PRIMARY KEY,
    standardId INT NOT NULL,
    policyId INT NOT NULL,
    nameAr VARCHAR(255) NOT NULL,
    nameEn VARCHAR(255) NOT NULL,
    descriptionAr TEXT,
    descriptionEn TEXT,
    status ENUM('not_started', 'in_progress', 'completed') NOT NULL,
    importance ENUM('high', 'medium', 'low'),
    startDate DATE,
    endDate DATE,
    assignedTo TEXT,
    FOREIGN KEY (standardId) REFERENCES Standard(id),
    FOREIGN KEY (policyId) REFERENCES Policy(id)
);

-- جدول سجل التدقيق
CREATE TABLE IF NOT EXISTS AuditLog (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId VARCHAR(64),
    userName VARCHAR(255),
    action VARCHAR(255),
    entityType VARCHAR(255),
    entityId VARCHAR(64),
    timestamp DATETIME
);

-- جدول طلبات التغيير
CREATE TABLE IF NOT EXISTS ChangeRequest (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('tool_change', 'firewall_open', 'access_request', 'other'),
    senderId VARCHAR(64),
    senderName VARCHAR(255),
    receiverId VARCHAR(64),
    receiverName VARCHAR(255),
    status ENUM('pending', 'approved', 'rejected', 'clarification_needed') NOT NULL,
    attachments TEXT,
    createdAt DATETIME,
    updatedAt DATETIME
);

-- جدول خيارات القوائم
CREATE TABLE IF NOT EXISTS LookupOption (
    id VARCHAR(64) PRIMARY KEY,
    category VARCHAR(255) NOT NULL,
    value VARCHAR(255) NOT NULL,
    labelAr VARCHAR(255) NOT NULL,
    labelEn VARCHAR(255) NOT NULL,
    isActive BOOLEAN NOT NULL,
    descriptionAr TEXT,
    descriptionEn TEXT
);
