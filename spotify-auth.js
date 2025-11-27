// Spotify OAuth and Playlist Creation

// OAuth Configuration
const SPOTIFY_AUTH_CONFIG = {
    clientId: CONFIG.SPOTIFY_CLIENT_ID,
    redirectUri: 'https://aichasd.github.io/bookbeats/index.html', // Changed to match Spotify dashboard
    scopes: [
        'playlist-modify-public',
        'playlist-modify-private',
        'user-read-private'
    ]
};

// ========================================
// STEP 1: INITIATE OAUTH FLOW
// ========================================

function initiateSpotifyAuth() {
    console.log('🔐 Initiating Spotify OAuth...');
    
    // Generate random state for security
    const state = generateRandomString(16);
    localStorage.setItem('spotify_auth_state', state);
    
    // Store tracks and analysis for after redirect
    localStorage.setItem('pending_playlist_tracks', JSON.stringify(aiGeneratedTracks));
    localStorage.setItem('pending_playlist_analysis', JSON.stringify(currentAnalysis));
    localStorage.setItem('pending_book_title', document.getElementById('bookTitle').textContent);
    
    // Build authorization URL
    const authUrl = 'https://accounts.spotify.com/authorize?' + 
        new URLSearchParams({
            client_id: SPOTIFY_AUTH_CONFIG.clientId,
            response_type: 'code',
            redirect_uri: SPOTIFY_AUTH_CONFIG.redirectUri,
            scope: SPOTIFY_AUTH_CONFIG.scopes.join(' '),
            state: state,
            show_dialog: false
        });
    
    console.log('🔐 Redirecting to Spotify authorization...');
    window.location.href = authUrl;
}

// ========================================
// STEP 2: HANDLE OAUTH CALLBACK
// ========================================

async function handleSpotifyCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = localStorage.getItem('spotify_auth_state');
    
    if (!code) {
        return false; // Not a callback
    }
    
    console.log('🔐 Handling Spotify OAuth callback...');
    
    // Verify state for security
    if (state !== storedState) {
        console.error('❌ State mismatch - potential CSRF attack');
        alert('Security error. Please try again.');
        return true;
    }
    
    try {
        // Exchange code for access token
        console.log('🔐 Exchanging code for access token...');
        const accessToken = await exchangeCodeForToken(code);
        
        console.log('✅ Got access token!');
        
        // Retrieve stored data
        const tracks = JSON.parse(localStorage.getItem('pending_playlist_tracks'));
        const analysis = JSON.parse(localStorage.getItem('pending_playlist_analysis'));
        const bookTitle = localStorage.getItem('pending_book_title');
        
        if (!tracks || !analysis) {
            throw new Error('Missing playlist data');
        }
        
        // Create the playlist!
        console.log('🎵 Creating Spotify playlist...');
        const playlistUrl = await createSpotifyPlaylist(accessToken, bookTitle, tracks, analysis);
        
        // Clean up
        localStorage.removeItem('spotify_auth_state');
        localStorage.removeItem('pending_playlist_tracks');
        localStorage.removeItem('pending_playlist_analysis');
        localStorage.removeItem('pending_book_title');
        
        // Show success state
        showPlaylistSuccess(playlistUrl, bookTitle);
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        return true;
        
    } catch (error) {
        console.error('❌ Error creating playlist:', error);
        alert('Failed to create playlist. Please try again.');
        window.location.href = window.location.pathname; // Clean redirect
        return true;
    }
}

// ========================================
// STEP 3: EXCHANGE CODE FOR TOKEN
// ========================================

async function exchangeCodeForToken(code) {
    // Note: In production, this should be done server-side for security
    // For now, we'll use PKCE flow or accept the limitation
    
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + btoa(CONFIG.SPOTIFY_CLIENT_ID + ':' + CONFIG.SPOTIFY_CLIENT_SECRET)
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: SPOTIFY_AUTH_CONFIG.redirectUri
        })
    });
    
    if (!response.ok) {
        throw new Error('Failed to exchange code for token');
    }
    
    const data = await response.json();
    return data.access_token;
}

