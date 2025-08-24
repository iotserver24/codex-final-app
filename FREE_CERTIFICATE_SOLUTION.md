# Free Solutions to Fix "Unknown Publisher" Warning

This guide provides **completely free** solutions to fix the blue screen "unknown publisher" warning when running your Electron app on Windows.

## 🎯 Quick Solution (Recommended)

### Step 1: Create Self-Signed Certificate

```powershell
# Run this in PowerShell as Administrator
.\scripts\create-self-signed-cert.ps1
```

### Step 2: Install Certificate

```powershell
# Run this in PowerShell as Administrator
.\scripts\install-certificate.ps1
```

### Step 3: Build Your App

```bash
# Set environment and build
.\setup-certificate.bat
npm run make
```

## 🔧 Alternative Free Solutions

### Solution 1: Self-Signed Certificate (Above)

- ✅ Completely free
- ✅ Reduces SmartScreen warnings
- ✅ Works for development and personal use
- ⚠️ Still shows some warnings (but less severe)

### Solution 2: Windows SmartScreen Settings

1. **Temporarily disable SmartScreen** (for testing):

   - Go to Windows Security → App & Browser Control
   - Turn off "Check apps and files"
   - **Note**: Re-enable after testing for security

2. **Add app to SmartScreen exceptions**:
   - Right-click your .exe file
   - Properties → Security → Unblock
   - Check "Allow this file"

### Solution 3: Portable App Approach

1. **Use ZIP distribution instead of installer**:

   - Build with `MakerZIP` instead of `MakerSquirrel`
   - Users extract and run directly
   - Less likely to trigger SmartScreen

2. **Create a portable version**:
   ```bash
   # In forge.config.ts, prioritize ZIP maker
   npm run make -- --targets=@electron-forge/maker-zip
   ```

### Solution 4: Development Certificate (Free for 1 year)

1. **Get free certificate from Microsoft**:

   - Visit: https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/
   - Install Windows SDK
   - Use `makecert` tool to create development certificate

2. **Use the certificate**:

   ```bash
   # Create development certificate
   makecert -r -pe -n "CN=CodeX Development" -ss CA -sr CurrentUser -a sha256 -cy end -sky signature -sv CA.pvk CA.cer

   # Sign your app
   signtool sign /f CA.pfx /p password your-app.exe
   ```

## 🛠️ Manual Certificate Creation

If the scripts don't work, create certificate manually:

```powershell
# Create certificate manually
$cert = New-SelfSignedCertificate -Type Custom -Subject "CN=CodeX" -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3") -KeyUsage DigitalSignature -KeyAlgorithm RSA -KeyLength 2048 -NotBefore (Get-Date) -NotAfter (Get-Date).AddYears(3) -CertStoreLocation "Cert:\CurrentUser\My"

# Export to PFX
$cert | Export-PfxCertificate -FilePath "codex-cert.pfx" -Password (ConvertTo-SecureString -String "password123" -Force -AsPlainText)

# Get thumbprint
$cert.Thumbprint
```

## 📋 Environment Variables

Add these to your `.env` file:

```env
# Self-Signed Certificate
SM_CODE_SIGNING_CERT_SHA1_HASH=YOUR_THUMBPRINT_HERE
CERTIFICATE_PATH=certificates\codex-certificate.pfx
CERTIFICATE_PASSWORD=password123
SELF_SIGNED=true

# Optional: Disable SmartScreen for development
SMARTScreen_Enabled=false
```

## 🚀 Build Commands

### For Self-Signed Build:

```bash
# Set environment
set SM_CODE_SIGNING_CERT_SHA1_HASH=YOUR_THUMBPRINT
set SELF_SIGNED=true

# Build
npm run make
```

### For ZIP Distribution (No Certificate):

```bash
# Build only ZIP version
npm run make -- --targets=@electron-forge/maker-zip
```

## 🔍 Troubleshooting

### Certificate Not Found:

```powershell
# Check if certificate exists
Get-ChildItem Cert:\CurrentUser\My | Where-Object {$_.Subject -like "*CodeX*"}
```

### Permission Issues:

```powershell
# Run PowerShell as Administrator
Start-Process PowerShell -Verb RunAs
```

### SmartScreen Still Blocking:

1. Right-click .exe → Properties → Security → Unblock
2. Add to Windows Defender exclusions
3. Temporarily disable SmartScreen

## 📝 Important Notes

1. **Self-signed certificates** still show warnings but are less severe
2. **Commercial certificates** are required for complete elimination of warnings
3. **ZIP distribution** bypasses most SmartScreen checks
4. **Development certificates** are free but expire after 1 year

## 🎯 Best Practices

1. **For Development**: Use self-signed certificate
2. **For Distribution**: Consider ZIP format
3. **For Production**: Eventually get a commercial certificate
4. **For Testing**: Temporarily disable SmartScreen

## 🔗 Useful Links

- [Microsoft Code Signing](https://docs.microsoft.com/en-us/windows/win32/seccrypto/code-signing)
- [Electron Forge Documentation](https://www.electronforge.io/configuration)
- [Windows SmartScreen](https://support.microsoft.com/en-us/windows/smartscreen-helps-protect-you-against-malware-and-phishing-53d4b351-2e6e-8e9f-2be6-753aacf2b023)

---

**Remember**: These solutions reduce warnings but don't eliminate them completely. For a professional release, consider getting a commercial code signing certificate.
