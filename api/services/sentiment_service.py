"""
Sentiment Service
-----------------
Wraps the XLM-RoBERTa sentiment classifier and the CharCNN-BiLSTM language
tagger that were trained in Setiment-analysis/sentiment_analysis.ipynb.

All heavy objects are loaded ONCE and reused across requests.
"""

import os
import re
import pickle
import logging
from typing import List, Dict

import torch
import torch.nn as nn
from transformers import AutoConfig, AutoTokenizer, AutoModelForSequenceClassification
from api.services.artifact_loader import ensure_artifact

try:
    import khmernltk  # type: ignore
except Exception:
    khmernltk = None

logger = logging.getLogger(__name__)

# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Constants
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
LABEL_MAP = {0: "Negative", 1: "Neutral", 2: "Positive"}
MAX_LENGTH = 128
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
BASE_MODEL_ID = "xlm-roberta-base"

# Paths are relative to the project root â€” adjust if needed
_BASE = os.path.join(os.path.dirname(__file__), "..", "..", "Setiment-analysis")
XLMR_MODEL_PATH = os.path.join(_BASE, "best_xlmr_sentiment_model.pth")
CS_MODEL_PATH   = os.path.join(_BASE, "khmer_cs_char_cnn_model.pth")
VOCAB_PATH      = os.path.join(_BASE, "vocab2.pkl")
LOCAL_XLMR_PATH = os.getenv(
    "SENTIMENT_BASE_MODEL_PATH",
    os.path.join(_BASE, "xlm-roberta-base"),
)
REQUIRED_ARTIFACTS = {
    "best_xlmr_sentiment_model.pth": {
        "path": XLMR_MODEL_PATH,
        "relative": "Setiment-analysis/best_xlmr_sentiment_model.pth",
        "env": "ARTIFACT_URL_BEST_XLMR_MODEL",
    },
    "khmer_cs_char_cnn_model.pth": {
        "path": CS_MODEL_PATH,
        "relative": "Setiment-analysis/khmer_cs_char_cnn_model.pth",
        "env": "ARTIFACT_URL_CHARCNN_MODEL",
    },
    "vocab2.pkl": {
        "path": VOCAB_PATH,
        "relative": "Setiment-analysis/vocab2.pkl",
        "env": "ARTIFACT_URL_VOCAB",
    },
    "xlm-roberta-base/tokenizer.json": {
        "path": os.path.join(LOCAL_XLMR_PATH, "tokenizer.json"),
        "relative": "Setiment-analysis/xlm-roberta-base/tokenizer.json",
        "env": "ARTIFACT_URL_XLMR_TOKENIZER_JSON",
    },
    "xlm-roberta-base/sentencepiece.bpe.model": {
        "path": os.path.join(LOCAL_XLMR_PATH, "sentencepiece.bpe.model"),
        "relative": "Setiment-analysis/xlm-roberta-base/sentencepiece.bpe.model",
        "env": "ARTIFACT_URL_XLMR_SENTENCEPIECE",
    },
    "xlm-roberta-base/config.json": {
        "path": os.path.join(LOCAL_XLMR_PATH, "config.json"),
        "relative": "Setiment-analysis/xlm-roberta-base/config.json",
        "env": "ARTIFACT_URL_XLMR_CONFIG",
    },
    "xlm-roberta-base/tokenizer_config.json": {
        "path": os.path.join(LOCAL_XLMR_PATH, "tokenizer_config.json"),
        "relative": "Setiment-analysis/xlm-roberta-base/tokenizer_config.json",
        "env": "ARTIFACT_URL_XLMR_TOKENIZER_CONFIG",
    },
}


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# CharCNN-BiLSTM  (same architecture as training notebook)
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class CharCNN_BiLSTM_Labeler(nn.Module):
    def __init__(self, word_vocab_size, char_vocab_size, tagset_size,
                 word_embed_dim=128, char_embed_dim=50, char_filters=50,
                 kernel_size=3, hidden_dim=256):
        super().__init__()
        self.word_embedding = nn.Embedding(word_vocab_size, word_embed_dim, padding_idx=0)
        self.char_embedding = nn.Embedding(char_vocab_size, char_embed_dim, padding_idx=0)
        self.char_cnn       = nn.Conv1d(char_embed_dim, char_filters, kernel_size, padding=kernel_size // 2)
        lstm_input_dim      = word_embed_dim + char_filters
        self.lstm           = nn.LSTM(lstm_input_dim, hidden_dim // 2, num_layers=1,
                                      bidirectional=True, batch_first=True)
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


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Service class (singleton â€” loaded once at startup)
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class SentimentService:
    def __init__(self):
        self.tokenizer  = None
        self.xlmr_model = None
        self.cs_model   = None
        self.word2idx   = None
        self.char2idx   = None
        self.idx2tag    = None
        self.sentiment_weights_loaded = False
        self.language_tagger_loaded = False
        self.sentiment_model_source = "uninitialized"

    def _ensure_required_artifacts(self):
        # Attempt to download missing artifacts before failing startup.
        for name, item in REQUIRED_ARTIFACTS.items():
            path = item["path"]
            if os.path.exists(path):
                continue
            ensure_artifact(
                local_path=path,
                relative_path=item["relative"],
                env_key=item.get("env"),
            )

        missing = [
            f"{name} -> {item['path']}"
            for name, item in REQUIRED_ARTIFACTS.items()
            if not os.path.exists(item["path"])
        ]
        if missing:
            joined = "; ".join(missing)
            raise RuntimeError(
                "Missing required fine-tuned sentiment artifacts. "
                "Provide per-file artifact URLs or MODEL_ARTIFACT_BASE_URL. "
                f"Missing files: {joined}"
            )

    def load(self):
        """Load all models into memory. Call this once at app startup."""
        self._ensure_required_artifacts()
        logger.info("Loading XLM-RoBERTa sentiment modelâ€¦")
        base_model_source = LOCAL_XLMR_PATH if os.path.isdir(LOCAL_XLMR_PATH) else BASE_MODEL_ID
        try:
            # Load tokenizer + config only (small files), then load the fine-tuned
            # checkpoint weights directly to reduce startup memory.
            self.tokenizer = AutoTokenizer.from_pretrained(
                base_model_source,
                local_files_only=True,
            )
            config = AutoConfig.from_pretrained(
                base_model_source,
                local_files_only=True,
            )
            config.num_labels = 3
            self.xlmr_model = AutoModelForSequenceClassification.from_config(config)
        except Exception as exc:
            raise RuntimeError(
                "Unable to load tokenizer/config in offline mode. "
                "Provide local XLM-RoBERTa tokenizer/config files in "
                f"'{LOCAL_XLMR_PATH}'. "
                f"Root cause: {exc}"
            ) from exc
        state_dict = torch.load(XLMR_MODEL_PATH, map_location=DEVICE)
        try:
            self.xlmr_model.load_state_dict(state_dict)
        except RuntimeError:
            # Common fallback for wrapped checkpoints.
            if isinstance(state_dict, dict) and "state_dict" in state_dict:
                self.xlmr_model.load_state_dict(state_dict["state_dict"])
            else:
                remapped = {
                    (k[7:] if k.startswith("module.") else k): v
                    for k, v in state_dict.items()
                }
                self.xlmr_model.load_state_dict(remapped)
        logger.info("Fine-tuned XLM-RoBERTa weights loaded.")
        self.sentiment_weights_loaded = True
        self.sentiment_model_source = "fine_tuned"
        self.xlmr_model.to(DEVICE)
        self.xlmr_model.eval()

        logger.info("Loading CharCNN-BiLSTM language taggerâ€¦")
        with open(VOCAB_PATH, "rb") as f:
            vocab = pickle.load(f)
        self.word2idx = vocab["word2idx"]
        self.char2idx = vocab["char2idx"]
        tag2idx       = vocab["tag2idx"]
        self.idx2tag  = {v: k for k, v in tag2idx.items()}
        self.cs_model = CharCNN_BiLSTM_Labeler(
            len(self.word2idx), len(self.char2idx), len(tag2idx)
        )
        self.cs_model.load_state_dict(
            torch.load(CS_MODEL_PATH, map_location=DEVICE)
        )
        self.cs_model.to(DEVICE)
        self.cs_model.eval()
        logger.info("CharCNN-BiLSTM loaded.")
        self.language_tagger_loaded = True

    # â”€â”€ Internal helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    def _clean_text(self, text: str) -> str:
        if not isinstance(text, str):
            return ""
        text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
        text = re.sub(r'<.*?>', '', text)
        text = text.replace('_', ' ')
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def _predict_language(self, text: str) -> str:
        if self.cs_model is None:
            return "KM"
        tokens = text.strip().split()
        if not tokens:
            return "KM"
        word_ids     = [self.word2idx.get(w, self.word2idx.get("<UNK>", 1)) for w in tokens]
        max_word_len = max(len(w) for w in tokens)
        char_ids     = [
            [self.char2idx.get(c, self.char2idx.get("<UNK>", 1)) for c in w]
            + [0] * (max_word_len - len(w))
            for w in tokens
        ]
        words_t = torch.tensor([word_ids], dtype=torch.long).to(DEVICE)
        chars_t = torch.tensor([char_ids], dtype=torch.long).to(DEVICE)
        with torch.no_grad():
            outputs  = self.cs_model(words_t, chars_t)
            pred_ids = torch.argmax(outputs, dim=2)[0].tolist()
        most_common = max(set(pred_ids), key=pred_ids.count)
        return self.idx2tag[most_common]

    def _preprocess(self, text: str):
        """Returns (preprocessed_text, language_tag)."""
        cleaned = self._clean_text(text)
        if not cleaned:
            return "", "KM"
        tag    = self._predict_language(cleaned)
        if khmernltk is not None:
            tokens = khmernltk.word_tokenize(cleaned)
        else:
            # Fallback tokenizer when khmernltk isn't installed.
            tokens = cleaned.split()
        spaced = re.sub(r'\s+', ' ', " ".join(tokens)).strip()
        return f"[{tag}] {spaced}", tag

    # â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    def predict(self, texts: List[str], batch_size: int = 16) -> List[Dict]:
        """
        Predict sentiment for a list of raw texts.

        Returns a list of dicts with keys:
            text, label, confidence, scores, language_tag
        """
        preprocessed_texts = []
        language_tags      = []
        for t in texts:
            p, tag = self._preprocess(t)
            preprocessed_texts.append(p)
            language_tags.append(tag)

        results = []
        for i in range(0, len(preprocessed_texts), batch_size):
            batch = preprocessed_texts[i: i + batch_size]
            enc   = self.tokenizer(
                batch, truncation=True, padding=True,
                max_length=MAX_LENGTH, return_tensors="pt"
            )
            enc = {k: v.to(DEVICE) for k, v in enc.items()}
            with torch.no_grad():
                logits = self.xlmr_model(**enc).logits
            preds = torch.argmax(logits, dim=1).cpu().numpy()
            probs = torch.softmax(logits, dim=1).cpu().numpy()
            for pred, prob in zip(preds, probs):
                results.append({
                    "label":      LABEL_MAP[int(pred)],
                    "confidence": float(prob[pred]),
                    "scores": {
                        "negative": float(prob[0]),
                        "neutral":  float(prob[1]),
                        "positive": float(prob[2]),
                    },
                })

        # Attach original text + language tag
        output = []
        for raw_text, tag, res in zip(texts, language_tags, results):
            output.append({
                "text":         raw_text,
                "label":        res["label"],
                "confidence":   res["confidence"],
                "scores":       res["scores"],
                "language_tag": tag,
            })
        return output


# Singleton instance â€” imported by routes
sentiment_service = SentimentService()
