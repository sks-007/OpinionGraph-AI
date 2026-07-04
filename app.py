from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from transformers import pipeline, AutoModelForSeq2SeqLM, AutoTokenizer
import torch
import time
from cachetools import LRUCache

# Initialize an LRU cache for up to 10,000 unique comments to avoid reprocessing
ANALYSIS_CACHE = LRUCache(maxsize=10000)

# --- NEW: Import WordCloud and its built-in stop words ---
from wordcloud import WordCloud, STOPWORDS

# 1. Initialize the Flask app
app = Flask(__name__)
CORS(app)

# --- Define Local Model Paths ---
SENTIMENT_MODEL_PATH = "models/distilbert-base-uncased-finetuned-sst-2-english"
SUMMARIZER_MODEL_PATH = "models/facebook/bart-large-cnn"

# --- AI Model Loading from Local Disk ---
device = 0 if torch.cuda.is_available() else -1
print(f"Using device: {'GPU' if device == 0 else 'CPU'}")

print("Loading sentiment analysis model from local disk...")
sentiment_analyzer = pipeline("sentiment-analysis", model=SENTIMENT_MODEL_PATH, device=device)
print("Sentiment model loaded.")

print("Loading summarization model from local disk...")
summarizer_tokenizer = AutoTokenizer.from_pretrained(SUMMARIZER_MODEL_PATH)
summarizer_model = AutoModelForSeq2SeqLM.from_pretrained(SUMMARIZER_MODEL_PATH)
if device == 0:
    summarizer_model = summarizer_model.to('cuda')
print("Summarization model loaded.")


# --- Keyword Extraction with frequencies ---
def extract_keywords_with_wordcloud(text, num_keywords=15):
    """
    Extracts keywords using the wordcloud library's text processing.
    Returns (word, frequency) pairs for better word cloud sizing.
    """
    stopwords = set(STOPWORDS)
    # Expanded stopwords: MCA legal terms + informal/vague words that flood simple feedback
    extra_stopwords = {
        "company", "shall", "section", "proposed", "amendment", "act", "rule", "ministry",
        "government", "india", "rules", "companies", "limited", "okay", "alright", "got",
        "didn", "wasn", "isn", "couldn", "wouldn", "don", "doesn", "haven", "hadn",
        "ve", "ll", "re", "just", "really", "very", "quite", "much", "also",
        "think", "like", "feel", "good", "bad", "lot", "bit", "way", "find", "found",
        "love", "hate", "make", "made", "get", "got", "going", "come", "came",
        "know", "need", "want", "think", "use", "used", "look", "said", "say",
        "thing", "things", "time", "year", "one", "two", "new", "old", "well",
        "even", "still", "already", "always", "never", "often", "day",
        "best", "better", "great", "nice", "sure", "right", "left", "back"
    }
    stopwords = stopwords.union(extra_stopwords)
    
    wc = WordCloud(
        stopwords=stopwords,
        max_words=100,
        background_color="white",
        min_word_length=4  # filter single chars and 2-3 letter noise
    )
    
    word_frequencies = wc.process_text(text)
    sorted_keywords = sorted(word_frequencies.items(), key=lambda item: item[1], reverse=True)
    
    # Return tuples of (word, frequency) for the top keywords
    return [(word, freq) for word, freq in sorted_keywords[:num_keywords]]

LABEL_MAP = {
    "POSITIVE": "Positive",
    "NEGATIVE": "Negative",
    "LABEL_1": "Positive",
    "LABEL_0": "Negative",
}


@app.route("/")
def serve_app():
    return render_template("index.html")

