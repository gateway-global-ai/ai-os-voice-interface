# Workspace MCP — nginx + TLS on `mcp.gatewayglobal.ai` (path prefix)

Ops recipe for hosting **[gateway-global-ai/aios_google_workspace_mcp](https://github.com/gateway-global-ai/aios_google_workspace_mcp)** behind **HTTPS** with URL prefix **`/googleworkspace`** (not `googleworkplace` — matches product naming).

**DNS (done):** `mcp.gatewayglobal.ai` A → `72.61.4.44`  
**Target public base (browser + OAuth):** `https://mcp.gatewayglobal.ai/googleworkspace`  
**This app’s build env:** `VITE_WORKSPACE_MCP_URL=https://mcp.gatewayglobal.ai/googleworkspace` and default `VITE_WORKSPACE_MCP_JSONRPC_PATH=/mcp` → JSON-RPC POST URL `https://mcp.gatewayglobal.ai/googleworkspace/mcp`.

---

## 1. Layout on the server

Canonical path on your server (example production layout):

```text
/opt/gatewayglobal/mcp.gatewayglobal.ai/
  google-workspace-mcp/          # shallow clone of gateway-global-ai/aios_google_workspace_mcp
  google-workspace-mcp/.env      # symlink → ../.env (for load_dotenv)
  deploy/
    nginx/                       # e.g. mcp.gatewayglobal.ai.conf, http-bootstrap for first cert
    systemd/                     # workspace-mcp.service
    README.md                    # operator steps (uv, venv, www-data, HOME/cache dirs)
  .env                           # real secrets — from .env.example; not in git
```

Permissions: e.g. **`.env` mode `640`**, group **`www-data`**, so the service user can read it; edit as root. **Let’s Encrypt** (webroot); ACME contact can be changed with `certbot update_account`.

**TLS / nginx:** Site enabled at `/etc/nginx/sites-enabled/mcp.gatewayglobal.ai` — HTTP→HTTPS, **`/googleworkspace/`** → `http://127.0.0.1:8000/`, redirect `/googleworkspace` → `/googleworkspace/`.

**systemd:** `workspace-mcp.service` — bind **`127.0.0.1:8000`** only; **`uv`** at `/usr/local/bin`; venv owned by **`www-data`** with cache under e.g. `/var/lib/workspace-mcp` per deploy README.

### Post-deploy verification (streamable HTTP)

Confirm **`workspace-mcp.service`** is **active**, then:

| Check | Expected |
|-------|----------|
| **GET** `https://<host>/googleworkspace/mcp` (plain `curl`, no special `Accept`) | **406** — normal for streamable HTTP when **`Accept`** does not include what the server expects (not a misconfiguration). |
| **GET** | Must **not** be **502** (that means nginx cannot reach upstream). |
| **POST** `…/googleworkspace/mcp` with **`Accept: application/json, text/event-stream`** and JSON-RPC **`initialize`** | **200**, **`Content-Type: text/event-stream`**, SSE body with e.g. **`serverInfo.name`** / version (e.g. `google_workspace`, `3.2.0`). |
| Same **POST** to `http://127.0.0.1:8000/mcp` | Same style response (proves app; bypasses nginx). |
| **`tools/list`** on the public URL (reuse **`Mcp-Session-Id`** from **`initialize`** if required) | **200**, SSE JSON-RPC result listing tools (e.g. `search_gmail_messages`, …). |

That proves **TLS → nginx (path strip) → MCP**: the stack answers correctly for the **streamable HTTP** MCP flow (**200** on a proper **`initialize`** POST to the public URL; **`tools/list`** with **`Mcp-Session-Id`** returns a normal tool list). Upstream should listen on **`127.0.0.1:8000`** (or your chosen port) only.

**Clients:** Requests without **`Accept: application/json, text/event-stream`** (or whatever your MCP client uses) will often keep returning **406** — match the transport your stack expects; this is normal streamable HTTP behavior.

#### Failure interpretation (quick)

| Response / symptom | Likely meaning |
|--------------------|----------------|
| **502** | **nginx → upstream** broken (upstream down, wrong socket, wrong `proxy_pass`). |
| **406** on **GET** / bare **`curl`** | **Expected** — missing or wrong **`Accept`** for streamable HTTP (not nginx misconfiguration). |
| **406** on **POST** | Wrong **`Accept`** / **`Content-Type`** or body — compare to golden **`curl`** below. |
| **200** but not **`text/event-stream`** / no SSE | Wrong transport or endpoint — confirm **streamable HTTP** and path **`/mcp`**. |
| **200** SSE but no **`serverInfo`** in stream | **initialize** failed or wrong JSON-RPC — check body and MCP logs. |
| **`tools/list` empty** or error inside result | OAuth not completed for that user, **scope** mismatch, or tool registration — not a proxy issue if **initialize** succeeded. |

**Fault isolation:** If **public URL** fails but **`127.0.0.1:<port>/mcp`** works → **proxy/TLS** path. If **both** fail the same way → **MCP process** or config.

#### Golden test (`curl` — copy/paste)

Minimal **initialize** against upstream (adjust host/port if needed):

```bash
curl -sS -N -X POST "http://127.0.0.1:8000/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "initialize",
    "params": {}
  }'
```

Expect **200** and an **SSE** stream containing **`serverInfo`** (e.g. `google_workspace`). If your server requires a non-empty **`params`** object (protocol version / clientInfo), follow the fork’s examples.

For the **public** URL, use `https://<host>/googleworkspace/mcp` with the same headers and body.

**Ongoing confidence:** `sudo systemctl status workspace-mcp.service` and a quick **`initialize` → `tools/list`** as above. No need to run full OAuth for those protocol checks.

**OAuth vs protocol:** Valid **`GOOGLE_OAUTH_CLIENT_ID`** / **`GOOGLE_OAUTH_CLIENT_SECRET`** (and redirect / **`WORKSPACE_EXTERNAL_URL`**) are required for **real user sign-in** and Workspace-backed tool calls. The server can still complete **initialize** / **tools/list** without a finished Google login — set secrets in server **`.env`**, Google Console redirect **`…/googleworkspace/oauth2callback`**, optional **`OAUTH_ALLOWED_ORIGINS`**, then `sudo systemctl restart workspace-mcp.service` when you change OAuth config.

**OAuth consent screen — Testing:** While the app’s publishing status is **Testing** (Google Cloud → **APIs & Services** → **OAuth consent screen**), only **Test users** you explicitly add there, plus project owners, can complete Google sign-in (Google currently allows on the order of **100** test users). Everyone else is denied until you add their Google account under **Test users** or move to **In production** (which may require verification for sensitive / restricted scopes). Maintain the email list in Console only — **do not** commit personal emails to this repo.

**Privacy Policy / Terms URLs** for the consent screen (when Google asks for app links): canonical **`https://gatewayglobal.ai/privacy`** and **`https://gatewayglobal.ai/terms`**. Authoritative policy text: **`governing_docs/legal/`** (`LEGAL-001`, `LEGAL-002`) — see **[WORKSPACE.md](../WORKSPACE.md)** (*Legal pages — source of truth vs app rendering*).

---

## 2. Run the MCP bound to localhost

Do **not** expose the Python/uv port on `0.0.0.0` if nginx terminates TLS. Listen on **`127.0.0.1`** only (e.g. port **8000**).

**Critical for reverse proxy + OAuth:** set the public origin the server advertises (see upstream README “Reverse Proxy”):

```bash
export WORKSPACE_EXTERNAL_URL="https://mcp.gatewayglobal.ai/googleworkspace"
```

Also set Google OAuth client + Phase 1 flags per **[aios_google_workspace_mcp README](https://github.com/gateway-global-ai/aios_google_workspace_mcp)** (e.g. `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `MCP_ENABLE_OAUTH21=true` for multi-user HTTP, `WORKSPACE_MCP_STATELESS_MODE=true` if you use stateless containers, **`WORKSPACE_MCP_HOST=127.0.0.1`**, **`WORKSPACE_MCP_PORT=8000`**).

**Google Cloud Console — OAuth redirect URIs:** add exactly what the server will use after the path strip, e.g.  
`https://mcp.gatewayglobal.ai/googleworkspace/oauth2callback`  
(confirm against your fork’s actual callback path; align with `GOOGLE_OAUTH_REDIRECT_URI` only if you override it.)

**Consent screen vs runtime:** You may register many scopes in Cloud Console; the MCP requests **`BASE_SCOPES` + scopes for enabled tools only** (`get_scopes_for_tools()`, **`TOOL_SCOPES_MAP`** / **`TOOL_READONLY_SCOPES_MAP`**, or granular mode via **`auth/permissions.py`**). Do **not** add **`gmail.addons.*`**, **`cloud-platform`**, **`https://mail.google.com/`**, or extra Calendar/Drive rows that are not in the fork’s **`scopes.py`** — see **[WORKSPACE.md](../WORKSPACE.md)** (*Google OAuth scopes* and *align scopes with the fork*).

Start with streamable HTTP, e.g.:

```bash
cd /opt/gatewayglobal/mcp.gatewayglobal.ai/google-workspace-mcp
# load .env or export vars
uv run main.py --transport streamable-http
```

Prefer **systemd** or **docker compose** from the fork for restart policy (example unit below).

---

## 3. nginx: TLS + `/googleworkspace/` → upstream root

Install nginx and (on Ubuntu/Debian) `certbot python3-certbot-nginx`.

**First-time certificate** (DNS must already resolve to this box):

```bash
sudo certbot certonly --nginx -d mcp.gatewayglobal.ai
```

Or use **standalone** briefly if no server block exists yet:

```bash
sudo systemctl stop nginx   # if something already bound :80
sudo certbot certonly --standalone -d mcp.gatewayglobal.ai
sudo systemctl start nginx
```

**Server block** (snippet — adjust `ssl_certificate` paths to where certbot put them, often `/etc/letsencrypt/live/mcp.gatewayglobal.ai/`):

```nginx
# /etc/nginx/sites-available/mcp.gatewayglobal.ai
# sudo ln -s ../sites-available/mcp.gatewayglobal.ai /etc/nginx/sites-enabled/

map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    listen [::]:80;
    server_name mcp.gatewayglobal.ai;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name mcp.gatewayglobal.ai;

    ssl_certificate     /etc/letsencrypt/live/mcp.gatewayglobal.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.gatewayglobal.ai/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Hardening (tune as needed)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Strip /googleworkspace/ and forward to MCP on loopback (default fork: JSON-RPC under /mcp)
    location /googleworkspace/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # OAuth 2.1 / GIS: MCP AuthInfoMiddleware reads Authorization (ya29.*) to set authenticated_user_email.
        proxy_set_header Authorization $http_authorization;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
        client_max_body_size 25m;
    }

    location = /googleworkspace {
        return 301 https://$host/googleworkspace/;
    }
}
```

**CORS (browser `fetch` from another origin):** If the app is served from e.g. **`https://gatewayglobal.ai`** while the MCP is **`https://mcp.gatewayglobal.ai`**, the browser blocks responses unless this host sends **`Access-Control-Allow-*`**. Add a `map` in the **`http`** block (see nginx docs) and `add_header` for allowed **`$http_origin`** values, plus **`OPTIONS`** handling for preflight. The **`ai-os-voice-interface`** dev server avoids this for local work by proxying **`/__workspace_mcp`** to this host (see **`.env.example`**). Production builds that use the full **`https://mcp…/googleworkspace`** URL **require** CORS on nginx or the MCP process.

Reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

**Smoke test from your laptop:**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://mcp.gatewayglobal.ai/googleworkspace/mcp
```

Expect **4xx** (e.g. wrong method) rather than **502** — **502** means upstream not listening on `127.0.0.1:8000`.

---

## 4. systemd (example)

`/etc/systemd/system/workspace-mcp.service`:

```ini
[Unit]
Description=Google Workspace MCP (streamable HTTP)
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/gatewayglobal/mcp.gatewayglobal.ai/google-workspace-mcp
EnvironmentFile=/opt/gatewayglobal/mcp.gatewayglobal.ai/.env
ExecStart=/usr/local/bin/uv run main.py --transport streamable-http
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Adjust `User`/`uv` path (`which uv` as deploy user). Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now workspace-mcp.service
sudo systemctl status workspace-mcp.service
```

---

## 5. AI OS voice app (this repo — build-time)

**Where to put vars:** use **`.env.local`** in the project root (copy from **`.env.example`**). Vite loads `.env.local` over `.env`; both are gitignored except `.env.example`. Put **`GEMINI_API_KEY`**, other provider keys, and **`VITE_WORKSPACE_MCP_URL`** here for local dev and production builds on your machine/CI — **not** the MCP server’s Google OAuth secrets (those stay only in **`/opt/.../mcp.gatewayglobal.ai/.env`** on the host).

```env
VITE_WORKSPACE_MCP_URL=https://mcp.gatewayglobal.ai/googleworkspace
# JSON-RPC defaults to /mcp → https://mcp.gatewayglobal.ai/googleworkspace/mcp
# VITE_WORKSPACE_MCP_JSONRPC_PATH=/mcp
```

**CORS:** the browser calls your **public** MCP origin; the fork documents **`OAUTH_ALLOWED_ORIGINS`** on the **server** `.env` if the consent / metadata flow needs your voice app’s origin(s).

---

## 6. Firewall

Ensure **80/443** are open to the world (for Let’s Encrypt + clients); **do not** publish **8000** publicly if the MCP listens on **127.0.0.1** only.

---

## Related

- [WORKSPACE.md](../WORKSPACE.md) — adapter contract and fork pointer
- [pre-workplace-checklist.md](./pre-workplace-checklist.md) — production gate (secrets, intent routing, no bypass)
