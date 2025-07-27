from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import re
import os
import pickle
import nltk
from typing import Dict, List, Tuple
import warnings

warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)

class SinhalaHateSpeechDetector:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
        self.model = LogisticRegression(random_state=42)
        self.trained = False
        self.hate_words = set()
        self.neutralizer_templates = [
            "This content contains inappropriate language",
            "This message has been flagged for inappropriate content",
            "Content has been identified as potentially harmful",
            "This text contains language that may be offensive",
            "Content moderated for inappropriate language"
        ]
        
    def preprocess_text(self, text: str) -> str:
        """Preprocess Sinhala/Singlish text"""
        # Convert to lowercase
        text = text.lower()
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Remove special characters but keep Sinhala characters
        text = re.sub(r'[^\w\s\u0D80-\u0DFF]', ' ', text)
        
        return text
    
    def extract_features(self, texts: List[str]) -> Dict:
        """Extract features for hate speech detection"""
        features = []
        
        for text in texts:
            feature_dict = {}
            processed_text = self.preprocess_text(text)
            
            # Hate word count
            hate_count = sum(1 for word in self.hate_words if word in processed_text)
            feature_dict['hate_word_count'] = hate_count
            
            # Text length features
            feature_dict['text_length'] = len(processed_text)
            feature_dict['word_count'] = len(processed_text.split())
            
            # Uppercase ratio
            feature_dict['uppercase_ratio'] = sum(1 for c in text if c.isupper()) / max(len(text), 1)
            
            # Special character count
            feature_dict['special_char_count'] = len(re.findall(r'[!@#$%^&*(),.?":{}|<>]', text))
            
            features.append(feature_dict)
            
        return pd.DataFrame(features)
    
    def train_model(self, csv_path: str):
        """Train the model using custom CSV data"""
        try:
            # Load training data
            df = pd.read_csv(csv_path)
            
            # Expected columns: 'text', 'label', 'hate_words' (optional)
            if 'text' not in df.columns or 'label' not in df.columns:
                raise ValueError("CSV must contain 'text' and 'label' columns")
            
            # Load hate words if available
            if 'hate_words' in df.columns:
                for hate_words_str in df['hate_words'].dropna():
                    if isinstance(hate_words_str, str):
                        self.hate_words.update(word.strip().lower() for word in hate_words_str.split(','))
            
            # Preprocess texts
            texts = [self.preprocess_text(text) for text in df['text']]
            labels = df['label'].values
            
            # Create TF-IDF features
            tfidf_features = self.vectorizer.fit_transform(texts)
            
            # Extract additional features
            additional_features = self.extract_features(df['text'].tolist())
            
            # Combine features
            combined_features = np.hstack([
                tfidf_features.toarray(),
                additional_features.values
            ])
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                combined_features, labels, test_size=0.2, random_state=42
            )
            
            # Train model
            self.model.fit(X_train, y_train)
            
            # Evaluate
            y_pred = self.model.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            
            self.trained = True
            
            # Save model
            self.save_model()
            
            return {
                'success': True,
                'accuracy': accuracy,
                'training_samples': len(df),
                'hate_words_loaded': len(self.hate_words)
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def predict(self, text: str) -> Dict:
        """Predict hate speech and generate scores"""
        if not self.trained:
            return {
                'error': 'Model not trained yet',
                'classification': 'unknown',
                'confidence_scores': {'hate': 0, 'harassment': 0, 'normal': 100}
            }
        
        try:
            # Preprocess text
            processed_text = self.preprocess_text(text)
            
            # Create TF-IDF features
            tfidf_features = self.vectorizer.transform([processed_text])
            
            # Extract additional features
            additional_features = self.extract_features([text])
            
            # Combine features
            combined_features = np.hstack([
                tfidf_features.toarray(),
                additional_features.values
            ])
            
            # Get prediction probabilities
            probabilities = self.model.predict_proba(combined_features)[0]
            prediction = self.model.predict(combined_features)[0]
            
            # Map probabilities to our scoring system
            if len(probabilities) >= 2:
                hate_score = probabilities[1] * 100  # Assuming class 1 is hate speech
                normal_score = probabilities[0] * 100  # Assuming class 0 is normal
            else:
                hate_score = probabilities[0] * 100 if prediction == 1 else 0
                normal_score = 100 - hate_score
            
            # Calculate harassment score based on features
            harassment_score = min(
                (additional_features['hate_word_count'].iloc[0] * 10 +
                 additional_features['uppercase_ratio'].iloc[0] * 30 +
                 additional_features['special_char_count'].iloc[0] * 5), 100
            )
            
            # Normalize scores
            total = hate_score + harassment_score + normal_score
            if total > 0:
                hate_score = (hate_score / total) * 100
                harassment_score = (harassment_score / total) * 100
                normal_score = (normal_score / total) * 100
            
            # Determine classification
            if hate_score > 60:
                classification = 'hate_speech'
            elif hate_score > 30 or harassment_score > 40:
                classification = 'flagged'
            else:
                classification = 'safe'
            
            return {
                'classification': classification,
                'confidence_scores': {
                    'hate': round(hate_score, 2),
                    'harassment': round(harassment_score, 2),
                    'normal': round(normal_score, 2)
                },
                'is_hate_speech': hate_score > 60,
                'neutralized_text': self.neutralize_text(text, hate_score)
            }
            
        except Exception as e:
            return {
                'error': str(e),
                'classification': 'error',
                'confidence_scores': {'hate': 0, 'harassment': 0, 'normal': 100}
            }
    
    def neutralize_text(self, text: str, hate_score: float) -> str:
        """Generate neutralized abstract sentence for hate speech"""
        if hate_score < 30:
            return text  # Return original if not hate speech
        
        # Select neutralization template based on hate score
        if hate_score > 80:
            return "This content has been identified as highly inappropriate and has been neutralized for community safety."
        elif hate_score > 60:
            return "This message contained inappropriate language and has been converted to maintain respectful communication."
        elif hate_score > 40:
            return "Content has been moderated and replaced with this neutral message to ensure positive interactions."
        else:
            return "This text has been flagged and neutralized to promote respectful dialogue."
    
    def save_model(self):
        """Save trained model and vectorizer"""
        os.makedirs('ml_backend/models', exist_ok=True)
        
        with open('ml_backend/models/model.pkl', 'wb') as f:
            pickle.dump(self.model, f)
        
        with open('ml_backend/models/vectorizer.pkl', 'wb') as f:
            pickle.dump(self.vectorizer, f)
        
        with open('ml_backend/models/hate_words.pkl', 'wb') as f:
            pickle.dump(self.hate_words, f)
    
    def load_model(self):
        """Load trained model and vectorizer"""
        try:
            with open('ml_backend/models/model.pkl', 'rb') as f:
                self.model = pickle.load(f)
            
            with open('ml_backend/models/vectorizer.pkl', 'rb') as f:
                self.vectorizer = pickle.load(f)
            
            with open('ml_backend/models/hate_words.pkl', 'rb') as f:
                self.hate_words = pickle.load(f)
            
            self.trained = True
            return True
        except FileNotFoundError:
            return False

# Initialize detector
detector = SinhalaHateSpeechDetector()

# Try to load existing model
detector.load_model()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_trained': detector.trained,
        'hate_words_loaded': len(detector.hate_words)
    })

