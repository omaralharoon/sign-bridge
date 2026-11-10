declare var Hands: any;
declare var Camera: any;
declare var drawConnectors: any;
declare var drawLandmarks: any;
declare var HAND_CONNECTIONS: any;

const homeView = document.getElementById('home-view')!;
const cameraView = document.getElementById('camera-view')!;
const audioView = document.getElementById('audio-view')!;

const navHomeBtn = document.getElementById('nav-home-btn')!;
const cardToCamera = document.getElementById('card-to-camera')!;
const cardToAudio = document.getElementById('card-to-audio')!;
const goToAudioBtn = document.getElementById('go-to-audio-btn')!;
const goToCameraBtn = document.getElementById('go-to-camera-btn')!;

const startCameraBtn = document.getElementById('start-camera-btn') as HTMLButtonElement;
const camBtnText = document.getElementById('cam-btn-text')!;
const camBtnIcon = document.getElementById('cam-btn-icon')!;
const webcam = document.getElementById('webcam') as HTMLVideoElement;
const videoOverlay = document.getElementById('video-overlay')!;
const modelStatus = document.getElementById('model-status')!;

const canvasElement = document.createElement('canvas');
canvasElement.style.position = 'absolute';
canvasElement.style.top = '0';
canvasElement.style.left = '0';
canvasElement.style.width = '100%';
canvasElement.style.height = '100%';
canvasElement.style.pointerEvents = 'none';
const videoWrapper = document.querySelector('.video-wrapper')!;
videoWrapper.appendChild(canvasElement);
const canvasCtx = canvasElement.getContext('2d')!;

const micListenBtn = document.getElementById('mic-listen-btn') as HTMLButtonElement;
const micBtnText = document.getElementById('mic-btn-text')!;
const audioStatus = document.getElementById('audio-status')!;
const textPrompt = document.getElementById('text-prompt') as HTMLInputElement;
const translateTextBtn = document.getElementById('translate-text-btn') as HTMLButtonElement;

let isCameraStarted = false;
let activeCameraInstance: any = null;
let activeHandsInstance: any = null;

let currentLang: 'ar' | 'en' = (localStorage.getItem('preferred_lang') as 'ar' | 'en') || 'ar';
const langBtn = document.getElementById('lang-toggle-btn');
const brandText = document.getElementById('brand-text');
const themeToggleBtn = document.getElementById('theme-toggle-btn');

const savedTheme = localStorage.getItem('preferred_theme');
if (savedTheme === 'dark') {
  document.body.classList.add('dark-mode');
  themeToggleBtn?.classList.add('dark');
  themeToggleBtn?.classList.remove('light');
} else {
  document.body.classList.remove('dark-mode');
  themeToggleBtn?.classList.remove('dark');
  themeToggleBtn?.classList.add('light');
}

function applySavedLanguage() {
  document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = currentLang;

  if (langBtn) {
    langBtn.textContent = currentLang === 'ar' ? '🌐 English' : '🌐 عربي';
  }
  
  if (brandText) {
    brandText.textContent = currentLang === 'ar' ? 'جسر تواصل' : 'SignBridge';
  }

  const translatableElements = document.querySelectorAll('[data-ar]');
  translatableElements.forEach((el) => {
    const text = el.getAttribute(`data-${currentLang}`);
    if (text) el.textContent = text;
  });

  if (textPrompt) {
    const ph = textPrompt.getAttribute(`data-placeholder-${currentLang}`);
    if (ph) textPrompt.placeholder = ph;
  }

  if (modelStatus.textContent === 'None' || modelStatus.textContent === 'غير معرف') {
    modelStatus.textContent = currentLang === 'ar' ? 'غير معرف' : 'None';
  }

  if (micBtnText) {
    micBtnText.innerHTML = currentLang === 'ar' ? '🎙️اضغط هنا للتحدث الآن🎙️' : '🎙️Click here to speak now🎙️';
  }
}

applySavedLanguage();

themeToggleBtn?.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  themeToggleBtn.classList.toggle('dark', isDark);
  themeToggleBtn.classList.toggle('light', !isDark);
  localStorage.setItem('preferred_theme', isDark ? 'dark' : 'light');
});

langBtn?.addEventListener('click', () => {
  currentLang = currentLang === 'ar' ? 'en' : 'ar';
  localStorage.setItem('preferred_lang', currentLang);
  applySavedLanguage();
});

