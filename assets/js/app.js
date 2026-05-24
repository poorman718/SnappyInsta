(function() {
    'use strict';

    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light');
            localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
        });
        const saved = localStorage.getItem('theme');
        if (saved === 'light') document.body.classList.add('light');
        else document.body.classList.remove('light');
    }

    // App Elements
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

    // Manual Paste (Ctrl+V)
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
        if (e.key === 'Enter') {
            e.preventDefault();
            startDownload();
        }
    });

    async function startDownload() {
        const url = urlInput.value.trim();
        if (!url) {
            errorMsg.textContent = 'Please enter a URL';
            return;
        }
        if (!url.includes('instagram.com') && !url.includes('instagr.am')) {
            errorMsg.textContent = 'Invalid Instagram URL';
            return;
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
            // Keep only video items
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
                        <div class="result-creator">
                            <span class="creator-dot"></span>${item.username || '@instagram'}
                        </div>
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

            // Download button – DIRECT, same tab, no popup
            card.querySelector('.btn-dl-row').addEventListener('click', async function(e) {
                e.stopPropagation();
                const btn = this;
                const videoUrl = btn.getAttribute('data-url');
                const filename = btn.getAttribute('data-filename') || `instagram_video.mp4`;

                btn.disabled = true;
                btn.innerHTML = '<span class="btn-spinner"></span> Downloading…';

                try {
                    // Attempt direct blob download
                    const downloaded = await downloadBlob(videoUrl, filename);
                    if (downloaded) {
                        btn.innerHTML = '✓ Downloaded';
                        showToast('Download complete!', 'success');
                    } else {
                        // Fallback: anchor with download attribute
                        triggerAnchorDownload(videoUrl, filename);
                        btn.innerHTML = '✓ Downloaded';
                        showToast('Download started', 'success');
                    }
                } catch (err) {
                    // Last resort: anchor
                    triggerAnchorDownload(videoUrl, filename);
                    btn.innerHTML = '✓ Downloaded';
                    showToast('Download started', 'success');
                }

                setTimeout(() => {
                    btn.disabled = false;
                    btn.innerHTML = '⬇ Download Video';
                }, 2500);
            });

            // New Link button – reset everything
            card.querySelector('.btn-new-link').addEventListener('click', () => {
                document.body.classList.remove('results-active');
                results.style.display = 'none';
                urlInput.value = '';
                errorMsg.textContent = '';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            // Click title to copy
            card.querySelector('.result-title').addEventListener('click', async () => {
                await navigator.clipboard.writeText(title);
                showToast('Title copied!', 'success');
            });

            resultsGrid.appendChild(card);
        });
    }

    // Download as blob (direct)
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
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
            }, 1000);
            return true;
        } catch (e) {
            console.warn('Blob download failed, using fallback', e);
            return false;
        }
    }

    // Fallback: anchor with download attribute (same tab)
    function triggerAnchorDownload(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.target = '_self';
        a.style.display = 'none';
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

    // Toast notification
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

class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        // Random position
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        
        // Size between 2px and 5px
        this.size = Math.random() * 3 + 2;
        
        // Float upward slowly, with slight horizontal drift
        this.speedX = (Math.random() - 0.5) * 0.3;  // horizontal drift
        this.speedY = -(Math.random() * 0.4 + 0.2); // upward float
        
        // Random opacity 0.2–0.4
        this.opacity = Math.random() * 0.2 + 0.2;
        
        // Random animation duration for pulsing
        this.pulseSpeed = Math.random() * 0.02 + 0.01;
        this.pulseOffset = Math.random() * Math.PI * 2;
        
        // Color always cyan
        this.color = `rgba(0, 242, 234, ${this.opacity})`;
        
        // Glow effect (shadow)
        this.glow = Math.random() * 5 + 3;
    }

    update() {
        // Move particle
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Subtle parallax: move particles slightly based on mouse
        const parallaxStrength = 0.5;
        this.x += (mouse.x - 0.5) * parallaxStrength * 0.1;
        this.y += (mouse.y - 0.5) * parallaxStrength * 0.1;
        
        // Wrap around edges smoothly
        if (this.y < -20) {
            this.y = canvas.height + 20;
            this.x = Math.random() * canvas.width;
        }
        if (this.x < -50) this.x = canvas.width + 50;
        if (this.x > canvas.width + 50) this.x = -50;
    }

    draw() {
        // Pulsing size based on sine wave
        const pulse = Math.sin(Date.now() * this.pulseSpeed + this.pulseOffset) * 0.5 + 1;
        const currentSize = this.size * pulse;
        
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = '#e4eded';
        
        // Main circle with glow (using shadow)
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
        ctx.shadowColor = '#e4eded';
        ctx.shadowBlur = this.glow;
        ctx.fill();
        
        // Optional second circle for extra glow
        ctx.shadowBlur = 0;
        ctx.globalAlpha = this.opacity * 0.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentSize * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 242, 234, 0.15)';
        ctx.fill();
        
        ctx.restore();
    }
}

function createParticles(count) {
    particles = [];
    for (let i = 0; i < count; i++) {
        particles.push(new Particle());
    }
}

function animateParticles() {
    // Only render if canvas is visible (dark mode) to save CPU
    if (parseFloat(getComputedStyle(canvas).opacity) > 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw subtle gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#0a0a0a');
        gradient.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Update and draw particles
        particles.forEach(p => {
            p.update();
            p.draw();
        });
    }
    requestAnimationFrame(animateParticles);
}

// Initialize everything
resizeCanvas();
createParticles(30); // 30 particles – adjust as needed
animateParticles();
    
})();

// Add animation
const animStyle = document.createElement('style');
animStyle.textContent = `@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`;
document.head.appendChild(animStyle);
