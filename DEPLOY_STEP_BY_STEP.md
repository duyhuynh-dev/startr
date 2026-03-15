# Deploy Startr – Step by Step

Deploy **backend on AWS EC2** and **frontend on Vercel**, then connect them.

---

## Before you start

- [ ] GitHub repo is up to date: `git push origin main` (or your branch)
- [ ] Turnstile keys: **Site key** and **Secret key** from Cloudflare (you have these)
- [ ] AWS account with EC2 access
- [ ] Vercel account (connected to GitHub)

---

# Part 1: Backend on EC2

## Step 1.1 – Launch an EC2 instance

1. In **AWS Console** go to **EC2** → **Launch instance**.
2. **Name:** e.g. `startr-backend`.
3. **AMI:** Ubuntu Server 22.04 LTS.
4. **Instance type:** e.g. `t3.micro` (free tier) or `t3.small`.
5. **Key pair:** Create or select one so you can SSH in.
6. **Network / Security group:**
   - Create or edit security group.
   - Inbound rules:
     - **SSH (22)** from your IP (or 0.0.0.0/0 only for testing).
     - **HTTP (80)** from 0.0.0.0/0 (for Nginx later, or API if you use port 80).
     - **Custom TCP (8012)** from 0.0.0.0/0 if you expose the API directly on 8012.
   - Save and launch.

7. After it’s running, note the **Public IPv4 address** (e.g. `3.xxx.xxx.xxx`).

---

## Step 1.2 – Connect and install dependencies

From your laptop (replace `your-key.pem` and `3.xxx.xxx.xxx`):

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@3.xxx.xxx.xxx
```

On the EC2 instance:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y software-properties-common
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev git postgresql postgresql-contrib redis-server
sudo systemctl enable postgresql redis-server
sudo systemctl start postgresql redis-server
```

Install **uv** (for running the backend):

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.local/bin/env  # or close and reopen SSH
```

---

## Step 1.3 – PostgreSQL: create DB and user

On EC2:

```bash
sudo -u postgres psql
```

In `psql`:

```sql
CREATE USER startr WITH PASSWORD 'your_secure_password';
CREATE DATABASE vc_matcher OWNER startr;
\q
```

Remember the password; you’ll use it in `DATABASE_URL`.

---

## Step 1.4 – Clone repo and set up backend

On EC2:

```bash
cd $HOME
git clone https://github.com/duyhuynh-dev/startr.git
cd startr/backend
```

Create `.env` (copy from your laptop or paste in):

```bash
nano .env
```

Minimum for production:

```env
# Database (use the user/password from Step 1.3)
DATABASE_URL=postgresql+psycopg://startr:your_secure_password@localhost:5432/vc_matcher

# Redis (default)
REDIS_URL=redis://localhost:6379/0

# Security – generate a new random string for production
SECRET_KEY=your-long-random-secret-key-here

# Frontend URL (your Vercel URL)
FRONTEND_URL=https://startr-duy.vercel.app

# CORS – allow your Vercel app
CORS_ORIGINS=https://startr-duy.vercel.app

# Turnstile (from Cloudflare)
TURNSTILE_SITE_KEY=your_site_key
TURNSTILE_SECRET_KEY=your_secret_key
```

Save and exit (`Ctrl+O`, Enter, `Ctrl+X`).

---

## Step 1.5 – Python env, install deps, migrations

Still in `~/startr/backend`:

```bash
uv venv
source .venv/bin/activate
uv sync
```

Run migrations:

```bash
uv run alembic upgrade head
```

If you get “no such table” or first deploy, ensure migrations are up to date locally and committed, then run again.

---

## Step 1.6 – Test run

```bash
uv run uvicorn app.main:app --host 0.0.0.0 --port 8012
```

From your laptop browser open: `http://3.xxx.xxx.xxx:8012/healthz`  
You should see `{"status":"ok"}`.

Stop the server: `Ctrl+C`.

---

## Step 1.7 – Run backend as a service (systemd)

So the backend restarts on reboot and stays up. Use the service file from the repo:

```bash
cd ~/startr/backend
sudo cp deploy/startr-backend.service /etc/systemd/system/
```

