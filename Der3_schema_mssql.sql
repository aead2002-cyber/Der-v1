-- جداول النظام بصيغة MS SQL Server

-- جدول المستخدمين
CREATE TABLE [User] (
    uid NVARCHAR(64) PRIMARY KEY,
    email NVARCHAR(255) NOT NULL,
    displayName NVARCHAR(255),
    role NVARCHAR(20) NOT NULL,
    teams NVARCHAR(MAX),
    departments NVARCHAR(MAX),
    photoURL NVARCHAR(MAX),
    passwordHash NVARCHAR(MAX) NULL,
    passwordSalt NVARCHAR(MAX) NULL,
    createdAt DATETIME,
    updatedAt DATETIME
);

-- جدول السياسات
CREATE TABLE Policy (
    id NVARCHAR(64) PRIMARY KEY,
    nameAr NVARCHAR(255) NOT NULL,
    nameEn NVARCHAR(255) NOT NULL,
    descriptionAr NVARCHAR(MAX),
    descriptionEn NVARCHAR(MAX),
    framework NVARCHAR(20),
    createdAt DATETIME,
    updatedAt DATETIME
);

-- جدول المعايير
CREATE TABLE Standard (
    id NVARCHAR(64) PRIMARY KEY,
    policyId NVARCHAR(64) NOT NULL,
    nameAr NVARCHAR(255) NOT NULL,
    nameEn NVARCHAR(255) NOT NULL,
    descriptionAr NVARCHAR(MAX),
    descriptionEn NVARCHAR(MAX),
    classifications NVARCHAR(MAX),
    createdAt DATETIME,
    updatedAt DATETIME,
    FOREIGN KEY (policyId) REFERENCES Policy(id)
);

-- جدول الإجراءات
CREATE TABLE [Procedure] (
    id NVARCHAR(64) PRIMARY KEY,
    standardId NVARCHAR(64) NOT NULL,
    policyId NVARCHAR(64) NOT NULL,
    nameAr NVARCHAR(255) NOT NULL,
    nameEn NVARCHAR(255) NOT NULL,
    descriptionAr NVARCHAR(MAX),
    descriptionEn NVARCHAR(MAX),
    status NVARCHAR(20) NOT NULL,
    importance NVARCHAR(20),
    startDate DATE,
    endDate DATE,
    assignedTo NVARCHAR(MAX),
    assignedTeams NVARCHAR(MAX),
    isPeriodic BIT NOT NULL DEFAULT 0,
    frequency NVARCHAR(20),
    createdAt DATETIME,
    updatedAt DATETIME,
    FOREIGN KEY (standardId) REFERENCES Standard(id),
    FOREIGN KEY (policyId) REFERENCES Policy(id)
);

-- جدول سجل التدقيق
CREATE TABLE AuditLog (
    id NVARCHAR(64) PRIMARY KEY,
    userId NVARCHAR(64),
    userName NVARCHAR(255),
    action NVARCHAR(255),
    entityType NVARCHAR(255),
    entityId NVARCHAR(64),
    oldValue NVARCHAR(MAX),
    newValue NVARCHAR(MAX),
    timestamp DATETIME
);

-- جدول طلبات التغيير
CREATE TABLE ChangeRequest (
    id NVARCHAR(64) PRIMARY KEY,
    title NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    type NVARCHAR(50),
    senderId NVARCHAR(64),
    senderName NVARCHAR(255),
    receiverId NVARCHAR(64),
    receiverName NVARCHAR(255),
    status NVARCHAR(30) NOT NULL,
    attachments NVARCHAR(MAX),
    createdAt DATETIME,
    updatedAt DATETIME
);

-- جدول خيارات القوائم
CREATE TABLE LookupOption (
    id NVARCHAR(64) PRIMARY KEY,
    category NVARCHAR(255) NOT NULL,
    value NVARCHAR(255) NOT NULL,
    labelAr NVARCHAR(255) NOT NULL,
    labelEn NVARCHAR(255) NOT NULL,
    isActive BIT NOT NULL,
    descriptionAr NVARCHAR(MAX),
    descriptionEn NVARCHAR(MAX)
);

-- جدول بنود السياسات
CREATE TABLE PolicyItem (
    id NVARCHAR(64) PRIMARY KEY,
    policyId NVARCHAR(64) NOT NULL,
    parentId NVARCHAR(64),
    [order] INT NOT NULL,
    nameAr NVARCHAR(255) NOT NULL,
    nameEn NVARCHAR(255) NOT NULL,
    descriptionAr NVARCHAR(MAX),
    descriptionEn NVARCHAR(MAX),
    createdAt DATETIME,
    updatedAt DATETIME,
    FOREIGN KEY (policyId) REFERENCES Policy(id)
);

-- جدول الأدلة
CREATE TABLE Evidence (
    id NVARCHAR(64) PRIMARY KEY,
    procedureId NVARCHAR(64) NOT NULL,
    name NVARCHAR(255),
    url NVARCHAR(MAX),
    type NVARCHAR(100),
    uploadedBy NVARCHAR(64),
    uploadedAt DATETIME,
    description NVARCHAR(MAX),
    FOREIGN KEY (procedureId) REFERENCES [Procedure](id)
);

