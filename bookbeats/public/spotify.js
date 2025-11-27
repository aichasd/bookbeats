// Spotify API Integration

// Get Spotify Access Token (Client Credentials Flow)
async function getSpotifyToken() {
    const clientId = CONFIG.SPOTIFY_CLIENT_ID;
    const clientSecret = CONFIG.SPOTIFY_CLIENT_SECRET;
    // OAuth Configuration
const SPOTIFY_AUTH_CONFIG = {
    clientId: CONFIG.SPOTIFY_CLIENT_ID,
    redirectUri: 'http://127.0.0.1:8000/index.html',
    scopes: [
        'playlist-modify-public',
        'playlist-modify-private',
        'user-read-private'
    ]
};

    const credentials = btoa(clientId + ':' + clientSecret);
    
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + credentials
        },
        body: 'grant_type=client_credentials'
    });
    
    if (!response.ok) {
        const errorData = await response.text();
        console.error('Spotify auth error:', response.status, errorData);
        throw new Error('Failed to get Spotify token');
    }
    
    const data = await response.json();
    console.log('Got Spotify token!', data.access_token.substring(0, 20) + '...');
    return data.access_token;
}

// Search for tracks on Spotify
async function searchSpotifyTracks(query, limit = 20) {
    const token = await getSpotifyToken();
    
    const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
        {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }
    );
    
    const data = await response.json();
    return data.tracks.items;
}

// Search for PLAYLISTS on Spotify
async function searchSpotifyPlaylists(query, limit = 10) {
    const token = await getSpotifyToken();
    
    const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=playlist&limit=${limit}`,
        {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }
    );
    
    const data = await response.json();
    
    // Return simplified playlist objects
    return data.playlists.items.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        owner: playlist.owner.display_name,
        tracks_count: playlist.tracks.total
    }));
}

// Test function - let's search for melancholic Turkish music!
async function testSpotifySearch() {
    console.log('Testing Spotify API...');
    
    try {
        const tracks = await searchSpotifyTracks('melancholic turkish instrumental');
        console.log('Found tracks:', tracks);
        
        tracks.slice(0, 5).forEach(track => {
            console.log(`- ${track.name} by ${track.artists[0].name}`);
        });
        
        return tracks;
    } catch (error) {
        console.error('Spotify API error:', error);
    }
}