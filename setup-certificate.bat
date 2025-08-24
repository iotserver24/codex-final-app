@echo off
echo Setting up CodeX certificate environment...
set SM_CODE_SIGNING_CERT_SHA1_HASH=
set CERTIFICATE_PATH=certificates\codex-certificate.pfx
set CERTIFICATE_PASSWORD=password123
echo Certificate environment variables set!
echo You can now run: npm run make
pause
