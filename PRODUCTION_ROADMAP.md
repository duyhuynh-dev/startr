# Production Roadmap: VC-Founder Matching Platform

**Generated:** 2025-11-30
**Status:** Backend 95% Complete, Infrastructure Setup Required

---

## Current State Assessment

### ✅ What's Already Built (Backend)

Your backend is **production-ready** with:

1. **Database Layer**
   - PostgreSQL with proper schema
   - User/Profile/Like/Match/Message tables
   - Daily limits, passes, profile views tracking
   - Alembic migrations for schema versioning

2. **Matching Engine**
   - ML-based similarity (sentence-transformers embeddings)
   - Heuristic fallback (sector/stage/location alignment)
   - Weighted ranking: 60% ML + 30% diligence + 10% engagement
   - Mutual matching logic (founder ↔ investor only)

3. **Discovery Feed Algorithm**
   - Redis-cached ranked profiles
   - Excludes already matched/liked/passed
   - Cursor-based pagination for scale
   - 5-minute feed cache, 1-hour compatibility cache

4. **Supporting Services**
   - Real-time messaging (WebSocket)
   - Due diligence scoring (ETL pipeline ready)
   - File storage (MinIO/S3)
   - JWT authentication
   - Email verification

5. **Performance Optimizations**
   - Multi-level Redis caching
   - Graceful fallback on cache misses
   - Embedding vector caching
   - Query optimization with indexes

### ⚠️ What Needs Work

**Immediate (< 1 week):**
- Fix frontend UI bugs (currently addressing)
- Test end-to-end flow with 2 test users
- Remove rose feature complexity
- Simplify to core: Like → Match → Message flow

**Infrastructure (1-2 weeks):**
- Deploy on AWS/GCP free tier
- Set up K3s on single VM
- Configure production PostgreSQL
- Set up Redis cluster
- Configure MinIO/S3 for file storage

**ML Pipeline (2-3 weeks):**
- Replace sentence-transformers with Ollama (local embeddings)
- Set up embedding generation service
- Implement nightly retraining pipeline
- Add Kafka/RabbitMQ for event streaming

**MLOps (3-4 weeks):**
- Deploy KubeFlow/Argo Workflows
- Set up Prometheus + Grafana monitoring
- Implement audit logging service
- Add performance dashboards

---

## Phase 1: Get Basic Flow Working (THIS WEEK)

**Goal:** Founder can discover investors, send likes, match, and message.

### Step 1.1: Fix Frontend Issues (Today)

```bash
# Current error: Circular structure when clicking "Interested"
# Fix: Update ProfileCard to pass parameters correctly (DONE)

cd frontend
npm run dev

# Test:
# 1. Click "Interested" → should send like
# 2. Check daily limits decrease
# 3. Click "Pass" → should skip profile
```

**Files modified:**
- ✅ `frontend/src/components/features/discover/ProfileCard.tsx` - Fixed onClick handlers
- ✅ Removed rose button (as requested)

### Step 1.2: Test Complete User Flow (Today)

**Test Script:**

```bash
# 1. Start backend
cd backend
docker compose -f docker-compose.dev.yml up -d
# Wait for PostgreSQL + Redis + MinIO to start

# Check services are up
docker ps  # Should see postgres, redis, minio containers

# Run backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 2. Start frontend (separate terminal)
cd frontend
npm run dev  # Opens on http://localhost:3000

# 3. Create test users
# User A: Founder
POST http://localhost:8000/api/v1/auth/register
{
  "email": "founder@test.com",
  "password": "Test123!@#",
  "full_name": "Alice Founder",
  "role": "founder"
}

# User B: Investor
POST http://localhost:8000/api/v1/auth/register
{
  "email": "investor@test.com",
  "password": "Test123!@#",
  "full_name": "Bob Investor",
  "role": "investor"
}

# 4. Complete profiles
# (Add sectors, stages, company info, etc.)

# 5. Test matching flow
# - Login as Investor
# - Go to /discover
# - See Founder in feed
# - Click "Interested" (sends like)
# - Check daily limits: 9 likes remaining

# - Login as Founder
# - Go to /likes (see Investor liked you)
# - Like back → should create match!
# - Alert: "It's a match! 🎉"

# - Go to /messages
# - See match
# - Click to open chat
# - Send message → real-time delivery

# 6. Test daily limits
# - Send 10 likes → should hit limit
# - Try 11th like → error: "Daily limit reached"
```

