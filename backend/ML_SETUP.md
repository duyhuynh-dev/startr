# ML Setup and Configuration Guide

This guide covers setup, configuration, and troubleshooting for the Machine Learning features in the VC × Startup Matching Platform backend.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Model Download](#model-download)
- [Configuration](#configuration)
- [GPU/MPS Acceleration](#gpu--mps-acceleration)
- [Performance Considerations](#performance-considerations)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)
- [API Endpoints](#api-endpoints)

## Overview

The ML system provides:

- **Sentence Transformer Embeddings**: Semantic similarity matching for profiles and prompts
- **Recommendation Engine**: PyTorch-based profile ranking and matching
- **Re-ranking Service**: Combines ML similarity with diligence scores and engagement signals

**Default Model**: `sentence-transformers/all-MiniLM-L6-v2`
- **Size**: ~80MB
- **Embedding Dimension**: 384
- **Performance**: Fast, good quality, CPU-friendly
- **Quality**: Good for semantic similarity, balanced speed/quality

## Installation

### Basic Setup (CPU-only)

Install ML dependencies using pip or uv:

```bash
# Using uv (recommended)
cd backend
uv sync --extra ml

# Using pip
cd backend
pip install -e ".[ml]"
```

This installs:
- `torch>=2.4.1` - PyTorch deep learning framework
- `sentence-transformers>=2.7.0` - Pre-trained embedding models
- `numpy>=1.26.0` - Numerical computing
- `langchain>=0.2.14` - ML utilities (if needed)

### GPU Setup (Optional)

For GPU acceleration, install PyTorch with CUDA support:

#### NVIDIA CUDA

```bash
# For CUDA 11.8 (check your CUDA version first)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# For CUDA 12.1
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

Verify CUDA availability:
```bash
python -c "import torch; print(torch.cuda.is_available())"
```

#### Apple Silicon (MPS)

MPS support is automatic if you're using Apple Silicon (M1/M2/M3). Just install PyTorch normally:

```bash
pip install torch torchvision
```

The system will automatically detect and use MPS acceleration.

Verify MPS availability:
```bash
python -c "import torch; print(torch.backends.mps.is_available())"
```

## Model Download

Models are **automatically downloaded** on first use. No manual steps required!

### First Run

1. When the embedding service initializes, it automatically downloads the model from HuggingFace
2. Model is cached in: `~/.cache/huggingface/transformers/`
3. **Requires internet connection** on first load only

### Model Cache Location

Models are cached locally to avoid re-downloading:

- **Linux/macOS**: `~/.cache/huggingface/transformers/`
- **Windows**: `C:\Users\<username>\.cache\huggingface\transformers\`

To clear the cache (force re-download):
```bash
rm -rf ~/.cache/huggingface/transformers/
```

### Download Size

- `all-MiniLM-L6-v2` (default): ~80MB
- `all-mpnet-base-v2` (higher quality): ~420MB

## Configuration

ML features are configured via environment variables. Add these to your `.env` file:

### Basic Configuration

```bash
# Enable/disable ML features
ML_ENABLED=true

# Choose embedding model (default: all-MiniLM-L6-v2)
EMBEDDING_MODEL=all-MiniLM-L6-v2

# Alternative models:
# EMBEDDING_MODEL=all-mpnet-base-v2          # Better quality, slower, larger
# EMBEDDING_MODEL=paraphrase-MiniLM-L6-v2    # Optimized for paraphrasing
# EMBEDDING_MODEL=instructor-xl              # Requires custom training
```

### Ranking Weights

Control how different signals contribute to profile ranking:

```bash
# Similarity weight (embedding-based match quality)
ML_SIMILARITY_WEIGHT=0.6

# Diligence weight (due diligence scores)
ML_DILIGENCE_WEIGHT=0.3

# Engagement weight (user interaction signals)
ML_ENGAGEMENT_WEIGHT=0.1

# Note: Weights don't need to sum to 1.0 - they're normalized automatically
```

### Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `ML_ENABLED` | `true` | Enable/disable all ML features |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | HuggingFace model name |
| `ML_SIMILARITY_WEIGHT` | `0.6` | Weight for embedding similarity (0-1) |
| `ML_DILIGENCE_WEIGHT` | `0.3` | Weight for diligence scores (0-1) |
| `ML_ENGAGEMENT_WEIGHT` | `0.1` | Weight for engagement signals (0-1) |

## GPU / MPS Acceleration

The system automatically detects and uses available hardware:

### Device Priority

1. **CUDA** (NVIDIA GPUs) - if available
2. **MPS** (Apple Silicon) - if available
3. **CPU** - fallback

### Device Detection

Check which device is being used:

```bash
# Check ML health endpoint
curl http://localhost:8000/api/v1/ml/health

# Response includes device info:
# {
#   "ml_enabled": true,
#   "embedding_service_available": true,
#   "device": "cuda",  # or "mps" or "cpu"
#   "model_name": "all-MiniLM-L6-v2",
#   "embedding_dimension": 384,
#   "status": "ready"
# }
```

### Performance Impact

| Device | Speedup | Best For |
|--------|---------|----------|
| **CPU** | 1x (baseline) | Small deployments, development |
| **CUDA** | 5-10x | Production with NVIDIA GPUs |
| **MPS** | 2-4x | Mac development, Apple Silicon servers |

## Performance Considerations

### Model Selection

Choose models based on your needs:

| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| `all-MiniLM-L6-v2` | 80MB | ⚡⚡⚡ Fast | ⭐⭐⭐ Good | **Default - balanced** |
| `all-mpnet-base-v2` | 420MB | ⚡⚡ Medium | ⭐⭐⭐⭐ Better | Higher quality needed |
| `paraphrase-MiniLM-L6-v2` | 80MB | ⚡⚡⚡ Fast | ⭐⭐⭐ Good | Paraphrase/similarity focus |

### Caching Strategy

Embeddings are cached in Redis to avoid recomputation:

- **Profile Embeddings**: Cached until profile is updated
- **Text Embeddings**: 1-hour TTL
- **Cache Key Format**: `embedding:profile:{profile_id}` or `embedding:text:{hash}`

### Batch Processing

For processing multiple texts, use batch endpoints:

```python
# Single embedding (slower)
POST /api/v1/ml/embeddings
{"text": "example text"}

# Batch embeddings (faster)
POST /api/v1/ml/embeddings/batch
{"texts": ["text1", "text2", "text3"]}
```

Batch processing is **2-5x faster** than sequential single requests.

## Usage Examples

### Python API

```python
from app.services.ml.embeddings import get_embedding_service
from app.services.ml.recommendation import get_recommendation_engine

# Get embedding service
embedding_service = get_embedding_service()

# Generate embedding
text = "Looking for AI startups in healthcare"
embedding = embedding_service.embed_text(text)
print(f"Embedding dimension: {len(embedding)}")

# Get recommendation engine
recommendation_engine = get_recommendation_engine()

# Compute similarity between profiles
similarity = recommendation_engine.compute_profile_similarity(
    profile_a_data=profile_a_dict,
    profile_b_data=profile_b_dict
)
print(f"Similarity score: {similarity:.2%}")
```

### REST API

```bash
# Generate embedding
curl -X POST http://localhost:8000/api/v1/ml/embeddings \
  -H "Content-Type: application/json" \
  -d '{"text": "AI healthcare startup"}'

# Compute similarity
curl -X POST http://localhost:8000/api/v1/ml/similarity \
  -H "Content-Type: application/json" \
  -d '{
    "text_a": "Looking for healthcare AI",
    "text_b": "AI startup in medical tech"
  }'

# Check health
curl http://localhost:8000/api/v1/ml/health
```

## Troubleshooting

### ML Service Not Available

**Problem**: `Embedding service not available` error

**Solutions**:
1. Check ML dependencies are installed:
   ```bash
   pip install -e ".[ml]"
   ```

2. Verify ML is enabled in `.env`:
   ```bash
   ML_ENABLED=true
   ```

3. Check ML health endpoint:
   ```bash
   curl http://localhost:8000/api/v1/ml/health
   ```

### Model Download Fails

**Problem**: Model fails to download on first run

**Solutions**:
1. **Check internet connection** - first download requires internet
2. **Check disk space** - models need ~100MB-500MB free
3. **Check permissions** - need write access to `~/.cache/huggingface/`
4. **Manual download**: Models will retry on next request

### Slow Performance

**Problem**: Embeddings are slow to generate

**Solutions**:
1. **Enable GPU/MPS** - see [GPU/MPS Acceleration](#gpu--mps-acceleration)
2. **Use batch endpoints** - 2-5x faster for multiple texts
3. **Check caching** - ensure Redis is running and embeddings are cached
4. **Choose faster model** - `all-MiniLM-L6-v2` is fastest default

### CUDA Out of Memory

**Problem**: `CUDA out of memory` error

**Solutions**:
1. **Reduce batch size** - process fewer items at once
2. **Use CPU fallback** - set `ML_ENABLED=true` but don't install CUDA PyTorch
3. **Clear GPU cache**: Restart application to free GPU memory

### Apple Silicon (MPS) Issues

**Problem**: MPS errors or crashes

**Solutions**:
1. **Update PyTorch**: `pip install --upgrade torch`
2. **Disable MPS**: System will fallback to CPU automatically
3. **Check macOS version**: MPS requires macOS 12.3+ (Monterey)

### Import Errors

**Problem**: `ModuleNotFoundError: No module named 'sentence_transformers'`

**Solution**:
```bash
# Install ML dependencies
pip install -e ".[ml]"

# Or install individually
pip install sentence-transformers torch numpy
```

### Model Not Loading

**Problem**: Model fails to load, service unavailable

**Solutions**:
1. Check logs for specific error:
   ```bash
   # Look for: "Failed to load embedding model: ..."
   ```

2. Verify model name is correct:
   ```bash
   EMBEDDING_MODEL=all-MiniLM-L6-v2  # Correct
   EMBEDDING_MODEL=all-MiniLM-L6-v3  # Wrong - model doesn't exist
   ```

3. Clear model cache and retry:
   ```bash
   rm -rf ~/.cache/huggingface/transformers/
   # Restart application
   ```

## API Endpoints

### Health Check

```bash
GET /api/v1/ml/health
```

Returns ML service status, model info, and device:

```json
{
  "ml_enabled": true,
  "embedding_service_available": true,
  "model_name": "all-MiniLM-L6-v2",
  "device": "cuda",
  "embedding_dimension": 384,
  "status": "ready"
}
```

### Generate Embedding

```bash
POST /api/v1/ml/embeddings
```

Generate embedding for a single text.

### Batch Embeddings

```bash
POST /api/v1/ml/embeddings/batch
```

Generate embeddings for multiple texts efficiently.

### Compute Similarity

```bash
POST /api/v1/ml/similarity
```

Compute cosine similarity between two texts.

### Batch Similarity

```bash
POST /api/v1/ml/similarity/batch
```

Compute similarities for multiple text pairs.

### Rank Candidates

```bash
POST /api/v1/ml/profiles/rank
```

Rank candidate profiles based on similarity to a current profile.

### Profile Similarity

```bash
POST /api/v1/ml/profiles/similarity
```

Compute similarity between two profiles.

**Full API documentation**: Visit `http://localhost:8000/api/docs` when server is running.

## Additional Resources

### Model Options

Browse available sentence transformer models:
- [HuggingFace Sentence Transformers](https://huggingface.co/models?library=sentence-transformers)
- [Model Performance Comparison](https://www.sbert.net/docs/pretrained_models.html)

### Performance Benchmarks

| Operation | CPU (M1) | MPS (M1) | CUDA (V100) |
|-----------|----------|----------|-------------|
| Single embedding | 15ms | 8ms | 5ms |
| Batch 10 texts | 50ms | 25ms | 15ms |
| Profile similarity | 30ms | 15ms | 10ms |

*Note: Actual performance varies by hardware and workload*

### Best Practices

1. **Always enable caching** - Redis caching dramatically improves performance
2. **Use batch endpoints** - For processing multiple items, batch is 2-5x faster
3. **Monitor health endpoint** - Check `/api/v1/ml/health` regularly in production
4. **Graceful fallback** - System falls back to heuristics if ML unavailable
5. **Choose appropriate model** - Balance quality vs speed based on your needs

---

**Need Help?** Check the main [Backend README](../README.md) or open an issue.



