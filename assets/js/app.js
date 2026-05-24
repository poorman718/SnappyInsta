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
    const likes = item.likes || '';
    const views = item.views || '';
    const comments = item.comments || '';
    
    const words = title.split(' ');
    const shortTitle = words.slice(0, 8).join(' ') + (words.length > 8 ? '...' : '');
    const typeLabel = getTypeLabel(mediaType);
    const isVideo = downloadUrl.includes('.mp4') || mediaType === 'video' || mediaType === 'reel' || mediaType === 'story';
    const isPhoto = mediaType === 'photo' || downloadUrl.includes('.jpg') || downloadUrl.includes('.jpeg') || downloadUrl.includes('.png');

    card.innerHTML = `
        <div class="result-preview">
            ${isVideo ? 
                `<video class="result-video" controls autoplay muted loop playsinline>
                    <source src="${downloadUrl}" type="video/mp4">
                </video>` :
                isPhoto ?
                `<img src="${downloadUrl}" alt="${typeLabel}" class="result-video" style="object-fit:cover;" onerror="this.style.display='none'">` :
                thumbnail && thumbnail.startsWith('http') ?
                `<img src="${thumbnail}" alt="${typeLabel}" class="result-video" style="object-fit:cover;" onerror="this.style.display='none'">` :
                `<div class="result-video-placeholder">${getMediaIcon(mediaType)}</div>`
            }
            ${duration ? `<span style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,0.6);color:#fff;padding:2px 8px;border-radius:6px;font-size:0.75rem;">${duration}s</span>` : ''}
        </div>
        <div class="result-content">
            <div>
                <h3 class="result-title" data-full-title="${escapeHtml(title)}" title="Click to copy title">${shortTitle}</h3>
                <div class="result-creator">
                    <span class="creator-dot"></span> 
                    <span>${username}</span>
                </div>
                <div class="result-meta">
                    <span>${getMediaIcon(mediaType)} ${typeLabel}</span>
                    ${quality ? `<span>📐 ${quality}</span>` : ''}
                    ${duration ? `<span>⏱ ${duration}s</span>` : ''}
                    ${likes ? `<span>❤️ ${formatNumber(likes)}</span>` : ''}
                    ${views ? `<span>👁 ${formatNumber(views)}</span>` : ''}
                    ${comments ? `<span>💬 ${formatNumber(comments)}</span>` : ''}
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

    setTimeout(() => attachRowEvents(card, downloadUrl, title, username, mediaType), 0);
    return card;
}

// Add this helper function at the bottom of app.js
function formatNumber(num) {
    if (!num) return '0';
    num = parseInt(num);
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}
