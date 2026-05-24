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

    console.log('🔍 API URL:', apiUrl);

    try {
        const response = await fetch(apiUrl, options);
        const result = await response.text();
        console.log('📄 API Response:', result);
        
        let data;
        try {
            data = JSON.parse(result);
        } catch (e) {
            console.error('JSON Parse Error:', e);
            throw new Error('Invalid response from server');
        }

        if (!response.ok) {
            throw new Error(data.message || `HTTP Error ${response.status}`);
        }

        return normalizeResponse(data);
        
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

function normalizeResponse(data) {
    let items = [];
    
    const post = data.post || data.data || data;
    if (!post) {
        console.log('No post data found, searching for URLs...');
        return findUrls(data);
    }

    console.log('📝 Post data:', post);

    const caption = post.caption || post.text || '';
    const username = post.owner?.username || post.username || '@instagram';
    const likes = post.like_count || post.likes || '';
    const views = post.view_count || post.play_count || '';
    const comments = post.comment_count || '';

    // Handle carousel (multiple media)
    if (post.carousel_media && Array.isArray(post.carousel_media)) {
        console.log('🎠 Carousel found:', post.carousel_media.length, 'items');
        post.carousel_media.forEach((media, index) => {
            const item = extractMediaItem(media, caption, username, likes, views, index);
            if (item) items.push(item);
        });
    }

    // Handle single media post
    if (items.length === 0) {
        const item = extractMediaItem(post, caption, username, likes, views);
        if (item) items.push(item);
    }

    // Handle video specifically
    if (post.video_url && !items.find(i => i.url === post.video_url)) {
        items.push({
            type: 'video',
            url: post.video_url,
            thumbnail: post.thumbnail_url || post.display_url || '',
            title: caption || 'Instagram Video',
            username: username,
            duration: post.video_duration || '',
            likes: likes,
            views: views,
            comments: comments,
            quality: 'HD'
        });
    }

    // Handle display image
    if (post.display_url && !items.find(i => i.url === post.display_url)) {
        items.push({
            type: 'photo',
            url: post.display_url,
            thumbnail: post.display_url,
            title: caption || 'Instagram Photo',
            username: username,
            likes: likes,
            comments: comments,
            quality: 'HD'
        });
    }

    console.log('✅ Normalized items:', items.length);
    return items.filter(item => item.url && item.url.startsWith('http'));
}

function extractMediaItem(media, caption, username, likes, views, index = 0) {
    if (!media) return null;

    let type = 'photo';
    let url = '';

    // Check for video
    if (media.video_url) {
        type = 'video';
        url = media.video_url;
    } else if (media.video_versions && Array.isArray(media.video_versions) && media.video_versions.length > 0) {
        type = 'video';
        url = media.video_versions[0].url;
    }
    // Check for image
    else if (media.display_url) {
        url = media.display_url;
    } else if (media.image_versions2?.candidates?.[0]?.url) {
        url = media.image_versions2.candidates[0].url;
    } else if (media.url) {
        url = media.url;
    } else if (media.src) {
        url = media.src;
    }

    if (!url) return null;

    return {
        type: type,
        url: url,
        thumbnail: media.thumbnail_url || media.display_url || url,
        title: caption || `Instagram ${type} ${index + 1}`,
        username: username || '@instagram',
        duration: media.video_duration || '',
        likes: media.like_count || likes || '',
        views: media.view_count || views || '',
        comments: media.comment_count || '',
        quality: 'HD'
    };
}

function findUrls(data) {
    let urls = [];
    
    function search(obj) {
        if (!obj || typeof obj !== 'object') return;
        
        if (Array.isArray(obj)) {
            obj.forEach(item => search(item));
        } else {
            for (const key in obj) {
                const value = obj[key];
                if (typeof value === 'string' && value.startsWith('http') && 
                    (value.includes('cdninstagram') || value.includes('fbcdn') || 
                     value.includes('video') || value.includes('jpg') || 
                     value.includes('png') || value.includes('mp4'))) {
                    urls.push({
                        type: value.includes('mp4') || value.includes('video') ? 'video' : 'photo',
                        url: value,
                        thumbnail: value,
                        title: 'Instagram Media',
                        username: '@instagram',
                        quality: 'HD'
                    });
                } else if (typeof value === 'object') {
                    search(value);
                }
            }
        }
    }
    
    search(data);
    return urls;
}
