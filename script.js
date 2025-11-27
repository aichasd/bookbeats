// BookTunes - Enhanced Music Search with Sophisticated Filtering
// Respects explicit exclusions, sensitive topics, and atmospheric guidance

let aiGeneratedTracks = [];
let currentAnalysis = null;

// ==========================================
// CONFIGURATION
// ==========================================

const SEARCH_CONFIG = {
    MIN_QUALITY_SCORE: 75,
    MIN_QUALITY_SCORE_SENSITIVE: 80,  // Higher threshold for sensitive topics
    MAX_TRACKS_PER_QUERY: 50,
    TARGET_PLAYLIST_SIZE: 30,
    MIN_INSTRUMENTALNESS: 0.70,
    MAX_SPEECHINESS: 0.33,
    BATCH_SIZE: 50
};

// Base genre blacklist (always applied)
const BASE_GENRE_BLACKLIST = [
    'comedy', 'stand-up', 'podcast', 'audiobook', 'spoken word',
    'kids', 'children', 'christmas', 'holiday'
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

    const userPreferences = {
        instrumentalOnly: document.getElementById('instrumentalOnly').checked,
        foreignLyricsOk: document.getElementById('foreignLyricsOk').checked
    };

    showLoading();

    try {
        // Step 1: Deep AI analysis
        console.log('📚 Analyzing book:', bookTitle);
        currentAnalysis = await analyzeBook(bookTitle);
        console.log('✅ DEEP ANALYSIS COMPLETE');
        console.log('   Emotional weight:', currentAnalysis.emotional_weight);
        console.log('   Subject gravity:', currentAnalysis.subject_gravity);
        console.log('   Sensitive topics:', currentAnalysis.sensitive_topics);
        console.log('   Explicit exclusions:', currentAnalysis.explicit_exclusions);
        console.log('🎛️ User preferences:', userPreferences);

        // Step 2: Build dynamic blacklist based on analysis
        const dynamicBlacklist = buildDynamicBlacklist(currentAnalysis);
        console.log('🚫 Total blacklist:', dynamicBlacklist);

        // Step 3: Search with sophisticated strategies
        const tracks = await searchTracksWithStrategies(currentAnalysis, userPreferences, dynamicBlacklist);
        
        if (tracks.length === 0) {
            throw new Error('No suitable tracks found. Try adjusting your preferences.');
        }

        // Step 4: Validate with stricter criteria for sensitive topics
        const minScore = currentAnalysis.sensitive_topics?.length > 0 
            ? SEARCH_CONFIG.MIN_QUALITY_SCORE_SENSITIVE 
            : SEARCH_CONFIG.MIN_QUALITY_SCORE;
            
        const validatedTracks = await validateTracksWithAudioFeatures(
            tracks, 
            userPreferences, 
            currentAnalysis,
            minScore
        );

        if (validatedTracks.length === 0) {
            throw new Error('No tracks passed quality validation. The book may require very specific music.');
        }

        // Step 5: Select best tracks
        aiGeneratedTracks = selectBestTracks(validatedTracks, SEARCH_CONFIG.TARGET_PLAYLIST_SIZE);

        console.log('✅ FINAL PLAYLIST:', aiGeneratedTracks.length, 'tracks');
        console.log('Top 5 tracks:', aiGeneratedTracks.slice(0, 5).map(t => 
            `"${t.name}" by ${t.artists[0].name} (score: ${t.qualityScore})`
        ));

        displayResults(bookTitle, aiGeneratedTracks);

    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error: ' + error.message);
        hideLoading();
    }
}

// ==========================================
// DYNAMIC BLACKLIST BUILDER
// ==========================================

function buildDynamicBlacklist(analysis) {
    let blacklist = [...BASE_GENRE_BLACKLIST];
    
    // Add explicit exclusions from AI
    if (analysis.explicit_exclusions) {
        blacklist.push(...analysis.explicit_exclusions.map(e => e.toLowerCase()));
    }
    
    // Add automatic exclusions based on subject gravity
    if (analysis.subject_gravity === 'tragic' || analysis.subject_gravity === 'traumatic') {
        blacklist.push(
            'party', 'dance', 'edm', 'reggaeton', 'latin pop', 'dance pop',
            'upbeat', 'cheerful', 'happy', 'festive', 'celebratory',
            'club', 'energetic', 'optimistic'
        );
    }
    
    // Add exclusions for sensitive topics
    if (analysis.sensitive_topics?.length > 0) {
        blacklist.push(
            'party', 'dance', 'edm', 'dubstep', 'hardstyle',
            'reggaeton', 'latin pop', 'k-pop', 'j-pop',
            'upbeat', 'cheerful', 'fun', 'happy'
        );
    }
    
    return [...new Set(blacklist)]; // Remove duplicates
}

// ==========================================
// MULTI-STRATEGY SEARCH
// ==========================================

