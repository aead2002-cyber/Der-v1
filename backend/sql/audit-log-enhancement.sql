IF OBJECT_ID(N'dbo.AuditLog', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.AuditLog', 'UserEmail') IS NULL
    BEGIN
        ALTER TABLE [dbo].[AuditLog]
        ADD [UserEmail] NVARCHAR(256) NULL;
    END;

    IF COL_LENGTH('dbo.AuditLog', 'DetailsJson') IS NULL
    BEGIN
        ALTER TABLE [dbo].[AuditLog]
        ADD [DetailsJson] NVARCHAR(MAX) NULL;
    END;

    IF COL_LENGTH('dbo.AuditLog', 'BeforeJson') IS NULL
    BEGIN
        ALTER TABLE [dbo].[AuditLog]
        ADD [BeforeJson] NVARCHAR(MAX) NULL;
    END;

    IF COL_LENGTH('dbo.AuditLog', 'AfterJson') IS NULL
    BEGIN
        ALTER TABLE [dbo].[AuditLog]
        ADD [AfterJson] NVARCHAR(MAX) NULL;
    END;

    IF COL_LENGTH('dbo.AuditLog', 'IpAddress') IS NULL
    BEGIN
        ALTER TABLE [dbo].[AuditLog]
        ADD [IpAddress] NVARCHAR(64) NULL;
    END;

    IF COL_LENGTH('dbo.AuditLog', 'TimestampUtc') IS NULL
    BEGIN
        ALTER TABLE [dbo].[AuditLog]
        ADD [TimestampUtc] DATETIME2 NULL;
    END;
END;
