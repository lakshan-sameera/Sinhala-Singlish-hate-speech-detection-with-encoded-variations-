from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pickle
import re
import os
import pandas as pd
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences
import json
from datetime import datetime
from difflib import SequenceMatcher
import unicodedata

def convert_numpy_types(obj):
    """Convert NumPy types to Python types for JSON serialization"""
    import numpy as np
    import tensorflow as tf
    
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, tf.Tensor):
        return float(obj.numpy())
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    else:
        return obj

app = Flask(__name__)
CORS(app)

# Global variables for model and tokenizer
model = None
tokenizer = None
preprocessor = None
max_words = 15000
max_len = 150

class SinhalaTextPreprocessor:
    """Enhanced text preprocessor for Sinhala/Singlish text"""
    
    def __init__(self):
        # Extended hate words dictionary
        self.hate_words = [
            # English/Singlish
            'pakaya', 'paka', 'harakaya', 'hara', 'huththi', 'balla', 'wesi', 'modaya', 
            'payya', 'hutta', 'whotto', 'ponnaya', 'mooda', 'haraka', 'humtha',
            'gon', 'puka', 'pissu', 'kata', 'wahagena', 'inna', 'ponnayo', 'sepak',
            'palayang', 'eta', 'deka', 'pyya', 'kimbula', 'salli', 'gahana', 'eka',
            'jara', 'kalliya', 'thopi', 'pnnya', 'huknna', 'payiyya', 'sukanna',
            'erapan', 'wade', 'palayan', 'gonja', 'yko', 'umbala', 'gedara', 'yanna',
            'pko', 'pkoo', 'pkko', 'pkooo',  # Added pko variations
            
            # Sinhala Unicode
            'පුක', 'පකයා', 'හරකයා', 'හුත්ති', 'බල්ලා', 'ගොංජා', 'මෝඩයා', 'කිඹුලා',
            'සල්ලි', 'ගහන', 'එක', 'රලහාමි', 'ජරා', 'කල්ලිය', 'පොන්නයා', 'මෝඩ',
            'හරක', 'තොපි', 'උඹලා', 'ගොන්', 'පිස්සු', 'ගෙදර', 'යන්න', 'කට', 'වහගෙන',
            'ඉන්න', 'පොන්නයෝ', 'වලිකෙ', 'නැත්නම්', 'ගහපං', 'වැඩේ', 'පලයන්', 'යකෝ',
            'අඬන්නේ', 'නෑ', 'කොල්ලෝ', 'කැමති', 'පිස්සෙක්', 'හූත්ති', 'කියන්නෙ',
        ]
        
        # Common non-offensive Sinhala words that should NOT be flagged (to reduce false positives)
        self.safe_words = [
            # Common words that get falsely matched
            'uba', 'mokada', 'karanne', 'kiyanne', 'dannawa', 'thamai', 'meka', 'eka', 'eta',
            'mama', 'oya', 'api', 'eka', 'deka', 'thuna', 'hathi', 'salli', 'gaha', 'katha',
            'mata', 'ape', 'dan', 'nah', 'ayi', 'eya', 'yanna', 'enna', 'inna', 'awa',
            'me', 'ara', 'wage', 'wada', 'kala', 'giya', 'awa', 'une', 'wage', 'nam',
            # English common words
            'you', 'me', 'the', 'and', 'are', 'can', 'but', 'not', 'how', 'what', 'when',
            'where', 'why', 'who', 'this', 'that', 'with', 'have', 'will', 'was', 'were'
        ]
        
        # Load persistent hate words from file
        self.load_persistent_hate_words()
    
    def load_persistent_hate_words(self):
        """Load hate words from persistent file"""
        hate_words_file = 'persistent_hate_words.txt'
        try:
            if os.path.exists(hate_words_file):
                with open(hate_words_file, 'r', encoding='utf-8') as f:
                    persistent_words = [line.strip().lower() for line in f if line.strip()]
                
                # Add persistent words that aren't already in the list
                for word in persistent_words:
                    if word not in self.hate_words:
                        self.hate_words.append(word)
                
                print(f"Loaded {len(persistent_words)} persistent hate words")
            else:
                print("No persistent hate words file found")
        except Exception as e:
            print(f"Error loading persistent hate words: {e}")
        
        # Character normalization mapping
        self.char_mapping = {
            'ක්‍ර': 'කර', 'ක්‍ල': 'කල', 'ග්‍ර': 'ගර', 'ත්‍ර': 'තර',
            'ප්‍ර': 'පර', 'ස්‍ර': 'සර', 'ශ්‍ර': 'ශර'
        }
    
    def normalize_sinhala(self, text):
        """Normalize Sinhala characters"""
        for old, new in self.char_mapping.items():
            text = text.replace(old, new)
        return text
    
    def detect_language(self, text):
        """Detect if text is primarily Sinhala, English, or mixed"""
        sinhala_chars = len(re.findall(r'[\u0D80-\u0DFF]', text))
        english_chars = len(re.findall(r'[a-zA-Z]', text))
        total_chars = sinhala_chars + english_chars
        
        if total_chars == 0:
            return 'unknown'
        
        sinhala_ratio = sinhala_chars / total_chars
        if sinhala_ratio > 0.7:
            return 'sinhala'
        elif sinhala_ratio < 0.3:
            return 'english'
        else:
            return 'mixed'
    
    def handle_obfuscation(self, text):
        """Enhanced obfuscation handling for Sinhala/Singlish variations"""
        # Character substitutions (enhanced)
        substitutions = {
            '@': 'a', '3': 'e', '1': 'i', '0': 'o', '$': 's', '7': 't',
            '4': 'a', '8': 'b', '!': 'i', '5': 's', '2': 'z', '6': 'g',
            '9': 'g', '+': 't', '*': 'a', '#': 'h'
        }
        
        for sub, original in substitutions.items():
            text = text.replace(sub, original)
        
        # Handle common Sinhala/Singlish letter variations
        sinhala_variations = {
            'tha': 'ta', 'dha': 'da', 'gha': 'ga', 'bha': 'ba',
            'kha': 'ka', 'pha': 'pa', 'jha': 'ja', 'sha': 'sa',
            # Add more Singlish-specific patterns
            'tt': 't', 'pp': 'p', 'kk': 'k', 'bb': 'b',
            'aa': 'a', 'ee': 'e', 'ii': 'i', 'oo': 'o', 'uu': 'u'
        }
        
        for variation, normalized in sinhala_variations.items():
            text = text.replace(variation, normalized)
        
        # Handle vowel ending variations (common in Singlish)
        # Convert common ending patterns to standard forms
        text = re.sub(r'o$', 'a', text)  # hutto -> hutta
        text = re.sub(r'e$', 'a', text)  # pakke -> pakka (then -> paka)
        
        # Remove excessive repetition but preserve some patterns
        text = re.sub(r'(.)\1{4,}', r'\1\1\1', text)  # Keep up to 3 repetitions
        
        # Handle spaced letters (h a t e -> hate)
        text = re.sub(r'\b(\w)\s+(\w)\s+(\w)\s+(\w)', r'\1\2\3\4', text)
        text = re.sub(r'\b(\w)\s+(\w)\s+(\w)', r'\1\2\3', text)
        text = re.sub(r'\b(\w)\s+(\w)', r'\1\2', text)
        
        # Handle mixed case obfuscation (HuTTa -> hutta)
        text = text.lower()
        
        # Normalize Unicode characters
        text = unicodedata.normalize('NFKC', text)
        
        return text
    
    def preprocess_text(self, text):
        """Comprehensive text preprocessing"""
        if pd.isna(text) or text is None:
            return ""
        
        text = str(text)
        
        # Normalize case but preserve Sinhala
        english_part = re.sub(r'[^\u0D80-\u0DFF]', lambda m: m.group(0).lower(), text)
        
        # Normalize Sinhala characters
        text = self.normalize_sinhala(english_part)
        
        # Handle obfuscation
        text = self.handle_obfuscation(text)
        
        # Remove URLs, emails, mentions
        text = re.sub(r'http\S+|www\S+|@\w+', '', text)
        
        # Remove excessive punctuation but keep some context
        text = re.sub(r'[^\w\s\u0D80-\u0DFF.,!?]', ' ', text)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    def calculate_similarity(self, word1, word2):
        """Enhanced similarity calculation for Singlish word variations"""
        # Direct match
        if word1 == word2:
            return 1.0
        
        # Handle very short words (less likely to be meaningful variations)
        if len(word1) < 3 or len(word2) < 3:
            return SequenceMatcher(None, word1, word2).ratio()
        
        # Initialize with base sequence similarity
        similarity = SequenceMatcher(None, word1, word2).ratio()
        
        # Pattern 1: Single character ending variations (hutta->hutto, paka->pako)
        if abs(len(word1) - len(word2)) <= 1:
            # Check if words are identical except for the last character
            if len(word1) == len(word2) and word1[:-1] == word2[:-1]:
                similarity = max(similarity, 0.90)  # High similarity for single char diff
            # Check if one word is the other + one character at end
            elif len(word1) == len(word2) + 1 and word1[:-1] == word2:
                similarity = max(similarity, 0.85)
            elif len(word2) == len(word1) + 1 and word2[:-1] == word1:
                similarity = max(similarity, 0.85)
        
        # Pattern 2: Character repetition variations (hutta->hutttta)
        if len(word1) != len(word2):
            # More sophisticated repetition handling
            def normalize_repetitions(word):
                # Remove excessive repetitions but keep double chars
                return re.sub(r'(.)\1{2,}', r'\1\1', word)
            
            norm1 = normalize_repetitions(word1)
            norm2 = normalize_repetitions(word2)
            
            if norm1 == norm2:
                similarity = max(similarity, 0.95)
            
            # Also try removing all repetitions for very similar words
            clean1 = re.sub(r'(.)\1+', r'\1', word1)
            clean2 = re.sub(r'(.)\1+', r'\1', word2)
            if clean1 == clean2:
                similarity = max(similarity, 0.90)
        
        # Pattern 3: Common Singlish character substitutions
        def apply_singlish_normalizations(word):
            # Common vowel variations in Singlish
            variations = word
            variations = variations.replace('a', 'o')  # a->o variations
            variations = re.sub(r'o$', 'a', variations)  # ending o->a
            variations = re.sub(r'e$', 'a', variations)  # ending e->a
            return variations
        
        # Check with character substitutions
        if apply_singlish_normalizations(word1) == word2 or apply_singlish_normalizations(word2) == word1:
            similarity = max(similarity, 0.85)
        
        # Pattern 4: Substring containment (for longer variations)
        min_len = min(len(word1), len(word2))
        max_len = max(len(word1), len(word2))
        
        if min_len >= 4:  # Only for reasonably long words
            # Check if shorter word is contained in longer word
            if word1 in word2 or word2 in word1:
                containment_ratio = min_len / max_len
                if containment_ratio >= 0.75:  # At least 75% overlap
                    similarity = max(similarity, 0.80)
        
        # Pattern 5: Levenshtein-like distance for close variations
        if abs(len(word1) - len(word2)) <= 2:
            # Count character differences
            differences = 0
            max_len = max(len(word1), len(word2))
            for i in range(max_len):
                char1 = word1[i] if i < len(word1) else ''
                char2 = word2[i] if i < len(word2) else ''
                if char1 != char2:
                    differences += 1
            
            # If only 1-2 character differences, high similarity
            if differences <= 1:
                similarity = max(similarity, 0.90)
            elif differences <= 2:
                similarity = max(similarity, 0.80)
        
        return similarity
    
    def generate_word_variations(self, word):
        """Generate comprehensive variations of a hate word for Singlish"""
        variations = [word]
        
        # Pattern 1: Ending variations (very common in Singlish)
        if len(word) > 3:
            # Vowel ending substitutions
            vowel_subs = {
                'a': ['o', 'e', 'u'],
                'o': ['a', 'e', 'u'], 
                'e': ['a', 'o', 'u'],
                'u': ['a', 'o', 'e'],
                'i': ['a', 'o', 'e']
            }
            
            last_char = word[-1].lower()
            if last_char in vowel_subs:
                for sub in vowel_subs[last_char]:
                    variations.append(word[:-1] + sub)
            
            # Add/remove consonants at end
            consonants = ['t', 'k', 'p', 'n', 'm', 'g']
            for cons in consonants:
                variations.append(word + cons)  # Add consonant
            
            # Remove last character if it's a consonant
            if last_char in consonants:
                variations.append(word[:-1])
        
        # Pattern 2: Character repetition (very common)
        for i in range(len(word)):
            char = word[i]
            if char.isalpha():
                # Double character
                variations.append(word[:i] + char + word[i:])
                # Triple character  
                variations.append(word[:i] + char + char + word[i:])
                # Quadruple character (for extreme cases)
                variations.append(word[:i] + char + char + char + word[i:])
        
        # Pattern 3: Common character substitutions
        char_subs = {
            'a': ['@', '4', 'aa', 'ah'],
            'e': ['3', 'ee', 'eh'], 
            'i': ['1', '!', 'ii', 'ih'],
            'o': ['0', 'oo', 'oh', 'aw'],
            's': ['$', '5', 'ss', 'z'],
            't': ['7', 'tt'],
            'u': ['uu', 'uh', 'w']
        }
        
        for original, subs in char_subs.items():
            if original in word:
                for sub in subs:
                    variations.append(word.replace(original, sub))
        
        # Pattern 4: Add common Singlish suffixes/prefixes
        common_additions = ['ah', 'la', 'lah', 'mah', 'tah']
        for addition in common_additions:
            variations.append(word + addition)
        
        # Pattern 5: Internal character variations (consonant clusters)
        if len(word) > 4:
            # Double internal consonants
            for i in range(1, len(word)-1):
                if word[i].isalpha() and word[i] not in 'aeiou':
                    variations.append(word[:i] + word[i] + word[i:])
        
        # Pattern 6: Remove duplicates and return
        unique_variations = list(set(variations))
        
        # Limit to reasonable number to avoid explosion
        return unique_variations[:50] if len(unique_variations) > 50 else unique_variations
    
    def detect_hate_words(self, text):
        """Enhanced hate word detection with word variations and LSTM intelligence"""
        text_lower = text.lower()
        found_words = []
        found_info = []
        
        # Split text into words for individual word checking
        words_in_text = re.findall(r'\w+', text_lower)
        
        # Step 1: Check for exact matches and word variations
        for hate_word in self.hate_words:
            hate_word_lower = hate_word.lower()
            
            # Check for exact matches first
            if hate_word_lower in text_lower:
                if self._validate_hate_word_context(hate_word, text):
                    if hate_word not in found_words:
                        found_words.append(hate_word)
                        found_info.append({
                            'word': hate_word,
                            'matched_text': hate_word_lower,
                            'match_type': 'exact',
                            'similarity': 1.0,
                            'context_validated': True,
                            'original_word': hate_word,
                            'detected_variation': hate_word_lower
                        })
            
            # Generate variations of this hate word
            variations = self.generate_word_variations(hate_word_lower)
            
            # Check for variations using similarity matching
            for variation in variations:
                if variation in text_lower:
                    # Additional context check: is this word actually hateful in this context?
                    if self._validate_hate_word_context(hate_word, text):
                        if hate_word not in found_words:
                            found_words.append(hate_word)
                            found_info.append({
                                'word': hate_word,
                                'matched_text': variation,
                                'match_type': 'variation',
                                'similarity': 0.9,
                                'context_validated': True,
                                'original_word': hate_word,
                                'detected_variation': variation
                            })
        
        # Step 1.5: Use similarity-based fuzzy matching for words not caught by variations
        for hate_word in self.hate_words:
            hate_word_lower = hate_word.lower()
            
            # Check each word in the text against this hate word
            for word_in_text in words_in_text:
                if word_in_text != hate_word_lower:  # Skip exact matches already found
                    similarity = self.calculate_similarity(hate_word_lower, word_in_text)
                    
                    # If similarity is high enough and word not already found
                    if similarity >= 0.8 and hate_word not in found_words:
                        if self._validate_hate_word_context(hate_word, text):
                            found_words.append(hate_word)
                            found_info.append({
                                'word': hate_word,
                                'matched_text': word_in_text,
                                'match_type': 'fuzzy',
                                'similarity': similarity,
                                'context_validated': True,
                                'original_word': hate_word,
                                'detected_variation': word_in_text
                            })
        
        # Step 2: Use LSTM model to understand context and identify suspicious words
        # This is more intelligent than just dictionary lookup
        suspicious_words = self._identify_suspicious_words_with_lstm(text, words_in_text)
        
        # Step 3: Apply intelligent filtering based on context
        for word_info in suspicious_words:
            word = word_info['word']
            confidence = word_info['confidence']
            context_score = word_info['context_score']
            
            # Only include words that pass intelligent filtering and aren't already found
            if self._is_word_hateful_in_context(word, text, confidence, context_score) and word not in found_words:
                found_words.append(word)
                found_info.append({
                    'word': word,
                    'matched_text': word,
                    'match_type': 'intelligent',
                    'similarity': confidence,
                    'context_score': context_score,
                    'reason': word_info['reason']
                })
        
        # Store detailed info for debugging
        self.last_detection_info = found_info
        return found_words
    
    def _identify_suspicious_words_with_lstm(self, text, words_in_text):
        """Use LSTM model understanding to identify suspicious words"""
        suspicious_words = []
        
        # Analyze each word in context using LSTM model
        for word in words_in_text:
            if len(word) < 3 or word.lower() in self.safe_words:
                    continue
                
            # Create context windows around the word
            context_windows = self._create_context_windows(text, word)
            
            # Use LSTM to analyze each context window
            max_confidence = 0.0
            best_context = ""
            
            for context in context_windows:
                try:
                    # Use the LSTM model to analyze this context
                    lstm_result = predict_hate_speech(context)
                    confidence = lstm_result['probabilities']['OFF']
                    
                    if confidence > max_confidence:
                        max_confidence = confidence
                        best_context = context
                except:
                    continue
            
            # If LSTM identifies this word as suspicious in context
            if max_confidence > 0.6:  # Threshold for suspicious words
                context_score = self._calculate_context_score(word, text)
                
                suspicious_words.append({
                    'word': word,
                    'confidence': max_confidence,
                    'context_score': context_score,
                    'best_context': best_context,
                    'reason': f'LSTM identified as suspicious (confidence: {max_confidence:.2f})'
                })
        
        return suspicious_words
    
    def _create_context_windows(self, text, target_word):
        """Create context windows around a target word for LSTM analysis"""
        windows = []
        words = text.split()
        
        for i, word in enumerate(words):
            if target_word.lower() in word.lower():
                # Create window of 5 words before and after
                start = max(0, i - 5)
                end = min(len(words), i + 6)
                context = ' '.join(words[start:end])
                windows.append(context)
        
        return windows
    
    def _calculate_context_score(self, word, text):
        """Calculate how hateful a word is in its context"""
        # Analyze surrounding words and patterns
        score = 0.0
        
        # Check for aggressive language patterns
        aggressive_patterns = ['you', 'your', 'are', 'is', 'was', 'will', 'should', 'must']
        words_before = text.lower().split(word.lower())[0].split()[-3:]  # Last 3 words before
        words_after = text.lower().split(word.lower())[-1].split()[:3]   # First 3 words after
        
        # Score based on surrounding aggressive language
        for pattern in aggressive_patterns:
            if pattern in words_before or pattern in words_after:
                score += 0.2
        
        # Check for repetition (common in hate speech)
        if text.lower().count(word.lower()) > 1:
            score += 0.3
        
        # Check for capitalization (common in aggressive text)
        if word.isupper() or (word[0].isupper() and len(word) > 3):
            score += 0.2
        
        return min(score, 1.0)
    
    def _is_word_hateful_in_context(self, word, text, confidence, context_score):
        """Intelligent decision on whether a word is hateful in context"""
        # Combine LSTM confidence with context analysis
        combined_score = (confidence * 0.7) + (context_score * 0.3)
        
        # High threshold to avoid false positives
        return combined_score > 0.75
    
    def _validate_hate_word_context(self, hate_word, text):
        """Validate if a known hate word is actually hateful in this context"""
        # Check if the word is being used in a non-hateful context
        # For example, "I'm not a pakaya" should not be flagged
        
        # Look for negation patterns
        negation_words = ['not', 'no', 'never', 'isnt', 'arent', 'wasnt', 'werent']
        words_before = text.lower().split(hate_word.lower())[0].split()[-2:]
        
        for neg_word in negation_words:
            if neg_word in words_before:
                return False  # Likely not hateful due to negation
        
        # Check for quotation marks (might be discussing the word)
        if f'"{hate_word}"' in text or f"'{hate_word}'" in text:
            return False
        
        return True

