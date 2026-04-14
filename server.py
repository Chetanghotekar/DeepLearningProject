from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from PIL import Image
import torch
import torch.nn as nn
import torchvision.transforms as transforms
import torchvision.models as models
import os

# ---------------- CONFIG ----------------
MODEL_PATH = 'best_model.pth'
CLASS_NAMES = ['fake', 'real']
IMAGE_SIZE = 224
# ----------------------------------------

device = torch.device('cpu')
print("Using device:", device)

# Load pretrained ResNet18 architecture
model = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)

# Replace final layer with Dropout + Linear
num_features = model.fc.in_features
model.fc = nn.Sequential(
    nn.Dropout(0.5),
    nn.Linear(num_features, 2)
)

# Load trained weights (force CPU)
print(f'🔄 Loading model from {MODEL_PATH} ...')
model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
model = model.to(device)
model.eval()
print('✅ Model loaded successfully.')

# Preprocessing (same as training)
preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(IMAGE_SIZE),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

def predict_pil_image(pil_image):
    x = preprocess(pil_image).unsqueeze(0).to(device)
    with torch.no_grad():
        out = model(x).squeeze(0)
        probs = torch.softmax(out, dim=0)
        idx = torch.argmax(probs).item()
        label = CLASS_NAMES[idx]
        confidence = probs[idx].item()
    return label, float(confidence)

# Flask App
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    f = request.files['file']
    try:
        img = Image.open(f.stream).convert('RGB')
    except Exception as e:
        return jsonify({'error': f'Cannot open image: {e}'}), 400

    width, height = img.size
    try:
        label, confidence = predict_pil_image(img)
    except Exception as e:
        return jsonify({'error': f'Prediction error: {e}'}), 500

    return jsonify({
        'label': label,
        'confidence': confidence,
        'width': width,
        'height': height
    })

# Serve frontend files
@app.route('/')
def home():
    return send_from_directory('.', 'index.html')

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
