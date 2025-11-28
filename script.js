// BookTunes - Sophisticated Music Search (DEBUGGED)
// Keeps all advanced features with proper syntax

let aiGeneratedTracks = [];
let currentAnalysis = null;

// Configuration
const SEARCH_CONFIG = {
    MIN_QUALITY_SCORE: 75,
    MIN_QUALITY_SCORE_SENSITIVE: 80,
    TARGET_PLAYLIST_SIZE: 30,
    MIN_INSTRUMENTALNESS: 0.70,
    MAX_SPEECHINESS: 0.33,
    BATCH_SIZE: 50
};

const BASE_BLACKLIST = [
    'comedy', 'stand-up', 'podcast', 'audiobook', 'spoken word',
    'kids', 'children', 'christmas', 'holiday'
];

// Main function
async function generatePlaylist() {
    const bookTitle = document.getElementById('bookTitle').value.trim();
    
    if (!bookTitle) {
        alert('Please enter a book title');
        return;
    }

    const userPreferences = {
        instrumentalOnly: document.getElementById('instrumentalOnly').checked,
        foreignLyricsOk: document.getElementById('foreignLyricsOk').checked
    };

    showLoading();

    try {
        console.log('📚 Analyzing:', bookTitle);
        currentAnalysis = await analyzeBook(bookTitle);
        
        console.log('✅ Analysis complete');
        console.log('   Weight:', currentAnalysis.emotional_weight);
        console.log('   Gravity:', currentAnalysis.subject_gravity);
        console.log('   Sensitive:', currentAnalysis.sensitive_topics);

        // Build blacklist
        const blacklist = buildBlacklist(currentAnalysis);
        console.log('🚫 Blacklist:', blacklist.slice(0, 10));

        // Search
        const tracks = await searchTracks(currentAnalysis, userPreferences, blacklist);
        
        if (tracks.length === 0) {
            throw new Error('No tracks found. Try different preferences.');
        }

        // Validate
        const minScore = currentAnalysis.sensitive_topics?.length > 0 
            ? SEARCH_CONFIG.MIN_QUALITY_SCORE_SENSITIVE 
            : SEARCH_CONFIG.MIN_QUALITY_SCORE;
            
        const validated = await validateTracks(tracks, userPreferences, currentAnalysis, minScore);

        if (validated.length === 0) {
            throw new Error('No tracks passed validation.');
        }

        // Select best
        aiGeneratedTracks = selectBest(validated);

        console.log('✅ Final:', aiGeneratedTracks.length, 'tracks');

        displayResults(bookTitle, aiGeneratedTracks);

    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error: ' + error.message);
        hideLoading();
    }
}

// Build dynamic blacklist
function buildBlacklist(analysis) {
    let blacklist = [...BASE_BLACKLIST];
    
    if (analysis.explicit_exclusions) {
        blacklist.push(...analysis.explicit_exclusions.map(e => e.toLowerCase()));
    }
    
    if (analysis.subject_gravity === 'tragic' || analysis.subject_gravity === 'traumatic') {
        blacklist.push('party', 'dance', 'edm', 'upbeat', 'cheerful', 'happy');
    }
    
    if (analysis.sensitive_topics?.length > 0) {
        blacklist.push('party', 'dance', 'reggaeton', 'latin pop', 'upbeat', 'cheerful');
    }
    
    return [...new Set(blacklist)];
}

