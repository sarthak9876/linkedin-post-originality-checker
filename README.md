# LinkedIn Originality Checker Browser Extension

A browser extension that helps detect duplicate and copied content on LinkedIn posts. This tool analyzes posts for originality and identifies potential plagiarism or content theft.

## 🚀 Features

- **Automatic Post Detection**: Scans LinkedIn posts as you browse
- **Originality Scoring**: Provides percentage-based originality scores
- **Duplicate Detection**: Identifies similar or copied content
- **Visual Indicators**: Color-coded buttons showing originality status
- **Detailed Analysis**: Shows similar posts with similarity percentages
- **Export Functionality**: Export analysis data for reporting
- **Privacy Focused**: All analysis happens locally in your browser

## 📦 Installation

### Chrome Extension (Developer Mode)

1. **Download the Extension Files**
   - Save all the provided files in a folder named `linkedin-originality-checker`
   - Create an `icons` folder and add icon files (16x16, 48x48, 128x128 pixels)

2. **Enable Developer Mode**
   - Open Chrome and go to `chrome://extensions/`
   - Toggle "Developer mode" in the top right corner

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the `linkedin-originality-checker` folder
   - The extension should now appear in your extensions list

4. **Pin the Extension**
   - Click the puzzle piece icon in your browser toolbar
   - Pin the "LinkedIn Originality Checker" extension

### Firefox Extension

1. **Prepare for Firefox**
   - Change `manifest_version` to `2` in `manifest.json`
   - Update permissions format for Firefox compatibility

2. **Load in Firefox**
   - Go to `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select any file from the extension folder

## 🔧 File Structure

Your extension folder should contain:

```
linkedin-originality-checker/
├── manifest.json          # Extension configuration
├── content.js            # Main functionality script
├── background.js         # Background processing
├── popup.html           # Extension popup interface
├── styles.css           # Styling for UI elements
├── README.md            # This file
└── icons/               # Extension icons
    ├── icon16.png       # 16x16 pixel icon
    ├── icon48.png       # 48x48 pixel icon
    └── icon128.png      # 128x128 pixel icon
