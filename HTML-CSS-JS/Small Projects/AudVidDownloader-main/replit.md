# Multi-Platform Media Converter

## Overview

A Flask-based web application that converts videos from YouTube, Vimeo, and 1000+ other platforms to various audio and video formats (MP3, MP4, WAV, AAC, WEBM, M4A). The application uses yt-dlp for downloading content and FFmpeg for media conversion, providing a user-friendly web interface for media conversion tasks.

## System Architecture

### Frontend Architecture
- **Technology**: Vanilla JavaScript with Bootstrap 5 (dark theme)
- **UI Components**: Single-page application with responsive design
- **Styling**: Custom CSS with gradient backgrounds and glassmorphism effects
- **User Interface**: Clean, modern interface with real-time conversion progress

### Backend Architecture
- **Framework**: Flask (Python 3.11)
- **Web Server**: Gunicorn for production deployment
- **Media Processing**: yt-dlp for content extraction, FFmpeg for conversion
- **File Handling**: Temporary file system for processing and cleanup

### Data Storage
- **Session Management**: Flask sessions with configurable secret key
- **File Storage**: Temporary file system (no persistent database required)
- **Job Tracking**: In-memory job status tracking with unique job IDs

## Key Components

### Core Application (`app.py`, `main.py`)
- Flask application initialization with security middleware
- Session management and environment configuration
- Development and production server setup

### Media Conversion Engine (`converter.py`)
- **MediaConverter Class**: Handles all conversion operations
- **URL Validation**: Supports 1000+ platforms via yt-dlp
- **Format Support**: Multiple audio/video formats with quality options
- **Job Management**: UUID-based job tracking for async operations

### Web Routes (`routes.py`)
- **Index Route**: Serves the main conversion interface
- **Convert Endpoint**: Handles conversion requests with validation
- **Error Handling**: Comprehensive error responses and logging

### Frontend Interface
- **Templates**: HTML5 with Bootstrap integration
- **JavaScript**: Async conversion handling and progress tracking
- **CSS**: Custom styling with dark theme and modern effects

## Data Flow

1. **User Input**: User pastes URL and selects output format/quality
2. **URL Validation**: Backend validates URL compatibility with yt-dlp
3. **Job Creation**: Unique job ID generated for tracking
4. **Content Extraction**: yt-dlp extracts video/audio metadata
5. **Media Conversion**: FFmpeg processes content to desired format
6. **File Delivery**: Converted file served to user via download
7. **Cleanup**: Temporary files automatically removed

## External Dependencies

### Core Dependencies
- **yt-dlp**: Video/audio extraction from 1000+ platforms
- **FFmpeg**: Media format conversion and processing
- **Flask**: Web framework and HTTP handling
- **Gunicorn**: Production WSGI server

### Supporting Libraries
- **Werkzeug**: WSGI utilities and development server
- **psycopg2-binary**: PostgreSQL adapter (available for future use)
- **email-validator**: Input validation utilities
- **ffmpeg-python**: Python bindings for FFmpeg

### Frontend Dependencies
- **Bootstrap 5**: UI framework with dark theme
- **Font Awesome**: Icon library
- **Vanilla JavaScript**: No framework dependencies for maximum performance

## Deployment Strategy

### Production Environment
- **Platform**: Replit with autoscale deployment
- **Server**: Gunicorn with multiple workers and port reuse
- **Process Management**: Automatic restart and health monitoring
- **Environment**: Nix-based reproducible environment

### Development Setup
- **Hot Reload**: Flask development server with auto-reload
- **Debug Mode**: Comprehensive logging and error reporting
- **Port Configuration**: Configurable port binding (default 5000)

### Infrastructure Requirements
- **System Packages**: FFmpeg, OpenSSL, PostgreSQL (via Nix)
- **Python Runtime**: Python 3.11 with pip/uv package management
- **File System**: Temporary directory access for processing

## Changelog

```
Changelog:
- June 25, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```