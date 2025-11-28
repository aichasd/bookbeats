// BookTunes - Main Script
// Autocomplete, playlist generation, and sophisticated music curation

let generatedTracks = [];
let currentAnalysis = null;
let selectedBook = null;

// Configuration
const CONFIG_SEARCH = {
    MIN_QUALITY_SCORE: 75,
    MIN_QUALITY_SCORE_SENSITIVE: 85,
    TARGET_TRACKS: 30,
    MIN_INSTRUMENTALNESS: 0.70,
    MAX_SPEECHINESS: 0.33
};

const BASE_BLACKLIST = [
    'comedy', 'stand-up', 'podcast', 'audiobook', 'spoken word',
    'kids', 'children', 'christmas', 'holiday', 'karaoke'
];

// ==========================================
// AUTOCOMPLETE (Google Books API)
// ==========================================

const bookInput = document.getElementById('bookInput');
const autocompleteResults = document.getElementById('autocompleteResults');
let autocompleteTimeout;

bookInput.addEventListener('input', function() {
    clearTimeout(autocompleteTimeout);
    const query = this.value.trim();
    
    if (query.length < 2) {
        autocompleteResults.style.display = 'none';
        return;
    }
    
    autocompleteTimeout = setTimeout(() => searchBooks(query), 300);
});

