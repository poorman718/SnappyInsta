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
        
        console.log('========================================');
        console.log('🔍 API URL:', apiUrl);
        console.log('📡 Status:', response.status);
        console.log('📄 RAW Response:', text);
        console.log('========================================');
        
        // Try to parse JSON
        let data;
        try {
            data = JSON.parse(text);
            console.log('✅ Parsed JSON:', JSON.stringify(data, null, 2));
        } catch (e) {
            console.error('❌ Not valid JSON');
            throw new Error('Invalid server response');
        }

        if (!response.ok) {
            throw new Error(data.message || `HTTP Error ${response.status}`);
        }

        // Extract media from ANY possible structure
        const items = extractMediaFromAnyStructure(data);
        console.log('🎯 Extracted items:', items.length, 'items');
        console.log('📦 Items detail:', JSON.stringify(items, null, 2));
        
        if (items.length === 0) {
            throw new Error('No downloadable media found. The post might be private or deleted.');
        }
        
        return items;
        
    } catch (error) {
        console.error('💥 Final Error:', error.message);
        throw error;
    }
}

function extractMediaFromAnyStructure(data) {
    let allItems = [];
    
    // Print all keys for debugging
    console.log('🔑 Top-level keys:', Object.keys(data));
    
    // Strategy 1: Check data.post
    if (data.post) {
        console.log('📮 Found data.post');
        allItems = allItems.concat(extractFromPostObject(data.post));
    }
    
    // Strategy 2: Check data.data
    if (data.data) {
        console.log('📊 Found data.data');
        if (Array.isArray(data.data)) {
            data.data.forEach(item => {
                allItems = allItems.concat(extractFromPostObject(item));
            });
        } else if (typeof data.data === 'object') {
            allItems = allItems.concat(extractFromPostObject(data.data));
        }
    }
    
    // Strategy 3: Check data.result
    if (data.result) {
        console.log('📊 Found data.result');
        allItems = allItems.concat(extractFromPostObject(data.result));
    }
    
    // Strategy 4: Deep search for URLs
    if (allItems.length === 0) {
        console.log('🔍 Deep searching for URLs...');
        allItems = deepSearchUrls(data);
    }
    
    // Remove duplicates by URL
    const uniqueItems = [];
    const seenUrls = new Set();
    
    allItems.forEach(item => {
        if (item.url && !seenUrls.has(item.url) && item.url.startsWith('http')) {
            seenUrls.add(item.url);
            uniqueItems.push(item);
        }
    });
    
    return uniqueItems;
}

function extractFromPostObject(post) {
    const items = [];
    
    if (!post || typeof post !== 'object') return items;
    
    console.log('📝 Post keys:', Object.keys(post));
    
    const caption = post.caption || post.text || post.title || post.description || '';
    const username = post.owner?.username || post.username || post.author || '@instagram';
    const likes = post.like_count || post.likes || post.likeCount || '';
    const views = post.view_count || post.views || post.viewCount || post.play_count || '';
    const comments = post.comment_count || post.comments || post.commentCount || '';
    
    // Check for carousel media (multiple items)
    if (post.carousel_media && Array.isArray(post.carousel_media)) {
        console.log('🎠 Carousel with', post.carousel_media.length, 'items');
        post.carousel_media.forEach((media, idx) => {
            const item = extractSingleMedia(media, caption, username, likes, views, idx);
            if (item) items.push(item);
        });
    }
    
    // Check for sidecar children (another carousel format)
    if (post.edge_sidecar_to_children?.edges) {
        console.log('🎠 Sidecar with', post.edge_sidecar_to_children.edges.length, 'items');
        post.edge_sidecar_to_children.edges.forEach((edge, idx) => {
            const item = extractSingleMedia(edge.node, caption, username, likes, views, idx);
            if (item) items.push(item);
        });
    }
    
    // Single media check
    const singleItem = extractSingleMedia(post, caption, username, likes, views);
    if (singleItem && items.length === 0) {
        items.push(singleItem);
    }
    
    // Additional check: if post itself has video_url or display_url
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
    
    return items;
}

function extractSingleMedia(media, caption, username, likes, views, index = 0) {
    if (!media || typeof media !== 'object') return null;
    
    console.log('🖼️ Media keys:', Object.keys(media));
    
    let type = 'photo';
    let url = '';
    let thumbnail = '';
    let duration = '';
    
    // VIDEO CHECKS
    if (media.video_url) {
        type = 'video';
        url = media.video_url;
        duration = media.video_duration || '';
    } else if (media.video_versions && Array.isArray(media.video_versions) && media.video_versions.length > 0) {
        type = 'video';
        url = media.video_versions[0].url;
        duration = media.video_duration || '';
    } else if (media.media_type === 2 || media.is_video === true) {
        type = 'video';
        url = media.video_url || media.video_versions?.[0]?.url || '';
    }
    // IMAGE CHECKS
    else if (media.display_url) {
        type = 'photo';
        url = media.display_url;
    } else if (media.display_src) {
        type = 'photo';
        url = media.display_src;
    } else if (media.image_versions2?.candidates?.[0]?.url) {
        type = 'photo';
        url = media.image_versions2.candidates[0].url;
    } else if (media.media_url || media.url || media.src) {
        url = media.media_url || media.url || media.src;
        type = url.includes('.mp4') ? 'video' : 'photo';
    }
    
    // THUMBNAIL
    thumbnail = media.thumbnail_url || media.thumbnail_src || media.display_url || media.display_src || url;
    
    if (!url) {
        console.log('⚠️ No URL found for media item');
        return null;
    }
    
    return {
        type: type,
        url: url,
        thumbnail: thumbnail,
        title: caption || `Instagram ${type}`,
        username: username || '@instagram',
        duration: duration || media.video_duration || '',
        likes: media.like_count || likes || '',
        views: media.view_count || views || '',
        comments: media.comment_count || '',
        quality: 'HD'
    };
}

function deepSearchUrls(obj) {
    const urls = [];
    
    function search(obj, path = '') {
        if (!obj || typeof obj !== 'object') return;
        
        if (Array.isArray(obj)) {
            obj.forEach((item, i) => search(item, `${path}[${i}]`));
            return;
        }
        
        for (const key in obj) {
            const value = obj[key];
            
            if (typeof value === 'string' && value.startsWith('http')) {
                // Filter for Instagram/Facebook CDN URLs
                if (value.includes('cdninstagram') || 
                    value.includes('fbcdn') || 
                    value.includes('video') || 
                    value.includes('photo') ||
                    value.includes('jpg') ||
                    value.includes('mp4') ||
                    value.includes('png') ||
                    value.includes('jpeg')) {
                    
                    console.log('🔗 Found URL at', path + '.' + key, ':', value.substring(0, 80));
                    
                    urls.push({
                        type: value.includes('mp4') || value.includes('video') ? 'video' : 'photo',
                        url: value,
                        thumbnail: value,
                        title: 'Instagram Media',
                        username: '@instagram',
                        quality: 'HD'
                    });
                }
            } else if (typeof value === 'object' && value !== null) {
                search(value, path + '.' + key);
            }
        }
    }
    
    search(obj, 'root');
    return urls;
}