const signDictionary: { [key: string]: string } = {
  'مرحباً': '✋',
  'أهلاً': '✋',
  'مرحبا': '✋',
  'hello': '✋',
  'open palm': '✋',
  'توقف': '✊',
  'قف': '✊',
  'stop': '✊',
  'closed fist': '✊',
  'ممتاز': '👍',
  'أحسنت': '👍',
  'عظيم': '👍',
  'excellent': '👍',
  'thumbs up': '👍',
  'أبداً': '👎',
  'مستحيل': '👎',
  'never': '👎',
  'thumbs down': '👎',
  'اثنان': '✌️',
  'two': '✌️',
  '2': '✌️',
  'victory sign': '✌️',
  'واحد': '☝️',
  'one': '☝️',
  '1': '☝️',
  'raised finger': '☝️'
};

function showView(viewToShow: HTMLElement) {
  homeView.classList.add('hidden');
  cameraView.classList.add('hidden');
  audioView.classList.add('hidden');
  viewToShow.classList.remove('hidden');
}

showView(homeView);

navHomeBtn.addEventListener('click', () => showView(homeView));
cardToCamera.addEventListener('click', () => showView(cameraView));
cardToAudio.addEventListener('click', () => showView(audioView));
goToAudioBtn.addEventListener('click', () => showView(audioView));
goToCameraBtn.addEventListener('click', () => showView(cameraView));

function recognizeGesture(landmarks: any[]): string {
  if (!landmarks || landmarks.length === 0) return currentLang === 'ar' ? 'غير معرف' : 'None';

  const isIndexUp = landmarks[8].y < landmarks[6].y - 0.02;
  const isMiddleUp = landmarks[12].y < landmarks[10].y - 0.02;
  const isRingUp = landmarks[16].y < landmarks[14].y - 0.02;
  const isPinkyUp = landmarks[20].y < landmarks[18].y - 0.02;

  const isThumbDown = landmarks[4].y > landmarks[3].y && landmarks[4].y > landmarks[2].y;

  if (isThumbDown && !isIndexUp && !isMiddleUp && !isRingUp) {
    return currentLang === 'ar' ? 'أبداً 👎' : 'Never 👎';
  }

  const isHandUpright = landmarks[0].y > landmarks[9].y;
  if (!isHandUpright) {
    return currentLang === 'ar' ? 'غير معرف' : 'None';
  }

  const isThumbUp = landmarks[4].y < landmarks[3].y - 0.05 && 
                    landmarks[4].y < landmarks[2].y - 0.05 && 
                    landmarks[4].y < landmarks[9].y && 
                    !isIndexUp && !isMiddleUp;

  if (isThumbUp && !isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
    return currentLang === 'ar' ? 'ممتاز 👍' : 'Excellent 👍';
  }

  if (!isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
    return currentLang === 'ar' ? 'توقف ✊' : 'Stop ✊';
  }
  
  if (isIndexUp && isMiddleUp && isRingUp && isPinkyUp) {
    return currentLang === 'ar' ? 'مرحباً ✋' : 'Hello ✋';
  }
  
  if (isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp && landmarks[16].y > landmarks[14].y && landmarks[20].y > landmarks[18].y) {
    return currentLang === 'ar' ? 'اثنان ✌️' : 'Two ✌️';
  }
  
  if (isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
    return currentLang === 'ar' ? 'واحد ☝️' : 'One ☝️';
  }

  return currentLang === 'ar' ? 'غير معرف' : 'None';
}

