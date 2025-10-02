# Desktop App Authentication Integration

This document explains how to integrate OAuth-style authentication between your Xibe AI desktop app and the web platform.

## 🎯 **How It Works**

1. **User clicks "Login" in desktop app**
2. **Desktop app opens browser** to authentication URL
3. **User authenticates** with GitHub on the website
4. **Website redirects back** to desktop app via deep link
5. **Desktop app receives** authentication data and logs user in

## 🔧 **Implementation in Desktop App**

### **Step 1: Register Deep Link Protocol**

#### **Windows (Electron)**

```javascript
// In main process
const { protocol } = require("electron");

protocol.registerHttpProtocol("xibeai", (request, callback) => {
  const url = request.url;
  // Handle the auth callback
  handleAuthCallback(url);
});

function handleAuthCallback(url) {
  const urlObj = new URL(url);
  const data = urlObj.searchParams.get("data");

  if (data) {
    const authData = JSON.parse(decodeURIComponent(data));

    if (authData.success) {
      // Store auth data locally
      storeAuthData(authData);
      // Show success in app
      showLoginSuccess();
    } else {
      // Handle error
      showLoginError(authData.error);
    }
  }
}
```

#### **macOS (Electron)**

```javascript
// In main process
const { app } = require("electron");

app.setAsDefaultProtocolClient("xibeai");

app.on("open-url", (event, url) => {
  event.preventDefault();
  handleAuthCallback(url);
});
```

#### **Linux (Electron)**

```javascript
// In main process
const { app } = require("electron");

app.setAsDefaultProtocolClient("xibeai");

app.on("second-instance", (event, commandLine, workingDirectory) => {
  // Handle deep link from second instance
  const url = commandLine.find((arg) => arg.startsWith("xibeai://"));
  if (url) {
    handleAuthCallback(url);
  }
});
```

### **Step 2: Open Authentication URL**

```javascript
// In your desktop app
const { shell } = require("electron");

async function openLogin() {
  try {
    // Get auth URL from your API
    const response = await fetch(
      "https://api.xibe.app/api/auth/desktop-url?app_id=xibe-ai-desktop",
    );
    const { authUrl } = await response.json();

    // Open browser
    await shell.openExternal(authUrl);

    // Show waiting message
    showWaitingForAuth();
  } catch (error) {
    showError("Failed to open login page");
  }
}
```

### **Step 3: Handle Authentication Data**

```javascript
function storeAuthData(authData) {
  // Store in secure storage (keychain, etc.)
  const secureStorage = require("secure-electron-store");

  secureStorage.set("auth", {
    uid: authData.uid,
    email: authData.email,
    displayName: authData.displayName,
    idToken: authData.idToken,
    timestamp: authData.timestamp,
  });

  // Update app state
  updateAppState({
    isAuthenticated: true,
    user: {
      uid: authData.uid,
      email: authData.email,
      displayName: authData.displayName,
    },
  });
}
```

## 🌐 **API Endpoints**

### **Get Authentication URL**

```
GET /api/auth/desktop-url?app_id=your-app-id
```

**Response:**

```json
{
  "authUrl": "https://xibe.app/auth?desktop=true&app_id=your-app-id",
  "deepLinkProtocol": "xibeai://auth/callback",
  "instructions": "Open this URL in browser, authenticate, and the app will receive the auth data via deep link"
}
```

## 📱 **User Experience Flow**

1. **User opens desktop app**
2. **Clicks "Login" button**
3. **Browser opens** to your website's auth page
4. **User sees**: "Sign In to Xibe AI Desktop" with special UI
5. **User clicks "Sign in with GitHub"**
6. **GitHub OAuth flow** completes
7. **Browser shows**: "Authentication Successful! Returning to Xibe AI desktop app..."
8. **Browser automatically closes** and returns to desktop app
9. **Desktop app shows**: "Welcome back!" with user info

## 🔐 **Security Considerations**

1. **Deep Link Validation**: Validate the auth data in your desktop app
2. **Token Expiry**: Handle token refresh in your desktop app
3. **Secure Storage**: Store auth tokens in secure storage (keychain, etc.)
4. **App ID Validation**: Validate the app_id parameter
5. **Timestamp Check**: Validate auth timestamp to prevent replay attacks

## 🚀 **Benefits**

- ✅ **No API keys needed** - Direct authentication
- ✅ **Secure OAuth flow** - Uses GitHub's secure authentication
- ✅ **Seamless UX** - Browser handles the auth, app gets the result
- ✅ **Cross-platform** - Works on Windows, macOS, Linux
- ✅ **User tracking** - You get user info directly in your app
- ✅ **Professional** - Standard OAuth pattern used by major apps

## 📝 **Example Implementation**

```javascript
// Desktop app login button
function handleLoginClick() {
  // Show loading state
  setLoading(true);

  // Open browser for authentication
  openLogin()
    .then(() => {
      // Wait for deep link callback
      // This will be handled by the protocol handler
    })
    .catch((error) => {
      setLoading(false);
      showError("Login failed");
    });
}

// Protocol handler (called when deep link is received)
function handleAuthCallback(url) {
  setLoading(false);

  const urlObj = new URL(url);
  const data = urlObj.searchParams.get("data");

  if (data) {
    const authData = JSON.parse(decodeURIComponent(data));

    if (authData.success) {
      // Login successful
      storeAuthData(authData);
      showWelcomeMessage(authData.displayName);
    } else {
      // Login failed
      showError(authData.error);
    }
  }
}
```

This integration gives you direct user authentication without requiring users to manage API keys manually!
