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

    downloadBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        errorMsg.textContent = '';
        results.style.display = 'none';
        
        // URL validation
        if (!url) {
            errorMsg.textContent = '❌ Please paste an Instagram URL.';
            return;
        }
        if (!url.includes('instagram.com') && !url.includes('instagr.am')) {
            errorMsg.textContent = '❌ Please enter a valid Instagram link.';
            return;
        }

        // Show loader
        loader.style.display = 'flex';
        downloadBtn.disabled = true;
        downloadBtn.style.opacity = '0.7';

        try {
            const data = await fetchInstagramMedia(url);
            renderResults(data, resultsGrid);
            results.style.display = 'block';
            showToast('✅ Download ready! Click the button below.', 'success');
            
            // Scroll to results
            results.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (err) {
            errorMsg.textContent = `❌ ${err.message || 'Download failed. Please try again.'}`;
            showToast('❌ Failed to fetch media. Check the URL.', 'error');
        } finally {
            loader.style.display = 'none';
            downloadBtn.disabled = false;
            downloadBtn.style.opacity = '1';
        }
    });

    // Enter key support
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') downloadBtn.click();
    });
});

function renderResults(data, grid) {
    grid.innerHTML = '';
    
    // Handle the API response structure
    let mediaItems = [];

    // Check different possible response structures
    if (data && data.items) {
        mediaItems = data.items;
    } else if (data && data.media) {
        mediaItems = data.media;
    } else if (data && data.data) {
        mediaItems = Array.isArray(data.data) ? data.data : [data.data];
    } else if (Array.isArray(data)) {
        mediaItems = data;
    } else if (data && (data.video_url || data.download_url || data.url)) {
        mediaItems = [data];
    }

    // Debug log
    console.log('Processed media items:', mediaItems);

    if (mediaItems.length === 0) {
        grid.innerHTML = `
            <div style="text-align:center;padding:2rem;">
                <p style="color:#f87171;">No downloadable media found for this URL.</p>
                <p style="color:#a0a0c0;font-size:0.9rem;">Make sure the link is from a public Instagram account.</p>
            </div>`;
        return;
    }

    mediaItems.forEach((item, index) => {
        // Extract media details
        const mediaType = item.type || item.media_type || 'video';
        const downloadUrl = item.video_url || item.download_url || item.url || item.src || '';
        const thumbnail = item.thumbnail || item.thumb || item.preview || '';
        const quality = item.quality || item.resolution || 'HD';
        const duration = item.duration || '';

        const card = document.createElement('div');
        card.className = 'media-card glass';
        card.style.animation = `fadeInUp 0.4s ${index * 0.1}s both`;

        card.innerHTML = `
            ${thumbnail ? 
                `<img src="${thumbnail}" alt="Preview" class="media-preview" 
                     onerror="this.style.display='none'" loading="lazy">` : 
                `<div class="media-preview" style="display:flex;align-items:center;justify-content:center;background:#1a1a2e;">
                    <span style="font-size:3rem;">📸</span>
                </div>`
            }
            <div style="margin-bottom:0.5rem;">
                <span class="media-type">${mediaType.toUpperCase()}</span>
                ${quality ? `<span style="font-size:0.75rem;color:#a0a0c0;margin-left:0.5rem;">${quality}</span>` : ''}
                ${duration ? `<span style="font-size:0.75rem;color:#a0a0c0;margin-left:0.5rem;">⏱ ${duration}s</span>` : ''}
            </div>
            ${downloadUrl ? 
                `<a href="${downloadUrl}" class="download-link" download target="_blank" rel="noopener noreferrer">
                    ⬇ Download ${mediaType}
                </a>` : 
                `<p style="color:#f87171;">No download link available</p>`
            }
        `;
        grid.appendChild(card);
    });
}

// FAQ Toggle
window.addEventListener('load', () => {
    setTimeout(() => {
        document.querySelectorAll('.faq-question').forEach(btn => {
            btn.addEventListener('click', function() {
                const item = this.closest('.faq-item');
                if (item) {
                    item.classList.toggle('open');
                    this.setAttribute('aria-expanded', item.classList.contains('open'));
                }
            });
        });
    }, 500);
});

// Add animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);
