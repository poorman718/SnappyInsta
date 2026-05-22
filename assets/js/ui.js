function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    if (toast && toastMsg) {
        toastMsg.textContent = message;
        toast.className = `toast toast-${type} show`;
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(hideToast, 4000);
    }
}

function hideToast() {
    const toast = document.getElementById('toast');
    if (toast) toast.classList.remove('show');
}

function showLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'flex';
    const results = document.getElementById('results');
    if (results) results.style.display = 'none';
    const errorMsg = document.getElementById('errorMsg');
    if (errorMsg) errorMsg.textContent = '';
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
}

function showError(msg) {
    const errorMsg = document.getElementById('errorMsg');
    if (errorMsg) errorMsg.textContent = msg;
    hideLoader();
    const results = document.getElementById('results');
    if (results) results.style.display = 'none';
}
