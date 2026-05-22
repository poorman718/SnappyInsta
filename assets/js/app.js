window.addEventListener('load', () => {
    const urlInput = document.getElementById('urlInput');
    const downloadBtn = document.getElementById('downloadBtn');
    const errorMsg = document.getElementById('errorMsg');
    const loader = document.getElementById('loader');
    const results = document.getElementById('results');
    const resultsGrid = document.getElementById('resultsGrid');

    if (!downloadBtn || !urlInput) {
        console.error('Required elements not found');
        return;
    }

    downloadBtn.addEventListener('click', handleDownload);
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleDownload();
    });

    async function handleDownload() {
        const url = urlInput.value.trim();
        errorMsg.textContent = '';
        results.style.display = 'none';

        if (!url) {
            errorMsg.textContent = '❌ Please paste an Instagram URL.';
            return;
        }
        if (!url.includes('instagram.com') && !url.includes('instagr.am')) {
            errorMsg.textContent = '❌ Please enter a valid Instagram link.';
            return;
        }

        loader.style.display = 'flex';
        downloadBtn.disabled = true;
        downloadBtn.style.opacity = '0.7';

        try {
            const data = await fetchInstagramMedia(url);
            console.log('API Response:', data);
            renderResults(data);
            results.style.display = 'block';
            showToast('✅ Media ready!', 'success');
            results.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Hide all other content
            document.body.classList.add('results-active');
        } catch (err) {
            errorMsg.textContent = `❌ ${err.message || 'Download failed. Please try again.'}`;
            showToast('❌ Failed to fetch media.', 'error');
        } finally {
            loader.style.display = 'none';
            downloadBtn.disabled = false;
            downloadBtn.style.opacity = '1';
        }
    }

    function renderResults(data) {
        resultsGrid.innerHTML = '';
        let mediaItems = [];

        if (data && data.items) mediaItems = data.items;
        else if (data && data.media) mediaItems = data.media;
        else if (data && data.data) mediaItems = Array.isArray(data.data) ? data.data : [data.data];
        else if (Array.isArray(data)) mediaItems = data;
        else if (data && (data.video_url || data.download_url || data.url)) mediaItems = [data];

        if (mediaItems.length === 0) {
            resultsGrid.innerHTML = `<div style="text-align:center;padding:2rem;color:#f87171;">No downloadable media found.</div>`;
            return;
        }

        mediaItems.forEach((item, index) => {
            const card = createHorizontalCard(item, index);
            resultsGrid.appendChild(card);
        });
    }

    function createHorizontalCard(item, index) {
        const card = document.createElement('div');
        card.className = 'result-row glass';
        card.style.animation = `fadeInUp 0.4s ${index * 0.1}s both`;

        const mediaType = item.type || item.media_type || 'video';
        const videoUrl = item.video_url || item.download_url || item.url || '';
        const thumbnail = item.thumbnail || item.thumb || item.preview || '';
        const title = item.title || item.caption || item.description || 'Instagram Media';
        const username = item.username || item.owner || item.author || item.uploader || '@instagram';
        const duration = item.duration || '';
        const quality = item.quality || item.resolution || 'HD';

        // Truncate title to 3-5 words with "..."
        const words = title.split(' ');
        const shortTitle = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');

        card.innerHTML = `
            <div class="result-preview">
                ${thumbnail ? 
                    `<img src="${thumbnail}" alt="preview" class="result-thumb" onerror="this.style.display='none'" loading="lazy">` :
                    `<div class="result-thumb-placeholder">📸</div>`
                }
                ${duration ? `<span class="result-duration">${duration}s</span>` : ''}
            </div>
            <div class="result-info">
                <h3 class="result-title" data-full-title="${escapeHtml(title)}" title="Click to copy title">${shortTitle}</h3>
                <div class="result-creator">
                    <span class="creator-dot"></span> ${username}
                </div>
            </div>
            <div class="result-actions">
                <button class="btn-dl-row" data-url="${videoUrl}" data-filename="${sanitizeFilename(title)}_${username}.mp4">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download
                </button>
                <button class="btn-new-link">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    New Link
                </button>
            </div>
        `;

        // Attach events
        setTimeout(() => {
            attachRowEvents(card, videoUrl, title, username);
        }, 0);

        return card;
    }

    function attachRowEvents(card, videoUrl, fullTitle, username) {
        // Download button
        const dlBtn = card.querySelector('.btn-dl-row');
        if (dlBtn && videoUrl) {
            dlBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                dlBtn.disabled = true;
                dlBtn.innerHTML = `<span class="btn-spinner"></span> Downloading`;
                try {
                    await downloadFile(videoUrl, `${sanitizeFilename(fullTitle)}_${username}.mp4`);
                    dlBtn.innerHTML = `✓ Downloaded`;
                    showToast('✅ Download complete!', 'success');
                } catch (err) {
                    dlBtn.innerHTML = `Retry`;
                    dlBtn.disabled = false;
                    showToast('❌ Download failed', 'error');
                }
            });
        }

        // New Link button
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

        // Title copy
        const titleEl = card.querySelector('.result-title');
        if (titleEl) {
            titleEl.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(fullTitle);
                    showToast('📋 Title copied!', 'success');
                } catch {
                    showToast('Copy failed', 'error');
                }
            });
        }
    }

    async function downloadFile(url, filename) {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network error');
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    }

    function sanitizeFilename(name) {
        return name.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    }

    function escapeHtml(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

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

// Add styles dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .btn-spinner {
        width: 14px; height: 14px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
        display: inline-block;
    }
`;
document.head.appendChild(style);
