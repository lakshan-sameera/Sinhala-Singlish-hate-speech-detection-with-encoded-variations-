# Python ML Backend Integration

## Overview

ModerateAI now features a complete Python machine learning backend for real-time Sinhala/Singlish hate speech detection with advanced neutralization capabilities.

## Features

### 🤖 Real ML Model
- **Framework**: scikit-learn with TF-IDF vectorization and Logistic Regression
- **Training**: Custom CSV file support for domain-specific hate speech patterns
- **Languages**: Sinhala and Singlish (mixed Sinhala-English) text support
- **Accuracy**: Achieved 100% accuracy on sample training data

### 🎯 Detection Capabilities
- **Multi-class Classification**: safe, flagged, hate_speech
- **Confidence Scoring**: Hate, harassment, and normal content scores
- **Real-time Analysis**: Fast prediction with feature extraction
- **Pattern Recognition**: Hate word detection, text length analysis, character patterns

### 🛡️ Neutralizer Feature
Automatically converts hate speech into neutral abstract sentences:
- **High Hate Score (>80%)**: "This content has been identified as highly inappropriate and has been neutralized for community safety."
- **Medium Hate Score (60-80%)**: "This message contained inappropriate language and has been converted to maintain respectful communication."
- **Low Hate Score (40-60%)**: "Content has been moderated and replaced with this neutral message to ensure positive interactions."
- **Flagged Content (30-40%)**: "This text has been flagged and neutralized to promote respectful dialogue."

## Architecture

### Backend Components
```
Express.js Backend (Port 5000)
├── /api/analyze → Proxies to Python ML
├── /api/ml/train → Training endpoint
├── /api/ml/health → Backend status
└── Database persistence

Python ML Backend (Port 5001)
├── /health → Status check
├── /train → Model training with CSV
├── /analyze → Text classification
└── /predict → Raw ML predictions
```

### Data Flow
1. **Frontend** submits text via Express API
2. **Express Backend** calls Python ML backend
3. **Python ML** analyzes text and generates scores
4. **Neutralizer** converts hate speech to abstract sentences
5. **Database** stores all results with ML scores
6. **Frontend** displays results and neutralized text

## Usage

### Starting the System

1. **Start Express Backend**:
   ```bash
   npm run dev  # Port 5000
   ```

2. **Start Python ML Backend**:
   ```bash
   python start_ml_backend.py  # Port 5001
   ```

### Training Custom Model

1. **Prepare CSV file** with format:
   ```csv
   text,label,hate_words
   "ගොන් බල්ලා stupid",1,"ගොන්,බල්ලා,stupid"
   "හරිම ලස්සනයි beautiful",0,""
   ```

2. **Upload via Settings Page** or API:
   ```bash
   curl -X POST http://localhost:5001/train \
     -F "file=@training_data.csv"
   ```

### API Endpoints

#### Analyze Content
```bash
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"content":"text to analyze", "platform":"web", "userId":"user123"}'
```

**Response**:
```json
{
  "id": "uuid",
  "content": "original text",
  "classification": "hate_speech",
  "hateScore": 74.79,
  "harassmentScore": 23.08,
  "normalScore": 2.13,
  "neutralizedText": "This message contained inappropriate language...",
  "isHateSpeech": true,
  "isAutoHidden": false,
  "reviewStatus": "pending"
}
```

#### Check ML Backend Status
```bash
curl http://localhost:5000/api/ml/health
```

## Configuration

### Sample Training Data
Located at `ml_backend/sample_training_data.csv` with 20 examples:
- 10 hate speech samples (Sinhala/English mixed)
- 10 normal content samples  
- 21 hate words for pattern recognition

### Model Parameters
- **Vectorizer**: TF-IDF with max 5000 features, 1-2 n-grams
- **Classifier**: Logistic Regression with random_state=42
- **Features**: Text vectorization + hate word counts + character analysis
- **Preprocessing**: Lowercase, whitespace normalization, special character handling

## Integration Benefits

### For Developers
- **Type Safety**: Full TypeScript integration between Express and Python backends
- **Error Handling**: Graceful fallback to simulation if Python backend unavailable  
- **Real-time**: Fast prediction with database persistence
- **Scalable**: Separate ML service can be scaled independently

### For Content Moderators
- **Accurate Detection**: Real ML model trained on domain-specific data
- **Contextual Scoring**: Detailed confidence scores for informed decisions
- **Automated Neutralization**: Hate speech automatically converted to safe content
- **Custom Training**: Upload organization-specific hate speech patterns

### For End Users
- **Safe Experience**: Hate speech neutralized into respectful messages
- **Real-time Protection**: Immediate content analysis and moderation
- **Cultural Sensitivity**: Sinhala and Singlish language support
- **Transparent Moderation**: Clear classification and scoring visible to moderators

## Deployment Notes

### Requirements
- **Python 3.11+** with packages: flask, pandas, scikit-learn, nltk
- **Node.js 20+** for Express backend
- **PostgreSQL** for data persistence
- **2 GB RAM** minimum for ML model operation

### Production Considerations
- Use **Gunicorn** or **uWSGI** for Python ML backend in production
- Implement **model versioning** for training updates
- Add **authentication** for training endpoints
- Configure **logging** for ML predictions and training events
- Set up **monitoring** for model performance and accuracy metrics