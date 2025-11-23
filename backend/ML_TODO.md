# ML Implementation TODO List

This document tracks remaining ML tasks and notes where external configuration/API keys are needed.

## ✅ Completed

- [x] Sentence transformer embeddings service
- [x] PyTorch recommendation engine
- [x] Re-ranking service (combines ML + diligence + engagement)
- [x] ML integration into discovery feed
- [x] ML API endpoints (embeddings, similarity, ranking)
- [x] Graceful fallback when ML dependencies missing

## 🔄 In Progress / Pending

### 1. Embedding Caching (ml-cache)

**Status:** Pending  
**Priority:** High  
**Description:** Cache profile embeddings in Redis to avoid recomputing them on every request.

**Implementation Notes:**

- Cache key format: `embedding:profile:{profile_id}`
- TTL: Long (1 hour or until profile updated)
- Invalidate cache when profile is updated
- Cache both text embeddings and profile embeddings

**External Dependencies:** None

---

### 2. Batch Prediction Endpoints (ml-batch)

**Status:** Pending  
**Priority:** Medium  
**Description:** Add endpoints for batch operations (batch embeddings, batch similarities) for efficiency.

**Endpoints to Add:**

- `POST /api/v1/ml/embeddings/batch` - Generate embeddings for multiple texts
- `POST /api/v1/ml/similarity/batch` - Compute similarities for multiple pairs
- `POST /api/v1/ml/profiles/rank/batch` - Rank multiple sets of candidates

**External Dependencies:** None

---

### 3. ML Health Check Endpoint (ml-health)

**Status:** Pending  
**Priority:** Medium  
**Description:** Add health check endpoint to verify ML service availability, model status, and configuration.

**Endpoint:** `GET /api/v1/ml/health`

**Response should include:**

- ML enabled status
- Model availability
- Model name and device (CPU/CUDA/MPS)
- Embedding dimension
- Service status (ready/degraded/unavailable)

**External Dependencies:** None

---

### 4. ML Tests (ml-tests)

**Status:** Pending  
**Priority:** High  
**Description:** Create comprehensive tests for ML services.

**Test Coverage Needed:**

- Unit tests for embedding service (with mocked models)
- Unit tests for recommendation engine
- Unit tests for reranking service
- Integration tests for ML endpoints (mocked models)
- Test graceful fallback when ML unavailable
- Test caching behavior

**External Dependencies:**

- **⚠️ Note:** Tests should mock sentence-transformers to avoid downloading models
- Use `unittest.mock` or `pytest-mock` to mock model loading

---

### 5. ML Documentation (ml-docs)

**Status:** Pending  
**Priority:** Medium  
**Description:** Document ML setup, model download, and external dependencies.

**Documentation Needed:**

- Setup instructions (installing ML dependencies)
- Model download process (happens automatically via sentence-transformers)
- Configuration options (ML_ENABLED, embedding_model, weights)
- Performance considerations
- GPU/MPS setup for acceleration
- Troubleshooting guide

**External Dependencies:**

- **⚠️ Note:** Sentence-transformers downloads models from HuggingFace automatically
  - First run will download ~80MB model (all-MiniLM-L6-v2)
  - Requires internet connection on first load
  - Models cached in `~/.cache/huggingface/`
- Optional: Can specify custom HuggingFace model URLs or local paths

---

### 6. ML Configuration Validation (ml-config-validate)

**Status:** Pending  
**Priority:** Low  
**Description:** Add validation for ML configuration and better error messages.

**Validations Needed:**

- Validate model name exists (on startup)
- Validate weights sum to reasonable range (0-1)
- Warn if ML enabled but dependencies missing
- Provide helpful error messages with installation instructions

**External Dependencies:** None

---

## 🔗 External Dependencies & API Keys

### Required (Auto-downloaded)

1. **Sentence Transformers Models**
   - **Source:** HuggingFace Hub (https://huggingface.co/)
   - **Default Model:** `sentence-transformers/all-MiniLM-L6-v2`
   - **Download Size:** ~80MB
   - **Location:** Auto-downloaded to `~/.cache/huggingface/transformers/`
   - **Requires:** Internet connection on first model load
   - **Note:** No API key needed - public models

### Optional (Future Enhancements)

2. **OpenAI Embeddings (Alternative)**

   - **Status:** Not implemented yet
   - **API Key:** Would need `OPENAI_API_KEY` in environment
   - **Use Case:** Higher quality embeddings, but requires API calls
   - **Cost:** Pay per token

3. **Custom Model Hosting**

   - **Status:** Not implemented yet
   - **Use Case:** Host fine-tuned models on S3/Cloud Storage
   - **Configuration:** Would need model URL in settings
   - **Note:** Sentence-transformers can load from URLs

4. **GPU Cloud Services (Optional)**
   - **Status:** Not needed - works with local GPU/CUDA
   - **Options:** AWS EC2 GPU instances, Google Colab, etc.
   - **Configuration:** Just needs CUDA drivers installed

---

## 🚀 Installation & Setup

### Basic Setup (CPU)

```bash
# Install ML dependencies
pip install -e '.[ml]'

# Models will auto-download on first use
# No API keys needed
```

### GPU Setup (Optional)

```bash
# Install PyTorch with CUDA support (if needed)
# See: https://pytorch.org/get-started/locally/
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# Or for Apple Silicon
pip install torch torchvision
# MPS support is automatic if available
```

### Environment Variables

```bash
# Enable/disable ML features
ML_ENABLED=true

# Optional: Use different model
EMBEDDING_MODEL=all-mpnet-base-v2  # Better quality, slower

# Optional: Adjust ranking weights
ML_SIMILARITY_WEIGHT=0.6
ML_DILIGENCE_WEIGHT=0.3
ML_ENGAGEMENT_WEIGHT=0.1
```

---

## 📝 Implementation Priority

1. **High Priority:**

   - Embedding caching (ml-cache) - Performance critical
   - ML tests (ml-tests) - Quality assurance

2. **Medium Priority:**

   - Batch endpoints (ml-batch) - Efficiency improvements
   - Health check (ml-health) - Operations visibility
   - Documentation (ml-docs) - Developer experience

3. **Low Priority:**
   - Config validation (ml-config-validate) - Nice to have

---

## 🧪 Testing Strategy

### Unit Tests (Fast, No Model Download)

- Mock sentence-transformers models
- Test embedding service logic
- Test recommendation engine logic
- Test reranking calculations

### Integration Tests (Requires Models)

- Test actual model loading (with real models)
- Test end-to-end API endpoints
- Test fallback behavior
- **Note:** May require internet for model download on first run

### Performance Tests (Optional)

- Benchmark embedding generation speed
- Compare CPU vs GPU performance
- Test batch vs single embedding efficiency