async function searchTracksWithStrategies(analysis, preferences, blacklist) {
    const allTracks = [];
    
    // Strategy 1: Reference Composers/Artists (HIGHEST PRIORITY)
    if (analysis.suggested_artists?.length > 0) {
        console.log('🎤 Strategy 1: AI-suggested artists (highest priority)');
        const artistTracks = await searchBySpecificArtists(
            analysis.suggested_artists, 
            preferences, 
            blacklist
        );
        allTracks.push(...artistTracks);
    }
    
    if (analysis.reference_composers?.length > 0) {
        console.log('🎼 Strategy 1b: Reference composers');
        const composerTracks = await searchBySpecificArtists(
            analysis.reference_composers,
            preferences,
            blacklist
        );
        allTracks.push(...composerTracks);
    }
    
    // Strategy 2: Geographic/Cultural Music
    if (analysis.geographic_setting && preferences.foreignLyricsOk) {
        console.log('🌍 Strategy 2: Geographic/cultural context');
        const geoTracks = await searchGeographicMusic(analysis, blacklist);
        allTracks.push(...geoTracks);
    }
    
    // Strategy 3: Atmospheric Descriptors + Instruments
    console.log('🎹 Strategy 3: Atmospheric qualities');
    const atmosphericTracks = await searchByAtmosphere(analysis, preferences, blacklist);
    allTracks.push(...atmosphericTracks);
    
    // Strategy 4: Genre Suggestions
    if (analysis.genre_suggestions?.length > 0) {
        console.log('🎵 Strategy 4: AI-suggested genres');
        const genreTracks = await searchByGenres(
            analysis.genre_suggestions,
            preferences,
            blacklist
        );
        allTracks.push(...genreTracks);
    }
    
    // Strategy 5: Mood + Setting
    console.log('🎭 Strategy 5: Mood combinations');
    const moodTracks = await searchByMoodCombinations(analysis, preferences, blacklist);
    allTracks.push(...moodTracks);
    
    // Strategy 6: Time Period (if relevant)
    if (analysis.time_period) {
        console.log('⏰ Strategy 6: Time period');
        const periodTracks = await searchByTimePeriod(analysis, preferences, blacklist);
        allTracks.push(...periodTracks);
    }
    
    console.log('📊 Total tracks collected:', allTracks.length);
    return allTracks;
}

// ==========================================
// SEARCH IMPLEMENTATIONS
// ==========================================

async function searchBySpecificArtists(artists, preferences, blacklist) {
    const tracks = [];
    
    for (const artist of artists) {
        console.log(`   🔍 Searching: ${artist}`);
        
        const query = preferences.instrumentalOnly 
            ? `artist:"${artist}" instrumental`
            : `artist:"${artist}"`;
        
        const results = await searchSpotify(query, 20, blacklist);
        console.log(`   ✓ Found ${results.length} tracks`);
        
        // MAJOR BOOST for AI-suggested artists
        results.forEach(track => {
            track.qualityScore = (track.qualityScore || 50) + 25;
        });
        
        tracks.push(...results);
    }
    
    return tracks;
}

async function searchGeographicMusic(analysis, blacklist) {
    const tracks = [];
    const setting = analysis.geographic_setting;
    
    if (!setting) return tracks;
    
    const queries = [
        `${setting} traditional instrumental`,
        `${setting} folk music`,
        `${setting} classical music`,
        `${setting} ${analysis.instrument_palette?.[0] || 'ambient'}`
    ];
    
    for (const query of queries) {
        const results = await searchSpotify(query, 15, blacklist);
        tracks.push(...results);
    }
    
    return tracks;
}

async function searchByAtmosphere(analysis, preferences, blacklist) {
    const tracks = [];
    const descriptors = analysis.atmospheric_descriptors || [];
    const instruments = analysis.instrument_palette || ['piano', 'strings', 'ambient'];
    
    for (const descriptor of descriptors.slice(0, 3)) {
        for (const instrument of instruments.slice(0, 2)) {
            const query = `${descriptor} ${instrument}`;
            const results = await searchSpotify(query, 10, blacklist);
            tracks.push(...results);
        }
    }
    
    return tracks;
}

async function searchByGenres(genres, preferences, blacklist) {
    const tracks = [];
    
    for (const genre of genres) {
        const query = preferences.instrumentalOnly
            ? `genre:"${genre}" instrumental`
            : `genre:"${genre}"`;
        
        const results = await searchSpotify(query, 15, blacklist);
        tracks.push(...results);
    }
    
    return tracks;
}

async function searchByMoodCombinations(analysis, preferences, blacklist) {
    const tracks = [];
    const moods = analysis.mood || [];
    
    for (const mood of moods.slice(0, 3)) {
        const query = `${mood} ${analysis.sonic_texture || 'ambient'}`;
        const results = await searchSpotify(query, 12, blacklist);
        tracks.push(...results);
    }
    
    return tracks;
}

async function searchByTimePeriod(analysis, preferences, blacklist) {
    const tracks = [];
    const period = analysis.time_period;
    
    const queries = [
        `${period} instrumental`,
        `${period} classical`,
        `${period} traditional`
    ];
    
    for (const query of queries) {
        const results = await searchSpotify(query, 12, blacklist);
        tracks.push(...results);
    }
    
    return tracks;
}

// ==========================================
// SPOTIFY SEARCH WITH BLACKLIST
// ==========================================