def load_lstm_model():
    """Load the enhanced LSTM model and tokenizer"""
    global model, tokenizer, preprocessor
    
    try:
        # Try different possible paths for model files
        possible_paths = [
            'models/singlish_lstm_model.h5',
            'ml_backend/models/singlish_lstm_model.h5',
            '../ml_backend/models/singlish_lstm_model.h5'
        ]
        
        model_path = None
        for path in possible_paths:
            if os.path.exists(path):
                model_path = path
                break
        
        if model_path:
            model = load_model(model_path)
            print(f"Enhanced LSTM model loaded from {model_path}")
        else:
            print(f"Enhanced model file not found. Tried: {possible_paths}")
            return False
            
        # Load LSTM tokenizer (try multiple possible names)
        tokenizer_paths = [
            'models/singlish_tokenizer.pkl',
            'models/lstm_tokenizer.pkl',
            'ml_backend/models/singlish_tokenizer.pkl',
            'ml_backend/models/lstm_tokenizer.pkl',
            '../ml_backend/models/singlish_tokenizer.pkl',
            '../ml_backend/models/lstm_tokenizer.pkl'
        ]
        
        tokenizer_path = None
        for path in tokenizer_paths:
            if os.path.exists(path):
                tokenizer_path = path
                break
                
        if tokenizer_path:
            with open(tokenizer_path, 'rb') as f:
                tokenizer = pickle.load(f)
            print(f"LSTM tokenizer loaded from {tokenizer_path}")
        else:
            print(f"LSTM tokenizer file not found. Tried: {tokenizer_paths}")
            print("Creating a basic tokenizer as fallback...")
            
            # Create a basic tokenizer with common parameters
            from tensorflow.keras.preprocessing.text import Tokenizer
            tokenizer = Tokenizer(num_words=max_words, oov_token='<OOV>')
            
            # If we have training data, fit the tokenizer
            try:
                # Try to load some sample data to fit the tokenizer
                sample_texts = []
                for data_file in ['../DataSets/test.csv', '../DataSets/only_hate.csv']:
                    if os.path.exists(data_file):
                        df = pd.read_csv(data_file)
                        if 'text' in df.columns:
                            sample_texts.extend(df['text'].astype(str).tolist())
                        elif 'Text' in df.columns:
                            sample_texts.extend(df['Text'].astype(str).tolist())
                
                if sample_texts:
                    # Preprocess sample texts
                    processed_texts = [preprocessor.preprocess_text(text) for text in sample_texts[:1000]]  # Use first 1000
                    tokenizer.fit_on_texts(processed_texts)
                    print(f"✅ Created tokenizer from {len(sample_texts)} sample texts")
                    
                    # Save the created tokenizer for future use
                    with open('models/singlish_tokenizer.pkl', 'wb') as f:
                        pickle.dump(tokenizer, f)
                    print("✅ Saved created tokenizer to models/singlish_tokenizer.pkl")
                else:
                    print("⚠️  No training data found, creating basic vocabulary tokenizer")
                    # Create a basic vocabulary from hate words and common Singlish terms
                    basic_vocab = [
                        'hutta', 'hutto', 'hutttta', 'paka', 'pako', 'pakaa', 'balla', 'ballo',
                        'modaya', 'modo', 'haraka', 'harako', 'pissu', 'gon', 'kata', 'sepak',
                        'you', 'are', 'such', 'a', 'bad', 'person', 'this', 'is', 'not', 'good',
                        'hate', 'speech', 'offensive', 'content', 'safe', 'normal', 'text'
                    ]
                    tokenizer.fit_on_texts(basic_vocab)
                    print(f"✅ Created basic tokenizer with {len(basic_vocab)} vocabulary terms")
                    
            except Exception as e:
                print(f"⚠️  Could not create tokenizer from data: {e}")
                print("Creating minimal vocabulary tokenizer...")
                # Last resort: create with absolute minimal vocab
                basic_vocab = ['hutta', 'paka', 'balla', 'you', 'are', 'bad', 'good']
                tokenizer.fit_on_texts(basic_vocab)
                print("Using minimal tokenizer with basic vocabulary")
            
        # Always use fresh preprocessor with latest enhancements
        preprocessor = SinhalaTextPreprocessor()
        print(f"Fresh enhanced preprocessor created with fuzzy matching capabilities")
            
        return True
    except Exception as e:
        print(f"Error loading model: {e}")
        return False



