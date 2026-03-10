# Sentiment & Clustering API

A FastAPI-based REST API that serves two ML models built for analysing Facebook comments in **Khmer** and **English**:

- **Sentiment Analysis** — XLM-RoBERTa fine-tuned on Khmer data + CharCNN-BiLSTM language tagger
- **Comment Clustering** — KMeans clustering with a multilingual Sentence Transformer encoder

---

## Project Structure

```
api/
├── app.py                    # FastAPI entry point
├── requirements.txt          # Python dependencies
├── models/
│   └── schemas.py            # Request / response data shapes (Pydantic)
├── routes/
│   ├── sentiment.py          # /sentiment/* endpoints
│   └── clustering.py         # /clustering/* endpoints
└── services/
    ├── sentiment_service.py  # Model loading + inference logic for sentiment
    └── clustering_service.py # Model loading + inference logic for clustering
```

The API depends on trained model files that live outside this folder:

```
Setiment-analysis/
├── best_xlmr_sentiment_model.pth   ← fine-tuned XLM-RoBERTa weights
├── khmer_cs_char_cnn_model.pth     ← CharCNN-BiLSTM weights
└── vocab2.pkl                      ← vocabulary for CharCNN-BiLSTM

Comment-clustering/
├── kmeans_clustering_model.pkl     ← trained KMeans model
└── models/sentence_transformer_local/  ← local copy of the encoder
```

> Before running the API, make sure you have generated these files by running the notebooks in `Setiment-analysis/` and `Comment-clustering/`.

---

## Setup

### 1. Install dependencies

```bash
pip install -r api/requirements.txt
```

### 1.1 Optional: Cloud artifact download for deployment

If model files are not committed to git, the API can download missing files on startup.

Option A (recommended): set one base URL that mirrors your repo artifact paths:

```env
MODEL_ARTIFACT_BASE_URL=https://your-storage.example.com/artifacts
```

Then host files using paths like:
- `Setiment-analysis/best_xlmr_sentiment_model.pth`
- `Setiment-analysis/khmer_cs_char_cnn_model.pth`
- `Setiment-analysis/vocab2.pkl`
- `Setiment-analysis/xlm-roberta-base/model.safetensors`
- `Comment-clustering/kmeans_clustering_model.pkl`
- `Comment-clustering/models/sentence_transformer_local/model.safetensors`

Option B: set per-file URLs (overrides base URL):

```env
ARTIFACT_URL_BEST_XLMR_MODEL=...
ARTIFACT_URL_CHARCNN_MODEL=...
ARTIFACT_URL_VOCAB=...
ARTIFACT_URL_XLMR_MODEL_SAFETENSORS=...
ARTIFACT_URL_CLUSTERING_KMEANS=...
ARTIFACT_URL_CLUSTERING_MODEL_SAFETENSORS=...
```

Optional:

```env
ARTIFACT_DOWNLOAD_TIMEOUT_SECONDS=1800
```

### 2. Start the server

Run this from the **project root** (the folder that contains `api/`, `Setiment-analysis/`, `Comment-clustering/`):

```bash
uvicorn api.app:app --reload --host 0.0.0.0 --port 8000
```

The `--reload` flag restarts the server automatically when you change a file (useful during development). Remove it in production.

### 3. Verify it is running

Open your browser at **http://localhost:8000/health** — you should see:

```json
{
  "status": "ok",
  "sentiment_model_loaded": true,
  "clustering_model_loaded": true
}
```

---

## Interactive Docs

FastAPI generates interactive API documentation automatically.

| URL | Description |
|-----|-------------|
| http://localhost:8000/docs | Swagger UI — try endpoints in the browser |
| http://localhost:8000/redoc | ReDoc — clean, readable reference |

---

## Endpoints