@app.route('/train', methods=['POST'])
def train_model():
    """Train model with uploaded CSV file"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'File must be CSV format'}), 400
    
    # Save uploaded file
    csv_path = f'ml_backend/training_data.csv'
    file.save(csv_path)
    
    # Train model
    result = detector.train_model(csv_path)
    
    return jsonify(result)

@app.route('/predict', methods=['POST'])
def predict_text():
    """Predict hate speech for given text"""
    data = request.get_json()
    
    if not data or 'text' not in data:
        return jsonify({'error': 'No text provided'}), 400
    
    text = data['text']
    result = detector.predict(text)
    
    return jsonify(result)

@app.route('/analyze', methods=['POST'])
def analyze_text():
    """Main analysis endpoint compatible with existing frontend"""
    data = request.get_json()
    
    if not data or 'content' not in data:
        return jsonify({'error': 'No content provided'}), 400
    
    text = data['content']
    result = detector.predict(text)
    
    # Format response to match frontend expectations
    response = {
        'classification': result.get('classification', 'safe'),
        'hateScore': float(result.get('confidence_scores', {}).get('hate', 0)),
        'harassmentScore': float(result.get('confidence_scores', {}).get('harassment', 0)),
        'normalScore': float(result.get('confidence_scores', {}).get('normal', 100)),
        'neutralizedText': result.get('neutralized_text', text),
        'isHateSpeech': bool(result.get('is_hate_speech', False))
    }
    
    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)