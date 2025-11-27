// BookTunes - Enhanced Music Search with Better Curation
// Improved track filtering, audio feature validation, and cultural context support

let aiGeneratedTracks = [];
let currentAnalysis = null;

// ==========================================
// CONFIGURATION
// ==========================================

const SEARCH_CONFIG = {
    MIN_QUALITY_SCORE: 75,  // Raised from 60
    MAX_TRACKS_PER_QUERY: 50,
    TARGET_PLAYLIST_SIZE: 30,
    MIN_INSTRUMENTALNESS: 0.70,  // For instrumental-only preference
    MAX_SPEECHINESS: 0.33,  // Exclude spoken word/podcasts
    BATCH_SIZE: 50  // For audio features API
};

// Expanded genre blacklist
const GENRE_BLACKLIST = [
    'comedy', 'stand-up', 'podcast', 'audiobook', 'spoken word',
    'kids', 'children', 'christmas', 'holiday',
    'edm', 'dubstep', 'hardstyle', 'drum and bass',
    'party', 'club', 'dance pop'
];

// ==========================================
// MAIN GENERATION FUNCTION
// ==========================================

async function generatePlaylist() {
    const bookTitle = document.getElementById('bookTitle').value.trim();
    
    if (!bookTitle) {
        alert('Please enter a book title');
        return;
    }

    // Get user preferences
    const userPreferences = {
        instrumentalOnly: document.getElementById('instrumentalOnly').checked,
        foreignLyricsOk: document.getElementById('foreignLyricsOk').checked
    };

    // Show loading state
    showLoading();

    try {
        // Step 1: Analyze book with AI
        console.log('📚 Analyzing book:', bookTitle);
        currentAnalysis = await analyzeBook(bookTitle);
        console.log('✅ AI Analysis:', currentAnalysis);
        console.log('🎛️ User preferences:', userPreferences);

        // Step 2: Search for tracks using multi-strategy approach
        const tracks = await searchTracksWithStrategies(currentAnalysis, userPreferences);
        
        if (tracks.length === 0) {
            throw new Error('No suitable tracks found. Try a different book or adjust your preferences.');
        }

        // Step 3: Validate tracks with audio features
        const validatedTracks = await validateTracksWithAudioFeatures(tracks, userPreferences, currentAnalysis);

        if (validatedTracks.length === 0) {
            throw new Error('No tracks passed quality validation. Try adjusting your preferences.');
        }

        // Step 4: Deduplicate and select best tracks
        aiGeneratedTracks = selectBestTracks(validatedTracks, SEARCH_CONFIG.TARGET_PLAYLIST_SIZE);

        console.log('✅ FINAL PLAYLIST:', aiGeneratedTracks.length, 'tracks selected');
        console.log('Top 10 tracks:', aiGeneratedTracks.slice(0, 10).map(t => 
            `"${t.name}" by ${t.artists[0].name} (score: ${t.qualityScore})`
        ));

        // Display results
        displayResults(bookTitle, aiGeneratedTracks);

    } catch (error) {
        console.error('❌ Error generating playlist:', error);
        alert('Error: ' + error.message);
        hideLoading();
    }
}

// ==========================================
// MULTI-STRATEGY TRACK SEARCH
// ==========================================

async function searchTracksWithStrategies(analysis, preferences) {
    const allTracks = [];
    
    // Strategy 1: Geographic/Cultural Context (if available)
    if (analysis.geographic_setting && preferences.foreignLyricsOk) {
        console.log('🌍 Strategy 1: Searching for geographic/cultural context...');
        const geoTracks = await searchGeographicMusic(analysis);
        allTracks.push(...geoTracks);
    }

    // Strategy 2: Specific Artists (if AI suggested any)
    if (analysis.suggested_artists && analysis.suggested_artists.length > 0) {
        console.log('🎤 Strategy 2: Searching for specific artists (highest priority)...');
        const artistTracks = await searchByArtists(analysis.suggested_artists, preferences);
        allTracks.push(...artistTracks);
    }

    // Strategy 3: Mood + Instruments
    console.log('🎹 Strategy 3: Searching for instruments with cultural context...');
    const instrumentTracks = await searchByInstruments(analysis, preferences);
    allTracks.push(...instrumentTracks);

    // Strategy 4: Cultural Genres
    console.log('🎵 Strategy 4: Searching for cultural genres...');
    const genreTracks = await searchByCulturalGenres(analysis, preferences);
    allTracks.push(...genreTracks);

    // Strategy 5: Mood + Setting
    console.log('🎭 Strategy 5: Searching for setting + mood...');
    const moodTracks = await searchByMoodAndSetting(analysis, preferences);
    allTracks.push(...moodTracks);

    // Strategy 6: Historical/Time Period
    if (analysis.time_period) {
        console.log('⏰ Strategy 6: Searching for time period music...');
        const periodTracks = await searchByTimePeriod(analysis, preferences);
        allTracks.push(...periodTracks);
    }

    console.log('📊 Total tracks collected:', allTracks.length);
    return allTracks;
}