async function searchBooks(query) {
    try {
        const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`
        );
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            displayAutocomplete(data.items);
        } else {
            autocompleteResults.style.display = 'none';
        }
    } catch (error) {
        console.error('Autocomplete error:', error);
    }
}

function displayAutocomplete(books) {
    autocompleteResults.innerHTML = books.map(book => {
        const info = book.volumeInfo;
        const title = info.title || 'Unknown Title';
        const author = info.authors ? info.authors[0] : 'Unknown Author';
        const cover = info.imageLinks?.thumbnail || '';
        
        return `
            <div class="autocomplete-item" onclick="selectBook('${escapeHtml(title)}', '${escapeHtml(author)}', '${escapeHtml(cover)}')">
                ${cover ? `<img src="${cover}" alt="${title}">` : ''}
                <div>
                    <div class="book-title-auto">${title}</div>
                    <div class="book-author-auto">${author}</div>
                </div>
            </div>
        `;
    }).join('');
    
    autocompleteResults.style.display = 'block';
}

function selectBook(title, author, cover) {
    selectedBook = { title, author, cover };
    bookInput.value = title;
    autocompleteResults.style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/'/g, "\\'");
}

// Hide autocomplete when clicking outside
document.addEventListener('click', function(e) {
    if (!bookInput.contains(e.target) && !autocompleteResults.contains(e.target)) {
        autocompleteResults.style.display = 'none';
    }
});

// ==========================================
// PLAYLIST GENERATION
// ==========================================

async function generatePlaylist() {
    const title = bookInput.value.trim();
    
    if (!title) {
        alert('Please enter a book title');
        return;
    }
    
    const preferences = {
        instrumentalOnly: document.getElementById('instrumentalOnly').checked,
        foreignLyricsOk: document.getElementById('foreignLyrics').checked
    };
    
    showLoading();
    
    try {
        console.log('📚 Analyzing:', title);
        currentAnalysis = await analyzeBook(title);
        
        console.log('✅ Analysis complete');
        
        // Build dynamic blacklist
        const blacklist = [
            ...BASE_BLACKLIST,
            ...currentAnalysis.exclusions
        ];
        
        console.log('🎵 Searching tracks...');
        const tracks = await searchWithStrategies(currentAnalysis, preferences, blacklist);
        
        if (tracks.length === 0) {
            throw new Error('No tracks found. Try different preferences.');
        }
        
        console.log('🔍 Validating tracks...');
        const minScore = currentAnalysis.sensitive_topics.length > 0 
            ? CONFIG_SEARCH.MIN_QUALITY_SCORE_SENSITIVE 
            : CONFIG_SEARCH.MIN_QUALITY_SCORE;
        
        const validated = await validateTracks(tracks, preferences, currentAnalysis, minScore);
        
        if (validated.length === 0) {
            throw new Error('No tracks passed quality validation.');
        }
        
        generatedTracks = selectBestTracks(validated);
        
        console.log('✅ PLAYLIST READY:', generatedTracks.length, 'tracks');
        console.log('Top tracks:', generatedTracks.slice(0, 3).map(t => 
            `${t.name} by ${t.artists[0].name}`
        ));
        
        displayResults();
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error: ' + error.message);
        hideLoading();
    }
}

// ==========================================
// MUSIC SEARCH STRATEGIES
// ==========================================

async function searchWithStrategies(analysis, prefs, blacklist) {
    const allTracks = [];
    
    // Strategy 1: AI-suggested artists (HIGHEST PRIORITY)
    if (analysis.suggested_artists.length > 0) {
        console.log('🎤 Searching suggested artists');
        for (const artist of analysis.suggested_artists.slice(0, 6)) {
            const query = prefs.instrumentalOnly 
                ? `artist:"${artist}" instrumental`
                : `artist:"${artist}"`;
            
            const results = await searchSpotify(query, 15, blacklist);
            results.forEach(t => t.priorityBoost = 25); // Big boost!
            allTracks.push(...results);
        }
    }
    
    // Strategy 2: Geographic/cultural music
    if (analysis.geographic_setting && prefs.foreignLyricsOk) {
        console.log('🌍 Searching geographic music');
        const queries = [
            `${analysis.geographic_setting} traditional`,
            `${analysis.geographic_setting} folk`,
            `${analysis.geographic_setting} classical`
        ];
        
        for (const query of queries) {
            const results = await searchSpotify(query, 12, blacklist);
            results.forEach(t => t.priorityBoost = 15);
            allTracks.push(...results);
        }
    }
    
    // Strategy 3: Mood + instruments
    console.log('🎹 Searching mood combinations');
    for (const mood of analysis.mood.slice(0, 3)) {
        for (const inst of analysis.instrument_palette.slice(0, 2)) {
            const results = await searchSpotify(`${mood} ${inst}`, 10, blacklist);
            allTracks.push(...results);
        }
    }
    
    // Strategy 4: Genres
    console.log('🎵 Searching genres');
    for (const genre of analysis.genres.slice(0, 3)) {
        const query = prefs.instrumentalOnly 
            ? `genre:"${genre}" instrumental`
            : `genre:"${genre}"`;
        
        const results = await searchSpotify(query, 10, blacklist);
        allTracks.push(...results);
    }
    
    console.log('📊 Collected:', allTracks.length, 'tracks');
    return allTracks;
}

async function searchSpotify(query, limit, blacklist) {
    try {
        const token = await getSpotifyToken();
        const response = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}&market=US`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        if (!response.ok) return [];
        
        const data = await response.json();
        
        // Filter against blacklist
        return data.tracks.items.filter(track => {
            if (!track.album) return false;
            
            const text = `${track.name} ${track.artists[0].name} ${track.album.name}`.toLowerCase();
            return !blacklist.some(blocked => text.includes(blocked));
        });
        
    } catch (error) {
        console.error('Search error:', error);
        return [];
    }
}

// ==========================================
// TRACK VALIDATION
// ==========================================

