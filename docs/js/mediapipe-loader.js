// docs/js/mediapipe-loader.js
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

// 使用 MediaPipe Tasks Vision 的 PoseLandmarker（CDN 已在 index.html 引入）
async function initPose() {
  // 确保全局对象存在
  if (!window.tasks) throw new Error('MediaPipe Tasks 未加载，请检查 CDN 引入');
  const { FilesetResolver, PoseLandmarker } = window.tasks.vision;

  // 加载模型（使用 CDN 默认模型）
  const fileset = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  );

  const pose = await PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/pose_landmarker.task' },
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
    alert('初始化失败，请检查控制台错误（可能是 CDN 访问问题）');
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

    if (result && result.landmarks && result.landmarks.length > 0) {
      const lm = result.landmarks[0]; // 单人
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
        const mpImage = window.tasks.vision.Image.fromCanvas(video);
        const results = pose.detectForVideo(mpImage, performance.now());
        // detectForVideo 返回对象可能包含 landmarks 字段（按版本不同）
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
