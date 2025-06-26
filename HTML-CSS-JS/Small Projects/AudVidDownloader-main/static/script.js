class MediaConverter {
    constructor() {
        this.currentJobId = null;
        this.pollInterval = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const convertForm = document.getElementById('convertForm');
        const downloadBtn = document.getElementById('downloadBtn');
        const newConversionBtn = document.getElementById('newConversionBtn');
        const formatSelect = document.getElementById('formatSelect');
        const modeRadios = document.querySelectorAll('input[name="conversionMode"]');

        convertForm.addEventListener('submit', (e) => this.handleSubmit(e));
        downloadBtn.addEventListener('click', () => this.downloadFile());
        newConversionBtn.addEventListener('click', () => this.resetForm());
        formatSelect.addEventListener('change', () => this.updateFormatOptions());
        
        // Mode switching
        modeRadios.forEach(radio => {
            radio.addEventListener('change', () => this.switchMode());
        });
        
        // Initialize format options
        this.updateFormatOptions();
    }

    switchMode() {
        const mode = document.querySelector('input[name="conversionMode"]:checked').id;
        
        // Hide all sections
        document.getElementById('singleUrlSection').classList.add('d-none');
        document.getElementById('batchUrlSection').classList.add('d-none');
        document.getElementById('playlistUrlSection').classList.add('d-none');
        
        // Show relevant section
        switch(mode) {
            case 'singleMode':
                document.getElementById('singleUrlSection').classList.remove('d-none');
                break;
            case 'batchMode':
                document.getElementById('batchUrlSection').classList.remove('d-none');
                break;
            case 'playlistMode':
                document.getElementById('playlistUrlSection').classList.remove('d-none');
                break;
        }
    }

    updateFormatOptions() {
        const format = document.getElementById('formatSelect').value;
        const qualitySelect = document.getElementById('qualitySelect');
        const bitrateSelect = document.getElementById('bitrateSelect');
        
        // Update quality options
        qualitySelect.innerHTML = '';
        bitrateSelect.innerHTML = '<option value="" selected>Auto</option>';
        
        if (['mp4', 'webm', 'mkv'].includes(format)) {
            // Video formats
            qualitySelect.innerHTML = `
                <option value="best" selected>Best Available</option>
                <option value="1080p">1080p</option>
                <option value="720p">720p</option>
                <option value="480p">480p</option>
                <option value="360p">360p</option>
                <option value="worst">Smallest File</option>
            `;
            bitrateSelect.innerHTML = '<option value="" selected>Auto</option>';
        } else {
            // Audio formats
            qualitySelect.innerHTML = `
                <option value="best" selected>Best Quality</option>
                <option value="worst">Smallest File</option>
            `;
            
            // Format-specific bitrate options
            if (format === 'mp3') {
                bitrateSelect.innerHTML = `
                    <option value="" selected>Auto</option>
                    <option value="320k">320k (Highest)</option>
                    <option value="256k">256k (High)</option>
                    <option value="192k">192k (Standard)</option>
                    <option value="128k">128k (Good)</option>
                `;
            } else if (format === 'aac' || format === 'm4a') {
                bitrateSelect.innerHTML = `
                    <option value="" selected>Auto</option>
                    <option value="256k">256k (High)</option>
                    <option value="192k">192k (Standard)</option>
                    <option value="128k">128k (Good)</option>
                    <option value="96k">96k (Lower)</option>
                `;
            } else if (format === 'wav') {
                bitrateSelect.innerHTML = `
                    <option value="" selected>Auto</option>
                    <option value="24bit">24-bit</option>
                    <option value="16bit">16-bit</option>
                `;
            } else if (format === 'flac') {
                bitrateSelect.innerHTML = '<option value="" selected>Lossless</option>';
            }
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const mode = document.querySelector('input[name="conversionMode"]:checked').id;
        const format = document.getElementById('formatSelect').value;
        const quality = document.getElementById('qualitySelect').value;
        const bitrate = document.getElementById('bitrateSelect').value;
        
        let requestData = {
            format: format,
            quality: quality,
            bitrate: bitrate || null
        };

        // Get URLs based on mode
        if (mode === 'singleMode') {
            const url = document.getElementById('urlInput').value.trim();
            if (!url) {
                this.showError('Please enter a valid URL');
                return;
            }
            if (!this.isValidUrl(url)) {
                this.showError('Please enter a valid URL format');
                return;
            }
            requestData.url = url;
        } else if (mode === 'batchMode') {
            const batchUrls = document.getElementById('batchUrlInput').value.trim();
            if (!batchUrls) {
                this.showError('Please enter URLs for batch processing');
                return;
            }
            const urls = batchUrls.split('\n').map(u => u.trim()).filter(u => u);
            if (urls.length === 0) {
                this.showError('Please enter valid URLs');
                return;
            }
            if (urls.length > 50) {
                this.showError('Maximum 50 URLs allowed for batch processing');
                return;
            }
            for (let url of urls) {
                if (!this.isValidUrl(url)) {
                    this.showError(`Invalid URL: ${url}`);
                    return;
                }
            }
            requestData.urls = urls;
        } else if (mode === 'playlistMode') {
            const playlistUrl = document.getElementById('playlistUrlInput').value.trim();
            if (!playlistUrl) {
                this.showError('Please enter a playlist URL');
                return;
            }
            if (!this.isValidUrl(playlistUrl)) {
                this.showError('Please enter a valid playlist URL');
                return;
            }
            requestData.url = playlistUrl;
        }

        this.showProgress('Starting conversion...');
        this.disableForm(true);

        try {
            const response = await fetch('/convert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.currentJobId = data.job_id;
                this.pollJobStatus();
            } else {
                this.showError(data.error || 'Conversion failed');
                this.disableForm(false);
            }
        } catch (error) {
            console.error('Conversion error:', error);
            this.showError('Network error. Please check your connection and try again.');
            this.disableForm(false);
        }
    }

    async pollJobStatus() {
        if (!this.currentJobId) return;
        
        try {
            const response = await fetch(`/status/${this.currentJobId}`);
            const data = await response.json();
            
            if (data.status === 'completed') {
                clearInterval(this.pollInterval);
                this.showSuccess(data.title || 'Conversion complete', data.duration || 'Unknown');
            } else if (data.status === 'error') {
                clearInterval(this.pollInterval);
                this.showError(data.error || 'Conversion failed');
                this.disableForm(false);
            } else {
                // Update progress
                const progressBar = document.getElementById('progressBar');
                const progressStatus = document.getElementById('progressStatus');
                
                if (data.progress) {
                    progressBar.style.width = data.progress + '%';
                }
                
                if (data.status.startsWith('processing_')) {
                    progressStatus.textContent = `Processing ${data.status.split('_')[1]} of ${data.status.split('_')[3]} files...`;
                } else {
                    progressStatus.textContent = this.getStatusMessage(data.status);
                }
                
                // Continue polling
                setTimeout(() => this.pollJobStatus(), 2000);
            }
        } catch (error) {
            console.error('Status polling error:', error);
            clearInterval(this.pollInterval);
            this.showError('Failed to get conversion status');
            this.disableForm(false);
        }
    }

    getStatusMessage(status) {
        const messages = {
            'starting': 'Initializing conversion...',
            'downloading': 'Downloading content...',
            'converting': 'Converting to selected format...',
            'processing': 'Processing files...'
        };
        return messages[status] || 'Processing...';
    }

    showProgress(message) {
        this.hideAllCards();
        const progressCard = document.getElementById('progressCard');
        const progressStatus = document.getElementById('progressStatus');
        const progressBar = document.getElementById('progressBar');
        
        progressStatus.textContent = message;
        progressBar.style.width = '10%';
        progressCard.classList.remove('d-none');
        
        // Simulate progress animation
        let progress = 10;
        const interval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress > 90) progress = 90;
            progressBar.style.width = progress + '%';
            
            if (progress > 50) {
                progressStatus.textContent = 'Converting to ' + document.getElementById('formatSelect').value.toUpperCase() + '...';
            }
        }, 1000);

        // Clear interval after 10 seconds to prevent infinite running
        setTimeout(() => clearInterval(interval), 10000);
    }

    showSuccess(title, duration) {
        this.hideAllCards();
        const successCard = document.getElementById('successCard');
        const videoTitle = document.getElementById('videoTitle');
        const videoDuration = document.getElementById('videoDuration');
        
        videoTitle.textContent = title || 'Unknown';
        videoDuration.textContent = duration || 'Unknown';
        
        successCard.classList.remove('d-none');
        this.disableForm(false);
    }

    showError(message) {
        this.hideAllCards();
        const errorAlert = document.getElementById('errorAlert');
        const errorMessage = document.getElementById('errorMessage');
        
        errorMessage.textContent = message;
        errorAlert.classList.remove('d-none');
        
        // Auto-hide error after 10 seconds
        setTimeout(() => {
            errorAlert.classList.add('d-none');
        }, 10000);
    }

    hideAllCards() {
        document.getElementById('progressCard').classList.add('d-none');
        document.getElementById('successCard').classList.add('d-none');
        document.getElementById('errorAlert').classList.add('d-none');
    }

    async downloadFile() {
        if (!this.currentJobId) {
            this.showError('No file available for download');
            return;
        }

        try {
            const response = await fetch(`/download/${this.currentJobId}`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                
                // Get filename from Content-Disposition header or use default
                const contentDisposition = response.headers.get('content-disposition');
                let filename = 'converted_media';
                
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                    if (filenameMatch) {
                        filename = filenameMatch[1];
                    }
                }
                
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                // Optional: Clean up the file on server after download
                this.cleanupFile();
                
            } else {
                const errorData = await response.json();
                this.showError(errorData.error || 'Download failed');
            }
        } catch (error) {
            console.error('Download error:', error);
            this.showError('Download failed. Please try again.');
        }
    }

    async cleanupFile() {
        if (!this.currentJobId) return;
        
        try {
            await fetch(`/cleanup/${this.currentJobId}`, {
                method: 'POST'
            });
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }

    resetForm() {
        // Reset form
        document.getElementById('convertForm').reset();
        document.getElementById('formatSelect').value = 'mp3';
        document.getElementById('singleMode').checked = true;
        this.switchMode();
        this.updateFormatOptions();
        
        // Hide all status cards
        this.hideAllCards();
        
        // Re-enable form
        this.disableForm(false);
        
        // Clear current job
        if (this.currentJobId) {
            this.cleanupFile();
            this.currentJobId = null;
        }
        
        // Clear polling
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        
        // Focus on URL input
        document.getElementById('urlInput').focus();
    }

    disableForm(disabled) {
        const elements = [
            'urlInput',
            'batchUrlInput',
            'playlistUrlInput',
            'formatSelect', 
            'qualitySelect',
            'bitrateSelect',
            'convertBtn'
        ];
        
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.disabled = disabled;
            }
        });
        
        // Disable mode radio buttons
        const modeRadios = document.querySelectorAll('input[name="conversionMode"]');
        modeRadios.forEach(radio => {
            radio.disabled = disabled;
        });
        
        const convertBtn = document.getElementById('convertBtn');
        if (convertBtn) {
            if (disabled) {
                convertBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Converting...';
            } else {
                convertBtn.innerHTML = '<i class="fas fa-play me-2"></i>Start Conversion';
            }
        }
    }

    isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }
}

// Initialize the converter when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MediaConverter();
});

// Add some utility functions for better UX
document.addEventListener('DOMContentLoaded', () => {
    // Auto-focus on URL input
    document.getElementById('urlInput').focus();
    
    // Add paste event listener to automatically start conversion
    document.getElementById('urlInput').addEventListener('paste', (e) => {
        setTimeout(() => {
            const url = e.target.value.trim();
            if (url && new MediaConverter().isValidUrl(url)) {
                // Optional: Show a toast or highlight that URL is detected
                e.target.classList.add('is-valid');
                setTimeout(() => e.target.classList.remove('is-valid'), 2000);
            }
        }, 100);
    });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+Enter or Cmd+Enter to start conversion
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const convertBtn = document.getElementById('convertBtn');
            if (convertBtn && !convertBtn.disabled) {
                convertBtn.click();
            }
        }
        
        // Escape to reset form
        if (e.key === 'Escape') {
            const newConversionBtn = document.getElementById('newConversionBtn');
            if (newConversionBtn && !newConversionBtn.classList.contains('d-none')) {
                newConversionBtn.click();
            }
        }
    });
});