async function validateTracks(tracks, prefs, analysis, minScore) {
    const token = await getSpotifyToken();
    const validated = [];
    const batchSize = 50;
    
    for (let i = 0; i < tracks.length; i += batchSize) {
        const batch = tracks.slice(i, i + batchSize);
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

function scoreTrack(track, features, prefs, analysis) {
    let score = 50;
    
    // Apply priority boost
    score += track.priorityBoost || 0;
    
    // HARD CHECKS
    if (prefs.instrumentalOnly && features.instrumentalness < CONFIG_SEARCH.MIN_INSTRUMENTALNESS) {
        return 0;
    }
    
    if (features.speechiness > CONFIG_SEARCH.MAX_SPEECHINESS) {
        return 0;
    }
    
    // Sensitive topics enforcement
    if (analysis.sensitive_topics.length > 0) {
        if (features.valence > 0.6 || features.energy > 0.7) return 0;
        if (features.valence < 0.4 && features.energy < 0.5) score += 20;
    }
    
    // Instrumental bonus
    if (prefs.instrumentalOnly) score += 30;
    
    // Mood matching
    const target = getMoodTarget(analysis.emotional_weight);
    const valenceDiff = Math.abs(features.valence - target.valence);
    const energyDiff = Math.abs(features.energy - target.energy);
    const moodMatch = 1 - ((valenceDiff + energyDiff) / 2);
    score += moodMatch * 20;
    
    // Discovery bonus (lesser-known tracks)
    if (track.popularity < 30) score += 10;
    
    // Duration penalty
    const mins = track.duration_ms / 60000;
    if (mins < 1 || mins > 10) score -= 20;
    
    return Math.max(0, Math.min(100, score));
}

function getMoodTarget(weight) {
    const targets = {
        'light': { valence: 0.6, energy: 0.5 },
        'medium': { valence: 0.5, energy: 0.4 },
        'heavy': { valence: 0.3, energy: 0.3 },
        'devastating': { valence: 0.2, energy: 0.3 }
    };
    return targets[weight] || targets['medium'];
}

function selectBestTracks(tracks) {
    const unique = Array.from(new Map(tracks.map(t => [t.id, t])).values());
    unique.sort((a, b) => b.qualityScore - a.qualityScore);
    return unique.slice(0, CONFIG_SEARCH.TARGET_TRACKS);
}

// ==========================================
// UI FUNCTIONS
// ==========================================

function showLoading() {
    document.getElementById('homepage').style.display = 'none';
    document.getElementById('loadingScreen').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingScreen').style.display = 'none';
}

function displayResults() {
    hideLoading();
    
    const resultsPage = document.getElementById('resultsPage');
    const playerContainer = document.getElementById('playerContainer');
    
    // Set book info
    if (selectedBook) {
        document.getElementById('bookCover').src = selectedBook.cover || '';
        document.getElementById('bookTitle').textContent = selectedBook.title;
        document.getElementById('bookAuthor').textContent = selectedBook.author;
    } else {
        document.getElementById('bookCover').style.display = 'none';
        document.getElementById('bookTitle').textContent = bookInput.value;
        document.getElementById('bookAuthor').textContent = '';
    }
    
    // Display track list
    playerContainer.innerHTML = `
        <div class="track-list">
            ${generatedTracks.map((track, i) => `
                <div class="track-item">
                    <span class="track-number">${i + 1}</span>
                    <img src="${track.album.images[2]?.url || track.album.images[0]?.url}" class="track-img">
                    <div class="track-info">
                        <div class="track-name">${track.name}</div>
                        <div class="track-artist">${track.artists[0].name}</div>
                    </div>
                    <span class="track-duration">${formatDuration(track.duration_ms)}</span>
                </div>
            `).join('')}
        </div>
        <button class="connect-spotify-btn" onclick="connectSpotify()">
            Save to Spotify
        </button>
    `;
    
    resultsPage.style.display = 'block';
}

function formatDuration(ms) {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, '0')}`;
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

// ==========================================
// EVENT LISTENERS
// ==========================================

// Generate button
document.getElementById('generateBtn').addEventListener('click', generatePlaylist);

// Enter key
bookInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        autocompleteResults.style.display = 'none';
        generatePlaylist();
    }
});

// Find another soundtrack button
document.getElementById('findAnotherBtn')?.addEventListener('click', () => {
    document.getElementById('resultsPage').style.display = 'none';
    document.getElementById('homepage').style.display = 'block';
    bookInput.value = '';
    selectedBook = null;
});

// Try another button
document.getElementById('tryAnotherBtn')?.addEventListener('click', () => {
    document.getElementById('resultsPage').style.display = 'none';
    document.getElementById('homepage').style.display = 'block';
});

console.log('✅ BookTunes loaded');