// ========================================
// STEP 4: CREATE PLAYLIST AND ADD TRACKS
// ========================================

async function createSpotifyPlaylist(accessToken, bookTitle, tracks, analysis) {
    // Get user ID
    console.log('👤 Getting user profile...');
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    });
    
    if (!userResponse.ok) {
        throw new Error('Failed to get user profile');
    }
    
    const userData = await userResponse.json();
    const userId = userData.id;
    
    console.log(`👤 User: ${userData.display_name}`);
    
    // Create playlist
    const playlistName = `Reading: ${bookTitle}`;
    const playlistDescription = `Custom soundtrack for reading "${bookTitle}" • ${analysis.vibes ? analysis.vibes.join(', ') : 'curated tracks'} • Created by BookTunes`;
    
    console.log(`🎵 Creating playlist: "${playlistName}"`);
    
    const createResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: playlistName,
            description: playlistDescription,
            public: false
        })
    });
    
    if (!createResponse.ok) {
        throw new Error('Failed to create playlist');
    }
    
    const playlistData = await createResponse.json();
    const playlistId = playlistData.id;
    
    console.log(`✅ Playlist created: ${playlistId}`);
    
    // Add tracks in batches (Spotify allows 100 tracks per request)
    const trackUris = tracks.map(track => track.uri);
    const batchSize = 100;
    
    for (let i = 0; i < trackUris.length; i += batchSize) {
        const batch = trackUris.slice(i, i + batchSize);
        
        console.log(`🎵 Adding tracks ${i + 1}-${i + batch.length}...`);
        
        const addResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uris: batch
            })
        });
        
        if (!addResponse.ok) {
            console.error(`Failed to add batch ${i / batchSize + 1}`);
        }
    }
    
    console.log(`✅ Added ${tracks.length} tracks to playlist!`);
    
    // Return playlist URL
    return playlistData.external_urls.spotify;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

function showPlaylistSuccess(playlistUrl, bookTitle) {
    const playerContainer = document.getElementById('playerContainer');
    
    // Extract playlist ID from URL
    const playlistId = playlistUrl.split('/playlist/')[1].split('?')[0];
    
    playerContainer.innerHTML = `
        <div class="success-state">
            <div class="success-icon">✅</div>
            <h2 class="success-title">Playlist Created!</h2>
            <p class="success-subtitle">Your reading soundtrack for "${bookTitle}" is ready</p>
            
            <!-- Spotify Embed -->
            <iframe 
                class="spotify-player success-player"
                src="https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0" 
                width="100%" 
                height="380" 
                frameBorder="0" 
                allowfullscreen="" 
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                loading="lazy">
            </iframe>
            
            <a href="${playlistUrl}" target="_blank" class="open-spotify-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                Open in Spotify App
            </a>
            
            <button class="create-another-btn" onclick="location.reload()">
                Create Another Soundtrack
            </button>
            
            <div class="share-section">
                <p class="share-label">Share this playlist:</p>
                <div class="share-link-container">
                    <input type="text" class="share-link-input" value="${playlistUrl}" readonly onclick="this.select()">
                    <button class="copy-link-btn" onclick="copyToClipboard('${playlistUrl}')">Copy</button>
                </div>
            </div>
        </div>
    `;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.querySelector('.copy-link-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.backgroundColor = '#1DB954';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.backgroundColor = '';
        }, 2000);
    });
}

// ========================================
// CHECK FOR OAUTH CALLBACK ON PAGE LOAD
// ========================================

window.addEventListener('DOMContentLoaded', async function() {
    const isCallback = await handleSpotifyCallback();
    
    if (isCallback) {
        console.log('✅ Handled OAuth callback');
    }
});