// ==========================================
// SEARCH STRATEGY IMPLEMENTATIONS
// ==========================================

async function searchGeographicMusic(analysis) {
    const tracks = [];
    const setting = analysis.geographic_setting;
    
    if (!setting) return tracks;

    // Search for traditional/folk music from the region
    const queries = [
        `${setting} traditional music`,
        `${setting} folk music`,
        `${setting} instrumental`,
        `${setting} classical music`
    ];

    for (const query of queries) {
        const results = await searchSpotify(query, 20);
        tracks.push(...results);
    }

    return tracks;
}

async function searchByArtists(artists, preferences) {
    const tracks = [];
    
    for (const artist of artists) {
        console.log(`   🔍 Searching artist: ${artist}`);
        const query = preferences.instrumentalOnly 
            ? `artist:${artist} instrumental`
            : `artist:${artist}`;
        
        const results = await searchSpotify(query, 15);
        console.log(`   ✓ Found ${results.length} tracks for '${artist}' (score: 80)`);
        
        // Boost score for specifically suggested artists
        results.forEach(track => track.qualityScore = (track.qualityScore || 0) + 20);
        tracks.push(...results);
    }

    return tracks;
}

async function searchByInstruments(analysis, preferences) {
    const tracks = [];
    const moods = analysis.mood || [];
    const instruments = ['piano', 'guitar', 'strings', 'ambient', 'classical'];
    
    for (const mood of moods.slice(0, 2)) {
        for (const instrument of instruments) {
            const query = `${instrument} ${mood}`;
            const results = await searchSpotify(query, 12);
            tracks.push(...results);
        }
    }

    return tracks;
}

async function searchByCulturalGenres(analysis, preferences) {
    const tracks = [];
    
    // Map geographic settings to music genres
    const culturalGenres = getCulturalGenres(analysis.geographic_setting);
    
    for (const genre of culturalGenres) {
        const query = preferences.instrumentalOnly 
            ? `genre:"${genre}" instrumental`
            : `genre:"${genre}"`;
        
        const results = await searchSpotify(query, 15);
        tracks.push(...results);
    }

    return tracks;
}

async function searchByMoodAndSetting(analysis, preferences) {
    const tracks = [];
    const moods = analysis.mood || [];
    const setting = analysis.setting_place || 'unknown';
    
    // Combine mood with setting descriptors
    const settingDescriptors = getSettingDescriptors(setting);
    
    for (const mood of moods.slice(0, 2)) {
        for (const descriptor of settingDescriptors) {
            const query = `${mood} ${descriptor}`;
            const results = await searchSpotify(query, 10);
            tracks.push(...results);
        }
    }

    return tracks;
}