```

## 📋 Usage

### Basic Usage

1. **Navigate to LinkedIn**
   - Open LinkedIn in your browser
   - Browse posts in your feed or visit specific post URLs

2. **Check Post Originality**
   - Look for the "Check Originality" button on posts
   - Click the button to analyze the post
   - View the originality score and any similar posts found

3. **Interpret Results**
   - 🟢 **Green (90-100%)**: Likely original content
   - 🟡 **Yellow (70-89%)**: Some similar content found
   - 🔴 **Red (0-69%)**: Potential copy or heavily borrowed content

### Advanced Features

#### Extension Popup
- Click the extension icon to access advanced controls
- View daily statistics (posts checked, duplicates found)
- Enable/disable the extension
- Scan entire page manually
- Clear cache and export data

#### Batch Analysis
- Use "Scan Current Page" to analyze all visible posts at once
- Scroll through your feed to build a larger comparison database
- Export results for further analysis or reporting

## ⚙️ How It Works

### Detection Process

1. **Content Extraction**: Automatically detects and extracts text from LinkedIn posts
2. **Text Analysis**: Advanced metrics analysis including readability, spam indicators, and content quality
3. **Multi-Source Search**: 
   - Real-time LinkedIn post search
   - Web content comparison via DuckDuckGo API
   - Historical post analysis
4. **Advanced Similarity Analysis**: Multiple algorithms working in parallel
5. **Comprehensive Scoring**: Multi-factor originality assessment
6. **Detailed Results**: Visual indicators and in-depth analysis

### Similarity Detection

The extension uses sophisticated algorithms for content comparison:

- **Multi-Level Text Analysis**:
  - Exact sentence matching
  - Phrase-level comparison (3-5 word sequences)
  - Partial sentence similarity (80% threshold)
  - Word frequency patterns
  - Structural similarity assessment

- **Smart Content Quality Checks**:
  - Excessive emoji detection
  - Hashtag spam analysis
  - ALL CAPS abuse detection
  - Word diversity measurement
  - Text length optimization
  - Readability scoring

- **Advanced Scoring System**:
  - Base score: 100 points
  - Deductions for:
    - Exact sentence matches (-30 per match)
    - Phrase similarities (-20 per match)
    - Overall similarity penalties
    - Quality indicator violations
    - Multiple match compounding

## 🛡️ Privacy & Security

- **Local Processing**: All analysis happens in your browser
- **No Data Collection**: No personal data is sent to external servers
- **Secure Storage**: Uses browser's secure storage APIs
- **No Tracking**: Extension doesn't track your browsing behavior

## ⚠️ Limitations

- **LinkedIn Only**: Currently works only on LinkedIn
- **Demo Mode**: Uses simulated data for similarity detection
- **Rate Limiting**: Respects LinkedIn's usage policies
- **Language**: Optimized for English content

## 🔍 Technical Details

### Technologies Used
- **Manifest V3**: Modern Chrome extension format
- **AI-Enhanced Development**: Utilized GitHub Copilot for advanced algorithms
- **Advanced APIs**: 
  - Chrome Tabs API for LinkedIn search
  - DuckDuckGo API for web content
  - Chrome Storage API for efficient caching
- **Real-time Processing**:
  - Mutation Observer for content detection
  - Parallel search processing
  - Sophisticated caching system

### Implementation Highlights
- **Smart Search System**:
  - Multi-threaded search across platforms
  - Intelligent phrase extraction
  - Real-time content scraping
  - Privacy-focused web search

- **Enhanced Similarity Detection**:
  - Multiple similarity metrics
  - Content fingerprinting
  - Structural analysis
  - Pattern recognition
  - Frequency analysis

- **Error Handling**:
  - Comprehensive error tracking
  - Graceful fallbacks
  - Timeout management
  - Rate limiting protection

### Browser Compatibility
- ✅ Chrome (Fully supported)
- ✅ Firefox (with manifest adjustments)
- ⚠️ Safari (requires conversion)
- ✅ Edge (Chromium version)

### AI Integration
This project leverages artificial intelligence through GitHub Copilot to implement:
- Sophisticated similarity algorithms
- Advanced error handling
- Intelligent search strategies
- Performance optimizations

## 🚨 Troubleshooting

### Common Issues

**Extension Not Working**
- Ensure you're on linkedin.com
- Check if the extension is enabled
- Refresh the LinkedIn page
- Check browser console for errors

**No Posts Detected**
- Wait for page to fully load
- Try scrolling to load more posts
- Use "Scan Current Page" manually
- Check if LinkedIn updated their page structure

**Popup Not Opening**
- Right-click extension icon and select options
- Disable and re-enable the extension
- Check for browser updates

### Performance Tips

- **Clear Cache Regularly**: Use the "Clear Cache" button in popup
- **Limit Batch Scanning**: Don't scan too many posts at once
- **Monitor Memory**: Close unused tabs to free memory
- **Update Regularly**: Keep the extension updated

## 📈 Future Enhancements

Current implementation includes real-time search and advanced similarity detection. Future improvements could include:

- **Enhanced AI Integration**:
  - Machine learning for pattern recognition
  - Neural network-based text analysis
  - Automated threshold optimization
  - Context-aware similarity detection

- **Extended Capabilities**:
  - Image content analysis
  - Multi-language support
  - Audio/video content checking
  - Real-time trend analysis

- **Platform Enhancements**:
  - Custom similarity thresholds
  - User-defined quality metrics
  - Advanced reporting features
  - Team collaboration tools
  - API integration options

- **Performance Optimizations**:
  - Distributed processing
  - Enhanced caching strategies
  - Reduced memory footprint
  - Faster search algorithms

- **Analytics Features**:
  - Content trend analysis
  - Plagiarism pattern detection
  - User behavior insights
  - Performance metrics tracking

## 🔗 Development

### Customization

To modify the extension:

1. **Edit Content Detection**: Modify selectors in `content.js`
2. **Change Scoring Algorithm**: Update logic in `background.js`
3. **Customize UI**: Modify styles in `styles.css`
4. **Add Features**: Extend popup functionality in `popup.html`

### Testing

- Test on different LinkedIn page types (feed, posts, profiles)
- Verify compatibility with LinkedIn updates
- Check performance with large numbers of posts
- Test privacy and security measures

## 📄 License

This extension is created for educational purposes. Please respect:
- LinkedIn's Terms of Service
- Copyright and fair use laws
- Privacy and data protection regulations
- Rate limiting and API usage policies

## 🤝 Contributing

This is a demonstration project. For a production version:
- Implement proper error handling
- Add comprehensive testing
- Integrate with real APIs
- Enhance security measures
- Add user feedback systems

---

**Disclaimer**: This extension is for educational and research purposes only. Always respect platform terms of service and copyright laws when using automated tools.