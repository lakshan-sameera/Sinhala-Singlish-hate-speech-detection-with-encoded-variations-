#!/usr/bin/env python3
"""
Singlish LSTM Model Training Script
Trains an LSTM model specifically for Singlish hate speech detection
"""

import os
import sys
import pandas as pd
import numpy as np
import pickle
import json
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Embedding, LSTM, Dense, Dropout, Bidirectional, Conv1D, MaxPooling1D
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
from tensorflow.keras.optimizers import Adam
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import SinhalaTextPreprocessor

class SinglishLSTMTrainer:
    """Trainer for Singlish LSTM model"""
    
    def __init__(self, max_words=20000, max_len=150, embedding_dim=300):
        self.max_words = max_words
        self.max_len = max_len
        self.embedding_dim = embedding_dim
        self.preprocessor = SinhalaTextPreprocessor()
        self.tokenizer = None
        self.model = None
        
    def load_and_prepare_data(self):
        """Load and prepare training data from multiple sources"""
        print("Loading training data...")
        
        texts = []
        labels = []
        
        # Load SOLD dataset
        sold_train_path = '../DataSets/SOLD_train.tsv'
        sold_test_path = '../DataSets/SOLD_test.tsv'
        
        if os.path.exists(sold_train_path):
            print(f"Loading SOLD training data from {sold_train_path}")
            sold_train = pd.read_csv(sold_train_path, sep='\t')
            if 'text' in sold_train.columns and 'label' in sold_train.columns:
                texts.extend(sold_train['text'].astype(str).tolist())
                labels.extend(sold_train['label'].tolist())
                print(f"Loaded {len(sold_train)} samples from SOLD train")
        
        if os.path.exists(sold_test_path):
            print(f"Loading SOLD test data from {sold_test_path}")
            sold_test = pd.read_csv(sold_test_path, sep='\t')
            if 'text' in sold_test.columns and 'label' in sold_test.columns:
                texts.extend(sold_test['text'].astype(str).tolist())
                labels.extend(sold_test['label'].tolist())
                print(f"Loaded {len(sold_test)} samples from SOLD test")
        
        # Load only_hate dataset
        only_hate_path = '../DataSets/only_hate.csv'
        if os.path.exists(only_hate_path):
            print(f"Loading only_hate data from {only_hate_path}")
            only_hate = pd.read_csv(only_hate_path)
            if 'text' in only_hate.columns:
                texts.extend(only_hate['text'].astype(str).tolist())
                labels.extend([1] * len(only_hate))  # All hate speech
                print(f"Loaded {len(only_hate)} samples from only_hate")
        
        # Load test dataset
        test_path = '../DataSets/test.csv'
        if os.path.exists(test_path):
            print(f"Loading test data from {test_path}")
            test_data = pd.read_csv(test_path)
            if 'text' in test_data.columns and 'label' in test_data.columns:
                texts.extend(test_data['text'].astype(str).tolist())
                labels.extend(test_data['label'].tolist())
                print(f"Loaded {len(test_data)} samples from test")
        
        # Clean data
        cleaned_texts = []
        cleaned_labels = []
        
        for text, label in zip(texts, labels):
            if pd.isna(text) or text.strip() == '' or pd.isna(label):
                continue
            
            # Preprocess text using our enhanced preprocessor
            processed_text = self.preprocessor.preprocess_text(text.strip())
            if processed_text and len(processed_text.strip()) > 0:
                cleaned_texts.append(processed_text)
                cleaned_labels.append(int(label))
        
        print(f"Final dataset: {len(cleaned_texts)} samples")
        print(f"Label distribution: {np.bincount(cleaned_labels)}")
        
        return cleaned_texts, cleaned_labels
    
    def create_tokenizer(self, texts):
        """Create and fit tokenizer"""
        print("Creating tokenizer...")
        self.tokenizer = Tokenizer(num_words=self.max_words, oov_token='<OOV>')
        self.tokenizer.fit_on_texts(texts)
        
        vocab_size = len(self.tokenizer.word_index) + 1
        print(f"Vocabulary size: {vocab_size}")
        
        return vocab_size
    
    def prepare_sequences(self, texts, labels):
        """Prepare sequences for training"""
        print("Preparing sequences...")
        
        # Tokenize texts
        sequences = self.tokenizer.texts_to_sequences(texts)
        
        # Pad sequences
        padded_sequences = pad_sequences(sequences, maxlen=self.max_len, padding='post', truncating='post')
        
        # Convert labels to numpy array
        labels = np.array(labels)
        
        print(f"Sequences shape: {padded_sequences.shape}")
        print(f"Labels shape: {labels.shape}")
        
        return padded_sequences, labels
    
    def create_model(self, vocab_size):
        """Create the LSTM model architecture"""
        print("Creating model architecture...")
        
        model = Sequential([
            # Embedding layer
            Embedding(vocab_size, self.embedding_dim, input_length=self.max_len),
            
            # Bidirectional LSTM layers
            Bidirectional(LSTM(128, return_sequences=True, dropout=0.2, recurrent_dropout=0.2)),
            Bidirectional(LSTM(64, dropout=0.2, recurrent_dropout=0.2)),
            
            # Dense layers
            Dense(128, activation='relu'),
            Dropout(0.5),
            Dense(64, activation='relu'),
            Dropout(0.3),
            
            # Output layer (binary classification)
            Dense(1, activation='sigmoid')
        ])
        
        # Compile model
        model.compile(
            optimizer=Adam(learning_rate=0.001),
            loss='binary_crossentropy',
            metrics=['accuracy', 'precision', 'recall']
        )
        
        print(model.summary())
        return model
    
    def train_model(self, X_train, y_train, X_val, y_val):
        """Train the model"""
        print("Training model...")
        
        # Create model
        vocab_size = len(self.tokenizer.word_index) + 1
        self.model = self.create_model(vocab_size)
        
        # Callbacks
        callbacks = [
            EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True),
            ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=3, min_lr=1e-7),
            ModelCheckpoint(
                'models/singlish_lstm_model.h5',
                monitor='val_accuracy',
                save_best_only=True,
                verbose=1
            )
        ]
        
        # Train model
        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=50,
            batch_size=32,
            callbacks=callbacks,
            verbose=1
        )
        
        return history
    
    def evaluate_model(self, X_test, y_test):
        """Evaluate the trained model"""
        print("Evaluating model...")
        
        # Predictions
        y_pred_proba = self.model.predict(X_test)
        y_pred = (y_pred_proba > 0.5).astype(int).flatten()
        
        # Metrics
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred))
        
        # Confusion Matrix
        cm = confusion_matrix(y_test, y_pred)
        plt.figure(figsize=(8, 6))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
        plt.title('Confusion Matrix')
        plt.ylabel('True Label')
        plt.xlabel('Predicted Label')
        plt.savefig('models/singlish_lstm_confusion_matrix.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        # Training History
        return y_pred_proba, y_pred
    
    def save_model_artifacts(self):
        """Save model artifacts"""
        print("Saving model artifacts...")
        
        # Create models directory if it doesn't exist
        os.makedirs('models', exist_ok=True)
        
        # Save tokenizer
        with open('models/singlish_tokenizer.pkl', 'wb') as f:
            pickle.dump(self.tokenizer, f)
        print("✅ Tokenizer saved")
        
        # Save preprocessor
        with open('models/singlish_preprocessor.pkl', 'wb') as f:
            pickle.dump(self.preprocessor, f)
        print("✅ Preprocessor saved")
        
        # Save metadata
        metadata = {
            'max_words': self.max_words,
            'max_len': self.max_len,
            'vocab_size': len(self.tokenizer.word_index) + 1,
            'embedding_dim': self.embedding_dim,
            'model_type': 'Singlish_LSTM',
            'training_date': datetime.now().isoformat(),
            'hate_words_count': len(self.preprocessor.hate_words)
        }
        
        with open('models/singlish_metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        print("✅ Metadata saved")
        
        print("🎉 All model artifacts saved successfully!")
    
    def train(self):
        """Main training pipeline"""
        print("=" * 60)
        print("Singlish LSTM Model Training")
        print("=" * 60)
        
        # Load and prepare data
        texts, labels = self.load_and_prepare_data()
        
        if len(texts) == 0:
            print("❌ No training data found!")
            return
        
        # Create tokenizer
        vocab_size = self.create_tokenizer(texts)
        
        # Prepare sequences
        X, y = self.prepare_sequences(texts, labels)
        
        # Split data
        X_train, X_temp, y_train, y_temp = train_test_split(
            X, y, test_size=0.3, random_state=42, stratify=y
        )
        X_val, X_test, y_val, y_test = train_test_split(
            X_temp, y_temp, test_size=0.5, random_state=42, stratify=y_temp
        )
        
        print(f"Training set: {X_train.shape[0]} samples")
        print(f"Validation set: {X_val.shape[0]} samples")
        print(f"Test set: {X_test.shape[0]} samples")
        
        # Train model
        history = self.train_model(X_train, y_train, X_val, y_val)
        
        # Evaluate model
        y_pred_proba, y_pred = self.evaluate_model(X_test, y_test)
        
        # Save artifacts
        self.save_model_artifacts()
        
        print("🎉 Training completed successfully!")
        print("Model files saved in 'models/' directory")

def main():
    """Main function"""
    trainer = SinglishLSTMTrainer()
    trainer.train()

if __name__ == "__main__":
    main() 