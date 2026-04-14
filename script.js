const API_ENDPOINT = "http://127.0.0.1:5000/predict";// change to your Flask server

const fileInput = document.getElementById('fileInput');
const previewImage = document.getElementById('previewImage');
const imageBox = document.getElementById('imageBox');
const placeholder = imageBox.querySelector('.placeholder');
const status = document.getElementById('status');
const resultDiv = document.getElementById('result');
const labelDiv = document.getElementById('label');
const confidenceDiv = document.getElementById('confidence');
const dimensionsDiv = document.getElementById('dimensions');

const video = document.getElementById('video');
const openCameraBtn = document.getElementById('openCamera');
const captureBtn = document.getElementById('capture');
const closeCameraBtn = document.getElementById('closeCamera');
const canvas = document.getElementById('captureCanvas');

let stream = null;

// File upload
fileInput.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  displayImageFromFile(file);
  sendFileToServer(file);
});

function displayImageFromFile(file) {
  const url = URL.createObjectURL(file);
  previewImage.src = url;
  previewImage.style.display = 'block';
  placeholder.style.display = 'none';
  previewImage.onload = () => {
    //dimensionsDiv.textContent = `Dimensions: ${previewImage.naturalWidth}px × ${previewImage.naturalHeight}px`;
  };
}

async function sendFileToServer(file) {
  //status.textContent = 'Analyzing image...';
  resultDiv.style.display = 'none';

  const form = new FormData();
  form.append('file', file, file.name || 'upload.jpg');

  try {
    const res = await fetch(API_ENDPOINT, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();
    showResult(data);
  } catch (err) {
    status.textContent = 'Error: ' + err.message;
  }
}

function showResult(data) {
  resultDiv.style.display = 'block';
  labelDiv.textContent = `Result: ${(data.label || 'unknown').toUpperCase()}`;
  if (data.confidence !== undefined)
    confidenceDiv.textContent = `Confidence: ${(data.confidence * 100).toFixed(1)}%`;
 
}

// Camera
openCameraBtn.addEventListener('click', async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    captureBtn.disabled = false;
    closeCameraBtn.disabled = false;
    openCameraBtn.disabled = true;
  } catch (err) {
    status.textContent = 'Cannot open camera: ' + err.message;
  }
});

captureBtn.addEventListener('click', () => {
  if (!stream) return;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
    displayImageFromFile(file);
    sendFileToServer(file);
    closeCamera();
  }, 'image/jpeg', 0.95);
});

closeCameraBtn.addEventListener('click', closeCamera);

function closeCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  video.srcObject = null;
  captureBtn.disabled = true;
  closeCameraBtn.disabled = true;
  openCameraBtn.disabled = false;
}