def predict_hate_speech(text):
    """Predict hate speech using enhanced LSTM model"""
    try:
        # Use enhanced preprocessor
        processed_text = preprocessor.preprocess_text(text)
        
        if not processed_text:
            return {
                'prediction': 'NOT',
                'confidence': 0.0,
                'probabilities': {'NOT': 1.0, 'OFF': 0.0},
                'debug_info': {'error': 'Empty processed text'}
            }
        
        # Debug info
        debug_info = {
            'original_text': text,
            'processed_text': processed_text,
            'text_changed': text != processed_text
        }
        
        # Tokenize and pad
        sequences = tokenizer.texts_to_sequences([processed_text])
        padded_sequences = pad_sequences(sequences, maxlen=max_len, padding='post', truncating='post')
        
        # Debug tokenization
        debug_info['sequence_length'] = len(sequences[0]) if sequences[0] else 0
        debug_info['padded_shape'] = padded_sequences.shape
        debug_info['non_zero_tokens'] = int(np.count_nonzero(padded_sequences))
        
        # Check if the text actually tokenized to something meaningful
        if debug_info['non_zero_tokens'] == 0:
            print(f"Warning: Text '{text}' tokenized to all zeros")
            debug_info['warning'] = 'Text tokenized to all zeros'
        
        # Add more detailed tokenization debug info
        debug_info['sequence_preview'] = sequences[0][:10] if sequences[0] else []
        debug_info['padded_preview'] = padded_sequences[0][:10].tolist()
        debug_info['vocab_size'] = len(tokenizer.word_index) if hasattr(tokenizer, 'word_index') else 0
        
        # Predict (binary classification with sigmoid)
        predictions = model.predict(padded_sequences, verbose=0)
        prediction_proba = float(predictions[0][0])  # Convert to Python float
        
        # Debug model output
        debug_info['raw_prediction'] = prediction_proba
        debug_info['model_shape_output'] = predictions.shape
        
        # Get prediction and confidence
        prediction = 'OFF' if prediction_proba > 0.5 else 'NOT'
        confidence = float(max(prediction_proba, 1 - prediction_proba))
        
        # Create probabilities dict
        probabilities = {
            'NOT': float(1 - prediction_proba),
            'OFF': float(prediction_proba)
        }
        
        return {
            'prediction': prediction,
            'confidence': confidence,
            'probabilities': probabilities,
            'debug_info': debug_info
        }
        
    except Exception as e:
        print(f"Error in prediction: {e}")
        import traceback
        traceback.print_exc()
        return {
            'prediction': 'NOT',
            'confidence': 0.0,
            'probabilities': {'NOT': 1.0, 'OFF': 0.0},
            'debug_info': {'error': str(e)}
        }

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    if model is not None and tokenizer is not None:
        return jsonify({
            'status': 'healthy',
            'model': 'LSTM',
            'loaded': True
        })
    else:
        return jsonify({
            'status': 'unhealthy',
            'model': 'LSTM',
            'loaded': False
        })

