## Cloudflare Proxy

This application serves as a proxy for HLS streams, Images and enabling secure access to media content.

### Deploy Using Actions

> [!tip]
> This is a detailed guide, so it may look long, but it's quite simple to follow.

1. Fork this repository to your GitHub account.
2. Create a [Cloudflare API token](https://dash.cloudflare.com/profile/api-tokens), select the `Edit Cloudflare Workers` template.
3. Copy the API token.
4. Go to `Settings > Secrets and variables > Actions` in your forked repository.
5. Add a new secret with the name `CLOUDFLARE_API_TOKEN` and your Cloudflare API token as the value.
6. Go to the `Actions` tab in your forked repository.
7. Select the `Deploy` workflow from the left sidebar.
8. Click the `Run workflow` button, you can enter a custom name for your worker in the input field.
9. Click the green `Run workflow` button to start the deployment.
10. Wait for the workflow to complete, your worker will be deployed to your Cloudflare account.
11. You can find the URL of your deployed worker in the workflow logs under the `Deploy Worker` step or in your Cloudflare dashboard.
12. It will be in the format: `https://<your-worker-name>.<your-subdomain>.workers.dev`

### Deploy Manually

- Setup wrangler on your system.
- Download the source code.
- Run `npm install`
- Run `npm run dev` or `wrangler dev` in your terminal to start a development server
- Open a browser tab at http://localhost:8787/ to see your worker in action
- Run `wrangler deploy` to publish your worker

### Proxy Endpoint

- `/proxy` - for HLS
- `/cors` - for Images/Web pages
- `/image` - for Images/Web pages
- `/thumbnail` - for thumbnail images

Use the following format to access the proxy:

```
/proxy?url=<encoded_m3u8_url>&headers=<encoded_headers>
```

- **`url`**: Base64-encoded M3U8 URL.
- **`headers`**: (Optional) Base64-encoded JSON string for custom headers.

---

### Encoding Instructions

#### Encode M3U8 URL:

```javascript
btoa('https://example.com/stream.m3u8');
```

or you can do this.

```javascript
encodeURIComponent('https://example.com/stream.m3u8');
```

#### Encode Headers (if needed):

```javascript
btoa(JSON.stringify({ Referer: 'https://kiwik.si' }));
```

or you can do this.

```javascript
encodeURIComponent(JSON.stringify({ Referer: 'https://kiwik.si' }));
```

#### Referer header

Just add `ref` to the url

```URL
&ref=example.com
```

## Hianime Streams Loading Issue

### 🚨 Problem

Hianime video streams fail to load when accessed through Cloudflare Workers proxy instead use Vercel instance.

## Root Cause

Cloudflare Workers ignore custom HTTPS ports (e.g., `:2228`) in `fetch()` requests after deployment.

| Environment                    | Status   |
| ------------------------------ | -------- |
| Development (`wrangler dev`)   | ✅ Works |
| Production (`wrangler deploy`) | ❌ Fails |

## ℹ️ Cloudflare Known Issue

This is a documented limitation of Cloudflare Workers:

[Fetch requests ignore non-standard HTTPS ports](https://developers.cloudflare.com/workers/platform/known-issues/#fetch-requests-ignore-non-standard-https-ports)

[Custom ports for outgoing HTTPS requests from Workers are ignored · Issue #5998 · cloudflare/cloudflare-docs](https://github.com/cloudflare/cloudflare-docs/issues/5998)

**Affected Scenarios:**

- All `fetch()` requests to non-standard HTTPS ports (e.g., `:2228`, `:8443`)
- Any Worker making requests to custom HTTPS ports
