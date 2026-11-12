# Deploying the Kith guest guide to Coolify

The folder is a self-contained static site. `Dockerfile` serves it with nginx
(video/mp4 MIME types and byte-range seeking work out of the box).

## Steps in Coolify

1. Push this folder to a GitHub repo (or a repo subdirectory).
2. Coolify: **+ New Resource → Application** → connect the repo.
3. Build Pack: **Dockerfile**. Port: **80**.
4. Domains: add `https://kith.mkguirguis.com` (set as primary).
5. **Deploy.**

`*.mkguirguis.com` already routes through the Cloudflare homelab tunnel, so no
DNS changes are needed. Once Coolify issues the certificate the link is live.

## Updating the guide later

Edit `index.html`, push, and hit **Redeploy** in Coolify. The HTML is never
cached, so guests see updates immediately; videos and posters are cached for
30 days for fast repeat loads.
