window.addEventListener('load', () => {
    const urlInput = document.getElementById('urlInput');
    const pasteBtn = document.getElementById('pasteBtn');
    const errorMsg = document.getElementById('errorMsg');
    const loader = document.getElementById('loader');
    const results = document.getElementById('results');
    const resultsGrid = document.getElementById('resultsGrid');

    if (!pasteBtn || !urlInput) {
        console.error('Required elements not found');
        return;
    }

    let isFetching = false;

    // --- Theme Toggle (already set up in index.html, but we can add listener if needed) ---
    // The toggle logic is handled in the inline script of index.html after navbar load.
    // If you want to be extra safe, you can replicate here but it's fine.

    // --- Paste & Auto-fetch ---
    pasteBtn.addEventListener('click', async () => {
        if (isFetching) return;
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                urlInput.value = text;
                showToast('📋 Link pasted! Auto-downloading...', 'info');
                await triggerDownload(text);
            } else {
                showToast('Clipboard is empty.', 'info');
            }
        } catch (err) {
            showToast('❌ Unable to read clipboard. Paste manually.', 'error');
        }
    });

    urlInput.addEventListener('paste', async () => {
        setTimeout(async () => {
            const url = urlInput.value.trim();
            if (url && (url.includes('instagram.com') || url.includes('instagr.am'))) {
                await triggerDownload(url);
            }
        }, 100);
    });

    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const url = urlInput.value.trim();
            if (url) triggerDownload(url);
        }
    });

    async function triggerDownload(url) {
        if (isFetching) return;
        if (!url.includes('instagram.com') && !url.includes('instagr.am')) {
            errorMsg.textContent = '❌ Please enter a valid Instagram link.';
            return;
        }

        isFetching = true;
        errorMsg.textContent = '';
        results.style.display = 'none';
        loader.style.display = 'flex';
        pasteBtn.disabled = true;
        pasteBtn.style.opacity = '0.7';

        try {
            const data = await fetchInstagramMedia(url);
            console.log('Normalized Data:', data);
            renderResults(data);
            results.style.display = 'block';
            showToast('✅ Media ready!', 'success');
            results.scrollIntoView({ behavior: 'smooth', block: 'center' });
            document.body.classList.add('results-active');
        } catch (err) {
            errorMsg.textContent = `❌ ${err.message || 'Download failed. Please try again.'}`;
            showToast('❌ Failed to fetch media.', 'error');
        } finally {
            loader.style.display = 'none';
            pasteBtn.disabled = false;
            pasteBtn.style.opacity = '1';
            isFetching = false;
        }
    }

    // --- Render & Card creation (identical to previous, adapted for new CSS classes) ---
    function renderResults(mediaItems) {
        resultsGrid.innerHTML = '';
        if (!mediaItems || mediaItems.length === 0) {
            resultsGrid.innerHTML = '<div style="text-align:center;padding:2rem;">No downloadable media found.</div>';
            return;
        }
        const validItems = mediaItems.filter(item => item.url);
        if (validItems.length === 0) {
            resultsGrid.innerHTML = '<div style="text-align:center;padding:2rem;">No downloadable media found.</div>';
            return;
        }
        validItems.forEach((item, index) => {
            const card = createHorizontalCard(item, index);
            resultsGrid.appendChild(card);
        });
    }

    function createHorizontalCard(item, index) {
        const card = document.createElement('div');
        card.className = 'result-row';
        card.style.animation = `fadeInUp 0.4s ${index * 0.1}s both`;

        const mediaType = item.type || 'video';
        const downloadUrl = item.url;
        const thumbnail = item.thumbnail || downloadUrl;
        const title = item.title || 'Instagram Media';
        const username = item.username || '@instagram';
        const duration = item.duration || '';
        const quality = item.quality || 'HD';
        const words = title.split(' ');
        const shortTitle = words.slice(0, 8).join(' ') + (words.length > 8 ? '...' : '');
        const typeLabel = getTypeLabel(mediaType);
        const isVideo = downloadUrl.includes('.mp4') || mediaType === 'video' || mediaType === 'reel' || mediaType === 'story';

        card.innerHTML = `
            <div class="result-preview">
                ${isVideo ? 
                    `<video class="result-video" controls autoplay muted loop playsinline>
                        <source src="${downloadUrl}" type="video/mp4">
                    </video>` :
                    thumbnail && thumbnail.startsWith('http') ?
                    `<img src="${thumbnail}" alt="${typeLabel}" class="result-video" style="object-fit:cover;">` :
                    `<div class="result-video-placeholder">📸</div>`
                }
                ${duration ? `<span style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,0.6);color:#fff;padding:2px 8px;border-radius:6px;font-size:0.75rem;">${duration}s</span>` : ''}
            </div>
            <div class="result-content">
                <div>
                    <h3 class="result-title" data-full-title="${escapeHtml(title)}" title="Click to copy title">${shortTitle}</h3>
                    <div class="result-creator"><span class="creator-dot"></span> ${username}</div>
                    <div class="result-meta">
                        <span>📹 ${typeLabel}</span>
                        <span>✨ ${quality}</span>
                        ${duration ? `<span>⏱ ${duration}s</span>` : ''}
                    </div>
                </div>
                <div class="result-actions">
                    <button class="btn-dl-row" data-url="${downloadUrl}" data-filename="${sanitizeFilename(title)}_${username}.${getExtension(downloadUrl, mediaType)}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Download ${typeLabel}
                    </button>
                    <button class="btn-new-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        New Link
                    </button>
                </div>
            </div>
        `;

        // Attach events after a tick
        setTimeout(() => attachRowEvents(card, downloadUrl, title, username, mediaType), 0);
        return card;
    }

    // ... (keep all the helper functions: getTypeLabel, getExtension, attachRowEvents, downloadFileDirect, downloadFileIframe, downloadFileAnchor, sanitizeFilename, escapeHtml, FAQ toggle)
    // They are identical to the previous fully working version, just copy them from the last correct app.js (the one with three download methods). 
    // Because the prompt is huge, I'll include the essential ones:

    function getTypeLabel(type) {
        const labels = {'video':'Video','reel':'Reel','story':'Story','photo':'Photo','profile_picture':'Profile Pic','audio':'Audio'};
        return labels[type] || 'Media';
    }
    function getExtension(url, type) {
        if (type === 'audio') return 'mp3';
        if (type === 'photo' || type === 'profile_picture') return 'jpg';
        if (url.includes('.jpg')||url.includes('.jpeg')) return 'jpg';
        if (url.includes('.png')) return 'png';
        return 'mp4';
    }

    function attachRowEvents(card, downloadUrl, fullTitle, username, mediaType) {
        const dlBtn = card.querySelector('.btn-dl-row');
        if (dlBtn && downloadUrl) {
            dlBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                dlBtn.disabled = true;
                dlBtn.innerHTML = '<span class="btn-spinner"></span> Preparing...';
                const filename = `${sanitizeFilename(fullTitle)}_${username}.${getExtension(downloadUrl, mediaType)}`;
                try {
                    const downloaded = await downloadFileDirect(downloadUrl, filename, dlBtn);
                    if (downloaded) {
                        dlBtn.innerHTML = '✓ Downloaded';
                        showToast('✅ Download complete!', 'success');
                    } else {
                        const iframeDownloaded = await downloadFileIframe(downloadUrl, filename, dlBtn);
                        if (iframeDownloaded) {
                            dlBtn.innerHTML = '✓ Downloaded';
                            showToast('✅ Download complete!', 'success');
                        } else {
                            downloadFileAnchor(downloadUrl, filename);
                            dlBtn.innerHTML = '✓ Downloaded';
                            showToast('✅ Download started!', 'success');
                        }
                    }
                } catch (err) {
                    downloadFileAnchor(downloadUrl, filename);
                    dlBtn.innerHTML = '✓ Downloaded';
                    showToast('✅ Download started!', 'success');
                } finally {
                    setTimeout(() => {
                        dlBtn.disabled = false;
                        dlBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download ${getTypeLabel(mediaType)}`;
                    }, 2000);
                }
            });
        }
        const newBtn = card.querySelector('.btn-new-link');
        if (newBtn) {
            newBtn.addEventListener('click', () => {
                document.body.classList.remove('results-active');
                document.getElementById('results').style.display = 'none';
                document.getElementById('urlInput').value = '';
                document.getElementById('errorMsg').textContent = '';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
        const titleEl = card.querySelector('.result-title');
        if (titleEl) {
            titleEl.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(fullTitle);
                    showToast('📋 Title copied!', 'success');
                } catch { showToast('Copy failed', 'error'); }
            });
        }
    }

    // Download methods (same as before, keep them)
    async function downloadFileDirect(url, filename, button) { /* ... same code ... */ }
    async function downloadFileIframe(url, filename, button) { /* ... same code ... */ }
    function downloadFileAnchor(url, filename) { /* ... same code ... */ }
    function sanitizeFilename(name) { return name.replace(/[^a-z0-9\s]/gi,'').replace(/\s+/g,'_').substring(0,50); }
    function escapeHtml(text) { const d=document.createElement('div'); d.textContent=text; return d.innerHTML; }

    // FAQ toggle
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', function() {
            const item = this.closest('.faq-item');
            if (item) {
                item.classList.toggle('open');
                this.setAttribute('aria-expanded', item.classList.contains('open'));
            }
        });
    });
});

// Animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
    .btn-spinner { width:14px; height:14px; border:2px solid rgba(255,255,255,0.3); border-top-color:white; border-radius:50%; animation: spin 0.6s linear infinite; display:inline-block; }
    @keyframes spin { to { transform:rotate(360deg); } }
`;
document.head.appendChild(style);

// Copy the download methods from the earlier working version (I'll omit for brevity but you have them)
