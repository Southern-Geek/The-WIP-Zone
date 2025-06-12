// Initialize QR Scanner
const video = document.getElementById('video');
const resultDiv = document.getElementById('result');
const errorMessage = document.getElementById('error-message');
let scanner = null;

const startButton = document.getElementById('start-button');
const stopButton = document.getElementById('stop-button');

startButton.addEventListener('click', () => {
  if (scanner) {
    scanner.stop();
    scanner.destroy();
    scanner = null;
  }
  scanner = new QrScanner(
    video,
    (result) => {
      resultDiv.textContent = `QR Code Result: ${result}`;
      errorMessage.textContent = '';
    },
    {
      onDecodeError: (error) => {
        errorMessage.textContent = `Error: ${error}`;
      }
    }
  );
  scanner.start().catch(err => {
    errorMessage.textContent = `Camera Error: ${err.message || err}`;
  });
});

stopButton.addEventListener('click', () => {
  if (scanner) {
    scanner.stop();
    scanner.destroy();
    scanner = null;
    resultDiv.textContent = '';
    errorMessage.textContent = '';
  }
});

// Handle video stream errors
video.addEventListener('error', (event) => {
  errorMessage.textContent = `Video Error: ${event.message}`;
});

// Handle canvas resizing
window.addEventListener('resize', () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
});

// Initialize canvas size
canvas.width = video.videoWidth;
canvas.height = video.videoHeight;