### Health

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/` | Basic alive check |
| `GET` | `/health` | Reports whether each model is loaded |

---

### Sentiment

#### `POST /sentiment/predict`
Analyse the sentiment of a **single** comment.

**Request body:**
```json
{
  "text": "Smart ល្អណាស់ ប្រើបានស្រួល"
}
```

**Response:**
```json
{
  "results": [
    {
      "text": "Smart ល្អណាស់ ប្រើបានស្រួល",
      "label": "Positive",
      "confidence": 0.94,
      "scores": {
        "negative": 0.02,
        "neutral": 0.04,
        "positive": 0.94
      },
      "language_tag": "KM"
    }
  ]
}
```

---

#### `POST /sentiment/predict/batch`
Analyse **multiple** comments in one request. More efficient than calling `/predict` in a loop.

**Request body:**
```json
{
  "texts": [
    "Smart ល្អណាស់ ប្រើបានស្រួល",
    "តម្លៃថ្លៃពេក ប្រាក់អស់លឿន",
    "Signal not good in my area"
  ],
  "batch_size": 16
}
```

**Response:** same shape as single predict, but `results` contains one entry per input text.

---

### Clustering

#### `POST /clustering/predict`
Assign a **single** comment to a cluster.

**Request body:**
```json
{
  "text": "តម្លៃថ្លៃពេក ប្រើមិនសូវឃើញថ្ងៃ"
}
```

**Response:**
```json
{
  "results": [
    {
      "text": "តម្លៃថ្លៃពេក ប្រើមិនសូវឃើញថ្ងៃ",
      "cluster_id": 2
    }
  ],
  "total_clusters": 5
}
```

---

#### `POST /clustering/predict/batch`
Assign **multiple** comments to clusters.

**Request body:**
```json
{
  "texts": [
    "តម្លៃថ្លៃពេក ប្រើមិនសូវឃើញថ្ងៃ",
    "សេវាកម្មល្អ បុគ្គលិកមានប្រសិទ្ធភាព",
    "Internet slow during peak hours"
  ]
}
```

---

## How the Backend Should Call This API

Your friend's backend (Node.js, Laravel, etc.) calls this API over HTTP. Example using `fetch` in JavaScript:

```js
// Single sentiment prediction
const response = await fetch("http://localhost:8000/sentiment/predict", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: "Smart ល្អណាស់" }),
});
const data = await response.json();
console.log(data.results[0].label); // "Positive"
```

```js
// Batch clustering
const response = await fetch("http://localhost:8000/clustering/predict/batch", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ texts: ["comment 1", "comment 2", "comment 3"] }),
});
const data = await response.json();
// data.results → [{ text, cluster_id }, ...]
```

---

## Response Fields Reference

### Sentiment result

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | The original input text |
| `label` | string | `"Positive"`, `"Neutral"`, or `"Negative"` |
| `confidence` | float | Probability of the predicted label (0–1) |
| `scores.positive` | float | Raw probability for Positive class |
| `scores.neutral` | float | Raw probability for Neutral class |
| `scores.negative` | float | Raw probability for Negative class |
| `language_tag` | string | Language detected by CharCNN model (e.g. `"KM"`) |

### Clustering result

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | The original input text |
| `cluster_id` | int | Cluster number (0-indexed) assigned by KMeans |
| `total_clusters` | int | Total number of clusters the model was trained with |

---

## CORS

The API allows requests from **any origin** by default (`"*"`), so the frontend can call it directly during development.

Before deploying to production, update the `allow_origins` setting in [app.py](app.py) to your actual frontend URL:

```python
allow_origins=["https://your-frontend-domain.com"]
```

---

## Common Issues

| Problem | Solution |
|---------|----------|
| `FileNotFoundError: kmeans_clustering_model.pkl` | Run all cells in `Comment-clustering/flexible-clustering.ipynb` first |
| `FileNotFoundError: best_xlmr_sentiment_model.pth` | Run training in `Setiment-analysis/sentiment_analysis.ipynb` first |
| `ModuleNotFoundError: khmernltk` | Run `pip install khmernltk` |
| Port 8000 already in use | Change the port: `uvicorn api.app:app --port 8001` |
