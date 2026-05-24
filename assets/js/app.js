// ========== DROPDOWN TOGGLE ==========
(function() {
    const toolsBtn = document.getElementById('toolsBtn');
    const dropdown = document.querySelector('.dropdown');
    if (toolsBtn && dropdown) {
        toolsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });
        document.addEventListener('click', () => dropdown.classList.remove('open'));
        dropdown.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const platform = link.getAttribute('data-platform');
                showToast(`${platform} tool coming soon!`, 'info');
                dropdown.classList.remove('open');
            });
        });
    }

    // Q&A link scroll
    const qaLink = document.getElementById('qaLink');
    if (qaLink) {
        qaLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('faq').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // ========== FOOTER MODALS ==========
    const modalOverlay = document.getElementById('infoModal');
    const modalContent = document.getElementById('modalContent');
    const modalClose = document.getElementById('modalClose');

    const modalData = {
        disclaimer: { title: 'Disclaimer', text: 'DownReels is an independent tool and is not affiliated with Instagram. Download only content you have rights to use.' },
        privacy: { title: 'Privacy Policy', text: 'We do not collect or store any personal data. All downloads are processed client-side.' },
        terms: { title: 'Terms of Service', text: 'By using this tool you agree to download only content from public accounts for personal use.' },
        about: { title: 'About DownReels', text: 'DownReels is the fastest Instagram video downloader. Built for creators who need quick, watermark-free downloads.' }
    };

    document.querySelectorAll('.footer-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const key = link.getAttribute('data-modal');
            if (key && modalData[key]) {
                modalContent.innerHTML = `<h3>${modalData[key].title}</h3><p>${modalData[key].text}</p>`;
                modalOverlay.classList.add('active');
            }
        });
    });

    modalClose.addEventListener('click', () => modalOverlay.classList.remove('active'));
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) modalOverlay.classList.remove('active'); });
})();
