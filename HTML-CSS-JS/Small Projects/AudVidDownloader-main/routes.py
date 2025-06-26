import os
import tempfile
import logging
from flask import render_template, request, jsonify, send_file, flash, redirect, url_for
from app import app
from converter import MediaConverter
import uuid

# Global converter instance
converter = MediaConverter()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/convert', methods=['POST'])
def convert_media():
    try:
        data = request.get_json()
        url = data.get('url', '').strip()
        urls = data.get('urls', [])  # For batch processing
        output_format = data.get('format', 'mp3').lower()
        quality = data.get('quality', 'best')
        bitrate = data.get('bitrate', None)
        
        # Handle single URL or batch URLs
        if url:
            urls_to_process = [url]
        elif urls:
            urls_to_process = [u.strip() for u in urls if u.strip()]
        else:
            return jsonify({'error': 'URL or URLs are required'}), 400
        
        # Validate URLs
        for u in urls_to_process:
            if not converter.validate_url(u):
                return jsonify({'error': f'Invalid or unsupported URL: {u}'}), 400
        
        # Generate unique job ID
        job_id = str(uuid.uuid4())
        
        # Start conversion in background
        result = converter.convert(urls_to_process if len(urls_to_process) > 1 else urls_to_process[0], 
                                 output_format, quality, job_id, bitrate)
        
        if result['success']:
            return jsonify({
                'success': True,
                'job_id': job_id,
                'message': 'Conversion started successfully'
            })
        else:
            return jsonify({'error': result.get('error', 'Unknown error')}), 500
            
    except Exception as e:
        logging.error(f"Conversion error: {str(e)}")
        return jsonify({'error': f'Conversion failed: {str(e)}'}), 500

@app.route('/formats')
def get_formats():
    """Get supported formats and their options"""
    try:
        formats = converter.get_supported_formats()
        return jsonify({'success': True, 'formats': formats})
    except Exception as e:
        logging.error(f"Format retrieval error: {str(e)}")
        return jsonify({'error': 'Failed to get formats'}), 500

@app.route('/download/<job_id>')
def download_file(job_id):
    try:
        file_path = converter.get_output_file(job_id)
        if file_path and os.path.exists(file_path):
            return send_file(file_path, as_attachment=True, download_name=os.path.basename(file_path))
        else:
            return jsonify({'error': 'File not found or expired'}), 404
    except Exception as e:
        logging.error(f"Download error: {str(e)}")
        return jsonify({'error': 'Download failed'}), 500

@app.route('/status/<job_id>')
def get_status(job_id):
    try:
        status = converter.get_status(job_id)
        return jsonify(status)
    except Exception as e:
        logging.error(f"Status error: {str(e)}")
        return jsonify({'error': 'Failed to get status'}), 500

@app.route('/cleanup/<job_id>', methods=['POST'])
def cleanup_file(job_id):
    try:
        converter.cleanup_file(job_id)
        return jsonify({'success': True})
    except Exception as e:
        logging.error(f"Cleanup error: {str(e)}")
        return jsonify({'error': 'Cleanup failed'}), 500