async function searchByTimePeriod(analysis, preferences) {
    const tracks = [];
    const period = analysis.time_period;
    
    if (!period) return tracks;

    const queries = [
        `${period} instrumental`,
        `${period} classical`,
        `${period} soundtrack`
    ];

    for (const query of queries) {
        const results = await searchSpotify(query, 15);
        tracks.push(...results);
    }

    return tracks;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getCulturalGenres(setting) {
    if (!setting) return ['ambient', 'classical', 'instrumental'];
    
    const genreMap = {
        'Turkey': ['turkish classical', 'turkish folk', 'ottoman classical'],
        'Romania': ['romanian folk', 'romanian classical'],
        'Japan': ['japanese traditional', 'gagaku', 'shamisen'],
        'India': ['indian classical', 'raga', 'sitar'],
        'Middle East': ['arabic classical', 'oud', 'qanun'],
        'Russia': ['russian classical', 'russian folk'],
        'Ireland': ['irish traditional', 'celtic'],
        'Spain': ['flamenco', 'spanish classical'],
        'Brazil': ['bossa nova', 'brazilian jazz'],
        'Africa': ['african traditional', 'kora', 'mbira']
    };

    return genreMap[setting] || ['world music', 'ethnic', 'traditional'];
}

function getSettingDescriptors(setting) {
    const descriptors = {
        'urban': ['city', 'metropolitan', 'nocturne'],
        'rural': ['pastoral', 'countryside', 'nature'],
        'nature': ['forest', 'mountains', 'ambient'],
        'indoor': ['intimate', 'chamber', 'quiet'],
        'unknown': ['atmospheric', 'cinematic', 'ambient']
    };

    return descriptors[setting] || descriptors['unknown'];
}

// ==========================================
// SPOTIFY SEARCH WITH FILTERING
// ==========================================

async function searchSpotify(query, limit = 20) {
    try {
        const token = await getSpotifyToken();
        const params = new URLSearchParams({
            q: query,
            type: 'track',
            limit: limit,
            market: 'US'
        });

        const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Spotify search failed: ${response.status}`);
        }

        const data = await response.json();
        
        // Filter out blacklisted tracks
        const filtered = data.tracks.items.filter(track => {
            // Exclude podcasts/episodes (check if track has album type)
            if (!track.album || track.album.album_type === 'compilation') {
                return false;
            }

            // Check for blacklisted genres
            const trackName = track.name.toLowerCase();
            const artistName = track.artists[0].name.toLowerCase();
            
            return !GENRE_BLACKLIST.some(blocked => 
                trackName.includes(blocked) || artistName.includes(blocked)
            );
        });

        return filtered;

    } catch (error) {
        console.error('Spotify search error:', error);
        return [];
    }
}

// ==========================================
// AUDIO FEATURES VALIDATION
// ==========================================

async function validateTracksWithAudioFeatures(tracks, preferences, analysis) {
    console.log('🔍 Validating tracks with audio features...');
    
    const token = await getSpotifyToken();
    const validatedTracks = [];
    
    // Process in batches
    for (let i = 0; i < tracks.length; i += SEARCH_CONFIG.BATCH_SIZE) {
        const batch = tracks.slice(i, i + SEARCH_CONFIG.BATCH_SIZE);
        const ids = batch.map(t => t.id).join(',');
        
        try {
            const response = await fetch(`https://api.spotify.com/v1/audio-features?ids=${ids}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) continue;

            const data = await response.json();
            
            // Validate each track
            for (let j = 0; j < batch.length; j++) {
                const track = batch[j];
                const features = data.audio_features[j];
                
                if (!features) continue;

                // Calculate quality score based on audio features
                const score = calculateAudioQualityScore(track, features, preferences, analysis);
                
                if (score >= SEARCH_CONFIG.MIN_QUALITY_SCORE) {
                    track.audioFeatures = features;
                    track.qualityScore = score;
                    validatedTracks.push(track);
                }
            }
        } catch (error) {
            console.error('Error fetching audio features:', error);
        }
    }

    console.log(`✅ ${validatedTracks.length} tracks passed validation (min score: ${SEARCH_CONFIG.MIN_QUALITY_SCORE})`);
    return validatedTracks;
}

function calculateAudioQualityScore(track, features, preferences, analysis) {
    let score = 50; // Base score

    // CRITICAL: Instrumental preference
    if (preferences.instrumentalOnly) {
        if (features.instrumentalness < SEARCH_CONFIG.MIN_INSTRUMENTALNESS) {
            return 0; // Hard reject
        }
        score += 30; // Big bonus for being instrumental
    }

    // CRITICAL: Exclude spoken word/podcasts
    if (features.speechiness > SEARCH_CONFIG.MAX_SPEECHINESS) {
        return 0; // Hard reject comedy/podcasts
    }

    // Mood matching
    const targetMood = getMoodProfile(analysis);
    const moodScore = calculateMoodMatch(features, targetMood);
    score += moodScore * 20;

    // Popularity bonus (discover great old music)
    if (track.popularity) {
        if (track.popularity < 30) {
            score += 10; // Bonus for discovering lesser-known tracks
        }
    }

    // Duration check (avoid very short/long tracks)
    const durationMin = track.duration_ms / 60000;
    if (durationMin < 1 || durationMin > 10) {
        score -= 20;
    }

    return Math.max(0, Math.min(100, score));
}

