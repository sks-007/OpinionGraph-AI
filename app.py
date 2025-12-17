from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from transformers import pipeline
import torch

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
summarizer = pipeline("summarization", model=SUMMARIZER_MODEL_PATH, device=device)
print("Summarization model loaded.")


# --- NEW: Keyword Extraction function using the wordcloud library ---
def extract_keywords_with_wordcloud(text, num_keywords=7):
    """
    Extracts keywords using the wordcloud library's text processing.
    It does NOT generate an image, only calculates word frequencies.
    """
    # Use the library's default stop words
    # You can add custom words to ignore like this: stopwords = STOPWORDS | {"custom", "words"}
    stopwords = set(STOPWORDS)
    
    # Create a WordCloud object to process the text
    # We set max_words to a higher number to ensure we have enough to choose from.
    wc = WordCloud(
        stopwords=stopwords,
        max_words=50,
        background_color="white" # a background color is required
    )
    
    # The .process_text() method does all the work:
    # 1. Splits text into words (tokenization)
    # 2. Removes punctuation and stop words
    # 3. Counts the frequency of remaining words
    # It returns a dictionary like {'word': frequency, ...}
    word_frequencies = wc.process_text(text)
    
    # Sort the dictionary by frequency in descending order and get the top words
    sorted_keywords = sorted(word_frequencies.items(), key=lambda item: item[1], reverse=True)
    
    # Return just the word (the key) for the top `num_keywords`
    return [word for word, freq in sorted_keywords[:num_keywords]]


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
            summary_result = summarizer(comment_text, max_length=60, min_length=15, do_sample=False)[0]['summary_text']
        else:
            summary_result = comment_text

        # Run sentiment analysis
        sentiment_result = sentiment_analyzer(comment_text)[0]
        
        # --- MODIFIED: Call the new keyword extraction function ---
        keywords = extract_keywords_with_wordcloud(comment_text)

        response_data = {
            "sentiment": sentiment_result['label'],
            "confidence": sentiment_result['score'],
            "summary": summary_result,
            "keywords": keywords # Use the keywords from the wordcloud library
        }
        return jsonify(response_data)

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({"error": "Failed to process the request"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)