**Expected Results:**
- ✅ Like creates Like record in DB
- ✅ Mutual like creates Match record
- ✅ Daily limits enforced (10 likes/day)
- ✅ Messages send/receive in real-time
- ✅ Discovery feed updates after match

### Step 1.3: Database Verification

```sql
-- Check likes
SELECT sender_id, recipient_id, like_type, created_at
FROM likes
ORDER BY created_at DESC;

-- Check matches
SELECT founder_id, investor_id, status, created_at
FROM matches
ORDER BY created_at DESC;

-- Check daily limits
SELECT profile_id, date, standard_likes_used, standard_likes_remaining
FROM daily_limits
WHERE date = CURRENT_DATE;

-- Check messages
SELECT match_id, sender_id, content, created_at
FROM messages
ORDER BY created_at DESC;
```

---

## Phase 2: Infrastructure Setup (Week 2)

**Goal:** Deploy on cloud infrastructure with proper orchestration.

### 2.1: AWS/GCP Free Tier Setup

**Option A: AWS**
```bash
# Sign up for AWS Free Tier
# https://aws.amazon.com/free/

# Provision t2.micro EC2 instance (Linux)
# - OS: Ubuntu 22.04 LTS
# - Storage: 30GB gp2 (free tier)
# - Security group: Allow 22, 80, 443, 8000, 6379, 5432

# SSH into instance
ssh -i key.pem ubuntu@<instance-ip>

# Install Docker
sudo apt update
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker ubuntu
```

**Option B: GCP**
```bash
# Sign up for GCP Free Tier
# https://cloud.google.com/free

# Create e2-micro instance
gcloud compute instances create vc-matcher \
  --machine-type=e2-micro \
  --zone=us-central1-a \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=30GB

# SSH
gcloud compute ssh vc-matcher --zone=us-central1-a
```

### 2.2: K3s Installation

```bash
# Install K3s (lightweight Kubernetes)
curl -sfL https://get.k3s.io | sh -

# Verify
sudo kubectl get nodes
# Should show: Ready, master, <version>

# Copy kubeconfig for local access
mkdir ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER ~/.kube/config

# Test
kubectl get pods -A
```

### 2.3: Deploy Core Services on K3s

**PostgreSQL:**
```yaml
# postgres-deployment.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        env:
        - name: POSTGRES_DB
          value: vc_matcher
        - name: POSTGRES_USER
          value: postgres
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
  type: ClusterIP
```

```bash
# Create secret
kubectl create secret generic postgres-secret \
  --from-literal=password='your-secure-password'

# Deploy
kubectl apply -f postgres-deployment.yaml

# Verify
kubectl get pods | grep postgres
```

**Redis:**
```yaml
# redis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
---
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
  type: ClusterIP
```

```bash
kubectl apply -f redis-deployment.yaml
```

**MinIO (S3-compatible storage):**
```yaml
# minio-deployment.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: minio-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minio
spec:
  replicas: 1
  selector:
    matchLabels:
      app: minio
  template:
    metadata:
      labels:
        app: minio
    spec:
      containers:
      - name: minio
        image: minio/minio:latest
        args:
        - server
        - /data
        - --console-address
        - ":9001"
        env:
        - name: MINIO_ROOT_USER
          value: minioadmin
        - name: MINIO_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: minio-secret
              key: password
        ports:
        - containerPort: 9000
        - containerPort: 9001
        volumeMounts:
        - name: minio-storage
          mountPath: /data
      volumes:
      - name: minio-storage
        persistentVolumeClaim:
          claimName: minio-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: minio
spec:
  selector:
    app: minio
  ports:
    - name: api
      port: 9000
      targetPort: 9000
    - name: console
      port: 9001
      targetPort: 9001
  type: ClusterIP
```

