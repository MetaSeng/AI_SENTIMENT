# 🇰🇭 Khmer Sentiment Analyzer

A Streamlit web application for sentiment analysis of Khmer (and code-switched) Facebook comments using **XLM-RoBERTa** fine-tuned on Khmer data, paired with a **CharCNN-BiLSTM** language tagger for Khmer/non-Khmer code-switching detection.

---

## Features

- **Sentiment Classification** — Classifies comments as Positive, Neutral, or Negative
- **Code-Switching Detection** — Detects whether text is primarily Khmer or another language using a CharCNN-BiLSTM sequence labeler
- **Khmer Word Segmentation** — Uses `khmernltk` to tokenize Khmer text before inference
- **Batch CSV Analysis** — Upload a Facebook comments CSV and analyze all rows at once
- **Downloadable Results** — Export results with sentiment labels and confidence scores as CSV
- **Interactive Dashboard** — Summary metrics, bar charts, and a full results table

---

## Project Structure

```
KhmerSentiment_Version2/
├── app.py                          # Streamlit web application
├── sentiment_analysis.ipynb        # Training / preprocessing notebook
├── test.ipynb                      # Testing / experimentation notebook
├── best_xlmr_sentiment_model.pth   # Fine-tuned XLM-RoBERTa weights
├── khmer_cs_char_cnn_model.pth     # Trained CharCNN-BiLSTM weights
├── vocab2.pkl                      # Vocabulary for CharCNN-BiLSTM model
├── all_data.csv                    # Combined labelled dataset
├── segmented_tagged_dataset_cleaned.csv  # Preprocessed training data
└── dataset_facebook-comments-scraper_*.csv  # Raw Facebook scraped data
```

---

## Models

### 1. XLM-RoBERTa (Sentiment Classifier)
- Base model: `xlm-roberta-base` from Hugging Face
- Fine-tuned for 3-class sentiment classification: **Negative / Neutral / Positive**
- Weights stored in `best_xlmr_sentiment_model.pth`

### 2. CharCNN-BiLSTM (Language Tagger)
- Custom sequence labeling model combining character-level CNN features with a BiLSTM
- Detects code-switched language at the word level (e.g., Khmer vs. English/other)
- Prepends a language tag (e.g., `[KM]`) to preprocessed text before sentiment inference
- Weights stored in `khmer_cs_char_cnn_model.pth`

---

## Installation

### Prerequisites
- Python 3.8+
- CUDA-compatible GPU (optional, CPU inference supported)

### Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd KhmerSentiment_Version2

# Create a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install streamlit pandas torch transformers khmernltk numpy
```

> **Note:** Make sure `best_xlmr_sentiment_model.pth`, `khmer_cs_char_cnn_model.pth`, and `vocab2.pkl` are present in the project root before launching the app.

---

## Running the App

```bash
streamlit run app.py
```

The app will open in your browser at `http://localhost:8501`.

---

## Usage

1. Launch the app with `streamlit run app.py`
2. Upload a CSV file containing Facebook comments (must have a `text` column by default)
3. Adjust settings in the sidebar:
   - **Batch Size** — Number of comments processed per inference batch
   - **Show confidence scores** — Toggle score columns in the output table
   - **Text column name** — Specify the column containing comment text
4. Click **Run Sentiment Analysis**
5. View the summary metrics, sentiment distribution chart, and full results table
6. Download the results as a CSV file

### Expected CSV Format

| postTitle | postDescription | text | likesCount | facebookUrl |
|-----------|-----------------|------|------------|-------------|
| Smart 5G... | ... | Smart ឡូវ សុីលុយ ប្រើបានតែ12ថ្ងៃ | 0 | https://web.facebook.com/... |

---

## Preprocessing Pipeline

Each comment goes through the following steps before sentiment inference:

1. **Text Cleaning** — Remove URLs, HTML tags, extra whitespace
2. **Language Tagging** — CharCNN-BiLSTM predicts dominant language tag (e.g., `[KM]`)
3. **Word Segmentation** — `khmernltk.word_tokenize()` segments Khmer words
4. **Formatted Output** — Result: `[KM] word1 word2 word3 ...`

---

## Output Columns

| Column | Description |
|--------|-------------|
| `Sentiment` | Predicted label: Positive 😊 / Neutral 😐 / Negative 😠 |
| `Confidence` | Confidence score for the predicted class (%) |
| `Neg_Score` | Negative class probability (%) |
| `Neu_Score` | Neutral class probability (%) |
| `Pos_Score` | Positive class probability (%) |
| `Processed_Text` | Text after cleaning, tagging, and segmentation |

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `streamlit` | Web application framework |
| `torch` | Deep learning backend |
| `transformers` | XLM-RoBERTa model and tokenizer |
| `khmernltk` | Khmer natural language toolkit (word segmentation) |
| `pandas` | Data manipulation |
| `numpy` | Numerical operations |

---

## License

This project is for research and educational purposes.