// Search tracks
async function searchTracks(analysis, prefs, blacklist) {
    const allTracks = [];
    
    // Strategy 1: Suggested artists (PRIORITY)
    if (analysis.suggested_artists?.length > 0) {
        console.log('🎤 Searching suggested artists');
        for (const artist of analysis.suggested_artists) {
            const query = prefs.instrumentalOnly 
                ? `artist:"${artist}" instrumental`
                : `artist:"${artist}"`;
            
            const results = await searchSpotify(query, 20, blacklist);
            results.forEach(t => t.qualityScore = (t.qualityScore || 50) + 25);
            allTracks.push(...results);
        }
    }
    
    // Strategy 2: Geographic music
    if (analysis.geographic_setting && prefs.foreignLyricsOk) {
        console.log('🌍 Searching geographic context');
        const queries = [
            `${analysis.geographic_setting} traditional`,
            `${analysis.geographic_setting} folk`,
            `${analysis.geographic_setting} classical`
        ];
        
        for (const query of queries) {
            const results = await searchSpotify(query, 15, blacklist);
            allTracks.push(...results);
        }
    }
    
    // Strategy 3: Mood + instruments
    console.log('🎹 Searching mood combinations');
    const moods = analysis.mood || [];
    const instruments = analysis.instrument_palette || ['piano', 'strings'];
    
    for (const mood of moods.slice(0, 2)) {
        for (const inst of instruments.slice(0, 2)) {
            const query = `${mood} ${inst}`;
            const results = await searchSpotify(query, 10, blacklist);
            allTracks.push(...results);
        }
    }
    
    // Strategy 4: Genres
    if (analysis.genre_suggestions?.length > 0) {
        console.log('🎵 Searching genres');
        for (const genre of analysis.genre_suggestions.slice(0, 3)) {
            const query = prefs.instrumentalOnly
                ? `genre:"${genre}" instrumental`
                : `genre:"${genre}"`;
            
            const results = await searchSpotify(query, 12, blacklist);
            allTracks.push(...results);
        }
    }
    
    // Strategy 5: Atmospheric
    const descriptors = analysis.atmospheric_descriptors || [];
    for (const desc of descriptors.slice(0, 3)) {
        const results = await searchSpotify(`${desc} ambient`, 10, blacklist);
        allTracks.push(...results);
    }
    
    console.log('📊 Collected:', allTracks.length, 'tracks');
    return allTracks;
}

// Spotify search with filtering
async function searchSpotify(query, limit, blacklist) {
    try {
        const token = await getSpotifyToken();
        const params = new URLSearchParams({
            q: query,
            type: 'track',
            limit: limit,
            market: 'US'
        });

        const response = await fetch(
            `https://api.spotify.com/v1/search?${params}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (!response.ok) return [];

        const data = await response.json();
        
        // Filter
        const filtered = data.tracks.items.filter(track => {
            if (!track.album) return false;
            
            const name = track.name.toLowerCase();
            const artist = track.artists[0].name.toLowerCase();
            const album = track.album.name.toLowerCase();
            
            return !blacklist.some(b => 
                name.includes(b) || artist.includes(b) || album.includes(b)
            );
        });

        return filtered;

    } catch (error) {
        console.error('Search error:', error);
        return [];
    }
}

// Validate with audio features
async function validateTracks(tracks, prefs, analysis, minScore) {
    console.log(`🔍 Validating (min score: ${minScore})`);
    
    const token = await getSpotifyToken();
    const validated = [];
    
    for (let i = 0; i < tracks.length; i += SEARCH_CONFIG.BATCH_SIZE) {
        const batch = tracks.slice(i, i + SEARCH_CONFIG.BATCH_SIZE);
        const ids = batch.map(t => t.id).join(',');
        
        try {
            const response = await fetch(
                `https://api.spotify.com/v1/audio-features?ids=${ids}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (!response.ok) continue;

            const data = await response.json();
            
            for (let j = 0; j < batch.length; j++) {
                const track = batch[j];
                const features = data.audio_features[j];
                
                if (!features) continue;

                const score = scoreTrack(track, features, prefs, analysis);
                
                if (score >= minScore) {
                    track.audioFeatures = features;
                    track.qualityScore = score;
                    validated.push(track);
                }
            }
        } catch (error) {
            console.error('Validation error:', error);
        }
    }

    console.log(`✅ ${validated.length} tracks validated`);
    return validated;
}

// Score track
function scoreTrack(track, features, prefs, analysis) {
    let score = 50;

    // Instrumental check
    if (prefs.instrumentalOnly) {
        if (features.instrumentalness < SEARCH_CONFIG.MIN_INSTRUMENTALNESS) return 0;
        score += 30;
    }

    // No spoken word
    if (features.speechiness > SEARCH_CONFIG.MAX_SPEECHINESS) return 0;

    // Sensitive topics enforcement
    if (analysis.sensitive_topics?.length > 0) {
        if (features.valence > 0.6) return 0;
        if (features.energy > 0.7) return 0;
        if (features.valence < 0.4 && features.energy < 0.5) score += 20;
    }

    // Mood matching
    const target = getMoodTarget(analysis);
    const match = matchMood(features, target);
    score += match * 25;

    // Discovery bonus
    if (track.popularity < 30) score += 10;

    // Duration check
    const mins = track.duration_ms / 60000;
    if (mins < 1 || mins > 10) score -= 20;

    return Math.max(0, Math.min(100, score));
}