async function searchSpotify(query, limit, blacklist) {
    try {
        const token = await getSpotifyToken();
        const params = new URLSearchParams({
            q: query,
            type: 'track',
            limit: limit,
            market: 'US'
        });

        const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return [];

        const data = await response.json();
        
        // Apply blacklist filtering
        const filtered = data.tracks.items.filter(track => {
            if (!track.album) return false;
            
            const trackName = track.name.toLowerCase();
            const artistName = track.artists[0].name.toLowerCase();
            const albumName = track.album.name.toLowerCase();
            
            // Check against blacklist
            return !blacklist.some(blocked => 
                trackName.includes(blocked) || 
                artistName.includes(blocked) ||
                albumName.includes(blocked)
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

async function validateTracksWithAudioFeatures(tracks, preferences, analysis, minScore) {
    console.log(`🔍 Validating tracks (min score: ${minScore})...`);
    
    const token = await getSpotifyToken();
    const validatedTracks = [];
    
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

                const score = calculateAudioQualityScore(
                    track, 
                    features, 
                    preferences, 
                    analysis
                );
                
                if (score >= minScore) {
                    track.audioFeatures = features;
                    track.qualityScore = score;
                    validatedTracks.push(track);
                }
            }
        } catch (error) {
            console.error('Audio features error:', error);
        }
    }

    console.log(`✅ ${validatedTracks.length} tracks validated`);
    return validatedTracks;
}

function calculateAudioQualityScore(track, features, preferences, analysis) {
    let score = 50;

    // CRITICAL: Instrumental check
    if (preferences.instrumentalOnly) {
        if (features.instrumentalness < SEARCH_CONFIG.MIN_INSTRUMENTALNESS) {
            return 0;
        }
        score += 30;
    }

    // CRITICAL: No spoken word/podcasts
    if (features.speechiness > SEARCH_CONFIG.MAX_SPEECHINESS) {
        return 0;
    }

    // CRITICAL: For sensitive topics, enforce somber mood
    if (analysis.sensitive_topics?.length > 0) {
        // Reject upbeat music
        if (features.valence > 0.6) return 0;
        if (features.energy > 0.7) return 0;
        
        // Bonus for somber qualities
        if (features.valence < 0.4 && features.energy < 0.5) {
            score += 20;
        }
    }

    // Mood matching based on emotional weight
    const targetMood = getMoodProfile(analysis);
    const moodScore = calculateMoodMatch(features, targetMood);
    score += moodScore * 25;

    // Bonus for lesser-known tracks (discovery)
    if (track.popularity < 30) {
        score += 10;
    }

    // Duration check
    const durationMin = track.duration_ms / 60000;
    if (durationMin < 1 || durationMin > 10) {
        score -= 20;
    }

    return Math.max(0, Math.min(100, score));
}

function getMoodProfile(analysis) {
    // Map emotional weight to target audio features
    const weightProfiles = {
        'light': { valence: 0.6, energy: 0.5 },
        'medium': { valence: 0.5, energy: 0.4 },
        'heavy': { valence: 0.3, energy: 0.3 },
        'devastating': { valence: 0.2, energy: 0.3 }
    };
    
    const gravityAdjustments = {
        'lighthearted': { valence: +0.2, energy: +0.1 },
        'contemplative': { valence: 0, energy: -0.1 },
        'serious': { valence: -0.1, energy: -0.1 },
        'tragic': { valence: -0.2, energy: -0.2 },
        'traumatic': { valence: -0.3, energy: -0.2 }
    };
    
    let profile = weightProfiles[analysis.emotional_weight] || weightProfiles['medium'];
    const adjustment = gravityAdjustments[analysis.subject_gravity] || { valence: 0, energy: 0 };
    
    return {
        valence: Math.max(0, Math.min(1, profile.valence + adjustment.valence)),
        energy: Math.max(0, Math.min(1, profile.energy + adjustment.energy))
    };
}

function calculateMoodMatch(features, targetMood) {
    const valenceDiff = Math.abs(features.valence - targetMood.valence);
    const energyDiff = Math.abs(features.energy - targetMood.energy);
    return 1 - ((valenceDiff + energyDiff) / 2);
}

// ==========================================
// TRACK SELECTION
// ==========================================

function selectBestTracks(tracks, targetSize) {
    const uniqueTracks = Array.from(
        new Map(tracks.map(t => [t.id, t])).values()
    );

    console.log('📊 Unique tracks:', uniqueTracks.length);
    
    uniqueTracks.sort((a, b) => b.qualityScore - a.qualityScore);
    return uniqueTracks.slice(0, targetSize);
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
    
    const existingAudio = document.querySelector('audio');
    if (existingAudio) {
        existingAudio.pause();
        existingAudio.remove();
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

// ==========================================
// SPOTIFY TOKEN
// ==========================================

let cachedToken = null;
let tokenExpiry = null;

async function getSpotifyToken() {
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

        const data = await response.json();
        cachedToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
        
        return cachedToken;
    } catch (error) {
        console.error('Token error:', error);
        throw error;
    }
}

// ==========================================
// EVENT LISTENERS
// ==========================================

document.getElementById('bookTitle').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') generatePlaylist();
});