### 2.4: Deploy Backend Application

**Build Docker image:**
```bash
cd backend

# Build production image
docker build -t vc-matcher-backend:v1 .

# Tag for registry (GitHub Container Registry - free)
docker tag vc-matcher-backend:v1 ghcr.io/<your-username>/vc-matcher-backend:v1

# Login and push
echo $GITHUB_TOKEN | docker login ghcr.io -u <your-username> --password-stdin
docker push ghcr.io/<your-username>/vc-matcher-backend:v1
```

**Kubernetes deployment:**
```yaml
# backend-deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backend-config
data:
  DATABASE_URL: "postgresql+psycopg://postgres:password@postgres:5432/vc_matcher"
  REDIS_URL: "redis://redis:6379/0"
  MINIO_ENDPOINT: "minio:9000"
  ML_ENABLED: "true"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: ghcr.io/<your-username>/vc-matcher-backend:v1
        envFrom:
        - configMapRef:
            name: backend-config
        env:
        - name: SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: backend-secret
              key: secret-key
        ports:
        - containerPort: 8000
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  selector:
    app: backend
  ports:
    - port: 8000
      targetPort: 8000
  type: LoadBalancer  # Exposes externally
```

```bash
# Create secrets
kubectl create secret generic backend-secret \
  --from-literal=secret-key='your-very-secure-secret-key-change-this'

# Deploy
kubectl apply -f backend-deployment.yaml

# Check
kubectl get pods | grep backend
kubectl get svc backend  # Get external IP
```

### 2.5: Setup Nginx/Caddy as Reverse Proxy

**Using Caddy (simpler, auto HTTPS):**
```yaml
# caddy-deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: caddy-config
data:
  Caddyfile: |
    api.yourplatform.com {
      reverse_proxy backend:8000
    }

    minio.yourplatform.com {
      reverse_proxy minio:9000
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: caddy
spec:
  replicas: 1
  selector:
    matchLabels:
      app: caddy
  template:
    metadata:
      labels:
        app: caddy
    spec:
      containers:
      - name: caddy
        image: caddy:2-alpine
        ports:
        - containerPort: 80
        - containerPort: 443
        volumeMounts:
        - name: config
          mountPath: /etc/caddy
      volumes:
      - name: config
        configMap:
          name: caddy-config
---
apiVersion: v1
kind: Service
metadata:
  name: caddy
spec:
  selector:
    app: caddy
  ports:
    - name: http
      port: 80
      targetPort: 80
    - name: https
      port: 443
      targetPort: 443
  type: LoadBalancer
```

**DNS Setup:**
```bash
# Point your domain to LoadBalancer IP
# api.yourplatform.com → <caddy-service-ip>

# Verify
curl https://api.yourplatform.com/api/v1/healthz
```

---

## Phase 3: ML Pipeline with Ollama (Weeks 3-4)

**Goal:** Replace sentence-transformers with Ollama for local embeddings.

### 3.1: Deploy Ollama on K3s

```yaml
# ollama-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ollama
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ollama
  template:
    metadata:
      labels:
        app: ollama
    spec:
      containers:
      - name: ollama
        image: ollama/ollama:latest
        ports:
        - containerPort: 11434
        resources:
          limits:
            memory: "4Gi"
            cpu: "2"
---
apiVersion: v1
kind: Service
metadata:
  name: ollama
spec:
  selector:
    app: ollama
  ports:
    - port: 11434
      targetPort: 11434
  type: ClusterIP
```

```bash
kubectl apply -f ollama-deployment.yaml

# Pull embedding model
kubectl exec -it <ollama-pod> -- ollama pull nomic-embed-text
```

