IF OBJECT_ID(N'dbo.AuditLog', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.AuditLog', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE [dbo].[AuditLog]
        ADD IsDeleted BIT NOT NULL CONSTRAINT DF_AuditLog_IsDeleted DEFAULT 0 WITH VALUES;
    END;
    IF COL_LENGTH('dbo.AuditLog', 'DeletedAt') IS NULL
    BEGIN
        ALTER TABLE [dbo].[AuditLog]
        ADD DeletedAt DATETIME2 NULL;
    END;
    IF COL_LENGTH('dbo.AuditLog', 'DeletedBy') IS NULL
    BEGIN
        ALTER TABLE [dbo].[AuditLog]
        ADD DeletedBy NVARCHAR(100) NULL;
    END;
END;

IF OBJECT_ID(N'dbo.ChangeRequest', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.ChangeRequest', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE [dbo].[ChangeRequest]
        ADD IsDeleted BIT NOT NULL CONSTRAINT DF_ChangeRequest_IsDeleted DEFAULT 0 WITH VALUES;
    END;
    IF COL_LENGTH('dbo.ChangeRequest', 'DeletedAt') IS NULL
    BEGIN
        ALTER TABLE [dbo].[ChangeRequest]
        ADD DeletedAt DATETIME2 NULL;
    END;
    IF COL_LENGTH('dbo.ChangeRequest', 'DeletedBy') IS NULL
    BEGIN
        ALTER TABLE [dbo].[ChangeRequest]
        ADD DeletedBy NVARCHAR(100) NULL;
    END;
END;

IF OBJECT_ID(N'dbo.Commitment', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.Commitment', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Commitment]
        ADD IsDeleted BIT NOT NULL CONSTRAINT DF_Commitment_IsDeleted DEFAULT 0 WITH VALUES;
    END;
    IF COL_LENGTH('dbo.Commitment', 'DeletedAt') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Commitment]
        ADD DeletedAt DATETIME2 NULL;
    END;
    IF COL_LENGTH('dbo.Commitment', 'DeletedBy') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Commitment]
        ADD DeletedBy NVARCHAR(100) NULL;
    END;
END;

IF OBJECT_ID(N'dbo.Department', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.Department', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Department]
        ADD IsDeleted BIT NOT NULL CONSTRAINT DF_Department_IsDeleted DEFAULT 0 WITH VALUES;
    END;
    IF COL_LENGTH('dbo.Department', 'DeletedAt') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Department]
        ADD DeletedAt DATETIME2 NULL;
    END;
    IF COL_LENGTH('dbo.Department', 'DeletedBy') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Department]
        ADD DeletedBy NVARCHAR(100) NULL;
    END;
END;

IF OBJECT_ID(N'dbo.Evidence', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.Evidence', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Evidence]
        ADD IsDeleted BIT NOT NULL CONSTRAINT DF_Evidence_IsDeleted DEFAULT 0 WITH VALUES;
    END;
    IF COL_LENGTH('dbo.Evidence', 'DeletedAt') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Evidence]
        ADD DeletedAt DATETIME2 NULL;
    END;
    IF COL_LENGTH('dbo.Evidence', 'DeletedBy') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Evidence]
        ADD DeletedBy NVARCHAR(100) NULL;
    END;
END;

IF OBJECT_ID(N'dbo.FileBlob', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.FileBlob', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE [dbo].[FileBlob]
        ADD IsDeleted BIT NOT NULL CONSTRAINT DF_FileBlob_IsDeleted DEFAULT 0 WITH VALUES;
    END;
    IF COL_LENGTH('dbo.FileBlob', 'DeletedAt') IS NULL
    BEGIN
        ALTER TABLE [dbo].[FileBlob]
        ADD DeletedAt DATETIME2 NULL;
    END;
    IF COL_LENGTH('dbo.FileBlob', 'DeletedBy') IS NULL
    BEGIN
        ALTER TABLE [dbo].[FileBlob]
        ADD DeletedBy NVARCHAR(100) NULL;
    END;
END;

IF OBJECT_ID(N'dbo.Framework', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.Framework', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Framework]
        ADD IsDeleted BIT NOT NULL CONSTRAINT DF_Framework_IsDeleted DEFAULT 0 WITH VALUES;
    END;
    IF COL_LENGTH('dbo.Framework', 'DeletedAt') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Framework]
        ADD DeletedAt DATETIME2 NULL;
    END;
    IF COL_LENGTH('dbo.Framework', 'DeletedBy') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Framework]
        ADD DeletedBy NVARCHAR(100) NULL;
    END;
