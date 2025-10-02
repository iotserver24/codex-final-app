# API Key Verification & Usage Tracking

This document explains how to verify API keys and manage usage tracking for the Xibe AI platform.

## 🎯 **Overview**

The Xibe AI API provides several endpoints for API key verification and usage tracking. These endpoints allow you to:

- Verify if an API key is valid
- Check current usage and remaining requests
- Decrement usage count for each API call
- Get detailed usage information

## 🔑 **API Key Management**

### **Getting an API Key**

1. Sign up at [https://xibe.app](https://xibe.app)
2. Sign in with GitHub
3. Go to Dashboard → API Keys
4. Create a new API key
5. Copy the generated key (keep it secure!)

### **API Key Format**

```
XAI_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Example:**

```
XAI_AbC123DeF456GhI789JkL012MnO345PqR678
```

## 📡 **API Endpoints**

### **Base URL**

```
https://api.xibe.app/api
```

### **Authentication**

All endpoints require the API key in the request header:

```http
x-api-key: XAI_your-api-key-here
```

## 🔍 **1. Verify API Key (Check Only)**

**Endpoint:** `GET /api/verifyApiKeyInfo`

**Description:** Verifies if an API key is valid without consuming usage.

**Request:**

```http
GET /api/verifyApiKeyInfo
x-api-key: XAI_your-api-key-here
```

**Response (Success):**

```json
{
  "valid": true,
  "userId": "user123",
  "usage": 45,
  "limit": 100,
  "remaining": 55,
  "resetTime": "2024-01-02T00:00:00.000Z",
  "planType": "free",
  "planName": "Free Plan"
}
```

**Response (Invalid Key):**

```json
{
  "error": "Invalid API key",
  "valid": false
}
```

**Response (Inactive Key):**

```json
{
  "error": "API key is inactive",
  "valid": false
}
```

## 📊 **2. Get Usage Count**

**Endpoint:** `GET /api/getUsageCount`

**Description:** Gets current usage statistics without consuming usage.

**Request:**

```http
GET /api/getUsageCount
x-api-key: XAI_your-api-key-here
```

**Response:**

```json
{
  "valid": true,
  "remaining": 55,
  "usage": 45,
  "limit": 100,
  "resetTime": "2024-01-02T00:00:00.000Z",
  "planType": "free",
  "planName": "Free Plan"
}
```

## ⬇️ **3. Decrement Usage**

**Endpoint:** `POST /api/decrementUsage`

**Description:** Decrements usage count by 1. Use this for each API call you make.

**Request:**

```http
POST /api/decrementUsage
x-api-key: XAI_your-api-key-here
Content-Type: application/json
```

**Response (Success):**

```json
{
  "valid": true,
  "success": true,
  "message": "Usage count decreased by 1",
  "userId": "user123",
  "usage": 46,
  "limit": 100,
  "remaining": 54,
  "resetTime": "2024-01-02T00:00:00.000Z",
  "planType": "free",
  "planName": "Free Plan"
}
```

**Response (Limit Exceeded):**

```json
{
  "error": "Daily limit exceeded",
  "valid": false,
  "usage": 100,
  "limit": 100,
  "remaining": 0,
  "planType": "free",
  "planName": "Free Plan"
}
```

## 🔄 **4. Verify + Decrement (Legacy)**

**Endpoint:** `POST /api/verifyApiKey`

**Description:** Legacy endpoint that both verifies and decrements usage in one call.

**Request:**

```http
POST /api/verifyApiKey
x-api-key: XAI_your-api-key-here
Content-Type: application/json
```

**Response:** Same as `/api/decrementUsage`

## 📋 **Response Fields**

| Field       | Type    | Description                              |
| ----------- | ------- | ---------------------------------------- |
| `valid`     | boolean | Whether the API key is valid             |
| `userId`    | string  | User ID associated with the API key      |
| `usage`     | number  | Current usage count for today            |
| `limit`     | number  | Daily limit for the user's plan          |
| `remaining` | number  | Remaining requests for today             |
| `resetTime` | string  | When the usage counter resets (ISO 8601) |
| `planType`  | string  | Plan type (free, pro, enterprise)        |
| `planName`  | string  | Human-readable plan name                 |

## 🚨 **Error Responses**

### **401 Unauthorized**

```json
{
  "error": "API key is required",
  "valid": false
}
```

### **403 Forbidden**

```json
{
  "error": "API key is inactive",
  "valid": false
}
```

### **429 Too Many Requests**

```json
{
  "error": "Daily limit exceeded",
  "valid": false,
  "usage": 100,
  "limit": 100,
  "remaining": 0,
  "planType": "free",
  "planName": "Free Plan"
}
```

### **500 Internal Server Error**

```json
{
  "error": "Internal server error",
  "valid": false
}
```

## 💡 **Usage Patterns**

### **Pattern 1: Check Before Use**

```javascript
// 1. Check if API key is valid and has remaining usage
const checkResponse = await fetch("https://api.xibe.app/api/getUsageCount", {
  headers: {
    "x-api-key": "sk-your-api-key-here",
  },
});

const checkData = await checkResponse.json();

if (!checkData.valid || checkData.remaining <= 0) {
  console.log("API key invalid or limit exceeded");
  return;
}

// 2. Make your actual API call
// ... your API call here ...

// 3. Decrement usage after successful call
await fetch("https://api.xibe.app/api/decrementUsage", {
  method: "POST",
  headers: {
    "x-api-key": "sk-your-api-key-here",
    "Content-Type": "application/json",
  },
});
```

### **Pattern 2: Verify and Decrement in One Call**

```javascript
// Use the legacy endpoint for simplicity
const response = await fetch("https://api.xibe.app/api/verifyApiKey", {
  method: "POST",
  headers: {
    "x-api-key": "sk-your-api-key-here",
    "Content-Type": "application/json",
  },
});

const data = await response.json();

if (!data.valid) {
  console.log("API key invalid or limit exceeded");
  return;
}

// Proceed with your API call
// Usage has already been decremented
```

### **Pattern 3: Batch Operations**

```javascript
// For multiple API calls, check usage first
const usageResponse = await fetch("https://api.xibe.app/api/getUsageCount", {
  headers: {
    "x-api-key": "sk-your-api-key-here",
  },
});

const usageData = await usageResponse.json();

if (usageData.remaining < numberOfCalls) {
  console.log("Not enough remaining requests");
  return;
}

// Make all your API calls
for (let i = 0; i < numberOfCalls; i++) {
  // ... your API call ...

  // Decrement usage after each call
  await fetch("https://api.xibe.app/api/decrementUsage", {
    method: "POST",
    headers: {
      "x-api-key": "sk-your-api-key-here",
      "Content-Type": "application/json",
    },
  });
}
```

## 📈 **Plan Limits**

| Plan       | Daily Limit | Description                 |
| ---------- | ----------- | --------------------------- |
| Free       | 100         | Basic usage for testing     |
| Pro        | 1000        | For commercial applications |
| Enterprise | 10000       | For high-volume usage       |

## 🔄 **Usage Reset**

- Usage counters reset daily at **00:00 UTC**
- `resetTime` field shows when the next reset will occur
- Usage is tracked per user, not per API key

## 🛡️ **Security Best Practices**

1. **Keep API Keys Secret**: Never expose API keys in client-side code
2. **Use HTTPS**: Always use HTTPS for API requests
3. **Rotate Keys**: Regularly rotate your API keys
4. **Monitor Usage**: Check usage regularly to avoid hitting limits
5. **Error Handling**: Always handle API errors gracefully

## 📝 **Example Implementations**

### **Node.js**

```javascript
const axios = require("axios");

class XibeAIAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = "https://api.xibe.app/api";
  }

  async checkUsage() {
    const response = await axios.get(`${this.baseURL}/getUsageCount`, {
      headers: {
        "x-api-key": this.apiKey,
      },
    });
    return response.data;
  }

  async decrementUsage() {
    const response = await axios.post(
      `${this.baseURL}/decrementUsage`,
      {},
      {
        headers: {
          "x-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  }

  async makeAPICall() {
    // Check usage first
    const usage = await this.checkUsage();

    if (!usage.valid || usage.remaining <= 0) {
      throw new Error("API key invalid or limit exceeded");
    }

    // Make your actual API call here
    // ... your API call ...

    // Decrement usage
    await this.decrementUsage();
  }
}
```

### **Python**

```python
import requests

class XibeAIAPI:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = 'https://api.xibe.app/api'
        self.headers = {
            'x-api-key': api_key,
            'Content-Type': 'application/json'
        }

    def check_usage(self):
        response = requests.get(f'{self.base_url}/getUsageCount', headers=self.headers)
        return response.json()

    def decrement_usage(self):
        response = requests.post(f'{self.base_url}/decrementUsage', headers=self.headers)
        return response.json()

    def make_api_call(self):
        # Check usage first
        usage = self.check_usage()

        if not usage['valid'] or usage['remaining'] <= 0:
            raise Exception('API key invalid or limit exceeded')

        # Make your actual API call here
        # ... your API call ...

        # Decrement usage
        self.decrement_usage()
```

### **cURL Examples**

```bash
# Check usage
curl -X GET "https://api.xibe.app/api/getUsageCount" \
  -H "x-api-key: XAI_your-api-key-here"

# Decrement usage
curl -X POST "https://api.xibe.app/api/decrementUsage" \
  -H "x-api-key: XAI_your-api-key-here" \
  -H "Content-Type: application/json"

# Verify key (legacy)
curl -X POST "https://api.xibe.app/api/verifyApiKey" \
  -H "x-api-key: XAI_your-api-key-here" \
  -H "Content-Type: application/json"
```

## 🔗 **Related Documentation**

- [Desktop App Authentication](./DESKTOP_AUTH_INTEGRATION.md)
- [Releases Management](./RELEASES_SYSTEM.md)
- [API Reference](./API_REFERENCE.mdx)

## 📞 **Support**

If you need help with API key verification or usage tracking:

1. Check your API key is correct
2. Verify you're using the right endpoint
3. Check your daily usage limits
4. Contact support if issues persist

---

_Last updated: January 2024_
