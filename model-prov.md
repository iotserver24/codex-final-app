# Xibe API Wrapper — Pollinations Integration

This document describes the local API server that wraps Pollinations.ai and enforces per-key usage limits. It covers environment variables, headers, endpoints, example cURL, and response formats.

## Overview

- The frontend generates and manages user API keys.
- The backend `/api` server:
  - Verifies `x-api-key`
  - Enforces daily limits
  - Decrements usage by 1 before forwarding proxy requests
  - Wraps Pollinations endpoints
  - Reads the Pollinations token from environment

## Environment

Create `api/.env` from `api/.env.example` and set:

```ini
PORT=3001
CORS_ORIGIN=http://localhost:3000
POLLINATIONS_TOKEN=your_pollinations_token_here
```

Frontend `.env.local` should include:

```ini
VITE_API_URL=https://api.xibe.app/api
```

## Auth Header

All wrapper endpoints require this header:

```http
x-api-key: <your_client_api_key>
```

If the key is missing/invalid/inactive or exceeds daily limit, the server responds with an error (see Errors).

## Base URL

```
https://api.xibe.app/api
```

## Endpoints

### 1) Verify API Key — No Decrement

- Method: GET
- Path: `/verifyApiKeyInfo`
- Purpose: Check validity and get usage without decrementing

Example:

```bash
curl -s -X GET "https://api.xibe.app/api/verifyApiKeyInfo" \
  -H "x-api-key: XAI_MX4AQ4I9PbIqv42P1pMBaTEd8Nqlcdzi"
```

Response:

```json
{
  "valid": true,
  "userId": "user_123",
  "usage": 12,
  "limit": 1000,
  "remaining": 988,
  "resetTime": "2025-01-02T00:00:00.000Z"
}
```

### 2) Remaining Usage — No Decrement

- Method: GET
- Path: `/getUsageCount`
- Purpose: Return remaining usage for today

Example:

```bash
curl -s -X GET "https://api.xibe.app/api/getUsageCount" \
  -H "x-api-key: <your_key>"
```

Response:

```json
{
  "valid": true,
  "remaining": 988,
  "usage": 12,
  "limit": 1000,
  "resetTime": "2025-01-02T00:00:00.000Z"
}
```

### 3) Decrement Usage — Manual

- Method: POST
- Path: `/decrementUsage`
- Purpose: Decreases usage by 1 (for manual accounting)

Example:

```bash
curl -s -X POST "https://api.xibe.app/api/decrementUsage" \
  -H "x-api-key: <your_key>"
```

Response:

```json
{
  "valid": true,
  "success": true,
  "message": "Usage count decreased by 1",
  "userId": "user_123",
  "usage": 13,
  "limit": 1000,
  "remaining": 987,
  "resetTime": "2025-01-02T00:00:00.000Z"
}
```

### 4) Xibe AI Chat Completions — Consumes 1

- Method: POST
- Path: `/xibe/*`
- Description: Xibe AI chat completions with OpenAI-compatible API.
- Behavior: Server proxies to AI service with proper authentication

Example (chat completions):

```bash
curl -s -X POST "https://api.xibe.app/api/xibe/v1/chat/completions" \
  -H "x-api-key: <your_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

Response (Xibe AI JSON):

```json
{
  "id": "...",
  "choices": [{ "message": { "role": "assistant", "content": "Hi!" } }]
}
```

### 6) Xibe AI Simple Prompt — Consumes 1

- Method: GET
- Path: `/xibe/simple?prompt=...`
- Description: Simple text generation with URL-encoded prompt

Example:

```bash
curl -s "https://api.xibe.app/api/xibe/simple?prompt=Write%20a%20haiku" \
  -H "x-api-key: <your_key>"
```

Response: Plain text or JSON depending on upstream.

### 7) Xibe AI Models — No Decrement

- Method: GET
- Path: `/xibe/models`
- Description: Get list of available AI models

Example:

```bash
curl -s "https://api.xibe.app/api/xibe/models"
```

Response:

```json
[ { "name": "gpt-4o-mini", "label": "GPT-4o Mini" }, ... ]
```

## Errors

- 401 Invalid or missing API key

```json
{ "error": "Invalid API key", "valid": false }
```

- 403 Key inactive

```json
{ "error": "API key is inactive", "valid": false }
```

- 429 Daily limit exceeded

```json
{
  "error": "Daily limit exceeded",
  "valid": false,
  "usage": 1000,
  "limit": 1000,
  "remaining": 0
}
```

- 502 Upstream failure (AI Service)

```json
{
  "error": "AI service temporarily unavailable",
  "detail": {
    /* service body */
  }
}
```

## Typical Flows

### A) Safe AI call flow

1. GET `/getUsageCount` → ensure `remaining > 0`
2. POST `/xibe/v1/chat/completions` → consumes 1 (auto)
3. Handle response

### B) Manual decrement flow

1. GET `/getUsageCount` → ensure `remaining > 0`
2. Call your own AI pipeline
3. POST `/decrementUsage` → consumes 1 (manual)

## Notes

- Usage is tracked per API key per-day and resets at midnight UTC.
- `POLLINATIONS_TOKEN` is never exposed to clients; the server injects it into upstream requests.
- `/xibe/models` is free (no usage consumption) for UI population.
