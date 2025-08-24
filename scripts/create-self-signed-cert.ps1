# Create Self-Signed Certificate for Code Signing
# This script creates a free self-signed certificate to sign your Electron app

param(
    [string]$CertName = "CodeX-SelfSigned",
    [string]$OutputPath = "certificates",
    [string]$Password = "password123"
)

# Create certificates directory if it doesn't exist
if (!(Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath
}

Write-Host "Creating self-signed certificate for CodeX..." -ForegroundColor Green

# Create self-signed certificate
$cert = New-SelfSignedCertificate `
    -Type Custom `
    -Subject "CN=CodeX Development Certificate" `
    -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3") `
    -KeyUsage DigitalSignature `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -NotBefore (Get-Date) `
    -NotAfter (Get-Date).AddYears(3) `
    -CertStoreLocation "Cert:\CurrentUser\My"

# Export certificate to PFX file
$pfxPath = Join-Path $OutputPath "codex-certificate.pfx"
$cert | Export-PfxCertificate -FilePath $pfxPath -Password (ConvertTo-SecureString -String $Password -Force -AsPlainText)

# Export public key to CER file
$cerPath = Join-Path $OutputPath "codex-certificate.cer"
$cert | Export-Certificate -FilePath $cerPath

# Get certificate thumbprint
$thumbprint = $cert.Thumbprint

Write-Host "Certificate created successfully!" -ForegroundColor Green
Write-Host "Certificate Thumbprint: $thumbprint" -ForegroundColor Yellow
Write-Host "PFX File: $pfxPath" -ForegroundColor Yellow
Write-Host "CER File: $cerPath" -ForegroundColor Yellow
Write-Host "Password: $Password" -ForegroundColor Yellow

# Create environment file for the certificate
$envContent = @"
# Self-Signed Certificate Configuration
SM_CODE_SIGNING_CERT_SHA1_HASH=$thumbprint
CERTIFICATE_PATH=$pfxPath
CERTIFICATE_PASSWORD=$Password
"@

$envPath = Join-Path $OutputPath ".env.cert"
$envContent | Out-File -FilePath $envPath -Encoding UTF8

Write-Host "Environment file created: $envPath" -ForegroundColor Green
Write-Host ""
Write-Host "To use this certificate:" -ForegroundColor Cyan
Write-Host "1. Add the certificate to your system trust store" -ForegroundColor White
Write-Host "2. Set the environment variables in your build process" -ForegroundColor White
Write-Host "3. Import the certificate into your local certificate store" -ForegroundColor White
