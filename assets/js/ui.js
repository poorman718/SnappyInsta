function showLoader() {
    document.getElementById('loader').style.display = 'flex';
    document.getElementById('results').style.display = 'none';
    document.getElementById('errorMsg').textContent = '';
}
function hideLoader() {
    document.getElementById('loader').style.display = 'none';
}
function showError(msg) {
    document.getElementById('errorMsg').textContent = msg;
    hideLoader();
    document.getElementById('results').style.display = 'none';
}
function renderResults(data) {
    const grid = document.getElementById('resultsGrid');
    grid.innerHTML = '';

    // data may have different structures depending on the API; adapt as needed.
    const items = data?.media || data?.data || [];
    if (Array.isArray(data)) items = data;

    if (items.length === 0) {
        showError('No downloadable media found for this URL.');
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'media-card glass';
        const type = item.type || 'video';
        const url = item.url || item.download_url || item.src;
        const thumbnail = item.thumbnail || item.preview || url;

        card.innerHTML = `
            <img src="${thumbnail}" alt="preview" class="media-preview" onerror="this.style.display='none'" loading="lazy">
            <span class="media-type">${type.toUpperCase()}</span>
            <a href="${url}" class="download-link" download target="_blank" rel="noopener">
                ⬇ Download ${type}
            </a>
        `;
        grid.appendChild(card);
    });

    document.getElementById('results').style.display = 'block';
    hideLoader();
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toastMsg');
    msg.textContent = message;
    toast.classList.add('show');
    setTimeout(hideToast, 4000);
}
function hideToast() {
    document.getElementById('toast').classList.remove('show');
}
