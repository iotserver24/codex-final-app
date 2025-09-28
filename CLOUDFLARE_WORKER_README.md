# Cloudflare Worker - Subdomain Proxy System

## Overview

This Cloudflare Worker enables dynamic subdomain routing for the CodeX application, allowing users to access personalized instances (E2B, Vercel, etc.) through custom subdomains like `alice.kitoryd.cc`.

## Features

- **Dynamic Subdomain Routing**: Maps `subdomain.kitoryd.cc` → target URLs
- **Redis-Powered Storage**: Uses Upstash Redis for persistent mappings
- **TTL Management**: Configurable expiration times (-1 = permanent)
- **Badge Injection**: Optional "Made with Codex" floating badge
- **Admin API**: REST endpoints for managing subdomain mappings
- **Automatic Cleanup**: Expired mappings are automatically removed

## Architecture

```
User Request → subdomain.kitoryd.cc → Cloudflare Worker
    ↓
Redis Lookup → Get mapping configuration
    ↓
Proxy Request → Forward to target (E2B/Vercel instance)
    ↓
Badge Injection → Add "Made with Codex" if enabled
```

## Configuration

The worker uses these hardcoded constants (update in `workers/index.js`):

```javascript
const UPSTASH_REST_URL = "https://enabled-mammoth-11161.upstash.io";
const UPSTASH_REST_TOKEN =
  "ASuZAAIncDI3YjE2MmJjOTMyODk0MDkwYjkzMDAwOGVkOTg4NWFmZHAyMTExNjE";
const ADMIN_PASSWORD = "add@123";
const ROOT_DOMAIN = "kitoryd.cc";
```

## Redis Data Model

Each subdomain stores a JSON configuration:

```json
{
  "target": "https://xyz.e2b.dev",
  "ttl": 86400,
  "badge": true,
  "createdAt": 1699123456
}
```

## Admin API Endpoints

### Register Subdomain Mapping

**POST** `/_register`

```json
{
  "password": "add@123",
  "subdomain": "alice",
  "target": "https://jshdudhhd.e2b.dev",
  "ttl_seconds": 86400,
  "badge": true
}
```

### Delete Subdomain Mapping

**POST** `/_delete`

```json
{
  "password": "add@123",
  "subdomain": "alice"
}
```

## Usage Examples

### Free Trial (24 hours with badge)

```bash
curl -X POST https://your-worker.workers.dev/_register \
  -H "Content-Type: application/json" \
  -d '{
    "password": "add@123",
    "subdomain": "trial",
    "target": "https://trial-app.e2b.dev",
    "ttl_seconds": 86400,
    "badge": true
  }'
```

### Paid Instance (permanent, no badge)

```bash
curl -X POST https://your-worker.workers.dev/_register \
  -H "Content-Type: application/json" \
  -d '{
    "password": "add@123",
    "subdomain": "pro",
    "target": "https://my-app.vercel.app",
    "ttl_seconds": -1,
    "badge": false
  }'
```

## Integration with CodeX App

### Backend Integration

Add to your existing IPC handlers or API routes:

```typescript
// In your backend (main process or API routes)
async function registerSubdomain(
  subdomain: string,
  target: string,
  ttl: number,
  badge: boolean,
) {
  const response = await fetch("https://your-worker.workers.dev/_register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      password: "add@123",
      subdomain,
      target,
      ttl_seconds: ttl,
      badge,
    }),
  });

  return await response.json();
}

async function deleteSubdomain(subdomain: string) {
  const response = await fetch("https://your-worker.workers.dev/_delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      password: "add@123",
      subdomain,
    }),
  });

  return await response.json();
}
```

### Frontend Integration

Add UI components for subdomain management:

```typescript
// React hook for subdomain management
export function useSubdomainManager() {
  const registerSubdomain = async (config: {
    subdomain: string;
    target: string;
    ttl: number;
    badge: boolean;
  }) => {
    const response = await fetch("/api/subdomain/register", {
      method: "POST",
      body: JSON.stringify(config),
    });
    return await response.json();
  };

  const deleteSubdomain = async (subdomain: string) => {
    const response = await fetch("/api/subdomain/delete", {
      method: "POST",
      body: JSON.stringify({ subdomain }),
    });
    return await response.json();
  };

  return { registerSubdomain, deleteSubdomain };
}
```

## Deployment Steps

1. **Install Wrangler CLI**:

   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**:

   ```bash
   wrangler login
   ```

3. **Deploy Worker**:

   ```bash
   cd workers
   wrangler deploy
   ```

4. **Configure Custom Domain**:
   - Go to Cloudflare Dashboard → Your Domain
   - Add CNAME: `*.kitoryd.cc` → `your-worker.workers.dev`
   - Enable proxy (orange cloud)

## Badge Features

The floating badge appears on HTML pages when `badge: true`:

- **Position**: Fixed bottom-right corner
- **Styling**: Dark semi-transparent background with white text
- **Link**: Points to `https://kitoryd.cc`
- **Persistence**: Uses MutationObserver to survive DOM changes
- **Responsive**: Maintains position across different screen sizes

## Error Handling

- **Invalid subdomain**: Returns clean "Not Configured" page
- **Expired mappings**: Auto-deleted and shows default page
- **Proxy failures**: Falls back to default page with 502 status
- **Redis errors**: Graceful degradation with error logging
- **Admin auth**: 401 for invalid passwords

## Security Considerations

- **Admin Password**: Currently hardcoded (use Cloudflare secrets in production)
- **Redis Credentials**: Hardcoded (use Cloudflare secrets in production)
- **Rate Limiting**: Consider implementing for admin endpoints
- **Input Validation**: Add sanitization for subdomain names
- **HTTPS Only**: Worker enforces secure connections

## Use Cases

1. **Free Trials**: 24-hour E2B instances with badge
2. **Paid Subscriptions**: Permanent Vercel deployments without badge
3. **Sponsored Projects**: Permanent instances with attribution badge
4. **Demo Environments**: Temporary showcases with automatic cleanup
5. **Development Sandboxes**: Isolated environments for testing

## Monitoring & Logs

The worker logs to Cloudflare's logging system:

- Redis API errors
- Proxy failures
- Admin operation results
- Badge injection status

Access logs via Cloudflare Dashboard → Analytics → Logs.

## Cost Considerations

- **Cloudflare Workers**: Free tier covers most use cases
- **Upstash Redis**: Free tier (10,000 requests/month) sufficient for light usage
- **Bandwidth**: Worker requests count toward Cloudflare bandwidth limits
- **Custom Domains**: Requires Cloudflare Pro plan for unlimited custom domains

## Troubleshooting

### Common Issues

1. **Subdomain not working**: Check DNS CNAME configuration
2. **Redis connection failed**: Verify Upstash credentials
3. **Badge not appearing**: Ensure target returns HTML with proper content-type
4. **Admin endpoints failing**: Verify password and JSON format

### Debug Mode

Add temporary logging:

```javascript
console.log("Request:", request.url, hostname);
console.log("Subdomain:", subdomain);
console.log("Mapping:", mapping);
```

## Future Enhancements

- Environment-based configuration
- Database integration for user management
- Analytics tracking
- Custom badge styling options
- Webhook notifications for mapping changes
- Multi-domain support
- Caching layer for improved performance
