# Backend Authentication Checkpoint

1. CRUD backend completed and tested.
2. OTP/SMTP completed and tested.
3. JWT token is returned only after OTP verification.
4. Swagger Authorize works with token only, not Bearer token.
5. Protected APIs return 401 without token.
6. Protected APIs work with valid token.
7. Public endpoints:
   - `POST /api/auth/verify`
   - `POST /api/auth/verify-otp`
   - `GET /api/health`
8. Protected endpoints:
   - CRUD APIs
   - Files APIs
   - Compatibility `GET`
   - Database test
   - Email test
   - `GET /api/auth/me`
9. Next phase:
   Fine-grained permissions using `PermissionGroups`.
