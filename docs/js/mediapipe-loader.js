// docs/js/mediapipe-loader.js  （ES module 版本）
import { FilesetResolver, PoseLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/dist/tasks-vision.js';

const startBtn = document.getElementById('startBtn');
const video = document.getElementById('input_video');
const canvas = document.getElementById('output_canvas');
const ctx = canvas.getContext('2d');
const flipCheckbox = document.getElementById('flip');

async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
  video.srcObject = stream;
  await video.play();
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
}

async function initPose() {
  // 指定稳定版本的 wasm 目录（0.10.0 为示例，可替换为你需要的版本）
  const fileset = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
  );

  const pose = await PoseLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/pose_landmarker.task'
    },
    runningMode: 'VIDEO',
    numPoses: 1
  });

  return pose;
}

(async () => {
  let pose = null;
  try {
    pose = await initPose();
  } catch (e) {
    console.error('MediaPipe init error', e);
    alert('初始化失败：' + (e.message || e));
    return;
  }

  function drawResults(result) {
    ctx.save();
    if (flipCheckbox.checked) {
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Tasks API 的返回结构可能随版本不同，这里做兼容处理
    const landmarks = result?.landmarks ?? result?.poseLandmarks ?? null;
    if (landmarks && landmarks.length > 0) {
      const lm = landmarks[0]; // 单人
      ctx.fillStyle = 'red';
      for (const p of lm) {
        ctx.beginPath();
        ctx.arc(p.x * canvas.width, p.y * canvas.height, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  async function frameLoop() {
    if (video.readyState >= 2) {
      try {
        // Tasks API 提供 Image.fromCanvas 辅助
        const mpImage = window.tasks?.vision?.Image?.fromCanvas ? window.tasks.vision.Image.fromCanvas(video) : null;
        // 如果上面为 null，直接传 video 也可能被支持，按版本兼容
        const input = mpImage ?? video;
        const results = pose.detectForVideo ? pose.detectForVideo(input, performance.now()) : await pose.detect(input);
        drawResults(results);
      } catch (err) {
        console.warn('推理错误', err);
      }
    }
    requestAnimationFrame(frameLoop);
  }

  startBtn.addEventListener('click', async () => {
    await startCamera();
    frameLoop();
  });
})();
