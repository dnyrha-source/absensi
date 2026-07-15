const fs = require('fs');
const https = require('https');
const path = require('path');

const modelsDir = path.join(__dirname, 'public', 'models');

if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

// Use jsdelivr npm registry to get the models correctly
const baseUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

const models = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

models.forEach(model => {
  const url = baseUrl + model;
  const dest = path.join(modelsDir, model);
  
  https.get(url, (res) => {
    if (res.statusCode === 200) {
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${model}`);
      });
    } else {
      console.error(`Failed to download ${model}: ${res.statusCode}`);
    }
  }).on('error', (err) => {
    console.error(`Error downloading ${model}: ${err.message}`);
  });
});
