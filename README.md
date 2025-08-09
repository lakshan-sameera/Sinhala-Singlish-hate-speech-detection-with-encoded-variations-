# 🛡️ HateGuard - AI-Powered Singlish Hate Speech Detection

A comprehensive hate speech detection system specifically designed for Singlish (Sinhala-English mixed language) content, featuring advanced LSTM models and intelligent word variation detection.

Disclaimer: This model and the application only use for academic reseach purposes and may contatin a hateful words in the datsets or in codes.
HateGuard is an end-to-end system for detecting hate speech in Sinhala and Singlish text. It combines a Bidirectional LSTM model (binary NOT/OFF) with a robust rule-based layer for explicit hate words and obfuscated variants. A feedback mechanism lets users report missed cases, which are learned immediately via persistent word storage.

## 🌟 Features

- **🤖 Advanced LSTM Model**: Bidirectional LSTM with 93%+ accuracy
- **🔍 Word Variation Detection**: Detects variations like "hutta" → "hutto", "paka" → "pako"
- **🌐 Multi-language Support**: Sinhala, English, and Singlish
- **📊 Real-time Analysis**: Instant hate speech detection with confidence scores
- **🔄 User Feedback System**: Learn from user corrections to improve accuracy
- **🎨 Modern UI**: Beautiful React-based frontend with real-time results
- **⚡ High Performance**: Fast API responses with Express.js backend

## 🏗️ Architecture

```
HateGuard/
├── 🎨 client/          # React frontend
├── ⚙️ server/          # Express.js API
├── 🤖 ml_backend/      # Python ML backend
├── 📊 DataSets/        # Training datasets
└── 📁 shared/          # Shared utilities
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or higher)
- **Python** (3.8 or higher)
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/lakshan-sameera/Sinhala-Singlish-hate-speech-detection-with-encoded-variations-.git
   cd HateGuard
   ```

2. **Install dependencies**
   ```bash
   # Install Node.js dependencies
   npm install
   
   # Install Python dependencies
   pip install -r requirements.txt
   pip install -r ml_backend/requirements_training.txt
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Start the development server**
   ```bash
   npm run dev:all
   ```

5. **Access the application**
   - Frontend: http://localhost:5000
   - API: http://localhost:5000/api
   - ML Backend: http://localhost:5003

## 🧠 ML Model Details

### Model Architecture
- **Type**: Bidirectional LSTM
- **Embedding**: 300 dimensions
- **Layers**: 128 → 64 units with dropout
- **Output**: Binary classification (hate speech vs. safe)

### Training Data
- **SOLD Dataset**: Sinhala Online Language Dataset
- **Only Hate Dataset**: Curated hate speech samples
- **Test Dataset**: Mixed safe and hate speech content

### Word Variation Detection
The system intelligently detects variations of hate words:
- **"hutta"** → **"hutto"** ✅ (93.36% confidence)
- **"paka"** → **"pako"** ✅ (97.97% confidence)
- **"mooda"** → **"mokda"** ✅ (90% similarity)

## 📊 API Endpoints

### Analysis
- `POST /api/analyze` - Analyze text for hate speech
- `GET /api/analysis` - Get analysis history
- `GET /api/analysis/:id` - Get specific analysis

### ML Backend
- `GET /api/ml/health` - ML backend health check
- `GET /api/ml/models/status` - Model status
- `POST /api/feedback` - Submit user feedback

### Statistics
- `GET /api/stats` - System statistics
- `GET /api/moderation-queue` - Moderation queue

## 🎯 Usage Examples

### Frontend Usage
1. Open http://localhost:5000
2. Enter text in the analysis box
3. View real-time results with confidence scores
4. Submit feedback for missed detections

### API Usage
```bash
# Analyze text
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"content": "hutto mokda karanne"}'

# Response
{
  "classification": "flagged",
  "confidenceScore": 97,
  "hateScore": 87,
  "probabilities": {
    "NOT": 0.066,
    "OFF": 0.934
  }
}
```

## 🔧 Development

### Training the Model
```bash
cd ml_backend
python train_singlish_lstm.py
```

### Running Individual Services
```bash
# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend

# ML Backend only
npm run dev:ml

# All services
npm run dev:all
```

## 📈 Performance

- **Accuracy**: 93%+ on Singlish hate speech detection
- **Response Time**: < 1 second for text analysis
- **Word Variation Detection**: 90%+ similarity matching
- **Model Size**: ~92MB (optimized for production)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **SOLD Dataset**: Sinhala Online Language Dataset
- **TensorFlow/Keras**: Deep learning framework
- **React**: Frontend framework
- **Express.js**: Backend framework

## 📞 Support

For support, email lakshansameera636@gmail.com or create an issue in this repository.

---

**Made with ❤️ for safer online communities**
