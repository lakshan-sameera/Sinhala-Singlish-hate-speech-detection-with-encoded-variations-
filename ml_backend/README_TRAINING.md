# Singlish LSTM Model Training

This directory contains the training code for the Singlish LSTM hate speech detection model.

## Model Architecture

The model uses a **Bidirectional LSTM** architecture specifically designed for Singlish hate speech detection:

- **Embedding Layer**: 300-dimensional embeddings
- **Bidirectional LSTM**: 128 units (first layer), 64 units (second layer)
- **Dense Layers**: 128 → 64 → 1 (with dropout)
- **Output**: Binary classification (hate speech vs. safe)

## Training Data

The model is trained on multiple datasets:

1. **SOLD Dataset** (`SOLD_train.tsv`, `SOLD_test.tsv`)
   - Sinhala Online Language Dataset
   - Contains labeled Sinhala text samples

2. **Only Hate Dataset** (`only_hate.csv`)
   - Curated hate speech samples
   - All samples labeled as hate speech (1)

3. **Test Dataset** (`test.csv`)
   - Additional test samples
   - Mixed safe and hate speech content

## Training Process

### 1. Install Dependencies

```bash
pip install -r requirements_training.txt
```

### 2. Prepare Data

Ensure your datasets are in the `../DataSets/` directory:
- `SOLD_train.tsv`
- `SOLD_test.tsv`
- `only_hate.csv`
- `test.csv`

### 3. Run Training

```bash
cd ml_backend
python train_singlish_lstm.py
```

### 4. Training Output

The training process will:

1. **Load and preprocess** all datasets
2. **Create tokenizer** with vocabulary size up to 20,000 words
3. **Train the model** with early stopping and learning rate reduction
4. **Evaluate performance** with classification report and confusion matrix
5. **Save model artifacts**:
   - `models/singlish_lstm_model.h5` - Trained model
   - `models/singlish_tokenizer.pkl` - Tokenizer
   - `models/singlish_preprocessor.pkl` - Text preprocessor
   - `models/singlish_metadata.json` - Model metadata
   - `models/singlish_lstm_confusion_matrix.png` - Confusion matrix

## Model Configuration

- **Max Words**: 20,000
- **Max Sequence Length**: 150 tokens
- **Embedding Dimension**: 300
- **Vocabulary Size**: ~24,676 (from current model)
- **Hate Words Count**: 2,177 (from current model)

## Training Callbacks

- **Early Stopping**: Stops training if validation loss doesn't improve for 5 epochs
- **Learning Rate Reduction**: Reduces LR by 50% if validation loss plateaus
- **Model Checkpointing**: Saves best model based on validation accuracy

## Performance

The current model achieves:
- **High accuracy** on Singlish hate speech detection
- **Excellent word variation detection** (e.g., "hutta" → "hutto")
- **Context-aware understanding** through LSTM intelligence

## Usage

After training, the model can be used in the main application:

```python
from app import predict_hate_speech

# Predict hate speech
result = predict_hate_speech("hutto mokda karanne")
print(result)
```

## Notes

- The model uses the enhanced `SinhalaTextPreprocessor` for text preprocessing
- Word variation detection is built into the preprocessor
- The model learns to detect hate speech patterns beyond simple word matching
- Training typically takes 1-2 hours depending on hardware 