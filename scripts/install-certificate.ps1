# Install Self-Signed Certificate and Configure Code Signing
# This script installs the certificate and configures your Electron app

param(
    [string]$CertPath = "certificates\codex-certificate.pfx",
    [string]$Password = "password123"
)

Write-Host "Installing self-signed certificate for CodeX..." -ForegroundColor Green

# Check if certificate exists
if (!(Test-Path $CertPath)) {
    Write-Host "Certificate not found at: $CertPath" -ForegroundColor Red
    Write-Host "Please run create-self-signed-cert.ps1 first" -ForegroundColor Yellow
    exit 1
}

# Import certificate to Personal store
Write-Host "Importing certificate to Personal certificate store..." -ForegroundColor Yellow
Import-PfxCertificate -FilePath $CertPath -CertStoreLocation "Cert:\CurrentUser\My" -Password (ConvertTo-SecureString -String $Password -Force -AsPlainText)

# Import certificate to Trusted Root CA store (to avoid warnings)
Write-Host "Importing certificate to Trusted Root CA store..." -ForegroundColor Yellow
Import-PfxCertificate -FilePath $CertPath -CertStoreLocation "Cert:\CurrentUser\Root" -Password (ConvertTo-SecureString -String $Password -Force -AsPlainText)

# Get certificate thumbprint
$cert = Get-PfxCertificate -FilePath $CertPath
$thumbprint = $cert.Thumbprint

Write-Host "Certificate installed successfully!" -ForegroundColor Green
Write-Host "Certificate Thumbprint: $thumbprint" -ForegroundColor Yellow

# Create .env file with certificate configuration
$envContent = @"
# Code Signing Configuration
SM_CODE_SIGNING_CERT_SHA1_HASH=$thumbprint
CERTIFICATE_PATH=$CertPath
CERTIFICATE_PASSWORD=$Password

# Disable SmartScreen warnings (for development)
SMARTScreen_Enabled=false
"@

$envPath = ".env.cert"
$envContent | Out-File -FilePath $envPath -Encoding UTF8

Write-Host "Environment file created: $envPath" -ForegroundColor Green

# Create batch file for easy certificate usage
$batchContent = @"
@echo off
echo Setting up CodeX certificate environment...
set SM_CODE_SIGNING_CERT_SHA1_HASH=$thumbprint
set CERTIFICATE_PATH=$CertPath
set CERTIFICATE_PASSWORD=$Password
echo Certificate environment variables set!
echo You can now run: npm run make
pause
"@

$batchPath = "setup-certificate.bat"
$batchContent | Out-File -FilePath $batchPath -Encoding ASCII

Write-Host "Batch file created: $batchPath" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: .\setup-certificate.bat" -ForegroundColor White
Write-Host "2. Then run: npm run make" -ForegroundColor White
Write-Host "3. Your app will now be signed with the self-signed certificate" -ForegroundColor White
Write-Host ""
Write-Host "Note: Users will still see a warning, but it will be less severe" -ForegroundColor Yellow
