# Backend deployment (EC2)

Copy these files to your EC2 server when following `DEPLOY_STEP_BY_STEP.md`.

| File | Purpose |
|------|---------|
| `startr-backend.service` | systemd unit – copy to `/etc/systemd/system/`, edit user/path if needed, then `systemctl enable --now startr-backend` |
| `nginx-site.conf` | Optional Nginx reverse proxy for HTTPS – copy to `/etc/nginx/sites-available/`, edit domain, enable, run certbot |
| `deploy.sh` | After first deploy: run from repo root (`cd ~/startr && bash backend/deploy/deploy.sh`) to pull, sync, migrate, and restart the backend |
