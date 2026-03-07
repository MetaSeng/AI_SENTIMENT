# 📊 Facebook Comment Clustering & AI Summarizer

A powerful, end-to-end NLP pipeline designed to extract, group, and summarize customer feedback from Facebook posts. Whether analyzing a single viral post or tracking sentiment across multiple campaigns, this tool groups thousands of noisy comments into distinct, actionable business insights.

---

## ✨ Key Features

- **📥 Scrape Comments** — Fetch top-level comments and metadata (like post titles) from Facebook posts.
- **🔍 Intelligent Filtering** — Automatically cleans text, handles emojis, and filters out short, low-quality comments. Built-in support for Khmer word segmentation using `khmernltk`.
- **🧠 AI Clustering** — Uses multilingual semantic embeddings (`paraphrase-multilingual-MiniLM-L12-v2`) to group similar comments. It automatically finds the optimal number of topics (Dynamic $k$) using the Silhouette Score.
- **🎯 Smart Sampling** — Instead of sending random comments to the AI, the pipeline calculates the mathematical center (centroid) of each cluster and extracts the most representative comments proportionally.
- **🤖 AI Summarization** — Leverages Google Gemini (2.5 Flash) to read the representative comments and generate human-readable, business-friendly reports for each cluster (Topic, Customer Perspective, Sentiment, Business Insights, and Keywords).

---

## 🛠️ Tech Stack

| Category | Libraries / Tools |
|---|---|
| Language | Python 3.10+ |
| Data Processing | `pandas`, `numpy`, `re` |
| NLP & Embeddings | `sentence-transformers`, `khmernltk`, `emoji` |
| Machine Learning | `scikit-learn` (K-Means, Silhouette Score, Cosine Similarity) |
| LLM Integration | `google-generativeai` (Gemini API) |

---

## 🚀 Getting Started

### Prerequisites

You will need a **Google Gemini API key** to run the summarizer. Get one from [Google AI Studio](https://aistudio.google.com/).

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/facebook-comment-clustering.git
   cd facebook-comment-clustering
   ```

2. **Install the required dependencies:**

   ```bash
   pip install pandas numpy scikit-learn sentence-transformers khmernltk emoji python-dotenv google-generativeai
   ```

3. **Set up your environment variables:**

   Create a `.env` file in the root directory and add your Gemini API key:

   ```
   GEMINI_API_KEY=your_api_key_here
   ```

---

## 🧠 How It Works Under the Hood

1. **Preprocessing** — Comments are stripped of URLs and timestamps. Emojis are converted into sentiment tokens (e.g., `EMO_HAPPY`). Khmer text is properly tokenized using `khmernltk` so the transformer model can read it accurately.

2. **Embedding** — Text is converted into 384-dimensional vector embeddings using a multilingual `SentenceTransformer` model.

3. **Dynamic Clustering** — Instead of hardcoding the number of clusters, the pipeline tests various cluster counts and uses the Silhouette Score to choose the arrangement with the clearest thematic boundaries.

4. **Centroid Extraction** — To save API tokens and improve accuracy, the script calculates the Cosine Similarity of each comment to its cluster's center, pulling only the top 5% of the most highly relevant comments to send to Gemini.

5. **Contextual AI Prompts** — The selected comments are bundled with their original Post Titles and sent to Gemini to generate actionable business advice.

---

## 📊 Example Output

```
============================================================
CLUSTER 0 ANALYSIS
============================================================
Topic: 5G Service Availability & Expansion Queries

Customer Perspective:
Customers are eager to know when 5G service will be available in their specific
provinces. There is a clear demand for wider coverage in rural areas.

Overall Sentiment: Mixed (leaning Negative)

Business Insight:
There is high anticipation for 5G service in provincial areas beyond the currently
announced locations. Customers expect clear communication regarding future rollout plans.

Suggested Action:
Publish an updated roadmap detailing upcoming 5G rollout phases for specific provinces.

Representative Keywords:
Availability, Provinces, Rollout, Coverage
```