async function fetchInstagramMedia(url) {
    const apiUrl = `${CONFIG.API_BASE_URL}?url=${encodeURIComponent(url)}`;
    
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': CONFIG.API_KEY,
            'x-rapidapi-host': CONFIG.API_HOST,
            'Content-Type': 'application/json'
        }
    };

    try {
        const response = await fetch(apiUrl, options);
        const text = await response.text();
        
        console.log('Raw API Response:', text);
        
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Invalid JSON response:', text);
            throw new Error('Invalid response from server');
        }

        if (!response.ok) {
            throw new Error(data.message || `HTTP Error ${response.status}`);
        }

        console.log('Parsed API Data:', data);
        
        // Normalize response from new API
        return normalizeNewAPIResponse(data);
        
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

function normalizeNewAPIResponse(data) {
    let items = [];
    
    // Handle the new API response structure
    // The API returns different formats based on content type
    
    if (Array.isArray(data)) {
        // If it's already an array
        items = data;
    } 
    else if (data && data.media && Array.isArray(data.media)) {
        // If media is in a media array
        items = data.media;
    }
    else if (data && data.data && Array.isArray(data.data)) {
        // If data is in a data array
        items = data.data;
    }
    else if (data && data.items && Array.isArray(data.items)) {
        // If items array exists
        items = data.items;
    }
    else if (data && data.url) {
        // Single media item
        items = [data];
    }
    else if (data && data.video_url) {
        // Video response
        items = [{
            type: 'video',
            url: data.video_url,
            thumbnail: data.thumbnail || data.thumb || '',
            title: data.title || data.caption || data.description || 'Instagram Video',
            username: data.username || data.owner || data.author || '@instagram',
            duration: data.duration || '',
            quality: data.quality || 'HD'
        }];
    }
    else if (data && data.image_url) {
        // Photo response
        items = [{
            type: 'photo',
            url: data.image_url,
            thumbnail: data.image_url,
            title: data.caption || data.description || 'Instagram Photo',
            username: data.username || data.owner || '@instagram'
        }];
    }
    else if (data && data.audio_url) {
        // Audio response
        items = [{
            type: 'audio',
            url: data.audio_url,
            thumbnail: data.thumbnail || '',
            title: data.title || 'Instagram Audio',
            username: data.username || data.artist || '@instagram',
            duration: data.duration || ''
        }];
    }
    else if (data && typeof data === 'object') {
        // Try to extract any downloadable URLs from the response
        const extractedItems = extractMediaFromObject(data);
        items = extractedItems;
    }
    
    // Ensure all items have proper structure
    return items.map(item => ({
        type: item.type || item.media_type || guessMediaType(item),
        url: item.url || item.video_url || item.download_url || item.image_url || item.audio_url || item.src || '',
        thumbnail: item.thumbnail || item.thumb || item.preview || item.image_url || item.url || '',
        title: item.title || item.caption || item.description || item.text || 'Instagram Media',
        username: item.username || item.owner || item.author || item.uploader || item.artist || '@instagram',
        duration: item.duration || item.video_duration || item.length || '',
        quality: item.quality || item.resolution || item.format || 'HD'
    }));
}

function extractMediaFromObject(obj) {
    let items = [];
    
    // Recursively search for media URLs in the response object
    function searchForMedia(obj, path = '') {
        if (!obj || typeof obj !== 'object') return;
        
        // Check for direct media URLs
        const mediaKeys = ['url', 'video_url', 'image_url', 'audio_url', 'download_url', 'src', 'link'];
        
        for (const key of mediaKeys) {
            if (obj[key] && typeof obj[key] === 'string' && obj[key].startsWith('http')) {
                items.push({
                    url: obj[key],
                    type: guessMediaType({ url: obj[key] }),
                    thumbnail: obj.thumbnail || obj.thumb || obj[key],
                    title: obj.title || obj.caption || obj.description || path + key,
                    username: obj.username || obj.owner || obj.author || '@instagram',
                    duration: obj.duration || '',
                    quality: obj.quality || 'HD'
                });
            }
        }
        
        // Recursively search nested objects
        if (Array.isArray(obj)) {
            obj.forEach((item, index) => searchForMedia(item, `${path}[${index}].`));
        } else {
            for (const key in obj) {
                if (obj[key] && typeof obj[key] === 'object') {
                    searchForMedia(obj[key], `${path}${key}.`);
                }
            }
        }
    }
    
    searchForMedia(obj);
    
    // Remove duplicates by URL
    const uniqueItems = [];
    const seenUrls = new Set();
    
    for (const item of items) {
        if (!seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            uniqueItems.push(item);
        }
    }
    
    return uniqueItems;
}

function guessMediaType(item) {
    const url = item.url || item.video_url || item.image_url || item.audio_url || '';
    
    if (url.includes('.mp4') || url.includes('video') || item.video_url || item.type === 'video') {
        return 'video';
    }
    if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.webp') || item.image_url || item.type === 'photo') {
        return 'photo';
    }
    if (url.includes('.mp3') || url.includes('audio') || item.audio_url || item.type === 'audio') {
        return 'audio';
    }
    if (url.includes('story')) {
        return 'story';
    }
    if (url.includes('reel')) {
        return 'reel';
    }
    if (url.includes('profile') || url.includes('avatar')) {
        return 'profile_picture';
    }
    
    // Default to video for Instagram content
    return 'video';
}