If your EC2 user is not `ubuntu`, edit the unit: `sudo nano /etc/systemd/system/startr-backend.service` and replace `/home/ubuntu` with your home (e.g. `/home/ec2-user`). Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable startr-backend
sudo systemctl start startr-backend
sudo systemctl status startr-backend
```

Check again: `http://3.xxx.xxx.xxx:8012/healthz` → `{"status":"ok"}`.

**Backend base URL:** `http://3.xxx.xxx.xxx:8012`  
**API base URL for frontend:** `http://3.xxx.xxx.xxx:8012/api/v1`

---

## (Optional) Step 1.8 – Nginx + HTTPS with a domain

If you have a domain (e.g. `api.yourdomain.com`):

1. Point **api.yourdomain.com** (A record) to the EC2 **Elastic IP** (allocate one in EC2 and associate it with the instance).
2. On EC2 install Nginx and Certbot:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

3. Copy and edit the Nginx config from the repo:

```bash
cd ~/startr/backend
sudo cp deploy/nginx-site.conf /etc/nginx/sites-available/startr-api
sudo nano /etc/nginx/sites-available/startr-api   # set server_name to api.yourdomain.com
sudo ln -s /etc/nginx/sites-available/startr-api /etc/nginx/sites-enabled/
sudo certbot --nginx -d api.yourdomain.com
sudo nginx -t && sudo systemctl reload nginx
```

Then use **`https://api.yourdomain.com/api/v1`** as the frontend API URL. If you skip this, use **`http://3.xxx.xxx.xxx:8012/api/v1`** in the next part.

---

# Part 2: Frontend on Vercel

## Step 2.1 – Connect repo to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub).
2. **Add New** → **Project**.
3. Import **duyhuynh-dev/startr** (or your repo).
4. **Root Directory:** set to **`frontend`** (not the repo root).
5. **Framework Preset:** Next.js (auto-detected). Leave build/output as default.

---

## Step 2.2 – Environment variables (Vercel)

In the project **Settings** → **Environment Variables**, add:

| Name | Value | Environment |
|------|--------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://3.xxx.xxx.xxx:8012/api/v1` (or `https://api.yourdomain.com/api/v1` if you did Step 1.8) | Production, Preview |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Your Cloudflare Turnstile **site key** | Production, Preview |

Replace `3.xxx.xxx.xxx` with your EC2 public IP (or your API domain).

---

## Step 2.3 – Deploy

Click **Deploy**. Wait for the build to finish. Your app will be at e.g. **https://startr-duy.vercel.app**.

---

# Part 3: Connect and test

## Step 3.1 – CORS

Backend must allow your Vercel origin. On EC2 you already set:

```env
CORS_ORIGINS=https://startr-duy.vercel.app
```

If your Vercel URL is different, update `.env` on EC2 and restart:

```bash
sudo systemctl restart startr-backend
```

---

## Step 3.2 – Quick tests

1. Open **https://startr-duy.vercel.app** (or your Vercel URL).
2. **Sign up** or **Log in** – Turnstile should appear and work.
3. Complete **onboarding** if needed.
4. Open **Discover** – profiles should load from the EC2 backend.
5. Try **Due diligence** on a profile.

If something fails, check:

- Browser **Network** tab: is the request going to the right API URL? Any CORS errors?
- EC2: `sudo journalctl -u startr-backend -f` for backend logs.

---

## Summary

| What | Where | URL / note |
|------|--------|------------|
| Backend | EC2 | `http://<EC2_IP>:8012` or `https://api.yourdomain.com` |
| API base (for frontend) | — | `http://<EC2_IP>:8012/api/v1` or `https://api.yourdomain.com/api/v1` |
| Frontend | Vercel | `https://startr-duy.vercel.app` (or your project URL) |
| DB | EC2 (or RDS) | `localhost:5432` / `vc_matcher` |
| Redis | EC2 | `localhost:6379` |

**Future backend updates on EC2:** from the repo root run the deploy script so it pulls, syncs, migrates, and restarts:

```bash
cd ~/startr && bash backend/deploy/deploy.sh
```

After any change to frontend: push to GitHub; Vercel will redeploy automatically.
