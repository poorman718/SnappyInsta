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

    console.log('🔍 Fetching URL:', apiUrl);
    
    try {
        const response = await fetch(apiUrl, options);
        console.log('📡 Response Status:', response.status);
        
        const text = await response.text();
        console.log('📄 Raw Response Text:', text);
        
        let data;
        try {
            data = JSON.parse(text);
            console.log('✅ Parsed JSON:', data);
        } catch (e) {
            console.error('❌ JSON Parse Error:', e);
            throw new Error('Invalid response from server. The API may be down or the key may be invalid.');
        }

        if (!response.ok) {
            throw new Error(data.message || `HTTP Error ${response.status}`);
        }

        // Check if we got valid data
        if (!data) {
            throw new Error('No data received from API');
        }

        // Normalize and return
        const normalizedData = normalizeResponse(data, url);
        console.log('🔄 Normalized Data:', normalizedData);
        
        if (normalizedData.length === 0) {
            throw new Error('No downloadable media found. The post might be private or the URL is incorrect.');
        }
        
        return normalizedData;
        
    } catch (error) {
        console.error('💥 API Error:', error);
        throw error;
    }
}

function normalizeResponse(data, originalUrl) {
    let items = [];
    
    // Debug log the actual structure
    console.log('🔧 Normalizing data with keys:', Object.keys(data));
    
    // Handle the specific structure from instagram-statistics-api
    if (data.post) {
        const post = data.post;
        console.log('📝 Post data found:', post);
        
        // Extract caption/title
        const caption = post.caption || post.text || '';
        const username = post.owner?.username || post.username || '';
        const fullName = post.owner?.full_name || '';
        
        // Handle carousel (multiple media)
        if (post.carousel_media && Array.isArray(post.carousel_media)) {
            console.log('🎠 Carousel media found:', post.carousel_media.length, 'items');
            post.carousel_media.forEach((media, index) => {
                const item = extractMediaItem(media, caption, username, fullName, index);
                if (item) items.push(item);
            });
        }
        
        // Handle single image/video
        if (items.length === 0) {
            const item = extractMediaItem(post, caption, username, fullName);
            if (item) items.push(item);
        }
        
        // Extract video URL if exists
        if (post.video_url || post.video_versions) {
            const videoUrl = post.video_url || (post.video_versions && post.video_versions[0]?.url) || '';
            if (videoUrl && !items.find(i => i.url === videoUrl)) {
                items.push({
                    type: 'video',
                    url: videoUrl,
                    thumbnail: post.thumbnail_url || post.display_url || '',
                    title: caption || 'Instagram Video',
                    username: username || '@instagram',
                    duration: post.video_duration || '',
                    quality: 'HD',
                    likes: post.like_count || post.likes || '',
                    views: post.view_count || post.play_count || '',
                    comments: post.comment_count || ''
                });
            }
        }
        
        // Extract display image
        if (post.display_url || post.image_versions2?.candidates?.[0]?.url) {
            const imageUrl = post.display_url || post.image_versions2.candidates[0].url;
            if (imageUrl && !items.find(i => i.url === imageUrl)) {
                items.push({
                    type: 'photo',
                    url: imageUrl,
                    thumbnail: imageUrl,
                    title: caption || 'Instagram Photo',
                    username: username || '@instagram',
                    likes: post.like_count || post.likes || '',
                    comments: post.comment_count || ''
                });
            }
        }
    }
    
    // Handle different API response structures
    if (items.length === 0 && data.data) {
        console.log('📊 Trying data.data path');
        const d = data.data;
        if (Array.isArray(d)) {
            d.forEach(item => {
                if (item.url || item.src || item.video_url) {
                    items.push({
                        type: item.type || 'video',
                        url: item.url || item.src || item.video_url,
                        thumbnail: item.thumbnail || item.url,
                        title: item.caption || item.title || 'Instagram Media',
                        username: item.username || item.owner?.username || '@instagram'
                    });
                }
            });
        } else if (d.url || d.src || d.video_url) {
            items.push({
                type: d.type || 'video',
                url: d.url || d.src || d.video_url,
                thumbnail: d.thumbnail || d.url,
                title: d.caption || d.title || 'Instagram Media',
                username: d.username || d.owner?.username || '@instagram'
            });
        }
    }
    
    // Try to extract from graphql structure (common in Instagram APIs)
    if (items.length === 0 && data.graphql) {
        console.log('📊 Trying graphql path');
        const media = data.graphql.shortcode_media || data.graphql.media;
        if (media) {
            const item = extractMediaItem(media, media.edge_media_to_caption?.edges?.[0]?.node?.text || '', media.owner?.username || '', media.owner?.full_name || '');
            if (item) items.push(item);
        }
    }
    
    // Last resort: try to find any URLs in the response
    if (items.length === 0) {
        console.log('🔍 Searching for any URLs in response...');
        const foundUrls = findUrlsInObject(data);
        items = foundUrls.map(u => ({
            type: guessType(u),
            url: u,
            thumbnail: u,
            title: 'Instagram Media',
            username: '@instagram'
        }));
    }
    
    // Filter out invalid items and duplicates
    items = items.filter(item => item.url && (item.url.startsWith('http')))
                 .filter((item, index, self) => 
                     index === self.findIndex(t => t.url === item.url)
                 );
    
    console.log('✅ Final items:', items.length);
    return items;
}

function extractMediaItem(media, caption, username, fullName, index = 0) {
    if (!media) return null;
    
    // Determine type
    let type = 'photo';
    let url = '';
    
    if (media.video_url || media.video_versions) {
        type = 'video';
        url = media.video_url || (media.video_versions && media.video_versions[0]?.url) || '';
    } else if (media.display_url) {
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
        quality: 'HD',
        likes: media.like_count || media.likes || '',
        views: media.view_count || media.play_count || '',
        comments: media.comment_count || ''
    };
}

function guessType(url) {
    if (!url) return 'video';
    if (url.includes('.mp4') || url.includes('video')) return 'video';
    if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.webp')) return 'photo';
    if (url.includes('.mp3') || url.includes('audio')) return 'audio';
    return 'video';
}

function findUrlsInObject(obj, foundUrls = []) {
    if (!obj || typeof obj !== 'object') return foundUrls;
    
    if (Array.isArray(obj)) {
        obj.forEach(item => findUrlsInObject(item, foundUrls));
    } else {
        for (const key in obj) {
            const value = obj[key];
            if (typeof value === 'string' && value.startsWith('http') && 
                (value.includes('instagram') || value.includes('cdninstagram') || value.includes('fbcdn'))) {
                if (!foundUrls.includes(value)) {
                    foundUrls.push(value);
                }
            } else if (typeof value === 'object') {
                findUrlsInObject(value, foundUrls);
            }
        }
    }
    
    return foundUrls;
}
