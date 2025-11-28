// BookTunes - Main Script (No Audio Features Validation)
// Works with basic Spotify search data only

let generatedTracks = [];
let currentAnalysis = null;
let selectedBook = null;

const TARGET_TRACKS = 30;

const BASE_BLACKLIST = [
    'comedy', 'stand-up', 'podcast', 'audiobook', 'spoken word',
    'kids', 'children', 'christmas', 'holiday', 'karaoke', 'disney',
    'trap', 'dubstep', 'hardstyle'
];

// ==========================================
// AUTOCOMPLETE
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
        
        const blacklist = [
            ...BASE_BLACKLIST,
            ...currentAnalysis.exclusions
        ];
        
        console.log('🎵 Searching tracks...');
        const tracks = await searchWithStrategies(currentAnalysis, preferences, blacklist);
        
        if (tracks.length === 0) {
            throw new Error('No tracks found. Try different preferences.');
        }
        
        console.log('✨ Selecting best tracks...');
        generatedTracks = selectBestTracks(tracks, preferences);
        
        if (generatedTracks.length === 0) {
            throw new Error('No suitable tracks found.');
        }
        
        console.log('✅ PLAYLIST READY:', generatedTracks.length, 'tracks');
        console.log('Sample:', generatedTracks.slice(0, 3).map(t => 
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
// MUSIC SEARCH
// ==========================================

async function searchWithStrategies(analysis, prefs, blacklist) {
    const allTracks = [];
    
    // Strategy 1: AI-suggested artists
    if (analysis.suggested_artists.length > 0) {
        console.log('🎤 Searching suggested artists');
        for (const artist of analysis.suggested_artists.slice(0, 6)) {
            const query = prefs.instrumentalOnly 
                ? `artist:"${artist}" instrumental`
                : `artist:"${artist}"`;
            
            const results = await searchSpotify(query, 20, blacklist, prefs);
            results.forEach(t => t.priorityScore = 100); // Highest priority
            allTracks.push(...results);
        }
    }
    
    // Strategy 2: Geographic music
    if (analysis.geographic_setting && prefs.foreignLyricsOk) {
        console.log('🌍 Searching geographic music');
        const queries = [
            `${analysis.geographic_setting} traditional instrumental`,
            `${analysis.geographic_setting} folk instrumental`,
            `${analysis.geographic_setting} classical`
        ];
        
        for (const query of queries) {
            const results = await searchSpotify(query, 15, blacklist, prefs);
            results.forEach(t => t.priorityScore = 80);
            allTracks.push(...results);
        }
    }
    
    // Strategy 3: Mood + instruments
    console.log('🎹 Searching mood combinations');
    for (const mood of analysis.mood.slice(0, 3)) {
        for (const inst of analysis.instrument_palette.slice(0, 2)) {
            const query = prefs.instrumentalOnly
                ? `${mood} ${inst} instrumental`
                : `${mood} ${inst}`;
            
            const results = await searchSpotify(query, 10, blacklist, prefs);
            results.forEach(t => t.priorityScore = 60);
            allTracks.push(...results);
        }
    }
    
    // Strategy 4: Genres
    console.log('🎵 Searching genres');
    for (const genre of analysis.genres.slice(0, 3)) {
        const query = prefs.instrumentalOnly 
            ? `genre:"${genre}" instrumental`
            : `genre:"${genre}"`;
        
        const results = await searchSpotify(query, 12, blacklist, prefs);
        results.forEach(t => t.priorityScore = 50);
        allTracks.push(...results);
    }
    
    console.log('📊 Collected:', allTracks.length, 'tracks');
    return allTracks;
}

async function searchSpotify(query, limit, blacklist, prefs) {
    try {
        const token = await getSpotifyToken();
        const response = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}&market=US`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        if (!response.ok) {
            console.warn('Spotify search failed:', response.status);
            return [];
        }
        
        const data = await response.json();
        
        if (!data.tracks || !data.tracks.items) return [];
        
        // Filter
        return data.tracks.items.filter(track => {
            if (!track || !track.album || !track.artists || !track.artists[0]) return false;
            
            const text = `${track.name} ${track.artists[0].name} ${track.album.name}`.toLowerCase();
            
            // Check blacklist
            if (blacklist.some(blocked => text.includes(blocked))) return false;
            
            // Check for explicit "instrumental" in name if instrumental-only mode
            if (prefs.instrumentalOnly) {
                const hasInstrumental = text.includes('instrumental') || 
                                      text.includes('piano') ||
                                      text.includes('ambient') ||
                                      text.includes('classical');
                if (!hasInstrumental) return false;
            }
            
            // Duration check (1-10 minutes)
            const mins = track.duration_ms / 60000;
            if (mins < 1 || mins > 10) return false;
            
            return true;
        });
        
    } catch (error) {
        console.error('Search error:', error);
        return [];
    }
}

function selectBestTracks(tracks, prefs) {
    // Remove duplicates
    const unique = Array.from(new Map(tracks.map(t => [t.id, t])).values());
    
    // Score tracks
    unique.forEach(track => {
        let score = track.priorityScore || 50;
        
        // Bonus for lesser-known (discovery)
        if (track.popularity < 30) score += 20;
        else if (track.popularity < 50) score += 10;
        
        // Bonus for specific keywords in instrumental mode
        if (prefs.instrumentalOnly) {
            const text = `${track.name} ${track.artists[0].name}`.toLowerCase();
            if (text.includes('instrumental')) score += 15;
            if (text.includes('piano')) score += 10;
            if (text.includes('ambient')) score += 10;
            if (text.includes('classical')) score += 10;
        }
        
        track.finalScore = score;
    });
    
    // Sort by score
    unique.sort((a, b) => b.finalScore - a.finalScore);
    
    // Return top tracks
    return unique.slice(0, TARGET_TRACKS);
}

// ==========================================
// UI
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
    
    if (selectedBook) {
        document.getElementById('bookCover').src = selectedBook.cover || '';
        document.getElementById('bookTitle').textContent = selectedBook.title;
        document.getElementById('bookAuthor').textContent = selectedBook.author;
    } else {
        document.getElementById('bookCover').style.display = 'none';
        document.getElementById('bookTitle').textContent = bookInput.value;
        document.getElementById('bookAuthor').textContent = '';
    }
    
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

document.getElementById('generateBtn').addEventListener('click', generatePlaylist);

bookInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        autocompleteResults.style.display = 'none';
        generatePlaylist();
    }
});

document.getElementById('findAnotherBtn')?.addEventListener('click', () => {
    document.getElementById('resultsPage').style.display = 'none';
    document.getElementById('homepage').style.display = 'block';
    bookInput.value = '';
    selectedBook = null;
});

document.getElementById('tryAnotherBtn')?.addEventListener('click', () => {
    document.getElementById('resultsPage').style.display = 'none';
    document.getElementById('homepage').style.display = 'block';
});

console.log('✅ BookTunes loaded');