function getMoodProfile(analysis) {
    const moods = analysis.mood || [];
    
    // Map moods to audio features
    const moodProfiles = {
        'melancholic': { valence: 0.3, energy: 0.4 },
        'contemplative': { valence: 0.4, energy: 0.3 },
        'tense': { valence: 0.3, energy: 0.6 },
        'peaceful': { valence: 0.6, energy: 0.2 },
        'mysterious': { valence: 0.4, energy: 0.5 },
        'nostalgic': { valence: 0.5, energy: 0.3 },
        'hopeful': { valence: 0.7, energy: 0.5 },
        'dark': { valence: 0.2, energy: 0.4 }
    };

    // Average the profiles of all moods
    const profiles = moods.map(m => moodProfiles[m]).filter(p => p);
    
    if (profiles.length === 0) {
        return { valence: 0.5, energy: 0.4 }; // Default
    }

    return {
        valence: profiles.reduce((sum, p) => sum + p.valence, 0) / profiles.length,
        energy: profiles.reduce((sum, p) => sum + p.energy, 0) / profiles.length
    };
}

function calculateMoodMatch(features, targetMood) {
    const valenceDiff = Math.abs(features.valence - targetMood.valence);
    const energyDiff = Math.abs(features.energy - targetMood.energy);
    
    // Convert difference to similarity score (0-1)
    const similarity = 1 - ((valenceDiff + energyDiff) / 2);
    return similarity;
}

// ==========================================
// TRACK SELECTION AND DEDUPLICATION
// ==========================================

function selectBestTracks(tracks, targetSize) {
    // Deduplicate by track ID
    const uniqueTracks = Array.from(
        new Map(tracks.map(t => [t.id, t])).values()
    );

    console.log('📊 After deduplication:', uniqueTracks.length, 'unique tracks');

    // Sort by quality score
    uniqueTracks.sort((a, b) => b.qualityScore - a.qualityScore);

    // Select top tracks
    const selected = uniqueTracks.slice(0, targetSize);
    
    return selected;
}

// ==========================================
// UI FUNCTIONS
// ==========================================

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
    
    // Display track list
    const trackListDiv = document.getElementById('trackList');
    trackListDiv.innerHTML = tracks.map((track, index) => `
        <div class="track-item">
            <div class="track-number">${index + 1}</div>
            <img src="${track.album.images[2]?.url || track.album.images[0]?.url}" 
                 alt="${track.name}" class="track-image">
            <div class="track-info">
                <div class="track-name">${track.name}</div>
                <div class="track-artist">${track.artists[0].name}</div>
            </div>
            <div class="track-duration">${formatDuration(track.duration_ms)}</div>
            <button class="play-preview-btn" onclick="playPreview('${track.preview_url}')" 
                    ${!track.preview_url ? 'disabled' : ''}>
                ▶
            </button>
        </div>
    `).join('');
    
    document.getElementById('resultsSection').style.display = 'block';
}

function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function playPreview(url) {
    if (!url) return;
    
    // Stop any currently playing preview
    const existingAudio = document.querySelector('audio');
    if (existingAudio) {
        existingAudio.pause();
        existingAudio.remove();
    }
    
    // Play new preview
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

// ==========================================
// SPOTIFY TOKEN MANAGEMENT
// ==========================================

let cachedToken = null;
let tokenExpiry = null;

async function getSpotifyToken() {
    // Return cached token if still valid
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + btoa(CONFIG.SPOTIFY_CLIENT_ID + ':' + CONFIG.SPOTIFY_CLIENT_SECRET)
            },
            body: 'grant_type=client_credentials'
        });

        if (!response.ok) {
            throw new Error('Failed to get Spotify token');
        }

        const data = await response.json();
        cachedToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min before expiry
        
        console.log('Got Spotify token!', cachedToken.substring(0, 20) + '...');
        return cachedToken;

    } catch (error) {
        console.error('Error getting Spotify token:', error);
        throw error;
    }
}

// ==========================================
// EVENT LISTENERS
// ==========================================

document.getElementById('bookTitle').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        generatePlaylist();
    }
});
