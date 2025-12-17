## Cloudflare Proxy

This application serves as a proxy for HLS streams, Images and enabling secure access to media content.

### Deploy Using Cloudflare deploy button

- Enter valid Cloudflare API key and Account ID.
- Enable github workflows
- Run **`deploy`** workflow in your forked repo actions `https://github.com/[User-Name]/[Repo-Name]/actions/workflows/deploy.yml` .
- (Optional) When running the workflow manually, you can specify a custom worker name in the workflow inputs. If not specified, it defaults to `roxyp_1`.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/JMcrafter26/Roxy-Proxy)

> [!TIP]
> Dont' forget to run the workflow

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
