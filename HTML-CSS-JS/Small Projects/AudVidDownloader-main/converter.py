import os
import subprocess
import tempfile
import logging
import re
import json
import threading
import time
from urllib.parse import urlparse
import yt_dlp

class MediaConverter:
    def __init__(self):
        self.temp_dir = tempfile.gettempdir()
        self.jobs = {}  # Store job information
        self.supported_formats = {
            'mp3': {'type': 'audio', 'codec': 'mp3', 'bitrates': ['128k', '192k', '256k', '320k']},
            'mp4': {'type': 'video', 'codec': 'mp4', 'qualities': ['360p', '480p', '720p', '1080p']},
            'wav': {'type': 'audio', 'codec': 'wav', 'bitrates': ['16bit', '24bit']},
            'aac': {'type': 'audio', 'codec': 'aac', 'bitrates': ['96k', '128k', '192k', '256k']},
            'webm': {'type': 'video', 'codec': 'webm', 'qualities': ['360p', '480p', '720p', '1080p']},
            'm4a': {'type': 'audio', 'codec': 'm4a', 'bitrates': ['128k', '192k', '256k']},
            'flac': {'type': 'audio', 'codec': 'flac', 'bitrates': ['lossless']},
            'mkv': {'type': 'video', 'codec': 'mkv', 'qualities': ['480p', '720p', '1080p', '4k']}
        }
        
    def validate_url(self, url):
        """Validate if URL is supported by yt-dlp"""
        try:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                return False
            
            # Use yt-dlp to check if URL is supported
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': True
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                return info is not None
                
        except Exception as e:
            logging.error(f"URL validation error: {str(e)}")
            return False
    
    def get_video_info(self, url):
        """Extract video information without downloading"""
        try:
            ydl_opts = {
                'quiet': True,
                'no_warnings': True
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                return {
                    'title': info.get('title', 'Unknown'),
                    'duration': self._format_duration(info.get('duration')),
                    'uploader': info.get('uploader', 'Unknown'),
                    'thumbnail': info.get('thumbnail'),
                    'description': info.get('description', '')
                }
        except Exception as e:
            logging.error(f"Info extraction error: {str(e)}")
            return None
    
    def convert(self, url, output_format, quality, job_id, bitrate=None):
        """Convert media from URL to specified format"""
        # Initialize job status
        self.jobs[job_id] = {
            'status': 'starting',
            'progress': 0,
            'error': None,
            'output_file': None,
            'urls': [url] if isinstance(url, str) else url,
            'current_url_index': 0,
            'total_urls': 1 if isinstance(url, str) else len(url),
            'playlist_info': None
        }
        
        # Start conversion in background thread to avoid timeout
        thread = threading.Thread(target=self._convert_async, args=(url, output_format, quality, job_id, bitrate))
        thread.daemon = True
        thread.start()
        
        return {'success': True, 'job_id': job_id, 'status': 'started'}
    
    def _convert_async(self, url, output_format, quality, job_id, bitrate=None):
        """Async conversion process"""
        try:
            
            # Handle playlist vs single URL
            urls_to_process = [url] if isinstance(url, str) else url
            
            # Check if it's a playlist
            if isinstance(url, str) and self._is_playlist(url):
                playlist_info = self._extract_playlist_info(url)
                if playlist_info:
                    urls_to_process = playlist_info['entries']
                    self.jobs[job_id]['playlist_info'] = playlist_info
                    self.jobs[job_id]['total_urls'] = len(urls_to_process)
            
            # Validate format
            if output_format not in self.supported_formats:
                error_msg = f"Unsupported format: {output_format}"
                self.jobs[job_id]['status'] = 'error'
                self.jobs[job_id]['error'] = error_msg
                return
            
            format_info = self.supported_formats[output_format]
            processed_files = []
            
            # Process each URL
            for i, current_url in enumerate(urls_to_process):
                try:
                    self.jobs[job_id]['current_url_index'] = i
                    self.jobs[job_id]['status'] = f'processing_{i+1}_of_{len(urls_to_process)}'
                    
                    # Create temporary filename
                    temp_filename = f"{job_id}_temp_{i}"
                    output_filename = f"{job_id}_output_{i}.{output_format}"
                    temp_path = os.path.join(self.temp_dir, temp_filename)
                    output_path = os.path.join(self.temp_dir, output_filename)
                    
                    # Update progress
                    base_progress = (i / len(urls_to_process)) * 80
                    self.jobs[job_id]['progress'] = base_progress + 10
                    
                    # Download video/audio using yt-dlp
                    ydl_opts = {
                        'outtmpl': temp_path + '.%(ext)s',
                        'quiet': True,
                        'no_warnings': True
                    }
                    
                    # Set quality and format options
                    if format_info['type'] == 'audio':
                        ydl_opts['format'] = 'bestaudio/best'
                        if bitrate:
                            ydl_opts['postprocessors'] = [{
                                'key': 'FFmpegAudioConverter',
                                'preferredcodec': output_format,
                                'preferredquality': bitrate.replace('k', ''),
                            }]
                    else:
                        if quality == 'best':
                            ydl_opts['format'] = 'best'
                        elif quality == 'worst':
                            ydl_opts['format'] = 'worst'
                        else:
                            quality_num = quality.replace('p', '')
                            ydl_opts['format'] = f'best[height<={quality_num}]'
                    
                    # Download the media
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        info = ydl.extract_info(current_url, download=True)
                        
                        # Find the downloaded file
                        downloaded_files = []
                        for file in os.listdir(self.temp_dir):
                            if file.startswith(f"{job_id}_temp_{i}"):
                                downloaded_files.append(os.path.join(self.temp_dir, file))
                        
                        if not downloaded_files:
                            raise Exception(f"Download failed for URL {i+1}")
                        
                        input_file = downloaded_files[0]
                        
                        # Update progress
                        self.jobs[job_id]['progress'] = base_progress + 30
                        
                        # Convert using FFmpeg if needed
                        if self._needs_conversion(input_file, output_format):
                            self._convert_with_ffmpeg(input_file, output_path, output_format, bitrate)
                        else:
                            # Just rename/copy the file
                            os.rename(input_file, output_path)
                        
                        # Clean up temporary files
                        for temp_file in downloaded_files:
                            if os.path.exists(temp_file) and temp_file != output_path:
                                os.remove(temp_file)
                        
                        processed_files.append({
                            'path': output_path,
                            'title': info.get('title', f'Unknown_{i+1}'),
                            'duration': self._format_duration(info.get('duration'))
                        })
                        
                except Exception as e:
                    logging.error(f"Error processing URL {i+1}: {str(e)}")
                    continue
            
            if not processed_files:
                raise Exception("No files were successfully processed")
            
            # If multiple files, create a zip
            if len(processed_files) > 1:
                zip_path = self._create_zip_archive(processed_files, job_id)
                self.jobs[job_id]['output_file'] = zip_path
                self.jobs[job_id]['file_type'] = 'archive'
            else:
                self.jobs[job_id]['output_file'] = processed_files[0]['path']
                self.jobs[job_id]['file_type'] = 'single'
            
            # Update final status
            self.jobs[job_id]['status'] = 'completed'
            self.jobs[job_id]['progress'] = 100
            self.jobs[job_id]['processed_count'] = len(processed_files)
            self.jobs[job_id]['title'] = processed_files[0]['title'] if len(processed_files) == 1 else f"{len(processed_files)} files"
                
        except Exception as e:
            error_msg = f"Conversion failed: {str(e)}"
            logging.error(error_msg)
            self.jobs[job_id]['status'] = 'error'
            self.jobs[job_id]['error'] = error_msg
    
    def _needs_conversion(self, input_file, target_format):
        """Check if file needs format conversion"""
        file_ext = os.path.splitext(input_file)[1].lower().lstrip('.')
        return file_ext != target_format
    
    def _convert_with_ffmpeg(self, input_file, output_file, output_format, bitrate=None):
        """Convert file using FFmpeg"""
        try:
            cmd = ['ffmpeg', '-i', input_file, '-y']  # -y to overwrite output file
            
            if output_format == 'mp3':
                cmd.extend(['-acodec', 'libmp3lame'])
                if bitrate:
                    cmd.extend(['-ab', bitrate])
                else:
                    cmd.extend(['-ab', '192k'])
            elif output_format == 'wav':
                if bitrate == '24bit':
                    cmd.extend(['-acodec', 'pcm_s24le'])
                else:
                    cmd.extend(['-acodec', 'pcm_s16le'])
            elif output_format == 'aac':
                cmd.extend(['-acodec', 'aac'])
                if bitrate:
                    cmd.extend(['-ab', bitrate])
                else:
                    cmd.extend(['-ab', '128k'])
            elif output_format == 'm4a':
                cmd.extend(['-acodec', 'aac'])
                if bitrate:
                    cmd.extend(['-ab', bitrate])
                else:
                    cmd.extend(['-ab', '128k'])
            elif output_format == 'flac':
                cmd.extend(['-acodec', 'flac'])
            elif output_format == 'mp4':
                cmd.extend(['-vcodec', 'libx264', '-acodec', 'aac'])
                cmd.extend(['-preset', 'medium', '-crf', '23'])
            elif output_format == 'webm':
                cmd.extend(['-vcodec', 'libvpx-vp9', '-acodec', 'libopus'])
            elif output_format == 'mkv':
                cmd.extend(['-vcodec', 'libx264', '-acodec', 'aac'])
            
            cmd.append(output_file)
            
            # Run FFmpeg with longer timeout for batch processing
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            
            if result.returncode != 0:
                raise Exception(f"FFmpeg error: {result.stderr}")
                
        except subprocess.TimeoutExpired:
            raise Exception("Conversion timeout")
        except Exception as e:
            raise Exception(f"FFmpeg conversion failed: {str(e)}")
    
    def _is_playlist(self, url):
        """Check if URL is a playlist"""
        playlist_indicators = [
            'playlist',
            'list=',
            'album',
            'channel',
            'user/',
            '/playlists/',
            'set/',
            'sets/'
        ]
        return any(indicator in url.lower() for indicator in playlist_indicators)
    
    def _extract_playlist_info(self, url):
        """Extract playlist information"""
        try:
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': True
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                if 'entries' in info:
                    entries = []
                    for entry in info['entries']:
                        if entry and 'url' in entry:
                            entries.append(entry['url'])
                        elif entry and 'id' in entry:
                            # Construct URL for platforms like YouTube
                            if 'youtube' in url:
                                entries.append(f"https://www.youtube.com/watch?v={entry['id']}")
                    
                    return {
                        'title': info.get('title', 'Playlist'),
                        'entries': entries[:50],  # Limit to 50 for performance
                        'total_count': len(entries)
                    }
        except Exception as e:
            logging.error(f"Playlist extraction error: {str(e)}")
        return None
    
    def _create_zip_archive(self, files, job_id):
        """Create zip archive of multiple files"""
        import zipfile
        
        zip_path = os.path.join(self.temp_dir, f"{job_id}_archive.zip")
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for i, file_info in enumerate(files):
                if os.path.exists(file_info['path']):
                    # Use a clean filename
                    clean_title = re.sub(r'[^\w\s-]', '', file_info['title'])
                    ext = os.path.splitext(file_info['path'])[1]
                    archive_name = f"{i+1:03d}_{clean_title[:50]}{ext}"
                    zipf.write(file_info['path'], archive_name)
        
        # Clean up individual files
        for file_info in files:
            if os.path.exists(file_info['path']):
                os.remove(file_info['path'])
        
        return zip_path
    
    def get_supported_formats(self):
        """Get list of supported formats with their options"""
        return self.supported_formats
    
    def get_format_options(self, format_name):
        """Get available options for a specific format"""
        if format_name in self.supported_formats:
            return self.supported_formats[format_name]
        return None
    
    def get_status(self, job_id):
        """Get job status"""
        return self.jobs.get(job_id, {'status': 'not_found', 'error': 'Job not found'})
    
    def get_output_file(self, job_id):
        """Get output file path for job"""
        job = self.jobs.get(job_id)
        if job and job.get('output_file'):
            return job['output_file']
        return None
    
    def cleanup_file(self, job_id):
        """Clean up files for a job"""
        job = self.jobs.get(job_id)
        if job and job.get('output_file'):
            try:
                if os.path.exists(job['output_file']):
                    os.remove(job['output_file'])
                del self.jobs[job_id]
            except Exception as e:
                logging.error(f"Cleanup error: {str(e)}")
    
    def _format_duration(self, duration):
        """Format duration in seconds to HH:MM:SS"""
        if not duration:
            return "Unknown"
        
        hours = int(duration // 3600)
        minutes = int((duration % 3600) // 60)
        seconds = int(duration % 60)
        
        if hours > 0:
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        else:
            return f"{minutes:02d}:{seconds:02d}"
