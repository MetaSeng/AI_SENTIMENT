import streamlit as st
import pandas as pd
import torch
import torch.nn as nn
import re
import os
import numpy as np
import pickle
import khmernltk
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# ─────────────────────────────────────────────
# Page Config
# ─────────────────────────────────────────────
st.set_page_config(
    page_title="Khmer Sentiment Analyzer",
    page_icon="🇰🇭",
    layout="wide"
)

# ─────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────
XLMR_MODEL_PATH  = "best_xlmr_sentiment_model.pth"
CS_MODEL_PATH    = "khmer_cs_char_cnn_model.pth"
VOCAB_PATH       = "vocab2.pkl"
LABEL_MAP        = {0: "Negative 😠", 1: "Neutral 😐", 2: "Positive 😊"}
LABEL_COLOR      = {0: "#FF4B4B",     1: "#FFA500",    2: "#21C354"}
MAX_LENGTH       = 128
DEVICE           = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# ─────────────────────────────────────────────
# CharCNN-BiLSTM Model (for language tagging)
# ─────────────────────────────────────────────
class CharCNN_BiLSTM_Labeler(nn.Module):
    def __init__(self, word_vocab_size, char_vocab_size, tagset_size,
                 word_embed_dim=128, char_embed_dim=50, char_filters=50,
                 kernel_size=3, hidden_dim=256):
        super().__init__()
        self.word_embedding = nn.Embedding(word_vocab_size, word_embed_dim, padding_idx=0)
        self.char_embedding = nn.Embedding(char_vocab_size, char_embed_dim, padding_idx=0)
        self.char_cnn       = nn.Conv1d(char_embed_dim, char_filters, kernel_size, padding=kernel_size // 2)
        lstm_input_dim      = word_embed_dim + char_filters
        self.lstm           = nn.LSTM(lstm_input_dim, hidden_dim // 2, num_layers=1, bidirectional=True, batch_first=True)
        self.hidden2tag     = nn.Linear(hidden_dim, tagset_size)

    def forward(self, words, chars):
        batch_size, seq_len, max_word_len = chars.shape
        chars_flat  = chars.view(-1, max_word_len)
        char_embeds = self.char_embedding(chars_flat).transpose(1, 2)
        cnn_out     = torch.relu(self.char_cnn(char_embeds))
        char_feat, _= torch.max(cnn_out, dim=2)
        char_feat   = char_feat.view(batch_size, seq_len, -1)
        word_feat   = self.word_embedding(words)
        combined    = torch.cat((word_feat, char_feat), dim=2)
        lstm_out, _ = self.lstm(combined)
        return self.hidden2tag(lstm_out)


# ─────────────────────────────────────────────
# Text Cleaning
# ─────────────────────────────────────────────
def clean_text(text: str) -> str:
    if not isinstance(text, str):
        return ""
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    text = re.sub(r'<.*?>', '', text)
    text = text.replace('_', ' ')
    text = re.sub(r'\s+', ' ', text).strip()
    return text


# ─────────────────────────────────────────────
# Load Models (cached so they load only once)
# ─────────────────────────────────────────────
@st.cache_resource
def load_xlmr_model():
    tokenizer = AutoTokenizer.from_pretrained("xlm-roberta-base")
    model     = AutoModelForSequenceClassification.from_pretrained("xlm-roberta-base", num_labels=3)
    if os.path.exists(XLMR_MODEL_PATH):
        model.load_state_dict(torch.load(XLMR_MODEL_PATH, map_location=DEVICE))
    else:
        st.warning(f"⚠️ '{XLMR_MODEL_PATH}' not found. Using base XLM-RoBERTa weights.")
    model.to(DEVICE)
    model.eval()
    return tokenizer, model


@st.cache_resource
def load_cs_model():
    if not (os.path.exists(VOCAB_PATH) and os.path.exists(CS_MODEL_PATH)):
        return None, None, None, None

    with open(VOCAB_PATH, "rb") as f:
        vocab   = pickle.load(f)
    word2idx = vocab["word2idx"]
    char2idx = vocab["char2idx"]
    tag2idx  = vocab["tag2idx"]
    idx2tag  = {v: k for k, v in tag2idx.items()}

    cs_model = CharCNN_BiLSTM_Labeler(len(word2idx), len(char2idx), len(tag2idx))
    cs_model.load_state_dict(torch.load(CS_MODEL_PATH, map_location=DEVICE))
    cs_model.to(DEVICE)
    cs_model.eval()
    return cs_model, word2idx, char2idx, idx2tag


# ─────────────────────────────────────────────
# Language Tag Prediction
# ─────────────────────────────────────────────
def predict_language(text, word2idx, char2idx, cs_model, idx2tag):
    tokens = text.strip().split()
    if not tokens:
        return "KM"
    word_ids     = [word2idx.get(w, word2idx.get("<UNK>", 1)) for w in tokens]
    max_word_len = max(len(w) for w in tokens)
    char_ids     = [
        [char2idx.get(c, char2idx.get("<UNK>", 1)) for c in w] + [0] * (max_word_len - len(w))
        for w in tokens
    ]
    words_t = torch.tensor([word_ids], dtype=torch.long).to(DEVICE)
    chars_t = torch.tensor([char_ids], dtype=torch.long).to(DEVICE)
    with torch.no_grad():
        outputs  = cs_model(words_t, chars_t)
        pred_ids = torch.argmax(outputs, dim=2)[0].tolist()
    most_common = max(set(pred_ids), key=pred_ids.count)
    return idx2tag[most_common]


# ─────────────────────────────────────────────
# Full Preprocessing
# ─────────────────────────────────────────────
def preprocess(text: str, cs_model, word2idx, char2idx, idx2tag) -> str:
    cleaned = clean_text(text)
    if not cleaned:
        return ""

    # Language tagging
    if cs_model is not None:
        tag = predict_language(cleaned, word2idx, char2idx, cs_model, idx2tag)
    else:
        tag = "KM"  # default fallback

    # Word segmentation
    tokens  = khmernltk.word_tokenize(cleaned)
    spaced  = re.sub(r'\s+', ' ', " ".join(tokens)).strip()
    return f"[{tag}] {spaced}"


# ─────────────────────────────────────────────
# Sentiment Prediction
# ─────────────────────────────────────────────
def predict_sentiment(texts: list, tokenizer, model, batch_size: int = 16) -> list:
    results = []
    for i in range(0, len(texts), batch_size):
        batch  = texts[i: i + batch_size]
        enc    = tokenizer(batch, truncation=True, padding=True, max_length=MAX_LENGTH, return_tensors="pt")
        enc    = {k: v.to(DEVICE) for k, v in enc.items()}
        with torch.no_grad():
            logits = model(**enc).logits
        preds  = torch.argmax(logits, dim=1).cpu().numpy()
        probs  = torch.softmax(logits, dim=1).cpu().numpy()
        for pred, prob in zip(preds, probs):
            results.append({
                "label_id":   int(pred),
                "label":      LABEL_MAP[int(pred)],
                "confidence": float(prob[pred]),
                "neg_score":  float(prob[0]),
                "neu_score":  float(prob[1]),
                "pos_score":  float(prob[2]),
            })
    return results


# ─────────────────────────────────────────────
# UI
# ─────────────────────────────────────────────
st.title("🇰🇭 Khmer Sentiment Analyzer")
st.markdown("Upload a **Facebook comments CSV** to analyze sentiment using **XLM-RoBERTa**.")

# Sidebar
with st.sidebar:
    st.header("⚙️ Settings")
    batch_size   = st.slider("Batch Size", 4, 64, 16, step=4)
    show_scores  = st.checkbox("Show confidence scores", value=True)
    text_column  = st.text_input("Text column name in CSV", value="text")
    st.markdown("---")
    st.markdown("**Expected CSV columns:**")
    st.code("postTitle\npostDescription\ntext\nlikesCount\nfacebookUrl")

# Load models
with st.spinner("Loading models..."):
    tokenizer, xlmr_model                 = load_xlmr_model()
    cs_model, word2idx, char2idx, idx2tag = load_cs_model()

if cs_model is not None:
    st.sidebar.success("✅ CharCNN language model loaded")
else:
    st.sidebar.warning("⚠️ CharCNN model not found — using default [KM] tag")

st.sidebar.success("✅ XLM-RoBERTa model loaded")

# File upload
uploaded_file = st.file_uploader(
    "📂 Upload CSV file",
    type=["csv"],
    help="Upload a CSV with a 'text' column (Facebook comments format)"
)

if uploaded_file:
    df = pd.read_csv(uploaded_file)
    st.subheader("📋 Preview of Uploaded Data")
    st.dataframe(df.head(5), use_container_width=True)

    if text_column not in df.columns:
        st.error(f"❌ Column `{text_column}` not found in CSV. Available columns: {list(df.columns)}")
    else:
        st.info(f"✅ Found **{len(df)}** rows. Starting analysis...")

        if st.button("🚀 Run Sentiment Analysis"):
            progress = st.progress(0, text="Preprocessing texts...")

            # Step 1 — Preprocess
            processed = []
            total     = len(df)
            for i, text in enumerate(df[text_column].fillna("").tolist()):
                processed.append(preprocess(text, cs_model, word2idx, char2idx, idx2tag))
                if i % 10 == 0:
                    progress.progress(int((i / total) * 40), text=f"Preprocessing... {i}/{total}")

            progress.progress(40, text="Running sentiment model...")

            # Step 2 — Predict
            preds = predict_sentiment(processed, tokenizer, xlmr_model, batch_size)
            progress.progress(90, text="Building results...")

            # Step 3 — Merge results
            result_df = df.copy()
            result_df["Processed_Text"] = processed
            result_df["Sentiment"]      = [p["label"]      for p in preds]
            result_df["Confidence"]     = [round(p["confidence"] * 100, 2) for p in preds]
            result_df["Neg_Score"]      = [round(p["neg_score"]  * 100, 2) for p in preds]
            result_df["Neu_Score"]      = [round(p["neu_score"]  * 100, 2) for p in preds]
            result_df["Pos_Score"]      = [round(p["pos_score"]  * 100, 2) for p in preds]

            progress.progress(100, text="Done!")
            st.success("✅ Analysis complete!")

            # ─── Summary Stats ───
            st.subheader("📊 Sentiment Summary")
            counts  = result_df["Sentiment"].value_counts()
            total_c = len(result_df)

            col1, col2, col3 = st.columns(3)
            pos_count = counts.get("Positive 😊", 0)
            neu_count = counts.get("Neutral 😐",  0)
            neg_count = counts.get("Negative 😠", 0)

            col1.metric("Positive 😊", pos_count, f"{pos_count/total_c*100:.1f}%")
            col2.metric("Neutral 😐",  neu_count, f"{neu_count/total_c*100:.1f}%")
            col3.metric("Negative 😠", neg_count, f"{neg_count/total_c*100:.1f}%")

            # ─── Bar Chart ───
            st.bar_chart(counts)

            # ─── Results Table ───
            st.subheader("📝 Full Results")
            display_cols = [text_column, "Sentiment", "Confidence"]
            if show_scores:
                display_cols += ["Neg_Score", "Neu_Score", "Pos_Score"]
            if "facebookUrl" in result_df.columns:
                display_cols.insert(0, "facebookUrl")

            st.dataframe(
                result_df[display_cols].reset_index(drop=True),
                use_container_width=True
            )

            # ─── Download ───
            st.subheader("⬇️ Download Results")
            csv_out = result_df.to_csv(index=False, encoding="utf-8-sig")
            st.download_button(
                label="📥 Download CSV with Sentiment Labels",
                data=csv_out,
                file_name="sentiment_results.csv",
                mime="text/csv"
            )
else:
    st.info("👆 Please upload a CSV file to get started.")
    st.markdown("### Expected CSV Format")
    sample = pd.DataFrame({
        "postTitle":       ["Smart 5G Expansion..."],
        "postDescription": ["..."],
        "text":            ["Smart ឡូវ សុីលុយ ប្រើបានតែ12ថ្ងៃ"],
        "likesCount":      [0],
        "facebookUrl":     ["https://web.facebook.com/..."]
    })
    st.dataframe(sample, use_container_width=True)