@app.route('/analyze', methods=['POST'])
def analyze_text():
    try:
        data = request.get_json()
        comment_text = data.get('text')

        if not comment_text:
            return jsonify({"error": "No text provided"}), 400

        # Run summarization
        min_length_for_summary = 30
        if len(comment_text.split()) > min_length_for_summary:
            inputs = summarizer_tokenizer(comment_text, return_tensors="pt", max_length=1024, truncation=True)
            if device == 0:
                inputs = {k: v.to('cuda') for k, v in inputs.items()}
            summary_ids = summarizer_model.generate(
                inputs["input_ids"], 
                max_length=60, 
                min_length=15, 
                num_beams=4,
                do_sample=False
            )
            summary_result = summarizer_tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        else:
            summary_result = comment_text

        # Run sentiment analysis
        sentiment_result = sentiment_analyzer(comment_text[:512], truncation=True)[0]
        label = LABEL_MAP.get(sentiment_result['label'].upper(), "Neutral")
        confidence = sentiment_result['score']
        if confidence < 0.65:
            label = "Neutral"
        
        # --- MODIFIED: Call the new keyword extraction function ---
        keywords = extract_keywords_with_wordcloud(comment_text)
        keyword_words = [k[0] for k in keywords]  # backward compat

        response_data = {
            "sentiment": label,
            "confidence": confidence,
            "summary": summary_result,
            "keywords": keyword_words,
            "keyword_frequencies": {k[0]: k[1] for k in keywords}
        }
        return jsonify(response_data)

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({"error": "Failed to process the request"}), 500

@app.route('/analyze-batch', methods=['POST'])
def analyze_batch():
    try:
        data = request.get_json()
        comments = data.get('comments', [])
        if not comments:
            return jsonify({"error": "No comments provided"}), 400

        # --- Step 1: Pre-filter all comments ---
        cleaned = [c.strip() for c in comments if c.strip()]

        # --- Step 2: Identify texts not in cache ---
        texts_to_process = []
        for c in cleaned:
            if c not in ANALYSIS_CACHE and c not in texts_to_process:
                texts_to_process.append(c)

        # --- Step 3: TRUE BATCH INFERENCE for Sentiment ---
        large_dataset = len(cleaned) >= 100
        if texts_to_process:
            truncated_texts = [t[:512] for t in texts_to_process]
            
            start_time = time.time()
            sentiment_results = sentiment_analyzer(
                truncated_texts,
                batch_size=32,        # Process 32 comments at a time
                truncation=True
            )
            print(f"[PERF] Batch sentiment for {len(texts_to_process)} NEW comments took {time.time() - start_time:.2f}s")

            # --- Step 4: Per-item summarization + keyword extraction ---
            
            for i, comment_text in enumerate(texts_to_process):
                # Map sentiment result
                sr = sentiment_results[i]
                label = LABEL_MAP.get(sr['label'].upper(), 'Neutral')
                confidence = sr['score']
                if confidence < 0.65:
                    label = 'Neutral'

                # Summary — skip heavy model for large datasets, use first 2 sentences instead
                word_count = len(comment_text.split())
                if not large_dataset and word_count > 30:
                    inputs = summarizer_tokenizer(comment_text, return_tensors="pt", max_length=1024, truncation=True)
                    if device == 0:
                        inputs = {k: v.to('cuda') for k, v in inputs.items()}
                    summary_ids = summarizer_model.generate(
                        inputs["input_ids"], max_length=80, min_length=20,
                        num_beams=4, do_sample=False
                    )
                    summary = summarizer_tokenizer.decode(summary_ids[0], skip_special_tokens=True)
                else:
                    # Fast fallback: first 2 sentences
                    sentences = comment_text.replace('!', '.').replace('?', '.').split('.')
                    summary = '. '.join(s.strip() for s in sentences[:2] if s.strip()) or comment_text

                # Keywords
                keywords = extract_keywords_with_wordcloud(comment_text)
                keyword_words = [k[0] for k in keywords]

                # Save to cache
                ANALYSIS_CACHE[comment_text] = {
                    "original": comment_text,
                    "sentiment": label,
                    "confidence": confidence,
                    "summary": summary,
                    "keywords": keyword_words,
                    "keyword_frequencies": { k[0]: k[1] for k in keywords }
                }

        # Build final results from cache
        results = [ANALYSIS_CACHE[c] for c in cleaned]

        return jsonify({"results": results, "total": len(results), "fast_summary_used": large_dataset})

    except Exception as e:
        print(f"Batch analysis error: {e}")
        return jsonify({"error": "Batch processing failed"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)