END;

IF OBJECT_ID(N'dbo.IncidentFeedback', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.IncidentFeedback', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE [dbo].[IncidentFeedback]
        ADD IsDeleted BIT NOT NULL CONSTRAINT DF_IncidentFeedback_IsDeleted DEFAULT 0 WITH VALUES;
    END;
    IF COL_LENGTH('dbo.IncidentFeedback', 'DeletedAt') IS NULL
    BEGIN
        ALTER TABLE [dbo].[IncidentFeedback]
        ADD DeletedAt DATETIME2 NULL;
    END;
    IF COL_LENGTH('dbo.IncidentFeedback', 'DeletedBy') IS NULL
    BEGIN
        ALTER TABLE [dbo].[IncidentFeedback]
        ADD DeletedBy NVARCHAR(100) NULL;
    END;
END;

IF OBJECT_ID(N'dbo.IncidentNote', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.IncidentNote', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE [dbo].[IncidentNote]
        ADD IsDeleted BIT NOT NULL CONSTRAINT DF_IncidentNote_IsDeleted DEFAULT 0 WITH VALUES;
    END;
    IF COL_LENGTH('dbo.IncidentNote', 'DeletedAt') IS NULL
    BEGIN
        ALTER TABLE [dbo].[IncidentNote]
        ADD DeletedAt DATETIME2 NULL;
    END;
    IF COL_LENGTH('dbo.IncidentNote', 'DeletedBy') IS NULL
    BEGIN
        ALTER TABLE [dbo].[IncidentNote]
        ADD DeletedBy NVARCHAR(100) NULL;
    END;
END;

IF OBJECT_ID(N'dbo.SecurityIncident', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.SecurityIncident', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE [dbo].[SecurityIncident]
        ADD IsDeleted BIT NOT NULL CONSTRAINT DF_SecurityIncident_IsDeleted DEFAULT 0 WITH VALUES;
    END;
    IF COL_LENGTH('dbo.SecurityIncident', 'DeletedAt') IS NULL
    BEGIN
        ALTER TABLE [dbo].[SecurityIncident]
        ADD DeletedAt DATETIME2 NULL;
    END;
    IF COL_LENGTH('dbo.SecurityIncident', 'DeletedBy') IS NULL
    BEGIN
        ALTER TABLE [dbo].[SecurityIncident]
        ADD DeletedBy NVARCHAR(100) NULL;
    END;
END;

IF OBJECT_ID(N'dbo.LookupOption', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.LookupOption', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE [dbo].[LookupOption]
        ADD IsDeleted BIT NOT NULL CONSTRAINT DF_LookupOption_IsDeleted DEFAULT 0 WITH VALUES;
    END;
    IF COL_LENGTH('dbo.LookupOption', 'DeletedAt') IS NULL
    BEGIN
        ALTER TABLE [dbo].[LookupOption]
        ADD DeletedAt DATETIME2 NULL;
    END;
    IF COL_LENGTH('dbo.LookupOption', 'DeletedBy') IS NULL
    BEGIN
        ALTER TABLE [dbo].[LookupOption]
        ADD DeletedBy NVARCHAR(100) NULL;
    END;
END;

IF OBJECT_ID(N'dbo.Notification', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.Notification', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Notification]
        ADD IsDeleted BIT NOT NULL CONSTRAINT DF_Notification_IsDeleted DEFAULT 0 WITH VALUES;
    END;
    IF COL_LENGTH('dbo.Notification', 'DeletedAt') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Notification]
        ADD DeletedAt DATETIME2 NULL;
    END;
    IF COL_LENGTH('dbo.Notification', 'DeletedBy') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Notification]
        ADD DeletedBy NVARCHAR(100) NULL;
    END;
END;

IF OBJECT_ID(N'dbo.NotificationLog', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.NotificationLog', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE [dbo].[NotificationLog]
        ADD IsDeleted BIT NOT NULL CONSTRAINT DF_NotificationLog_IsDeleted DEFAULT 0 WITH VALUES;
    END;
    IF COL_LENGTH('dbo.NotificationLog', 'DeletedAt') IS NULL
    BEGIN
        ALTER TABLE [dbo].[NotificationLog]
        ADD DeletedAt DATETIME2 NULL;
    END;
    IF COL_LENGTH('dbo.NotificationLog', 'DeletedBy') IS NULL
    BEGIN
        ALTER TABLE [dbo].[NotificationLog]
        ADD DeletedBy NVARCHAR(100) NULL;
    END;
END;

IF OBJECT_ID(N'dbo.NotificationTemplate', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.NotificationTemplate', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE [dbo].[NotificationTemplate]
        ADD IsDeleted BIT NOT NULL CONSTRAINT DF_NotificationTemplate_IsDeleted DEFAULT 0 WITH VALUES;
    END;
    IF COL_LENGTH('dbo.NotificationTemplate', 'DeletedAt') IS NULL
    BEGIN
        ALTER TABLE [dbo].[NotificationTemplate]
        ADD DeletedAt DATETIME2 NULL;
    END;
    IF COL_LENGTH('dbo.NotificationTemplate', 'DeletedBy') IS NULL
    BEGIN
        ALTER TABLE [dbo].[NotificationTemplate]
        ADD DeletedBy NVARCHAR(100) NULL;
    END;
END;

IF OBJECT_ID(N'dbo.PermissionGroup', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.PermissionGroup', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE [dbo].[PermissionGroup]
        ADD IsDeleted BIT NOT NULL CONSTRAINT DF_PermissionGroup_IsDeleted DEFAULT 0 WITH VALUES;
    END;
    IF COL_LENGTH('dbo.PermissionGroup', 'DeletedAt') IS NULL
    BEGIN
        ALTER TABLE [dbo].[PermissionGroup]
        ADD DeletedAt DATETIME2 NULL;
    END;
    IF COL_LENGTH('dbo.PermissionGroup', 'DeletedBy') IS NULL
    BEGIN
        ALTER TABLE [dbo].[PermissionGroup]
        ADD DeletedBy NVARCHAR(100) NULL;
    END;
END;

IF OBJECT_ID(N'dbo.Policy', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.Policy', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Policy]
        ADD IsDeleted BIT NOT NULL CONSTRAINT DF_Policy_IsDeleted DEFAULT 0 WITH VALUES;
    END;
    IF COL_LENGTH('dbo.Policy', 'DeletedAt') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Policy]
        ADD DeletedAt DATETIME2 NULL;
    END;
    IF COL_LENGTH('dbo.Policy', 'DeletedBy') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Policy]
        ADD DeletedBy NVARCHAR(100) NULL;
    END;
END;

IF OBJECT_ID(N'dbo.PolicyItem', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.PolicyItem', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE [dbo].[PolicyItem]
        ADD IsDeleted BIT NOT NULL CONSTRAINT DF_PolicyItem_IsDeleted DEFAULT 0 WITH VALUES;
    END;
    IF COL_LENGTH('dbo.PolicyItem', 'DeletedAt') IS NULL
    BEGIN
        ALTER TABLE [dbo].[PolicyItem]
        ADD DeletedAt DATETIME2 NULL;
    END;
    IF COL_LENGTH('dbo.PolicyItem', 'DeletedBy') IS NULL
    BEGIN
        ALTER TABLE [dbo].[PolicyItem]
        ADD DeletedBy NVARCHAR(100) NULL;
    END;
END;

IF OBJECT_ID(N'dbo.Procedure', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.Procedure', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Procedure]
        ADD IsDeleted BIT NOT NULL CONSTRAINT DF_Procedure_IsDeleted DEFAULT 0 WITH VALUES;
    END;
    IF COL_LENGTH('dbo.Procedure', 'DeletedAt') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Procedure]
        ADD DeletedAt DATETIME2 NULL;
    END;
    IF COL_LENGTH('dbo.Procedure', 'DeletedBy') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Procedure]
        ADD DeletedBy NVARCHAR(100) NULL;
    END;
END;

IF OBJECT_ID(N'dbo.Risk', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.Risk', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Risk]
        ADD IsDeleted BIT NOT NULL CONSTRAINT DF_Risk_IsDeleted DEFAULT 0 WITH VALUES;
    END;
    IF COL_LENGTH('dbo.Risk', 'DeletedAt') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Risk]
        ADD DeletedAt DATETIME2 NULL;
    END;
    IF COL_LENGTH('dbo.Risk', 'DeletedBy') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Risk]
        ADD DeletedBy NVARCHAR(100) NULL;
    END;
END;

IF OBJECT_ID(N'dbo.StandardClassification', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.StandardClassification', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE [dbo].[StandardClassification]
        ADD IsDeleted BIT NOT NULL CONSTRAINT DF_StandardClassification_IsDeleted DEFAULT 0 WITH VALUES;
    END;
    IF COL_LENGTH('dbo.StandardClassification', 'DeletedAt') IS NULL
    BEGIN
        ALTER TABLE [dbo].[StandardClassification]
        ADD DeletedAt DATETIME2 NULL;
    END;
    IF COL_LENGTH('dbo.StandardClassification', 'DeletedBy') IS NULL
    BEGIN
        ALTER TABLE [dbo].[StandardClassification]
        ADD DeletedBy NVARCHAR(100) NULL;
    END;
END;

IF OBJECT_ID(N'dbo.Standard', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.Standard', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Standard]
        ADD IsDeleted BIT NOT NULL CONSTRAINT DF_Standard_IsDeleted DEFAULT 0 WITH VALUES;
    END;
    IF COL_LENGTH('dbo.Standard', 'DeletedAt') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Standard]
        ADD DeletedAt DATETIME2 NULL;
    END;
    IF COL_LENGTH('dbo.Standard', 'DeletedBy') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Standard]
        ADD DeletedBy NVARCHAR(100) NULL;
    END;
END;

IF OBJECT_ID(N'dbo.Team', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.Team', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Team]
        ADD IsDeleted BIT NOT NULL CONSTRAINT DF_Team_IsDeleted DEFAULT 0 WITH VALUES;
    END;
    IF COL_LENGTH('dbo.Team', 'DeletedAt') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Team]
        ADD DeletedAt DATETIME2 NULL;
    END;
    IF COL_LENGTH('dbo.Team', 'DeletedBy') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Team]
        ADD DeletedBy NVARCHAR(100) NULL;
    END;
END;

IF OBJECT_ID(N'dbo.[User]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.[User]', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE [dbo].[User]
        ADD IsDeleted BIT NOT NULL CONSTRAINT DF_User_IsDeleted DEFAULT 0 WITH VALUES;
    END;
    IF COL_LENGTH('dbo.[User]', 'DeletedAt') IS NULL
    BEGIN
        ALTER TABLE [dbo].[User]
        ADD DeletedAt DATETIME2 NULL;
    END;
    IF COL_LENGTH('dbo.[User]', 'DeletedBy') IS NULL
    BEGIN
        ALTER TABLE [dbo].[User]
        ADD DeletedBy NVARCHAR(100) NULL;
    END;
END;
