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

    const response = await fetch(apiUrl, options);
    const text = await response.text();
    
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

    console.log('Raw API Response:', data);
    
    // Normalize response to always return an array of media items
    return normalizeResponse(data);
}

function normalizeResponse(data) {
    let items = [];
    
    // Case 1: Direct array
    if (Array.isArray(data)) {
        items = data;
    }
    // Case 2: Object with media array
    else if (data && data.media && Array.isArray(data.media)) {
        items = data.media;
    }
    // Case 3: Object with items array
    else if (data && data.items && Array.isArray(data.items)) {
        items = data.items;
    }
    // Case 4: Object with data array
    else if (data && data.data && Array.isArray(data.data)) {
        items = data.data;
    }
    // Case 5: Single media object
    else if (data && (data.url || data.video_url || data.download_url || data.src)) {
        items = [data];
    }
    // Case 6: Profile picture response (usually has profile_pic_url or similar)
    else if (data && data.profile_pic_url) {
        items = [{
            type: 'profile_picture',
            url: data.profile_pic_url,
            thumbnail: data.profile_pic_url,
            title: data.full_name || data.username || 'Profile Picture',
            username: data.username || '@instagram'
        }];
    }
    // Case 7: Story response
    else if (data && data.story_url) {
        items = [{
            type: 'story',
            url: data.story_url,
            thumbnail: data.story_thumbnail || data.story_url,
            title: 'Instagram Story',
            username: data.username || data.owner || '@instagram',
            duration: data.duration || ''
        }];
    }
    // Case 8: Any other object - try to extract downloadable URLs
    else if (data && typeof data === 'object') {
        // Flatten all properties to find URLs
        const flatItems = flattenObject(data);
        items = flatItems.filter(item => item.url && (item.url.startsWith('http')));
    }
    
    // Ensure each item has required fields
    return items.map(item => ({
        type: item.type || item.media_type || guessMediaType(item),
        url: item.url || item.video_url || item.download_url || item.src || item.story_url || item.profile_pic_url || '',
        thumbnail: item.thumbnail || item.thumb || item.preview || item.thumbnail_url || item.url || '',
        title: item.title || item.caption || item.description || item.text || 'Instagram Media',
        username: item.username || item.owner || item.author || item.uploader || item.owner?.username || '@instagram',
        duration: item.duration || item.video_duration || '',
        quality: item.quality || item.resolution || 'HD'
    }));
}

function guessMediaType(item) {
    const url = item.url || item.video_url || item.download_url || '';
    if (url.includes('story')) return 'story';
    if (url.includes('profile') || url.includes('avatar')) return 'profile_picture';
    if (url.includes('.mp4') || item.video_url) return 'video';
    if (url.includes('.jpg') || url.includes('.png') || url.includes('.jpeg')) return 'photo';
    if (url.includes('.mp3') || item.audio_url) return 'audio';
    if (item.is_reel || url.includes('reel')) return 'reel';
    return 'video';
}

function flattenObject(obj, prefix = '') {
    let result = [];
    for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            result = result.concat(flattenObject(obj[key], prefix + key + '.'));
        } else if (typeof obj[key] === 'string' && obj[key].startsWith('http')) {
            result.push({
                url: obj[key],
                type: guessMediaType({ url: obj[key] }),
                thumbnail: obj[key],
                title: prefix + key,
                username: '@instagram'
            });
        }
    }
    return result;
}
