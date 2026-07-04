# OpinionGraph AI - eConsultation Intelligence Platform

<div align="center">

![Smart India Hackathon 2026](https://img.shields.io/badge/Smart_India_Hackathon-2026-orange?style=for-the-badge)
![Ministry of Corporate Affairs](https://img.shields.io/badge/MoCA-Problem_ID_25035-blue?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.10+-green?style=for-the-badge&logo=python)
![Flask](https://img.shields.io/badge/Flask-3.1-black?style=for-the-badge&logo=flask)

**An AI-powered platform for analyzing stakeholder comments in government eConsultations using Sentiment Analysis, Intelligent Summarization, and Interactive Word Cloud visualization.**

🚀 **[View Live Deployment on Hugging Face Spaces](https://huggingface.co/spaces/coderxsachin/OpinionGraph-AI)** 🚀

[Features](#features) · [Tech Stack](#tech-stack) · [Setup Guide](#installation) · [Sample Datasets](#sample-datasets)

</div>

---

## Problem Context

> **Organization:** Ministry of Corporate Affairs (MoCA), Government of India  
> **Problem Statement ID:** 25035  
> **Category:** Software — Smart India Hackathon 2026

The MCA's **eConsultation module** is an online platform where proposed amendments and draft legislations are posted for external stakeholders to submit their comments through the MCA21 portal. Responses are captured in a structured format for consideration during the legislative amendment process.

### The Challenge

When a substantial volume of comments is received, there exists a significant risk of:
- Certain observations being **inadvertently overlooked**
- **Inconsistent analysis** due to reviewer fatigue
- Hours or days spent manually reading **thousands of responses**
- Difficulty identifying **overall public opinion** or recurring concerns
- **Preparation of consultation reports** becoming a labor-intensive task

OpinionGraph AI was built to solve this. Rather than replacing human decision-making, it equips officials with AI-assisted insights so that **every submission gets considered and systematically analyzed**.

---

## Features

### AI Sentiment Analysis
- Automatically classifies every stakeholder comment as **Positive**, **Negative**, or **Neutral**
- Provides an individual **confidence score** for each classification
- Generates **overall sentiment distribution** across the entire consultation
- Built on `distilbert-base-uncased-finetuned-sst-2-english` for fast, accurate predictions

### Intelligent Summary Generation
- Generates concise summaries that preserve the stakeholder's original intent
- Runs `facebook/bart-large-cnn` for deep, abstractive summarization
- Automatically falls back to extractive summarization (first 2 sentences) for large datasets (≥100 comments) to ensure speed
- Summaries are displayed alongside each comment in the Comment Explorer

### Interactive Keyword Heatmap (Word Cloud)
- Extracts the most meaningful keywords from all comments using WordCloud frequency analysis
- Renders a beautiful, interactive D3.js word cloud where word size = frequency
- **Clicking any keyword** instantly navigates to the Comment Explorer, filtered to comments containing that keyword
- Uses an expanded stopword list to filter noise and irrelevant words

### Comprehensive Dashboard
- **Summary Statistics**: Total comments, sentiment breakdown, average confidence score
- **Sentiment Distribution Charts**: Pie charts and bar graphs
- **Model Confidence Distribution**: Histogram of AI prediction confidence
- **Stakeholder Category Breakdown**: Segment analysis when category data is present
- **Comment Length Distribution**: Analytics on response detail level
- **Top Keywords Bar Chart**: Visual frequency ranking of key terms

### Comment Explorer
- Full filterable and searchable table of all analyzed comments
- Filter by **Positive / Negative / Neutral** sentiment
- Real-time search across all comment text
- Displays original comment, AI-generated summary, detected sentiment, and confidence score
- All comments shown at once — no pagination limits

### Performance Optimizations
- **True Batch Inference**: Feeds all comments to the sentiment model simultaneously (`batch_size=32`) instead of one-by-one, eliminating per-call overhead
- **Auto-skip Summarizer**: For datasets ≥100 comments, uses fast sentence extraction instead of the heavy BART model
- **Toast Notification**: Non-blocking UI notification explains when performance mode activates

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend** | Python 3.10+, Flask 3.1 | REST API server |
| **AI — Sentiment** | `distilbert-base-uncased-finetuned-sst-2-english` | Sentiment classification |
| **AI — Summarizer** | `facebook/bart-large-cnn` | Abstractive text summarization |
| **AI — Keywords** | `wordcloud` Python library | Keyword frequency extraction |
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (ES6+) | Single-page application |
| **Charts** | Chart.js | Dashboard visualizations |
| **Word Cloud** | D3.js + d3-cloud | Interactive word cloud |
| **Icons** | Lucide Icons | UI iconography |
| **Fonts** | Google Fonts (Inter) | Typography |
| **File Parsing** | SheetJS (xlsx) | Client-side CSV/Excel parsing |

---

## Project Structure

```
Opinion Graph/
│
├── app.py                  # Flask backend — routes, AI pipeline, keyword extraction
├── download_models.py      # One-time script to download AI models from HuggingFace
├── requirements.txt        # Python dependencies
│
├── models/                 # Local AI model storage (downloaded by download_models.py)
│   ├── distilbert-base-uncased-finetuned-sst-2-english/
│   └── facebook/
│       └── bart-large-cnn/
│
├── templates/
│   └── index.html          # Single-page application shell
│
├── static/
│   ├── index.css           # All styles, design system, animations
│   ├── index.js            # All frontend logic — routing, parsing, charts, dashboard
│   ├── Sample1.csv         # Demo dataset (100 rows, single comment column)
│   ├── Sample2.xlsx        # Demo dataset (2,200 rows, multi-domain opinions)
│   └── Sample3.xlsx        # Demo dataset (160 rows, multi-annotator benchmark)
│
└── venv/                   # Python virtual environment (not committed)
```

---

## Installation

### Prerequisites
- Python 3.10 or higher
- pip
- ~5 GB free disk space (for AI models)
- Internet connection (first time only, for model download)

### Step 1 — Clone the Repository

```bash
git clone https://github.com/your-username/opinion-graph.git
cd opinion-graph
```

### Step 2 — Create a Virtual Environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### Step 3 — Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 4 — Download AI Models

This is a **one-time step**. The models are downloaded from HuggingFace Hub and stored locally so the app works fully offline afterwards.

```bash
python download_models.py
```

> ⚠️ **Note:** This downloads `distilbert-base-uncased-finetuned-sst-2-english` (~268 MB) and `facebook/bart-large-cnn` (~1.6 GB). Ensure you have a stable internet connection and sufficient disk space.

### Step 5 — Run the Application

```bash
python app.py
```

The server will start at **http://localhost:5000**

---

## How It Works

### Data Flow

```
User uploads CSV/Excel file
        │
        ▼
Frontend (SheetJS) parses file client-side
        │
        ▼
Comment column is auto-detected by header name or content length
        │
        ▼
All comment texts are sent to /analyze-batch API endpoint
        │
        ├──► Step 1: All texts pre-filtered and truncated to 512 tokens
        │
        ├──► Step 2: Batch Sentiment Inference
        │           sentiment_analyzer(all_texts, batch_size=32)
        │           → Returns label (Positive/Negative) + confidence score
        │           → Labels with confidence < 0.65 are reclassified as Neutral
        │
        ├──► Step 3: Summarization (per-item)
        │           - If dataset < 100 comments AND comment > 30 words:
        │             → BART model generates abstractive summary
        │           - Otherwise:
        │             → Fast extraction of first 2 sentences
        │
        └──► Step 4: Keyword Extraction (per-item)
                    → WordCloud library processes text with expanded stopwords
                    → Returns top 15 keywords with frequency counts
                    │
                    ▼
        Results returned as JSON to frontend
                    │
                    ▼
        Dashboard, Charts, Explorer, and Word Cloud rendered
```

### Sentiment Classification Rules

| Model Output | Confidence | Final Label |
|---|---|---|
| POSITIVE | ≥ 0.65 | Positive |
| NEGATIVE | ≥ 0.65 | Negative |
| POSITIVE or NEGATIVE | < 0.65 | Neutral |

---

## Sample Datasets

Three sample datasets are included and available for download directly from the app's **Demo** section.

### Sample 1 — `Sample1.csv`

| Property | Value |
|---|---|
| **Rows** | 100 |
| **Column** | `Comment` |
| **Unique comments** | ~15 (85% duplicates) |
| **Purpose** | Quick demo, tests duplicate detection and frequency analysis |

### Sample 2 — `Sample2.xlsx`

| Property | Value |
|---|---|
| **Rows** | 778 |
| **Column** | Primary text column |
| **Domains** | Government regulations, MSME policies, company law, compliance frameworks |
| **Purpose** | Realistic policy-focused benchmarking and sentiment analysis |
| **Note** | Performance optimization mode triggers automatically (dataset ≥100 comments) |

### Sample 3 — `Sample3.xlsx`

| Property | Value |
|---|---|
| **Rows** | 160 |
| **Columns** | 6 (ID, English Translation, empty, 3× annotation columns) |
| **Annotations** | 3 independent human sentiment labels per comment |
| **Positive ratio** | ~95% across all annotation columns |
| **Purpose** | Multi-annotator benchmark for model consistency evaluation |

---

## Application Pages

| Route | Page | Description |
|---|---|---|
| `/#home` | Home | Landing page with platform overview |
| `/#platform` | Platform | Detailed feature descriptions |
| `/#features` | Features | Capability highlights |
| `/#how-it-works` | How It Works | Step-by-step explanation |
| `/#demo` | Demo | Upload file and run analysis |
| `/#live` | Processing | Real-time analysis progress screen |
| `/#dashboard` | Dashboard | Main analytics overview |
| `/#summary` | AI Summary Centre | Detailed AI-generated summaries |
| `/#explorer` | Comment Explorer | Searchable, filterable comment table |
| `/#wordcloud` | Word Cloud | Interactive keyword heatmap |
| `/#advanced` | Advanced Analytics | Charts and statistical visualizations |
| `/#docs` | Documentation | Project background and dataset descriptions |

---

## API Reference

### `POST /analyze-batch`

Analyzes a batch of comments using the full AI pipeline.

**Request Body:**
```json
{
  "comments": ["comment text 1", "comment text 2", "..."]
}
```

**Response:**
```json
{
  "results": [
    {
      "original": "comment text 1",
      "sentiment": "Positive",
      "confidence": 0.97,
      "summary": "Concise summary of the comment.",
      "keywords": ["keyword1", "keyword2"],
      "keyword_frequencies": { "keyword1": 5, "keyword2": 3 }
    }
  ],
  "total": 1,
  "fast_summary_used": false
}
```

**Response fields:**

| Field | Type | Description |
|---|---|---|
| `results` | Array | One result object per input comment |
| `total` | Integer | Number of comments successfully processed |
| `fast_summary_used` | Boolean | `true` if extractive summary was used instead of BART |

---

## Configuration

Key configuration values in `app.py`:

```python
# Model paths (set after running download_models.py)
SENTIMENT_MODEL_PATH = "models/distilbert-base-uncased-finetuned-sst-2-english"
SUMMARIZER_MODEL_PATH = "models/facebook/bart-large-cnn"

# Confidence threshold below which comments are labeled Neutral
CONFIDENCE_THRESHOLD = 0.65

# Datasets with >= this many comments use fast extractive summarization
LARGE_DATASET_THRESHOLD = 100

# Batch size for sentiment inference
BATCH_SIZE = 32
```

---

## Known Limitations

- **Summarizer is CPU-bound**: The `bart-large-cnn` model is large and runs slowly on CPU. For datasets ≥100 comments, the platform automatically uses fast sentence extraction.
- **No GPU auto-detection on Windows**: PyTorch CUDA support requires a compatible NVIDIA GPU and CUDA toolkit. The app auto-detects and uses a GPU if available.
- **No stakeholder metadata in sample datasets**: Advanced features like stakeholder segmentation, regional analysis, and organization-wise breakdowns require datasets with dedicated metadata columns (Category, Organization, Region, etc.).
- **Single session**: The backend holds analysis results in-memory for the current session only. There is no database persistence.

---

## Roadmap

- [ ] GPU-accelerated inference for production deployments
- [ ] Result caching for duplicate comment detection (instant re-analysis)
- [ ] PDF/DOCX report export
- [ ] Multi-language support (Hindi, regional languages)
- [ ] Named Entity Recognition (NER) for extracting specific provisions mentioned
- [ ] Database persistence (SQLite / PostgreSQL)
- [ ] User authentication and session management
- [ ] Consultation comparison across multiple datasets
- [ ] REST API authentication with API keys

---

Built for **Smart India Hackathon 2026** under Problem Statement ID **25035** issued by the **Ministry of Corporate Affairs (MoCA)**.

---