### 3.2: Update Backend Embedding Service

```python
# backend/app/services/ml/embeddings_ollama.py

import httpx
from typing import List
from app.core.config import settings

class OllamaEmbeddingService:
    """Generate embeddings using Ollama API."""

    def __init__(self):
        self.base_url = settings.ollama_endpoint  # http://ollama:11434
        self.model = "nomic-embed-text"

    async def embed_text(self, text: str) -> List[float]:
        """Generate embedding for single text."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/embeddings",
                json={
                    "model": self.model,
                    "prompt": text
                },
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()["embedding"]

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for batch of texts."""
        embeddings = []
        for text in texts:
            embedding = await self.embed_text(text)
            embeddings.append(embedding)
        return embeddings

# Update config.py
class Settings(BaseSettings):
    # ... existing fields
    ollama_endpoint: str = "http://ollama:11434"
    embedding_model: str = "nomic-embed-text"
```

### 3.3: Setup Kafka for Event Streaming

```yaml
# kafka-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kafka
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kafka
  template:
    metadata:
      labels:
        app: kafka
    spec:
      containers:
      - name: kafka
        image: bitnami/kafka:latest
        env:
        - name: KAFKA_CFG_NODE_ID
          value: "0"
        - name: KAFKA_CFG_PROCESS_ROLES
          value: "controller,broker"
        - name: KAFKA_CFG_LISTENERS
          value: "PLAINTEXT://:9092,CONTROLLER://:9093"
        - name: KAFKA_CFG_ADVERTISED_LISTENERS
          value: "PLAINTEXT://kafka:9092"
        - name: KAFKA_CFG_CONTROLLER_LISTENER_NAMES
          value: "CONTROLLER"
        - name: KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP
          value: "CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT"
        ports:
        - containerPort: 9092
---
apiVersion: v1
kind: Service
metadata:
  name: kafka
spec:
  selector:
    app: kafka
  ports:
    - port: 9092
      targetPort: 9092
  type: ClusterIP
```

**Event Producer Example:**
```python
# backend/app/services/events.py

from aiokafka import AIOKafkaProducer
import json
from datetime import datetime

class EventService:
    """Publish interaction events to Kafka."""

    def __init__(self):
        self.producer = None

    async def start(self):
        self.producer = AIOKafkaProducer(
            bootstrap_servers='kafka:9092',
            value_serializer=lambda v: json.dumps(v).encode()
        )
        await self.producer.start()

    async def publish_like_event(self, sender_id: str, recipient_id: str, like_type: str):
        """Publish like event for ML pipeline."""
        event = {
            "event_type": "like",
            "sender_id": sender_id,
            "recipient_id": recipient_id,
            "like_type": like_type,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.producer.send('user-interactions', value=event)

    async def publish_match_event(self, match_id: str, founder_id: str, investor_id: str):
        """Publish match event."""
        event = {
            "event_type": "match",
            "match_id": match_id,
            "founder_id": founder_id,
            "investor_id": investor_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.producer.send('user-interactions', value=event)
```

### 3.4: Nightly Embedding Refresh Pipeline

```python
# backend/app/ml/refresh_embeddings.py

from sqlmodel import Session, select
from app.db.session import engine
from app.models.profile import Profile
from app.services.ml.embeddings_ollama import OllamaEmbeddingService
from app.core.redis import redis_client
import asyncio

async def refresh_all_embeddings():
    """Regenerate embeddings for all profiles (nightly job)."""

    embedding_service = OllamaEmbeddingService()

    with Session(engine) as session:
        profiles = session.exec(select(Profile)).all()

        for profile in profiles:
            # Generate profile text
            profile_text = f"""
            {profile.full_name}
            {profile.headline or ''}
            Sectors: {', '.join(profile.focus_sectors or [])}
            Stages: {', '.join(profile.focus_stages or [])}
            """

            # Generate embedding
            embedding = await embedding_service.embed_text(profile_text.strip())

            # Cache in Redis
            redis_client.setex(
                f"embedding:{profile.id}",
                3600,  # 1 hour TTL
                json.dumps(embedding)
            )

            print(f"✓ Refreshed embedding for {profile.full_name}")

if __name__ == "__main__":
    asyncio.run(refresh_all_embeddings())
```