startCameraBtn.addEventListener('click', async () => {
  if (isCameraStarted) {
    isCameraStarted = false;
    
    if (activeCameraInstance && typeof activeCameraInstance.stop === 'function') {
      activeCameraInstance.stop();
    }
    const stream = webcam.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    webcam.srcObject = null;

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    startCameraBtn.classList.remove('active');
    startCameraBtn.style.backgroundColor = ''; 
    camBtnIcon.textContent = '📷';
    camBtnText.textContent = currentLang === 'ar' ? 'انقر هنا لتشغيل الكاميرا' : 'Click here to start camera';
    videoOverlay.style.display = 'flex';
    modelStatus.textContent = currentLang === 'ar' ? '✅ النموذج جاهز!' : '✅ Model Ready!';
    return;
  }

  try {
    startCameraBtn.classList.add('active');
    startCameraBtn.style.backgroundColor = '#009a96';
    camBtnIcon.textContent = '📷';
    camBtnText.textContent = currentLang === 'ar' ? 'الكاميرا تعمل الآن...' : 'Camera is running...';
    videoOverlay.style.display = 'none';
    isCameraStarted = true;

    modelStatus.textContent = currentLang === 'ar' ? 'الكاميرا تعمل الآن' : 'Camera is running';

    const hands = new Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    activeHandsInstance = hands;

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    });

    hands.onResults((results: any) => {
      if (!isCameraStarted) return;
      canvasElement.width = webcam.videoWidth;
      canvasElement.height = webcam.videoHeight;
      
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
          drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#009a96', lineWidth: 5 });
          drawLandmarks(canvasCtx, landmarks, { color: '#0f172a', lineWidth: 2, radius: 7 });
        }

        const detectedSign = recognizeGesture(results.multiHandLandmarks[0]);
        modelStatus.textContent = detectedSign;
      } else {
        modelStatus.textContent = currentLang === 'ar' ? 'غير معرف' : 'None';
      }
      canvasCtx.restore();
    });

    const camera = new Camera(webcam, {
      onFrame: async () => {
        if (isCameraStarted) {
          await hands.send({ image: webcam });
        }
      },
      width: 640,
      height: 480
    });
    activeCameraInstance = camera;

    camera.start();

  } catch (err) {
    alert(currentLang === 'ar' ? 'يرجى السماح بالوصول للكاميرا.' : 'Please allow camera access.');
    isCameraStarted = false;
    startCameraBtn.classList.remove('active');
    startCameraBtn.style.backgroundColor = '';
    camBtnIcon.textContent = '📷';
    camBtnText.textContent = currentLang === 'ar' ? 'انقر هنا لتشغيل الكاميرا' : 'Click here to start camera';
    videoOverlay.style.display = 'flex';
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  }
});

function processTextToSign(inputString: string) {
  const cleanInput = inputString.trim().toLowerCase();
  let foundSymbol = 'None';

  for (const key in signDictionary) {
    if (cleanInput.includes(key.toLowerCase())) {
      foundSymbol = signDictionary[key];
      break;
    }
  }

  translateTextBtn.classList.add('active-translate');
  setTimeout(() => {
    translateTextBtn.classList.remove('active-translate');
  }, 600);

  if (foundSymbol !== 'None') {
    audioStatus.innerHTML = `<span style="font-size: 90px; display: inline-block; text-align: center; width: 100%;">${foundSymbol}</span>`;
  } else {
    audioStatus.innerHTML = `<span style="font-size: 24px; font-weight: bold; color: #009a96;">${currentLang === 'ar' ? 'غير معرف' : 'None'}</span>`;
  }
}

textPrompt.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const text = textPrompt.value.trim();
    if (text) {
      processTextToSign(text);
    }
  }
});

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  
  recognition.lang = currentLang === 'ar' ? 'ar-SA' : 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;

  let isListening = false;

  micListenBtn.addEventListener('click', () => {
    recognition.lang = currentLang === 'ar' ? 'ar-SA' : 'en-US';
    if (isListening) {
      recognition.stop();
      return;
    }

    try {
      recognition.start();
    } catch (e) {
      console.error(e);
      alert(currentLang === 'ar' ? 'تعذر تشغيل الميكروفون.' : 'Could not start microphone.');
    }
  });

  recognition.onstart = () => {
    isListening = true;
    micListenBtn.classList.add('listening');
    micBtnText.innerHTML = currentLang === 'ar' ? '🎙️جاري الاستماع... تحدث الآن🎙️' : '🎙️Listening... Speak now🎙️';
  };

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    textPrompt.value = transcript;
    processTextToSign(transcript);
  };

  recognition.onerror = (event: any) => {
    console.error('Speech recognition error:', event.error);
    resetMicButton();
  };

  recognition.onend = () => {
    resetMicButton();
  };

  function resetMicButton() {
    isListening = false;
    micListenBtn.classList.remove('listening');
    micBtnText.innerHTML = currentLang === 'ar' ? '🎙️اضغط هنا للتحدث الآن🎙️' : '🎙️Click here to speak now🎙️';
  }
} else {
  micListenBtn.addEventListener('click', () => {
    alert(currentLang === 'ar' ? 'متصفحك الحالي لا يدعم التعرف الصوتي.' : 'Your browser does not support speech recognition.');
  });
}

translateTextBtn.addEventListener('click', () => {
  const text = textPrompt.value.trim();
  if (text) {
    processTextToSign(text);
  }
});