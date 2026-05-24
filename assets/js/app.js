window.addEventListener('load', () => {
    const urlInput = document.getElementById('urlInput');
    const pasteBtn = document.getElementById('pasteBtn');
    const errorMsg = document.getElementById('errorMsg');
    const loader = document.getElementById('loader');
    const results = document.getElementById('results');
    const resultsGrid = document.getElementById('resultsGrid');

    // Check if elements exist
    if (!pasteBtn || !urlInput) {
        console.error('❌ Required elements not found! Check HTML IDs.');
        return;
    }

    console.log('✅ All elements loaded successfully');

    let isFetching = false;

    // SVG Icons
    const icons = {
        clipboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
        download: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        newLink: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        video: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
        photo: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
        audio: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>',
        reel: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="3"/></svg>'
    };

    // ==========================================
    // PASTE BUTTON - CLICK HANDLER
    // ==========================================
    pasteBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        console.log('🖱️ Paste button clicked');
        
        if (isFetching) {
            console.log('⚠️ Already fetching, ignoring click');
            return;
        }

        try {
            // Try to read from clipboard
            const text = await navigator.clipboard.readText();
            console.log('📋 Clipboard text:', text);
            
            if (text && text.trim()) {
                // Set the input value
                urlInput.value = text.trim();
                console.log('✅ Link pasted:', text.trim());
                
                // Auto trigger download
                await handleDownload();
            } else {
                console.log('⚠️ Clipboard is empty');
                showToast('Clipboard is empty. Please copy a link first.', 'info');
            }
        } catch (err) {
            console.error('❌ Clipboard read failed:', err);
            // Fallback: focus the input so user can paste manually
            urlInput.focus();
            showToast('Please paste the link manually (Ctrl+V)', 'info');
        }
    });

    // ==========================================
    // MANUAL PASTE (Ctrl+V) - AUTO DETECT
    // ==========================================
    urlInput.addEventListener('paste', function(e) {
        console.log('📋 Manual paste detected');
        // Wait for the value to be pasted
        setTimeout(async () => {
            const url = urlInput.value.trim();
            console.log('📋 Pasted URL:', url);
            if (url && (url.includes('instagram.com') || url.includes('instagr.am'))) {
                await handleDownload();
            }
        }, 200);
    });

    // ==========================================
    // ENTER KEY SUPPORT
    // ==========================================
    urlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            console.log('⌨️ Enter key pressed');
            e.preventDefault();
            const url = urlInput.value.trim();
            if (url) {
                handleDownload();
            }
        }
    });

    // ==========================================
    // MAIN DOWNLOAD FUNCTION
    // ==========================================
    async function handleDownload() {
        const url = urlInput.value.trim();
        console.log('🚀 Starting download for:', url);

        // Validate URL
        if (!url) {
            errorMsg.textContent = '❌ Please enter an Instagram URL.';
            console.log('❌ Empty URL');
            return;
        }

        if (!url.includes('instagram.com') && !url.includes('instagr.am')) {
            errorMsg.textContent = '❌ Please enter a valid Instagram link.';
            console.log('❌ Invalid URL');
            return;
        }

        // Prevent double fetching
        if (isFetching) {
            console.log('⚠️ Already fetching');
            return;
        }

        // Start loading state
        isFetching = true;
        errorMsg.textContent = '';
        results.style.display = 'none';
        resultsGrid.innerHTML = '';
        loader.style.display = 'flex';
        pasteBtn.disabled = true;
        pasteBtn.style.opacity = '0.7';
        urlInput.disabled = true;

        console.log('⏳ Loading state activated');

        try {
            // Call API
            const data = await fetchInstagramMedia(url);
            console.log('📦 API Response received:', data);

            if (!data || data.length === 0) {
                throw new Error('No downloadable media found for this URL.');
            }

            // Render results
            renderResults(data);
            results.style.display = 'block';
            
            // Smooth scroll to results
            setTimeout(() => {
                results.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 200);
            
            // Hide other sections
            document.body.classList.add('results-active');
            
            showToast('✅ Media ready! Click Download to save.', 'success');
            console.log('✅ Download complete');
            
        } catch (err) {
            console.error('❌ Download failed:', err);
            errorMsg.textContent = '❌ ' + (err.message || 'Download failed. Please try again.');
            showToast('❌ ' + err.message, 'error');
        } finally {
            // Reset loading state
            loader.style.display = 'none';
            pasteBtn.disabled = false;
            pasteBtn.style.opacity = '1';
            urlInput.disabled = false;
            isFetching = false;
            console.log('🔄 Loading state reset');
        }
    }

    // ==========================================
    // RENDER RESULTS
    // ==========================================
    function renderResults(mediaItems) {
        resultsGrid.innerHTML = '';

        if (!mediaItems || mediaItems.length === 0) {
            resultsGrid.innerHTML = `
                <div style="text-align:center;padding:3rem;color:var(--text-secondary);">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:1rem;opacity:0.5;">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p>No downloadable media found for this URL.</p>
                </div>`;
            return;
        }

        const validItems = mediaItems.filter(item => item.url);
        
        if (validItems.length === 0) {
            resultsGrid.innerHTML = '<div style="text-align:center;padding:3rem;">No downloadable media found.</div>';
            return;
        }

        validItems.forEach((item, index) => {
            const card = createMediaCard(item, index);
            resultsGrid.appendChild(card);
        });
    }

    // ==========================================
    // CREATE MEDIA CARD
    // ==========================================
    function createMediaCard(item, index) {
        const card = document.createElement('div');
        card.className = 'result-row';
        card.style.animation = `fadeInUp 0.4s ${index * 0.15}s both`;

        const mediaType = item.type || 'video';
        const downloadUrl = item.url;
        const thumbnail = item.thumbnail || downloadUrl;
        const title = item.title || 'Instagram Media';
        const username = item.username || '@instagram';
        const duration = item.duration || '';
        const likes = item.likes || '';
        const views = item.views || '';

        const words = String(title).split(' ');
        const shortTitle = words.slice(0, 8).join(' ') + (words.length > 8 ? '...' : '');
        const typeLabel = getTypeLabel(mediaType);
        const isVideo = mediaType === 'video' || mediaType === 'reel' || mediaType === 'story' || downloadUrl.includes('.mp4');
        const isPhoto = mediaType === 'photo' || downloadUrl.match(/\.(jpg|jpeg|png|webp)/i);

        const mediaIcon = getMediaIcon(mediaType);

        card.innerHTML = `
            <div class="result-preview">
                ${isVideo ? 
                    `<video class="result-video" controls autoplay muted loop playsinline>
                        <source src="${downloadUrl}" type="video/mp4">
                    </video>` :
                    isPhoto ?
                    `<img src="${downloadUrl}" alt="${typeLabel}" class="result-video" style="object-fit:cover;" onerror="this.style.display='none'" loading="lazy">` :
                    `<div class="result-video-placeholder">${mediaIcon}</div>`
                }
                ${duration ? `<span class="result-duration-badge">${duration}s</span>` : ''}
            </div>
            <div class="result-content">
                <div class="result-info-top">
                    <h3 class="result-title" data-full-title="${escapeHtml(title)}" title="Click to copy full title">${shortTitle}</h3>
                    <div class="result-creator">
                        <span class="creator-dot"></span> 
                        <span>${username}</span>
                    </div>
                    <div class="result-meta">
                        <span class="meta-tag">${mediaIcon} ${typeLabel}</span>
                        ${likes ? `<span class="meta-tag">❤️ ${formatNumber(likes)}</span>` : ''}
                        ${views ? `<span class="meta-tag">👁 ${formatNumber(views)}</span>` : ''}
                        ${duration ? `<span class="meta-tag">⏱ ${duration}s</span>` : ''}
                    </div>
                </div>
                <div class="result-actions">
                    <button class="btn-dl-row" data-url="${downloadUrl}" data-filename="${sanitizeFilename(title)}_${username}.${getExtension(downloadUrl, mediaType)}">
                        ${icons.download} Download ${typeLabel}
                    </button>
                    <button class="btn-new-link">
                        ${icons.newLink} New Link
                    </button>
                </div>
            </div>
        `;

        // Attach events after DOM insertion
        setTimeout(() => {
            attachCardEvents(card, downloadUrl, title, username, mediaType);
        }, 50);

        return card;
    }

    // ==========================================
    // ATTACH CARD EVENTS
    // ==========================================
    function attachCardEvents(card, downloadUrl, fullTitle, username, mediaType) {
        // Download button
        const dlBtn = card.querySelector('.btn-dl-row');
        if (dlBtn && downloadUrl) {
            dlBtn.addEventListener('click', async function(e) {
                e.stopPropagation();
                e.preventDefault();
                console.log('⬇️ Download button clicked');
                
                dlBtn.disabled = true;
                const originalHTML = dlBtn.innerHTML;
                dlBtn.innerHTML = '<span class="btn-spinner"></span> Downloading...';
                
                const filename = `${sanitizeFilename(fullTitle)}_${username}.${getExtension(downloadUrl, mediaType)}`;
                
                try {
                    // Try direct download
                    const success = await downloadFile(downloadUrl, filename);
                    if (success) {
                        dlBtn.innerHTML = '✓ Downloaded';
                        showToast('✅ Download complete!', 'success');
                    } else {
                        // Fallback to anchor
                        downloadFileAnchor(downloadUrl, filename);
                        dlBtn.innerHTML = '✓ Downloaded';
                        showToast('✅ Download started!', 'success');
                    }
                } catch (err) {
                    console.error('Download error:', err);
                    downloadFileAnchor(downloadUrl, filename);
                    dlBtn.innerHTML = '✓ Downloaded';
                    showToast('✅ Download started!', 'success');
                }
                
                // Reset button after 2 seconds
                setTimeout(() => {
                    dlBtn.disabled = false;
                    dlBtn.innerHTML = originalHTML;
                }, 2000);
            });
        }

        // New Link button
        const newBtn = card.querySelector('.btn-new-link');
        if (newBtn) {
            newBtn.addEventListener('click', function() {
                console.log('🆕 New Link clicked');
                document.body.classList.remove('results-active');
                results.style.display = 'none';
                resultsGrid.innerHTML = '';
                urlInput.value = '';
                errorMsg.textContent = '';
                urlInput.focus();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        // Title copy
        const titleEl = card.querySelector('.result-title');
        if (titleEl) {
            titleEl.addEventListener('click', async function() {
                try {
                    await navigator.clipboard.writeText(fullTitle);
                    showToast('📋 Title copied to clipboard!', 'success');
                } catch (err) {
                    showToast('Failed to copy title', 'error');
                }
            });
        }
    }

    // ==========================================
    // DOWNLOAD FUNCTIONS
    // ==========================================
    async function downloadFile(url, filename) {
        try {
            const response = await fetch(url, { mode: 'cors' });
            if (!response.ok) return false;
            
            const blob = await response.blob();
            if (blob.size === 0) return false;
            
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
            }, 1000);
            
            return true;
        } catch (error) {
            console.warn('Direct download failed:', error);
            return false;
        }
    }

    function downloadFileAnchor(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.target = '_self';
        a.rel = 'noopener';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 500);
    }

    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================
    function getTypeLabel(type) {
        const labels = {
            'video': 'Video',
            'reel': 'Reel',
            'story': 'Story',
            'photo': 'Photo',
            'profile_picture': 'Profile Pic',
            'audio': 'Audio'
        };
        return labels[type] || 'Media';
    }

    function getExtension(url, type) {
        if (type === 'audio') return 'mp3';
        if (type === 'photo' || type === 'profile_picture') return 'jpg';
        if (url.match(/\.(jpg|jpeg)/i)) return 'jpg';
        if (url.match(/\.png/i)) return 'png';
        if (url.match(/\.webp/i)) return 'webp';
        return 'mp4';
    }

    function getMediaIcon(type) {
        switch(type) {
            case 'video': return icons.video;
            case 'reel': return icons.reel;
            case 'story': return icons.video;
            case 'photo': return icons.photo;
            case 'profile_picture': return icons.photo;
            case 'audio': return icons.audio;
            default: return icons.photo;
        }
    }

    function formatNumber(num) {
        if (!num) return '0';
        num = parseInt(num);
        if (isNaN(num)) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    function sanitizeFilename(name) {
        return String(name).replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '_').substring(0, 50) || 'instagram_media';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text || '');
        return div.innerHTML;
    }

    // ==========================================
    // FAQ TOGGLE
    // ==========================================
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', function() {
            const item = this.closest('.faq-item');
            if (item) {
                item.classList.toggle('open');
                const isOpen = item.classList.contains('open');
                this.setAttribute('aria-expanded', isOpen);
            }
        });
    });

    console.log('✅ App initialized successfully');
});

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    if (!toast || !toastMsg) return;
    
    let icon = '';
    if (type === 'success') {
        icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    } else if (type === 'error') {
        icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    } else if (type === 'info') {
        icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }
    
    toastMsg.innerHTML = icon + ' ' + message;
    toast.className = `toast toast-${type} show`;
    
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(hideToast, 4000);
}

function hideToast() {
    const toast = document.getElementById('toast');
    if (toast) toast.classList.remove('show');
}

// ==========================================
// ANIMATIONS
// ==========================================
const styleEl = document.createElement('style');
styleEl.textContent = `
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin { 
        to { transform: rotate(360deg); } 
    }
    .btn-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
        display: inline-block;
    }
    .result-duration-badge {
        position: absolute;
        bottom: 10px;
        right: 10px;
        background: rgba(0,0,0,0.7);
        color: #fff;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 500;
    }
    .meta-tag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 0.78rem;
        color: var(--text-secondary);
    }
`;
document.head.appendChild(styleEl);