// Get mood target
function getMoodTarget(analysis) {
    const weights = {
        'light': { valence: 0.6, energy: 0.5 },
        'medium': { valence: 0.5, energy: 0.4 },
        'heavy': { valence: 0.3, energy: 0.3 },
        'devastating': { valence: 0.2, energy: 0.3 }
    };
    
    const adjustments = {
        'lighthearted': { valence: 0.2, energy: 0.1 },
        'contemplative': { valence: 0, energy: -0.1 },
        'serious': { valence: -0.1, energy: -0.1 },
        'tragic': { valence: -0.2, energy: -0.2 },
        'traumatic': { valence: -0.3, energy: -0.2 }
    };
    
    let profile = weights[analysis.emotional_weight] || weights['medium'];
    const adj = adjustments[analysis.subject_gravity] || { valence: 0, energy: 0 };
    
    return {
        valence: Math.max(0, Math.min(1, profile.valence + adj.valence)),
        energy: Math.max(0, Math.min(1, profile.energy + adj.energy))
    };
}

// Match mood
function matchMood(features, target) {
    const vDiff = Math.abs(features.valence - target.valence);
    const eDiff = Math.abs(features.energy - target.energy);
    return 1 - ((vDiff + eDiff) / 2);
}

// Select best tracks
function selectBest(tracks) {
    const unique = Array.from(new Map(tracks.map(t => [t.id, t])).values());
    unique.sort((a, b) => b.qualityScore - a.qualityScore);
    return unique.slice(0, SEARCH_CONFIG.TARGET_PLAYLIST_SIZE);
}

// UI functions
function showLoading() {
    document.getElementById('searchSection').style.display = 'none';
    document.getElementById('loadingSection').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loadingSection').style.display = 'none';
}

function displayResults(bookTitle, tracks) {
    hideLoading();
    
    document.getElementById('resultBookTitle').textContent = bookTitle;
    document.getElementById('trackCount').textContent = tracks.length;
    
    const html = tracks.map((track, i) => `
        <div class="track-item">
            <div class="track-number">${i + 1}</div>
            <img src="${track.album.images[2]?.url || track.album.images[0]?.url}" 
                 alt="${track.name}" class="track-image">
            <div class="track-info">
                <div class="track-name">${track.name}</div>
                <div class="track-artist">${track.artists[0].name}</div>
            </div>
            <div class="track-duration">${formatDuration(track.duration_ms)}</div>
            <button class="play-preview-btn" onclick="playPreview('${track.preview_url}')" 
                    ${!track.preview_url ? 'disabled' : ''}>▶</button>
        </div>
    `).join('');
    
    document.getElementById('trackList').innerHTML = html;
    document.getElementById('resultsSection').style.display = 'block';
}

function formatDuration(ms) {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

function playPreview(url) {
    if (!url) return;
    
    const existing = document.querySelector('audio');
    if (existing) {
        existing.pause();
        existing.remove();
    }
    
    const audio = new Audio(url);
    audio.volume = 0.5;
    audio.play();
}

function findAnotherSoundtrack() {
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('searchSection').style.display = 'block';
    document.getElementById('bookTitle').value = '';
    document.getElementById('bookTitle').focus();
}

// Token management
let cachedToken = null;
let tokenExpiry = null;

async function getSpotifyToken() {
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + btoa(CONFIG.SPOTIFY_CLIENT_ID + ':' + CONFIG.SPOTIFY_CLIENT_SECRET)
        },
        body: 'grant_type=client_credentials'
    });

    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
    
    return cachedToken;
}

// Event listener
document.getElementById('bookTitle').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') generatePlaylist();
});
document.getElementById('generateBtn').addEventListener('click', generatePlaylist);
