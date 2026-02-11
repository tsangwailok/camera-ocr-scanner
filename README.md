# Camera OCR Scanner PWA

A Progressive Web App that provides advanced document scanning capabilities with camera control, flash support, and image edge detection for Optical Character Recognition (OCR).

## Features

- 📷 **Camera Control**: Full control over device camera with video preview
- 💡 **Flash Support**: Toggle device flashlight during capture (where supported)
- 🔧 **Perspective Correction**: Drag the 4 corners of captured images to correct distortion
- 🔍 **Edge Detection**: Advanced Canny edge detection algorithm for document boundary detection
- 📝 **OCR Processing**: Extract text from images using Tesseract.js
- 📋 **Text Copy**: Copy extracted text to clipboard with one click
- 🌐 **Progressive Web App**: Works offline, installable, responsive design
- 📱 **Mobile Optimized**: Designed for smartphone and tablet use
- 🔒 **Privacy Focused**: All processing happens locally in the browser

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Camera API**: MediaDevices API (getUserMedia)
- **Perspective Correction**: OpenCV.js for geometric transformations
- **Edge Detection**: Canvas-based Canny edge detection algorithm (pure JavaScript)
- **OCR**: Tesseract.js (JavaScript implementation of Tesseract, with Chinese Simplified and Traditional support)
- **PWA**: Service Workers, Web Manifest, Cache-first strategy
- **Browser Storage**: IndexedDB for caching

## System Requirements

- Modern web browser with support for:
  - Geolocation API
  - MediaDevices API (getUserMedia)
  - Service Workers
  - Canvas API
  - LocalStorage/IndexedDB

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome/Edge | 90+ | ✅ Full support |
| Firefox | 88+ | ✅ Full support |
| Safari | 14.1+ | ✅ Partial (flash may not work) |
| Samsung Internet | 14+ | ✅ Full support |

## Installation

### As a Progressive Web App

1. Open the application in a modern mobile browser
2. Look for the "Install" or "Add to Home Screen" option
3. Follow the browser's prompts to install
4. The app will be added to your home screen and can run offline

### For Local Development

1. Clone the repository or download the files
2. Serve the files over HTTPS (required for camera access):

```bash
# Using Python 3
python -m http.server 8000

# Or using Node.js http-server
npx http-server
```

3. Access at `https://localhost:8000`

**Note**: Camera and flash features require HTTPS in production. For local development, localhost is an exception.

## Usage

### Basic Workflow

1. **Start Camera**: Click "📷 Start Camera" to request camera access
2. **Enable Flash** (optional): Click "💡 Flash Off" to toggle the flashlight
3. **Capture Image**: Click "📸 Capture" to take a photo
4. **Adjust Corners** (optional): Drag the red corner points to align with document edges
5. **Correct Perspective** (optional): Click "🔧 Correct Perspective" to straighten the image
6. **Process Image**:
   - Click "🔍 Detect Edge" to apply edge detection to the image
   - Click "📝 OCR Text" to extract text from the image
7. **View Results**: OCR text appears in the textarea below
8. **Copy Results**: Click "📋 Copy Text" to copy extracted text to clipboard
9. **Reset**: Click "🔄 Reset" to return to camera view

### Keyboard Shortcuts (Future Enhancement)

- `C` - Start/Stop camera
- `Space` - Capture image
- `F` - Toggle flash
- `E` - Edge detection
- `O` - Run OCR
- `R` - Reset

## API Permissions

This app requires the following permissions:

- **Camera**: For video stream and image capture
- **Clipboard**: For copying OCR results

These permissions are requested only when needed and can be revoked in browser settings.

## Edge Detection Algorithm

The app implements a Canny edge detection algorithm with the following steps:

1. **Grayscale Conversion**: Converts RGB image to grayscale
2. **Gaussian Blur**: Reduces noise with Gaussian filter (kernel 3x3)
3. **Sobel Operator**: Calculates image gradients
4. **Non-maximum Suppression**: Thins edges (implemented implicitly)
5. **Double Thresholding**: Classifies edges as strong, weak, or non-edges

## OCR Processing

- Uses **Tesseract.js** for text recognition
- Supports Chinese Simplified and Traditional (default)
- All processing happens client-side (no data sent to servers)
- Results can be edited before copying

## Offline Functionality

The app uses a **cache-first** service worker strategy:

1. All static assets are cached on first visit
2. If offline, cached versions are served
3. Network requests are attempted; failures fall back to cache
4. New content is cached in the background

## Performance Optimization

- **Canvas Optimization**: Images processed at native device resolution
- **Caching Strategy**: Service worker caches essential files
- **Image Compression**: Captured images use JPEG compression
- **Async Processing**: Long operations don't block UI

## Privacy & Security

- ✅ No server uploads - all processing local
- ✅ No tracking or analytics
- ✅ No third-party data collection
- ✅ HTTPS enforced in production
- ✅ Permissions requested only when needed

## Troubleshooting

### Camera Won't Start
- Ensure HTTPS is used (except localhost)
- Check browser camera permissions
- Try a different browser
- Ensure camera is not in use by another app

### Flash Not Working
- Device or browser may not support torch API
- Some Android browsers don't support this feature
- Check browser camera permissions

### OCR Not Extracting Text
- Ensure image quality is good
- Document text should be clear and readable
- Try adjusting lighting or distance
- Try edge detection first to improve results

### App Not Working Offline
- Ensure service worker was installed successfully
- Check browser's offline support settings
- Clear cache and reload if issues persist

## Future Enhancements

- [ ] Multi-language OCR support
- [ ] Batch processing of multiple images
- [ ] Cloud storage integration
- [ ] Document skew correction
- [ ] Brightness/contrast adjustment
- [ ] Export as PDF
- [ ] History of scans
- [ ] Handwriting recognition
- [ ] Barcode/QR code detection

## File Structure

```
camera-ocr-scanner/
├── index.html                 # Main HTML file
├── manifest.json             # PWA manifest
├── README.md                 # This file
├── css/
│   └── style.css            # Styles and responsive design
├── js/
│   ├── app.js               # Main application logic
│   └── service-worker.js    # Service worker for offline support
└── images/
    └── icons/               # App icons
```

## License

MIT License - Feel free to use for personal or commercial projects.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## Support

For issues, questions, or suggestions, please refer to:
- Browser developer console for technical errors
- Check system requirements
- Verify HTTPS usage in production
- Review privacy settings

## Disclaimer

This app processes images locally in your browser. While all processing is private, ensure you have proper rights to process any documents or images using OCR.

## Changelog

### Version 1.0 (Initial Release)
- Camera control with preview
- Flash toggle support
- Canny edge detection algorithm
- Tesseract.js OCR integration
- Service worker with offline support
- PWA installation support
- Responsive mobile design