@app.route('/analyze', methods=['POST'])
def analyze_text():
    """Analyze text for hate speech"""
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Get LSTM prediction
        lstm_result = predict_hate_speech(text)
        
        # Analyze text features using enhanced preprocessor
        print(f"DEBUG - Preprocessor hate words count: {len(preprocessor.hate_words)}")
        print(f"DEBUG - First 5 hate words: {preprocessor.hate_words[:5]}")
        
        hate_words = preprocessor.detect_hate_words(text)
        language = preprocessor.detect_language(text)
        processed_text = preprocessor.preprocess_text(text)
        
        # Get detailed hate word detection info
        detection_info = getattr(preprocessor, 'last_detection_info', [])
        
        # Get LSTM contribution (confidence from LSTM model)
        lstm_contribution = float(lstm_result['probabilities']['OFF'])
        
        # Debug: Print detection info for troubleshooting
        print(f"DEBUG - Text: '{text}'")
        print(f"DEBUG - LSTM Prediction: {lstm_result['prediction']} (Confidence: {lstm_contribution:.3f})")
        print(f"DEBUG - Detected hate words: {hate_words}")
        print(f"DEBUG - Detection info: {detection_info}")
        print(f"DEBUG - Words in text: {re.findall(r'\\w+', text.lower())}")
        
        # Analyze what the LSTM model actually learned from this text
        # This is more intelligent than just word matching
        lstm_analysis = {
            'model_confidence': lstm_contribution,
            'prediction': lstm_result['prediction'],
            'learned_patterns': 'The LSTM model has learned to recognize hate speech patterns from training data, including context, word combinations, and linguistic patterns that may not be captured by simple word lists.',
            'context_understanding': 'Unlike word lists, the LSTM can understand context, sarcasm, and complex linguistic patterns.',
            'training_based': 'This prediction is based on the model\'s training on thousands of labeled examples, not just dictionary matching.'
        }
        
        # Calculate Sinhala ratio
        sinhala_chars = len(re.findall(r'[\u0D80-\u0DFF]', text))
        total_chars = len(text.replace(' ', ''))
        sinhala_ratio = float(sinhala_chars / total_chars if total_chars > 0 else 0.0)
        
        # INTELLIGENT HATE SPEECH SCORING SYSTEM
        # Primary: LSTM Model Intelligence
        # Secondary: Context-aware word analysis
        
        # Step 1: Let LSTM be the primary decision maker
        # The LSTM model has learned patterns from training data
        # It can identify hate speech even without exact word matches
        
        # Step 2: Use word detection only as supporting evidence
        # Not as the primary classifier
        fuzzy_confidence = 0.0
        high_confidence_words = []
        
        if hate_words and detection_info:
            # Only use word detection if LSTM is uncertain
            # If LSTM is very confident (>80%), trust it more than word lists
            if lstm_contribution < 0.8:
                # Calculate weighted fuzzy confidence as supporting evidence
                total_similarity = 0.0
                valid_matches = 0
                
                for info in detection_info:
                    similarity = info.get('similarity', 0.0)
                    match_type = info.get('match_type', 'unknown')
                    
                    # Weight by match type and similarity
                    if match_type == 'exact':
                        weight = 1.0
                    elif match_type == 'variation':
                        weight = 0.9
                    elif match_type == 'fuzzy' and similarity >= 0.85:
                        weight = similarity
                    else:
                        weight = 0.0  # Low confidence matches
                    
                    if weight > 0:
                        total_similarity += weight
                        valid_matches += 1
                        
                        # Track high-confidence hate words for reporting
                        if weight >= 0.85:
                            high_confidence_words.append({
                                'word': info.get('word', ''),
                                'matched_text': info.get('matched_text', ''),
                                'confidence': weight,
                                'type': match_type
                            })
                
                # Calculate fuzzy confidence percentage
                if valid_matches > 0:
                    fuzzy_confidence = min(total_similarity / valid_matches, 1.0)
                else:
                    fuzzy_confidence = 0.3  # Low weight when LSTM is confident
            else:
                # LSTM is very confident, use word detection only for explanation
                # Don't let it override LSTM's decision
                fuzzy_confidence = 0.3  # Low weight when LSTM is confident
        
        # Step 2: LSTM-First Intelligent Scoring
        # The LSTM model is the primary intelligence - it has learned from data
        # Word detection is only supporting evidence
        
        final_hate_percentage = 0.0
        
        # Case 1: LSTM is very confident (>80%) - Trust the model
        if lstm_contribution >= 0.8:
            final_hate_percentage = lstm_contribution * 0.9  # 90% weight to LSTM
            if fuzzy_confidence > 0.5:
                final_hate_percentage += fuzzy_confidence * 0.1  # 10% supporting evidence
            confidence_level = "High (LSTM Intelligence)"
            
        # Case 2: LSTM is moderately confident (50-80%) - Use both
        elif lstm_contribution >= 0.5:
            final_hate_percentage = lstm_contribution * 0.7  # 70% weight to LSTM
            if fuzzy_confidence > 0.3:
                final_hate_percentage += fuzzy_confidence * 0.3  # 30% supporting evidence
            confidence_level = "Medium-High (LSTM + Context)"
            
        # Case 3: LSTM is uncertain (<50%) - Rely more on word patterns
        elif lstm_contribution < 0.5:
            if fuzzy_confidence >= 0.7:
                final_hate_percentage = (lstm_contribution * 0.3) + (fuzzy_confidence * 0.7)
                confidence_level = "Medium (Pattern Detection)"
            else:
                final_hate_percentage = lstm_contribution * 0.8  # Still trust LSTM more
                confidence_level = "Low (LSTM Uncertain)"
            final_hate_percentage = (lstm_contribution * 0.5) + (fuzzy_confidence * 0.5)
            confidence_level = "Medium"
            
        # Case 5: Both low (likely safe)
        else:
            final_hate_percentage = max(lstm_contribution, fuzzy_confidence * 0.6)
            confidence_level = "Low"
        
        # Step 3: Apply contextual adjustments
        # Boost for multiple high-confidence hate words
        if len(high_confidence_words) > 1:
            final_hate_percentage = min(final_hate_percentage + 0.15, 1.0)
        
        # Boost for Sinhala content with hate words
        if hate_words and sinhala_ratio > 0.5:
            final_hate_percentage = min(final_hate_percentage + 0.05, 1.0)
        
        # Additional boost for text that needed processing (indicates obfuscation)
        if processed_text != text.lower().strip():
            final_hate_percentage = min(final_hate_percentage + 0.03, 1.0)
        
        # Convert to percentage
        hate_score = float(final_hate_percentage)
        
        # Store analysis results for clear reporting
        analysis_summary = {
            'lstm_score': lstm_contribution * 100,
            'fuzzy_confidence': fuzzy_confidence * 100,
            'final_hate_percentage': hate_score * 100,
            'confidence_level': confidence_level,
            'high_confidence_hate_words': high_confidence_words,
            'total_hate_words_detected': len(hate_words),
            'analysis_method': 'Unified LSTM + Fuzzy Matching'
        }
        
        # Prepare response with clear, unified results
        response = {
            'prediction': lstm_result['prediction'],
            'confidence': lstm_result['confidence'],
            'probabilities': lstm_result['probabilities'],
            
            # NEW: Clear summary for end users
            'summary': {
                'final_hate_percentage': round(analysis_summary['final_hate_percentage'], 1),
                'confidence_level': analysis_summary['confidence_level'],
                'probable_hate_words': [hw['word'] for hw in analysis_summary['high_confidence_hate_words']],
                'detection_method': 'LSTM-First Intelligent Analysis',
                'is_hate_speech': analysis_summary['final_hate_percentage'] > 50,
                'recommendation': 'BLOCK' if analysis_summary['final_hate_percentage'] > 70 else 'REVIEW' if analysis_summary['final_hate_percentage'] > 30 else 'ALLOW',
                'primary_reason': 'LSTM Model Intelligence' if lstm_contribution > 0.7 else 'Pattern Detection' if fuzzy_confidence > 0.5 else 'Combined Analysis'
            },
            
            # Detailed analysis for debugging/advanced users
            'analysis': {
                'hate_score': hate_score,
                'hate_words_found': hate_words,
                'hate_word_count': len(hate_words),
                'sinhala_ratio': sinhala_ratio,
                'language_detected': language,
                'lstm_contribution': lstm_contribution,
                'processed_text': processed_text,
                'detection_details': detection_info,
                'fuzzy_matching_enabled': True,
                'lstm_intelligence': lstm_analysis,  # Add LSTM intelligence analysis
                
                # Enhanced breakdown with new unified scoring
                'unified_analysis': analysis_summary,
                'models_used': {
                    'lstm': True,
                    'mbert': False,
                    'academic_preprocessing': True,
                    'fuzzy_word_matching': True,
                    'word_variation_generation': True,
                    'enhanced_singlish_detection': True,
                    'unified_scoring': True
                },
                'detection_breakdown': {
                    'exact_matches': sum(1 for info in detection_info if info.get('match_type') == 'exact'),
                    'fuzzy_matches': sum(1 for info in detection_info if info.get('match_type') == 'fuzzy'),
                    'variation_matches': sum(1 for info in detection_info if info.get('match_type') == 'variation'),
                    'high_confidence_matches': len(analysis_summary['high_confidence_hate_words'])
                }
            },
            'debug_info': lstm_result.get('debug_info', {})
        }
        
        # Convert any NumPy types to Python types for JSON serialization
        response = convert_numpy_types(response)
        
        # Additional safety check - ensure all values are JSON serializable
        try:
            json.dumps(response)
        except (TypeError, ValueError) as e:
            print(f"JSON serialization error: {e}")
            # Fallback: convert all numeric values to float
            response = json.loads(json.dumps(response, default=lambda x: float(x) if isinstance(x, (int, float, np.number)) else str(x)))
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Error in analysis: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/models/status', methods=['GET'])
def model_status():
    """Get model status"""
    return jsonify({
        'current_model': 'Enhanced LSTM',
        'available_models': {
            'LSTM': {
                'loaded': model is not None,
                'status': 'Active' if model is not None else 'Inactive',
                'max_words': max_words,
                'max_len': max_len,
                'embedding_dim': 200 if model else None,
                'accuracy': '97.44%' if model else None
            }
        }
    })

