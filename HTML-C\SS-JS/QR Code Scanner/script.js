        // Get DOM elements
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const resultDiv = document.getElementById('result');
        const errorMessage = document.getElementById('error-message');
        const statusDiv = document.getElementById('status');
        const startButton = document.getElementById('start-button');
        const stopButton = document.getElementById('stop-button');
        
        let qrScanner = null;
        
        // Function to show messages
        function showResult(message) {
            resultDiv.textContent = `QR Code: ${message}`;
            resultDiv.style.display = 'block';
            errorMessage.style.display = 'none';
        }
        
        function showError(message) {
            errorMessage.textContent = `Error: ${message}`;
            errorMessage.style.display = 'block';
            resultDiv.style.display = 'none';
        }
        
        function updateStatus(message) {
            statusDiv.textContent = message;
        }
        
        // Start scanner function
        async function startScanner() {
            try {
                // Check if QrScanner is available
                if (typeof QrScanner === 'undefined') {
                    throw new Error('QR Scanner library not loaded');
                }
                
                // Check camera support
                const hasCamera = await QrScanner.hasCamera();
                if (!hasCamera) {
                    throw new Error('No camera found');
                }
                
                // Stop existing scanner if running
                if (qrScanner) {
                    qrScanner.stop();
                    qrScanner.destroy();
                }
                
                // Create new scanner
                qrScanner = new QrScanner(
                    video,
                    result => {
                        showResult(result.data);
                        updateStatus('QR Code detected! Scanning continues...');
                    },
                    {
                        returnDetailedScanResult: true,
                        highlightScanRegion: true,
                        highlightCodeOutline: true,
                    }
                );
                
                // Start scanning
                await qrScanner.start();
                
                // Update UI
                startButton.disabled = true;
                stopButton.disabled = false;
                updateStatus('Scanner active - point camera at QR code');
                errorMessage.style.display = 'none';
                
            } catch (error) {
                console.error('Scanner start error:', error);
                showError(error.message || 'Failed to start camera');
                updateStatus('Scanner failed to start');
            }
        }
        
        // Stop scanner function
        function stopScanner() {
            if (qrScanner) {
                qrScanner.stop();
                qrScanner.destroy();
                qrScanner = null;
            }
            
            // Update UI
            startButton.disabled = false;
            stopButton.disabled = true;
            updateStatus('Scanner stopped');
            resultDiv.style.display = 'none';
            errorMessage.style.display = 'none';
        }
        
        // Event listeners
        startButton.addEventListener('click', startScanner);
        stopButton.addEventListener('click', stopScanner);
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && qrScanner) {
                qrScanner.stop();
            } else if (!document.hidden && qrScanner && !qrScanner._active) {
                qrScanner.start();
            }
        });
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (qrScanner) {
                qrScanner.stop();
                qrScanner.destroy();
            }
        });