**Cron job (K8s CronJob):**
```yaml
# embedding-refresh-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: refresh-embeddings
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: refresh
            image: ghcr.io/<your-username>/vc-matcher-backend:v1
            command: ["python", "-m", "app.ml.refresh_embeddings"]
            envFrom:
            - configMapRef:
                name: backend-config
          restartPolicy: OnFailure
```

---

## Phase 4: MLOps & Monitoring (Week 5)

### 4.1: Deploy Prometheus + Grafana

```bash
# Install via Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack

# Access Grafana
kubectl port-forward svc/prometheus-grafana 3000:80

# Default credentials: admin / prom-operator
```

**Custom Metrics in Backend:**
```python
# backend/app/core/metrics.py

from prometheus_client import Counter, Histogram, Gauge

# Counters
likes_total = Counter('likes_total', 'Total likes sent', ['like_type'])
matches_total = Counter('matches_total', 'Total matches created')
api_requests_total = Counter('api_requests_total', 'Total API requests', ['method', 'endpoint', 'status'])

# Histograms
api_latency = Histogram('api_latency_seconds', 'API latency', ['method', 'endpoint'])
ml_ranking_latency = Histogram('ml_ranking_latency_seconds', 'ML ranking latency')
embedding_generation_latency = Histogram('embedding_generation_latency_seconds', 'Embedding generation latency')

# Gauges
active_users = Gauge('active_users', 'Number of active users')
cached_embeddings = Gauge('cached_embeddings', 'Number of cached embeddings in Redis')

# Middleware to track metrics
from starlette.middleware.base import BaseHTTPMiddleware
import time

class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time

        api_requests_total.labels(
            method=request.method,
            endpoint=request.url.path,
            status=response.status_code
        ).inc()

        api_latency.labels(
            method=request.method,
            endpoint=request.url.path
        ).observe(duration)

        return response

# In main.py
app.add_middleware(MetricsMiddleware)
```

### 4.2: Audit Logging Service

```python
# backend/app/services/audit.py

from aiokafka import AIOKafkaConsumer
import json
from sqlmodel import Session
from app.db.session import engine
from app.models.audit import AuditLog  # Create this model

class AuditLoggingService:
    """Consume Kafka events and write to audit log table."""

    async def start(self):
        consumer = AIOKafkaConsumer(
            'user-interactions',
            bootstrap_servers='kafka:9092',
            value_deserializer=lambda m: json.loads(m.decode())
        )
        await consumer.start()

        try:
            async for msg in consumer:
                event = msg.value
                await self._log_event(event)
        finally:
            await consumer.stop()

    async def _log_event(self, event: dict):
        """Write event to audit log table."""
        with Session(engine) as session:
            log = AuditLog(
                event_type=event['event_type'],
                user_id=event.get('sender_id'),
                target_id=event.get('recipient_id'),
                metadata=event,
                timestamp=event['timestamp']
            )
            session.add(log)
            session.commit()
```

**Audit Log Model:**
```python
# backend/app/models/audit.py

from sqlmodel import SQLModel, Field
from datetime import datetime
import uuid

class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    event_type: str = Field(index=True)  # "like", "match", "message", etc.
    user_id: str = Field(index=True)
    target_id: str | None = Field(default=None, index=True)
    metadata: dict = Field(default_factory=dict, sa_column=Column(JSON))
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
```

### 4.3: Argo Workflows for ML Pipelines

