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
2. **Text Analysis**: Analyzes text metrics (word count, readability, spam indicators)
3. **Similarity Search**: Compares against cached posts and searches for similar content
4. **Scoring Algorithm**: Calculates originality score based on multiple factors
5. **Results Display**: Shows visual indicators and detailed analysis

### Similarity Detection

The extension uses multiple algorithms to detect similar content:

- **Exact Matching**: Detects identical text copies
- **Jaccard Similarity**: Compares word overlap between posts
- **Text Metrics**: Analyzes writing patterns and characteristics
- **Spam Detection**: Identifies low-quality or promotional content

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
- **Vanilla JavaScript**: No external dependencies
- **Chrome Storage API**: For caching and preferences
- **Mutation Observer**: For detecting dynamic content

### Browser Compatibility
- ✅ Chrome (Recommended)
- ✅ Firefox (with minor modifications)
- ⚠️ Safari (requires additional conversion)
- ⚠️ Edge (Chromium-based versions)

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

Potential improvements for production version:

- **Real Search Integration**: Connect to actual LinkedIn search API
- **Machine Learning**: Advanced content similarity detection
- **Multi-language Support**: Support for non-English content
- **Database Integration**: Cloud-based comparison database
- **Reporting Features**: Generate plagiarism reports
- **Team Collaboration**: Share findings with team members

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