-- جدول أُطر العمل
CREATE TABLE Framework (
    id NVARCHAR(64) PRIMARY KEY,
    nameAr NVARCHAR(255) NOT NULL,
    nameEn NVARCHAR(255) NOT NULL,
    descriptionAr NVARCHAR(MAX),
    descriptionEn NVARCHAR(MAX),
    createdAt DATETIME,
    updatedAt DATETIME
);

-- جدول تصنيفات المعايير
CREATE TABLE StandardClassification (
    id NVARCHAR(64) PRIMARY KEY,
    nameAr NVARCHAR(255) NOT NULL,
    nameEn NVARCHAR(255) NOT NULL,
    createdAt DATETIME,
    updatedAt DATETIME
);

-- جدول الفِرق
CREATE TABLE Team (
    id NVARCHAR(64) PRIMARY KEY,
    nameAr NVARCHAR(255) NOT NULL,
    nameEn NVARCHAR(255) NOT NULL,
    descriptionAr NVARCHAR(MAX),
    descriptionEn NVARCHAR(MAX),
    createdAt DATETIME,
    updatedAt DATETIME
);

-- جدول الإدارات
CREATE TABLE Department (
    id NVARCHAR(64) PRIMARY KEY,
    nameAr NVARCHAR(255) NOT NULL,
    nameEn NVARCHAR(255) NOT NULL,
    descriptionAr NVARCHAR(MAX),
    descriptionEn NVARCHAR(MAX),
    createdAt DATETIME,
    updatedAt DATETIME
);

-- جدول الالتزامات
CREATE TABLE Commitment (
    id NVARCHAR(64) PRIMARY KEY,
    nameAr NVARCHAR(255) NOT NULL,
    nameEn NVARCHAR(255) NOT NULL,
    descriptionAr NVARCHAR(MAX),
    descriptionEn NVARCHAR(MAX),
    expiryDate DATE,
    responsibleUser NVARCHAR(64),
    status NVARCHAR(30) NOT NULL,
    evidenceTitle NVARCHAR(255),
    evidenceLink NVARCHAR(MAX),
    evidenceUploadedAt DATETIME,
    createdAt DATETIME,
    updatedAt DATETIME
);

-- جدول قوالب الإشعارات
CREATE TABLE NotificationTemplate (
    id NVARCHAR(64) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    subject NVARCHAR(500),
    body NVARCHAR(MAX),
    type NVARCHAR(50)
);

-- جدول سجل الإشعارات الصادرة
CREATE TABLE NotificationLog (
    id NVARCHAR(64) PRIMARY KEY,
    recipientId NVARCHAR(64),
    recipientEmail NVARCHAR(255),
    recipientName NVARCHAR(255),
    type NVARCHAR(50),
    subject NVARCHAR(500),
    body NVARCHAR(MAX),
    status NVARCHAR(20),
    sentAt DATETIME,
    errorMessage NVARCHAR(MAX)
);

-- جدول الحوادث الأمنية
CREATE TABLE SecurityIncident (
    id NVARCHAR(64) PRIMARY KEY,
    reporterEmail NVARCHAR(255),
    title NVARCHAR(500),
    description NVARCHAR(MAX),
    type NVARCHAR(100),
    priority NVARCHAR(20),
    status NVARCHAR(30),
    reportedAt DATETIME,
    assignedTo NVARCHAR(64),
    updatedAt DATETIME,
    closedAt DATETIME,
    attachments NVARCHAR(MAX)
);

-- جدول ملاحظات الحوادث
CREATE TABLE IncidentNote (
    id NVARCHAR(64) PRIMARY KEY,
    incidentId NVARCHAR(64) NOT NULL,
    authorId NVARCHAR(64),
    authorName NVARCHAR(255),
    content NVARCHAR(MAX),
    createdAt DATETIME,
    attachments NVARCHAR(MAX),
    FOREIGN KEY (incidentId) REFERENCES SecurityIncident(id)
);

-- جدول تقييمات الحوادث
CREATE TABLE IncidentFeedback (
    id NVARCHAR(64) PRIMARY KEY,
    incidentId NVARCHAR(64) NOT NULL,
    rating INT,
    comment NVARCHAR(MAX),
    submittedAt DATETIME,
    FOREIGN KEY (incidentId) REFERENCES SecurityIncident(id)
);

-- جدول الإشعارات داخل النظام
CREATE TABLE Notification (
    id NVARCHAR(64) PRIMARY KEY,
    userId NVARCHAR(64),
    titleAr NVARCHAR(500),
    titleEn NVARCHAR(500),
    messageAr NVARCHAR(MAX),
    messageEn NVARCHAR(MAX),
    type NVARCHAR(50),
    link NVARCHAR(MAX),
    isRead BIT NOT NULL DEFAULT 0,
    createdAt DATETIME
);

-- عمود تاريخ تعديلات طلب التغيير (مفقود سابقاً)
ALTER TABLE ChangeRequest ADD history NVARCHAR(MAX);