```yaml
# argo-embedding-pipeline.yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: embedding-refresh-
spec:
  entrypoint: refresh-pipeline
  templates:
  - name: refresh-pipeline
    steps:
    - - name: fetch-profiles
        template: fetch
    - - name: generate-embeddings
        template: embed
        arguments:
          parameters:
          - name: profile-ids
            value: "{{steps.fetch-profiles.outputs.result}}"
    - - name: cache-embeddings
        template: cache

  - name: fetch
    script:
      image: ghcr.io/<your-username>/vc-matcher-backend:v1
      command: [python]
      source: |
        from app.db.session import engine
        from sqlmodel import Session, select
        from app.models.profile import Profile
        import json

        with Session(engine) as session:
            profiles = session.exec(select(Profile.id)).all()
            print(json.dumps(list(profiles)))

  - name: embed
    inputs:
      parameters:
      - name: profile-ids
    script:
      image: ghcr.io/<your-username>/vc-matcher-backend:v1
      command: [python]
      source: |
        import json
        profile_ids = json.loads('{{inputs.parameters.profile-ids}}')
        # Generate embeddings via Ollama
        # ...

  - name: cache
    script:
      image: ghcr.io/<your-username>/vc-matcher-backend:v1
      command: [python]
      source: |
        # Write embeddings to Redis
        # ...
```

---

## Cost Breakdown (Free Tier Limits)

### AWS Free Tier (First 12 months)
- **EC2**: 750 hours/month t2.micro (enough for 1 instance 24/7)
- **S3**: 5GB storage, 20K GET requests, 2K PUT requests
- **RDS**: 750 hours/month db.t2.micro, 20GB storage (if you use managed DB instead of self-hosted)
- **Data Transfer**: 100GB/month outbound
- **Elastic Load Balancer**: Not free, ~$16/month (skip for MVP, use NodePort)

**Estimated Monthly Cost After Free Tier:**
- Single t2.micro instance: $0 (free tier)
- Storage (30GB EBS): ~$3/month
- S3 storage (10GB): ~$0.23/month
- Data transfer: Free within limits
- **Total: ~$3-5/month**

### GCP Free Tier (Always Free)
- **e2-micro**: 1 instance (0.25-2 vCPU, 1GB RAM) - ALWAYS FREE
- **Cloud Storage**: 5GB, 5K reads/month, 1K writes/month
- **Networking**: 1GB egress/month (North America)
- **Compute Engine**: 30GB HDD persistent disk

**Estimated Monthly Cost:**
- e2-micro instance: $0 (always free)
- Storage (30GB): ~$1.20/month
- **Total: ~$1-2/month**

### Recommendation: Start with GCP
- e2-micro is ALWAYS FREE (no 12-month limit)
- Simpler pricing
- Can upgrade later

---

## Success Metrics

**Week 1:**
- [ ] Frontend "Interested" button works
- [ ] Like → Match → Message flow end-to-end
- [ ] Daily limits enforced

**Week 2:**
- [ ] Backend deployed on GCP e2-micro
- [ ] K3s running with PostgreSQL + Redis
- [ ] Public API accessible via HTTPS

**Week 3:**
- [ ] Ollama embeddings replacing sentence-transformers
- [ ] Kafka event streaming working
- [ ] Nightly embedding refresh

**Week 4:**
- [ ] Prometheus + Grafana dashboards
- [ ] Audit logging capturing all events
- [ ] ML pipeline automated via Argo/cron

---

## Next Immediate Steps

1. **Test the app right now** (5 minutes)
   ```bash
   cd frontend && npm run dev
   # Click "Interested" → should work now!
   ```

2. **Create 2 test users** (10 minutes)
   - 1 founder + 1 investor
   - Complete profiles with sectors/stages
   - Test like → match flow

3. **Sign up for GCP Free Tier** (15 minutes)
   - Create account
   - Provision e2-micro instance
   - Save SSH key

4. **Deploy to GCP** (1 hour)
   - Install K3s
   - Deploy PostgreSQL + Redis
   - Deploy backend

Let me know when you've tested the frontend fix, and we'll move to infrastructure deployment!
