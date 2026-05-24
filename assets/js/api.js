async function fetchInstagramMedia(url) {
    const apiUrl = `${CONFIG.API_BASE_URL}?postUrl=${encodeURIComponent(url)}`;
    
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
        
        // Normalize the response to our standard format
        return normalizeNewAPIResponse(data);
        
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

function normalizeNewAPIResponse(data) {
    let items = [];
    
    // The new API returns post statistics and media info
    if (data && data.data) {
        const post = data.data;
        
        // Extract media items
        if (post.media && Array.isArray(post.media)) {
            post.media.forEach(media => {
                const item = {
                    type: media.type || guessMediaTypeFromUrl(media.url || media.src || ''),
                    url: media.url || media.src || media.video_url || media.download_url || '',
                    thumbnail: media.thumbnail || media.preview || media.url || '',
                    title: post.caption || post.title || post.text || 'Instagram Post',
                    username: post.owner?.username || post.author || post.username || '@instagram',
                    duration: media.duration || post.video_duration || '',
                    quality: media.quality || 'HD',
                    likes: post.likes || post.like_count || '',
                    views: post.views || post.view_count || post.play_count || '',
                    comments: post.comments || post.comment_count || ''
                };
                items.push(item);
            });
        }
        
        // If single media post
        if (items.length === 0 && (post.url || post.video_url || post.src)) {
            items.push({
                type: post.type || guessMediaTypeFromUrl(post.url || post.video_url || ''),
                url: post.url || post.video_url || post.src || post.download_url || '',
                thumbnail: post.thumbnail || post.preview || post.url || '',
                title: post.caption || post.title || post.text || 'Instagram Post',
                username: post.owner?.username || post.author || post.username || '@instagram',
                duration: post.duration || post.video_duration || '',
                quality: 'HD',
                likes: post.likes || post.like_count || '',
                views: post.views || post.view_count || post.play_count || '',
                comments: post.comments || post.comment_count || ''
            });
        }
        
        // Handle profile picture
        if (post.profile_pic_url || post.owner?.profile_pic_url) {
            items.push({
                type: 'profile_picture',
                url: post.profile_pic_url || post.owner?.profile_pic_url,
                thumbnail: post.profile_pic_url || post.owner?.profile_pic_url,
                title: post.owner?.full_name || post.owner?.username || 'Profile Picture',
                username: post.owner?.username || '@instagram'
            });
        }
    }
    
    // If no items found, try to extract any URLs from the response
    if (items.length === 0) {
        items = extractUrlsFromObject(data);
    }
    
    // Clean and validate items
    return items.filter(item => item.url && item.url.startsWith('http')).map(item => ({
        ...item,
        url: item.url,
        thumbnail: item.thumbnail || item.url,
        title: item.title || 'Instagram Media',
        username: item.username || '@instagram'
    }));
}

function guessMediaTypeFromUrl(url) {
    if (!url) return 'video';
    if (url.includes('.mp4')) return 'video';
    if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.webp')) return 'photo';
    if (url.includes('profile') || url.includes('avatar')) return 'profile_picture';
    if (url.includes('.mp3') || url.includes('audio')) return 'audio';
    return 'video';
}

function extractUrlsFromObject(obj, prefix = '') {
    let items = [];
    
    if (!obj || typeof obj !== 'object') return items;
    
    for (const key in obj) {
        const value = obj[key];
        
        if (typeof value === 'string' && value.startsWith('http')) {
            items.push({
                type: guessMediaTypeFromUrl(value),
                url: value,
                thumbnail: value,
                title: prefix ? `${prefix}_${key}` : key,
                username: '@instagram'
            });
        } else if (typeof value === 'object' && value !== null) {
            items = items.concat(extractUrlsFromObject(value, key));
        }
    }
    
    return items;
}
