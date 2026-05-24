(function() {
    'use strict';

    // ========== THEME TOGGLE ==========
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light');
            const isLight = document.body.classList.contains('light');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
        });
        const saved = localStorage.getItem('theme');
        if (saved === 'light') document.body.classList.add('light');
        else document.body.classList.remove('light');
    }

    // ========== DROPDOWN TOGGLE ==========
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdown = document.querySelector('.dropdown');
    if (dropdownToggle && dropdown) {
        dropdownToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });
        // Close dropdown when clicking outside
        document.addEventListener('click', () => dropdown.classList.remove('open'));
    }

    // ========== MODALS (Disclaimer, Policy, Terms) ==========
    const modalOverlay = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    const modalClose = document.getElementById('modalClose');

    const modalData = {
        disclaimer: {
            title: 'Disclaimer',
            text: 'This tool is for educational purposes only. We are not responsible for any misuse. Downloading content without permission may violate Instagram\'s terms of service. Use at your own risk.'
        },
        policy: {
            title: 'Privacy Policy',
            text: 'We do not collect, store, or share any personal data. All downloads are processed via third‑party APIs. No cookies or trackers are used. Your privacy is important to us.'
        },
        terms: {
            title: 'Terms of Service',
            text: 'By using this website, you agree to download only content that you have the right to access. We do not host any files; all media is fetched from Instagram\'s CDN. We are not affiliated with Instagram.'
        }
    };

    function openModal(type) {
        const data = modalData[type];
        if (!data) return;
        modalContent.innerHTML = `<h2>${data.title}</h2><p>${data.text}</p>`;
        modalOverlay.classList.add('active');
    }

    function closeModal() {
        modalOverlay.classList.remove('active');
    }

    if (modalOverlay) {
        modalClose.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });
    }

    // Attach footer button events
    document.querySelectorAll('.footer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalType = btn.getAttribute('data-modal');
            if (modalType) openModal(modalType);
        });
    });

    // ========== APP LOGIC (DOWNLOADER) ==========
    const urlInput = document.getElementById('urlInput');
    const pasteBtn = document.getElementById('pasteBtn');
    const errorMsg = document.getElementById('errorMsg');
    const loader = document.getElementById('loader');
    const results = document.getElementById('results');
    const resultsGrid = document.getElementById('resultsGrid');

    if (!pasteBtn || !urlInput) return;
    let isFetching = false;

    // Paste Button
    pasteBtn.addEventListener('click', async () => {
        if (isFetching) return;
        try {
            const text = await navigator.clipboard.readText();
            if (text && text.trim()) {
                urlInput.value = text.trim();
                await startDownload();
            } else {
                showToast('Clipboard is empty', 'info');
            }
        } catch {
            urlInput.focus();
            showToast('Paste manually (Ctrl+V)', 'info');
        }
    });

    // Manual Paste
    urlInput.addEventListener('paste', () => {
        setTimeout(async () => {
            const url = urlInput.value.trim();
            if (url && (url.includes('instagram.com') || url.includes('instagr.am'))) {
                await startDownload();
            }
        }, 200);
    });

    // Enter key
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); startDownload(); }
    });

    async function startDownload() {
        const url = urlInput.value.trim();
        if (!url) { errorMsg.textContent = 'Please enter a URL'; return; }
        if (!url.includes('instagram.com') && !url.includes('instagr.am')) {
            errorMsg.textContent = 'Invalid Instagram URL'; return;
        }
        if (isFetching) return;

        isFetching = true;
        errorMsg.textContent = '';
        results.style.display = 'none';
        loader.style.display = 'flex';
        pasteBtn.disabled = true;
        urlInput.disabled = true;

        try {
            const data = await fetchInstagramMedia(url);
            const videos = data.filter(item => item.type === 'video' || (item.url && item.url.includes('.mp4')));
            if (videos.length === 0) throw new Error('No video found. This tool only downloads videos.');
            renderResults(videos);
            results.style.display = 'block';
            document.body.classList.add('results-active');
            showToast(`${videos.length} video(s) ready!`, 'success');
            setTimeout(() => results.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (err) {
            errorMsg.textContent = err.message;
            showToast(err.message, 'error');
        } finally {
            loader.style.display = 'none';
            pasteBtn.disabled = false;
            urlInput.disabled = false;
            isFetching = false;
        }
    }

    function renderResults(videos) {
        resultsGrid.innerHTML = '';
        videos.forEach((item, i) => {
            const card = document.createElement('div');
            card.className = 'result-row';
            card.style.animation = `fadeIn 0.3s ${i * 0.1}s both`;
            const title = item.title || 'Instagram Video';
            const shortTitle = title.split(' ').slice(0, 6).join(' ') + (title.split(' ').length > 6 ? '...' : '');
            const safeFilename = `${sanitize(title)}_${item.username || 'instagram'}.mp4`;

            card.innerHTML = `
                <div class="result-preview">
                    <video class="result-video" controls muted loop playsinline src="${item.url}"></video>
                    ${item.duration ? `<span class="result-duration-badge">${item.duration}s</span>` : ''}
                </div>
                <div class="result-content">
                    <div>
                        <h3 class="result-title" title="Click to copy full title">${shortTitle}</h3>
                        <div class="result-creator"><span class="creator-dot"></span>${item.username || '@instagram'}</div>
                        <div class="result-meta">
                            <span class="meta-tag">🎥 Video</span>
                            ${item.likes ? `<span class="meta-tag">❤️ ${formatNum(item.likes)}</span>` : ''}
                            ${item.views ? `<span class="meta-tag">👁 ${formatNum(item.views)}</span>` : ''}
                        </div>
                    </div>
                    <div class="result-actions">
                        <button class="btn-dl-row" data-url="${item.url}" data-filename="${safeFilename}">⬇ Download Video</button>
                        <button class="btn-new-link">+ New Link</button>
                    </div>
                </div>
            `;

            // Download button
            card.querySelector('.btn-dl-row').addEventListener('click', async function(e) {
                e.stopPropagation();
                const btn = this;
                btn.disabled = true;
                btn.innerHTML = '<span class="btn-spinner"></span> Downloading…';
                try {
                    const downloaded = await downloadBlob(item.url, safeFilename);
                    if (downloaded) {
                        btn.innerHTML = '✓ Downloaded';
                    } else {
                        triggerAnchorDownload(item.url, safeFilename);
                        btn.innerHTML = '✓ Downloaded';
                    }
                } catch {
                    triggerAnchorDownload(item.url, safeFilename);
                    btn.innerHTML = '✓ Downloaded';
                }
                setTimeout(() => {
                    btn.disabled = false;
                    btn.innerHTML = '⬇ Download Video';
                }, 2500);
            });

            // New Link button
            card.querySelector('.btn-new-link').addEventListener('click', () => {
                document.body.classList.remove('results-active');
                results.style.display = 'none';
                urlInput.value = '';
                errorMsg.textContent = '';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            // Title copy
            card.querySelector('.result-title').addEventListener('click', async () => {
                await navigator.clipboard.writeText(title);
                showToast('Title copied!', 'success');
            });

            resultsGrid.appendChild(card);
        });
    }

    async function downloadBlob(url, filename) {
        try {
            const response = await fetch(url, { mode: 'cors' });
            if (!response.ok) return false;
            const blob = await response.blob();
            if (blob.size === 0) return false;
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
            }, 1000);
            return true;
        } catch { return false; }
    }

    function triggerAnchorDownload(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.target = '_self';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 500);
    }

    function formatNum(n) {
        if (!n) return '0';
        n = parseInt(n);
        if (n >= 1000000) return (n/1000000).toFixed(1)+'M';
        if (n >= 1000) return (n/1000).toFixed(1)+'K';
        return n.toString();
    }

    function sanitize(str) {
        return (str || 'video').replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '_').substring(0, 40);
    }

    // FAQ toggle
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.faq-item').classList.toggle('open'));
    });

    // Toast
    window.showToast = function(msg, type = 'success') {
        const t = document.getElementById('toast');
        const tm = document.getElementById('toastMsg');
        if (!t || !tm) return;
        tm.textContent = msg;
        t.className = 'toast show';
        t.style.borderLeft = type === 'error' ? '4px solid #ed4956' : type === 'info' ? '4px solid #0095f6' : '4px solid #78de45';
        clearTimeout(t._t);
        t._t = setTimeout(() => t.classList.remove('show'), 3500);
    };
    window.hideToast = function() {
        const t = document.getElementById('toast');
        if (t) t.classList.remove('show');
    };

})();

// Add animation
const animStyle = document.createElement('style');
animStyle.textContent = `@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`;
document.head.appendChild(animStyle);