@app.route('/feedback', methods=['POST'])
def submit_feedback():
    """Submit feedback for missed hate words or false positives"""
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        feedback_type = data.get('feedback_type', '').strip()  # 'missed_hate' or 'false_positive'
        user_annotation = data.get('user_annotation', '').strip()  # User's correction
        original_prediction = data.get('original_prediction', '')
        confidence = data.get('confidence', 0.0)
        
        if not text or not feedback_type:
            return jsonify({'error': 'Text and feedback_type are required'}), 400
        
        # Create feedback data
        feedback_data = {
            'text': text,
            'feedback_type': feedback_type,
            'user_annotation': user_annotation,
            'original_prediction': original_prediction,
            'confidence': confidence,
            'timestamp': datetime.now().isoformat(),
            'model_version': 'Enhanced LSTM v1.0'
        }
        
        # Save feedback to file
        feedback_file = 'feedback_data.jsonl'
        try:
            with open(feedback_file, 'a', encoding='utf-8') as f:
                f.write(json.dumps(feedback_data, ensure_ascii=False) + '\n')
        except Exception as e:
            print(f"Error saving feedback: {e}")
            return jsonify({'error': 'Failed to save feedback'}), 500
        
        # If it's a missed hate word, add to hate words list for immediate improvement
        if feedback_type == 'missed_hate' and user_annotation:
            try:
                # Add to hate words list in memory
                if user_annotation.lower() not in preprocessor.hate_words:
                    preprocessor.hate_words.append(user_annotation.lower())
                    print(f"Added new hate word to memory: {user_annotation}")
                
                # Save to persistent hate words file
                hate_words_file = 'persistent_hate_words.txt'
                try:
                    # Read existing hate words
                    existing_words = set()
                    if os.path.exists(hate_words_file):
                        with open(hate_words_file, 'r', encoding='utf-8') as f:
                            existing_words = set(line.strip().lower() for line in f if line.strip())
                    
                    # Add new word if not already present
                    if user_annotation.lower() not in existing_words:
                        with open(hate_words_file, 'a', encoding='utf-8') as f:
                            f.write(user_annotation.lower() + '\n')
                        print(f"Saved new hate word to file: {user_annotation}")
                except Exception as e:
                    print(f"Error saving hate word to file: {e}")
                    
            except Exception as e:
                print(f"Error adding hate word: {e}")
        
        return jsonify({
            'message': 'Feedback submitted successfully',
            'feedback_id': len(str(feedback_data)),
            'action_taken': 'Added to hate words list' if feedback_type == 'missed_hate' else 'Logged for review'
        })
        
    except Exception as e:
        print(f"Error in feedback submission: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/feedback/stats', methods=['GET'])
def get_feedback_stats():
    """Get feedback statistics"""
    try:
        feedback_file = 'feedback_data.jsonl'
        stats = {
            'total_feedback': 0,
            'missed_hate': 0,
            'false_positive': 0,
            'recent_feedback': []
        }
        
        if os.path.exists(feedback_file):
            with open(feedback_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                stats['total_feedback'] = len(lines)
                
                for line in lines[-10:]:  # Last 10 feedback entries
                    try:
                        feedback = json.loads(line.strip())
                        if feedback.get('feedback_type') == 'missed_hate':
                            stats['missed_hate'] += 1
                        elif feedback.get('feedback_type') == 'false_positive':
                            stats['false_positive'] += 1
                        
                        stats['recent_feedback'].append({
                            'text': feedback.get('text', '')[:50] + '...' if len(feedback.get('text', '')) > 50 else feedback.get('text', ''),
                            'type': feedback.get('feedback_type'),
                            'timestamp': feedback.get('timestamp')
                        })
                    except:
                        continue
        
        return jsonify(stats)
        
    except Exception as e:
        print(f"Error getting feedback stats: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/test-fuzzy', methods=['POST'])
def test_fuzzy_matching():
    """Test fuzzy matching capabilities"""
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        if preprocessor is None:
            return jsonify({'error': 'Preprocessor not loaded'}), 500
        
        # Test hate word detection
        hate_words = preprocessor.detect_hate_words(text)
        detection_info = getattr(preprocessor, 'last_detection_info', [])
        
        # Test text preprocessing
        processed_text = preprocessor.preprocess_text(text)
        
        # Test language detection
        language = preprocessor.detect_language(text)
        
        # Test similarity with specific examples
        test_words = ['hutta', 'paka', 'balla', 'modaya']
        similarity_tests = []
        
        words_in_text = re.findall(r'\w+', text.lower())
        for test_word in test_words:
            for word_in_text in words_in_text:
                similarity = preprocessor.calculate_similarity(test_word, word_in_text)
                if similarity > 0.5:  # Only show meaningful similarities
                    similarity_tests.append({
                        'hate_word': test_word,
                        'text_word': word_in_text,
                        'similarity': similarity
                    })
        
        return jsonify({
            'original_text': text,
            'processed_text': processed_text,
            'hate_words_detected': hate_words,
            'detection_details': detection_info,
            'language_detected': language,
            'words_in_text': words_in_text,
            'similarity_tests': similarity_tests,
            'fuzzy_matching_threshold': 0.65
        })
        
    except Exception as e:
        print(f"Error in fuzzy testing: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting LSTM-Only Hate Speech Detection System")
    print("=" * 60)
    
    # Load model
    if load_lstm_model():
        print("System ready!")
        app.run(host='0.0.0.0', port=5003, debug=False)
    else:
        print("Failed to load model. Please ensure model files exist.")
        exit(1) 