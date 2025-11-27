// Get all the screen elements
const generateBtn = document.getElementById('generateBtn');
const bookInput = document.getElementById('bookInput');
const homepage = document.getElementById('homepage');
const loadingScreen = document.getElementById('loadingScreen');
const resultsPage = document.getElementById('resultsPage');
const findAnotherBtn = document.getElementById('findAnotherBtn');
const tryAnotherBtn = document.getElementById('tryAnotherBtn');
const autocompleteResults = document.getElementById('autocompleteResults');

// Get result page elements
const bookCover = document.getElementById('bookCover');
const bookTitle = document.getElementById('bookTitle');
const bookAuthor = document.getElementById('bookAuthor');

// Store selected playlist globally
let selectedPlaylistId = '';
let allMatchedPlaylists = [];
let currentPlaylistIndex = 0;
let autocompleteTimeout;
let aiGeneratedTracks = []; // Store AI tracks globally
let currentAnalysis = null; // Store AI analysis globally

// Your curated playlists
const PLAYLISTS = {
    'anatolian_soul': {
        id: '37i9dQZF1E4xbglgDQjdyr',
        name: 'Anatolian Soul Radio',
        keywords: ['turkey', 'turkish', 'anatolia', 'psychedelic', 'pamuk', 'istanbul', 'shafak', 'elif']
    },
    'middle_eastern': {
        id: '6pNkuTM15mYKH546IScJ7w',
        name: 'Middle Eastern Instrumental',
        keywords: ['middle east', 'oud', 'palestine', 'syria', 'lebanon', 'jordan', 'akkad', 'omar']
    },
    'persian_dream': {
        id: '3GdL03WzwfDUvrtfDwhdxu',
        name: 'Persian Dream',
        keywords: ['persian', 'iran', 'iranian']
    },
    'arabic_instrumental': {
        id: '1ETZJ22QZBkO3WXLEGgRpf',
        name: 'The Sound of Arabic Instrumental',
        keywords: ['arabic', 'arab']
    },
    'desert_blues': {
        id: '5tJJ32hMWvFhIPLrHRreNZ',
        name: 'The Sound of Desert Blues',
        keywords: ['desert', 'sahara', 'mali', 'tuareg', 'blues']
    },
    'reading_marquez': {
        id: '3rauqRY9q1CnMDc5ZwCO4l',
        name: 'reading gabriel garcia marquez',
        keywords: ['marquez', 'garcia', 'magical realism', 'latin', 'colombia']
    },
    'reading_camus': {
        id: '7bODD6DmD0TGPiHL31TeIy',
        name: 'reading albert camus',
        keywords: ['camus', 'existential', 'stranger', 'plague']
    },
    'cigarettes_coffee': {
        id: '3LP007fyReuw2sGQ2oZlmH',
        name: 'cigarettes and coffee',
        keywords: ['coffee', 'cafe', 'jazz', 'baldwin', 'james', 'urban', 'giovanni']
    },
    'nyc_autumn_jazz': {
        id: '5fgilxFHQgTfNLK7lxgej0',
        name: 'NYC Autumn Jazz',
        keywords: ['new york', 'nyc', 'jazz', 'autumn', 'harlem']
    },
    'french_cafe': {
        id: '3x6xRt9FnSbfPbgiO6incZ',
        name: 'French Café Lounge',
        keywords: ['french', 'paris', 'cafe', 'bistro']
    },
    'jazz_1920s': {
        id: '37i9dQZF1DXb4WkkICA2jt',
        name: '1920s Jazz',
        keywords: ['gatsby', '1920s', 'jazz age', 'fitzgerald']
    },
    'late_night_piano': {
        id: '3I7BHxtVDc9BbYYRqSdBDu',
        name: 'Late Night Piano',
        keywords: ['piano', 'night', 'quiet', 'melancholy']
    },
    'gentle_mornings': {
        id: '4em3Dm5jf1PqN8VFBp3TOv',
        name: 'Gentle Instrumental Mornings',
        keywords: ['morning', 'gentle', 'calm']
    },
    'ethereal': {
        id: '5hRO1ZvHUsEDj9Mb54DMm0',
        name: 'Ethereal Instrumental',
        keywords: ['ethereal', 'dreamy', 'ambient']
    },
    'first_snow': {
        id: '7ACJ9fn6EI7uq0jRVh0glx',
        name: 'First Snow',
        keywords: ['snow', 'winter', 'cold']
    },
    'world_folk': {
        id: '1lFYFSCxRRlAO4d1nX9gvW',
        name: 'World Folk Music',
        keywords: ['world folk', 'traditional', 'ethnic']
    },
    'mexico_chill': {
        id: '7GPyNqSICWWLnQgq9ERrCI',
        name: 'Mexico Chill Vibe',
        keywords: ['mexico', 'mexican', 'latin']
    },
    'japanese_city_pop': {
        id: '0nz3cRJG7ZdCzdWQmIPp56',
        name: '80s/90s Japanese City Pop',
        keywords: ['japan', 'japanese', 'city pop', 'tokyo', 'murakami']
    },
    'dark_dystopian': {
        id: '37i9dQZF1DWWEJlAGA9gs0',
        name: 'Dark Dystopian',
        keywords: ['dystopia', 'orwell', '1984', 'dystopian', 'dark', 'electronic']
    },
    'default': {
        id: '3I7BHxtVDc9BbYYRqSdBDu',
        name: 'Late Night Piano',
        keywords: []
    }
};

// ========================================
// AUTOCOMPLETE - Open Library API
// ========================================

bookInput.addEventListener('input', function(e) {
    const query = e.target.value.trim();
    
    clearTimeout(autocompleteTimeout);
    
    if (query.length < 3) {
        autocompleteResults.classList.remove('show');
        autocompleteResults.innerHTML = '';
        return;
    }
    
    autocompleteResults.innerHTML = '<div class="autocomplete-loading">searching...</div>';
    autocompleteResults.classList.add('show');
    
    autocompleteTimeout = setTimeout(async function() {
        try {
            const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10&fields=key,title,author_name,cover_i,first_publish_year,ratings_average&sort=rating`);
            const data = await response.json();
            
            autocompleteResults.innerHTML = '';
            
            if (!data.docs || data.docs.length === 0) {
                autocompleteResults.innerHTML = '<div class="autocomplete-empty">no books found</div>';
                return;
            }
            
            const goodBooks = data.docs
                .filter(book => book.title && book.author_name && book.author_name.length > 0)
                .slice(0, 5);
            
            if (goodBooks.length === 0) {
                autocompleteResults.innerHTML = '<div class="autocomplete-empty">try including author name</div>';
                return;
            }
            
            goodBooks.forEach(book => {
                const bookDiv = document.createElement('div');
                bookDiv.className = 'autocomplete-item';
                
                const coverId = book.cover_i;
                const thumbnail = coverId 
                    ? `https://covers.openlibrary.org/b/id/${coverId}-S.jpg`
                    : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="60"%3E%3Crect fill="%23E0E0E0" width="40" height="60"/%3E%3C/svg%3E';
                
                const author = book.author_name[0];
                const fullTitle = book.title;
                
                bookDiv.innerHTML = `
                    <img src="${thumbnail}" alt="${fullTitle}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2260%22%3E%3Crect fill=%22%23E0E0E0%22 width=%2240%22 height=%2260%22/%3E%3C/svg%3E'">
                    <div class="autocomplete-book-info">
                        <div class="autocomplete-book-title">${fullTitle}</div>
                        <div class="autocomplete-book-author">${author}</div>
                    </div>
                `;
                
                bookDiv.addEventListener('mousedown', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    bookInput.value = `${fullTitle} ${author}`;
                    autocompleteResults.classList.remove('show');
                    autocompleteResults.innerHTML = '';
                    bookInput.focus();
                });
                
                autocompleteResults.appendChild(bookDiv);
            });
            
        } catch (error) {
            console.error('Autocomplete error:', error);
            autocompleteResults.innerHTML = '<div class="autocomplete-empty">error loading suggestions</div>';
        }
    }, 300);
});

document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-container')) {
        autocompleteResults.classList.remove('show');
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        autocompleteResults.classList.remove('show');
    }
});

// ========================================
// MAIN GENERATE BUTTON
// ========================================

generateBtn.addEventListener('click', async function() {
    const searchQuery = bookInput.value.trim();
    
    if (!searchQuery) {
        alert('Please enter a book title!');
        return;
    }
    
    homepage.style.display = 'none';
    loadingScreen.style.display = 'flex';
    
    try {
        const bookResponse = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}`);
        const bookData = await bookResponse.json();
        
        if (!bookData.items || bookData.items.length === 0) {
            throw new Error('Book not found');
        }
        
        const book = bookData.items[0].volumeInfo;
        
        bookTitle.textContent = book.title || 'Unknown Title';
        bookAuthor.textContent = book.authors ? `By ${book.authors[0]}` : 'By Unknown Author';
        
        // Get high-res cover from Open Library
        const openLibraryQuery = `${book.title} ${book.authors ? book.authors[0] : ''}`;
        try {
            const olResponse = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(openLibraryQuery)}&limit=1&fields=cover_i`);
            const olData = await olResponse.json();
            
            if (olData.docs && olData.docs[0] && olData.docs[0].cover_i) {
                bookCover.src = `https://covers.openlibrary.org/b/id/${olData.docs[0].cover_i}-L.jpg`;
            } else {
                bookCover.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="180" height="270"%3E%3Crect fill="%23E0E0E0" width="180" height="270"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999" font-family="Arial" font-size="14"%3ENo Cover%3C/text%3E%3C/svg%3E';
            }
            
            bookCover.onerror = function() {
                this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="180" height="270"%3E%3Crect fill="%23E0E0E0" width="180" height="270"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999" font-family="Arial" font-size="14"%3ENo Cover%3C/text%3E%3C/svg%3E';
            };
        } catch (error) {
            bookCover.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="180" height="270"%3E%3Crect fill="%23E0E0E0" width="180" height="270"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999" font-family="Arial" font-size="14"%3ENo Cover%3C/text%3E%3C/svg%3E';
        }
        
        // ========================================
        // AI-POWERED CUSTOM PLAYLIST GENERATION
        // ========================================
        
        console.log('🤖 Analyzing book with AI...');
        
        // Get book description properly
        const bookDescription = book.description || book.subtitle || '';
        
        console.log('📖 Book info:', {
            title: book.title,
            author: book.authors ? book.authors[0] : 'Unknown',
            description: bookDescription.substring(0, 150) + '...'
        });
        
        // Get AI analysis
        const analysis = await analyzeBookWithAI(
            book.title,
            book.authors ? book.authors[0] : 'Unknown',
            bookDescription
        ).catch(error => {
            console.error('AI analysis failed, using mock:', error);
            return getMockAnalysis(book.title, book.authors ? book.authors[0] : '');
        });
        
        console.log('✅ AI Analysis:', analysis);
        
        // Store analysis globally
        currentAnalysis = analysis;
        
        // Check user preferences
        const instrumentalOnly = document.getElementById('instrumentalOnly').checked;
        const foreignLyricsOk = document.getElementById('foreignLyrics').checked;
        
        console.log('🎛️ User preferences:', { instrumentalOnly, foreignLyricsOk });
        
        // ========================================
        // INTELLIGENT TRACK SEARCH WITH SCORING
        // ========================================
        
        let allTracks = [];
        const trackScores = new Map(); // Track quality scores
        
        // STRATEGY 1: Search for SPECIFIC ARTISTS (Highest Priority)
        console.log('🎵 Strategy 1: Searching for specific artists (highest priority)...');
        if (analysis.artists && analysis.artists.length > 0) {
            for (let i = 0; i < Math.min(analysis.artists.length, 4); i++) {
                const artist = analysis.artists[i];
                const searchQuery = instrumentalOnly 
                    ? `${artist} instrumental` 
                    : artist;
                try {
                    const tracks = await searchSpotifyTracks(searchQuery, 15);
                    tracks.forEach(track => {
                        trackScores.set(track.id, 100 - (i * 10)); // First artist gets 100, second 90, etc.
                    });
                    allTracks = allTracks.concat(tracks);
                    console.log(`  ✓ Found ${tracks.length} tracks from "${artist}" (score: ${100 - (i * 10)})`);
                } catch (error) {
                    console.error(`  ✗ Failed to find "${artist}"`);
                }
            }
        }
        
        // STRATEGY 2: Search for SPECIFIC INSTRUMENTS + CULTURAL CONTEXT
        console.log('🎵 Strategy 2: Searching for instruments with cultural context...');
        if (analysis.instruments && analysis.instruments.length > 0) {
            for (let i = 0; i < Math.min(analysis.instruments.length, 3); i++) {
                const instrument = analysis.instruments[i];
                const culturalContext = analysis.cultural_sound || analysis.setting_place || '';
                const searchQuery = `${instrument} ${culturalContext}`.trim();
                try {
                    const tracks = await searchSpotifyTracks(searchQuery, 12);
                    tracks.forEach(track => {
                        const existingScore = trackScores.get(track.id) || 0;
                        trackScores.set(track.id, Math.max(existingScore, 80 - (i * 10)));
                    });
                    allTracks = allTracks.concat(tracks);
                    console.log(`  ✓ Found ${tracks.length} tracks for "${searchQuery}" (score: ${80 - (i * 10)})`);
                } catch (error) {
                    console.error(`  ✗ Failed to find "${instrument}"`);
                }
            }
        }
        
        // STRATEGY 3: Search for CULTURAL GENRES (High Priority)
        console.log('🎵 Strategy 3: Searching for cultural genres...');
        if (analysis.music_genres && analysis.music_genres.length > 0) {
            for (let i = 0; i < Math.min(analysis.music_genres.length, 4); i++) {
                const genre = analysis.music_genres[i];
                const searchQuery = instrumentalOnly 
                    ? `${genre} instrumental` 
                    : genre;
                try {
                    const tracks = await searchSpotifyTracks(searchQuery, 12);
                    tracks.forEach(track => {
                        const existingScore = trackScores.get(track.id) || 0;
                        trackScores.set(track.id, Math.max(existingScore, 70 - (i * 5)));
                    });
                    allTracks = allTracks.concat(tracks);
                    console.log(`  ✓ Found ${tracks.length} tracks for "${genre}" (score: ${70 - (i * 5)})`);
                } catch (error) {
                    console.error(`  ✗ Failed to find "${genre}"`);
                }
            }
        }
        
        // STRATEGY 4: Search for SETTING + MOOD combination
        console.log('🎵 Strategy 4: Searching for setting + mood...');
        if (analysis.setting_place && analysis.setting_place !== 'contemporary') {
            const mood = analysis.mood[0] || 'music';
            const searchQuery = instrumentalOnly
                ? `${analysis.setting_place} ${mood} instrumental`
                : `${analysis.setting_place} ${mood} music`;
            try {
                const tracks = await searchSpotifyTracks(searchQuery, 10);
                tracks.forEach(track => {
                    const existingScore = trackScores.get(track.id) || 0;
                    trackScores.set(track.id, Math.max(existingScore, 60));
                });
                allTracks = allTracks.concat(tracks);
                console.log(`  ✓ Found ${tracks.length} tracks for "${searchQuery}" (score: 60)`);
            } catch (error) {
                console.error(`  ✗ Failed to find setting music`);
            }
        }
        
        console.log(`\n📊 Total tracks collected: ${allTracks.length}`);
        
        // ========================================
        // DEDUPLICATION & QUALITY SORTING
        // ========================================
        
        // Remove duplicates and keep highest score
        const uniqueTracksMap = new Map();
        allTracks.forEach(track => {
            if (!uniqueTracksMap.has(track.id)) {
                uniqueTracksMap.set(track.id, {
                    track: track,
                    score: trackScores.get(track.id) || 50
                });
            } else {
                // Keep track with higher score
                const existing = uniqueTracksMap.get(track.id);
                const newScore = trackScores.get(track.id) || 50;
                if (newScore > existing.score) {
                    existing.score = newScore;
                }
            }
        });
        
        console.log(`📊 After deduplication: ${uniqueTracksMap.size} unique tracks`);
        
        // Sort by score (highest first)
        const sortedTracks = Array.from(uniqueTracksMap.values())
            .sort((a, b) => b.score - a.score)
            .map(item => item.track);
        
        // Select top 40 tracks
        const finalTracks = sortedTracks.slice(0, 40);
        
        console.log(`\n✅ FINAL PLAYLIST: ${finalTracks.length} tracks selected`);
        console.log('Top 10 tracks:');
        finalTracks.slice(0, 10).forEach((track, i) => {
            const score = trackScores.get(track.id) || 50;
            console.log(`  ${i + 1}. "${track.name}" by ${track.artists[0].name} (score: ${score})`);
        });
        
        // Store tracks globally
        aiGeneratedTracks = finalTracks;
        
        // We'll create a Spotify playlist from these
        selectedPlaylistId = null;
        allMatchedPlaylists = [];
        
    } catch (error) {
        console.error('Error:', error);
        bookTitle.textContent = 'Oops! Something went wrong';
        bookAuthor.textContent = 'Please try again';
        bookCover.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="180" height="270"%3E%3Crect fill="%23E0E0E0" width="180" height="270"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999" font-family="Arial" font-size="14"%3EError%3C/text%3E%3C/svg%3E';
        selectedPlaylistId = PLAYLISTS.default.id;
        aiGeneratedTracks = [];
    }
    
    setTimeout(function() {
        loadingScreen.style.display = 'none';
        resultsPage.style.display = 'flex';
        
        const playerContainer = document.getElementById('playerContainer');
        
        // Display AI-generated custom track list
        if (aiGeneratedTracks && aiGeneratedTracks.length > 0) {
            displayCustomPlaylist(aiGeneratedTracks, currentAnalysis);
            tryAnotherBtn.style.display = 'none';
        } else {
            // Fallback: show default playlist
            displayPlaylistEmbed(PLAYLISTS.default.id);
            tryAnotherBtn.style.display = 'none';
        }
    }, 3500);
});

// ========================================
// DISPLAY CUSTOM AI-GENERATED PLAYLIST
// ========================================

function displayCustomPlaylist(tracks, analysis) {
    const playerContainer = document.getElementById('playerContainer');
    
    // Create playlist header with AI insights
    const vibesText = analysis.vibes ? analysis.vibes.slice(0, 3).join(', ') : 'curated tracks';
    const culturalText = analysis.cultural_sound || 'various genres';
    
    let html = '<div class="custom-playlist">';
    
    // Header section
    html += `
        <div class="playlist-header-section">
            <div class="playlist-title">Your Custom Soundtrack</div>
            <div class="playlist-subtitle">${tracks.length} tracks • ${culturalText}</div>
            <div class="playlist-vibes">${vibesText}</div>
        </div>
    `;
    
    // Track list
    html += '<div class="track-list-scroll">';
    
    tracks.forEach((track, index) => {
        const albumArt = track.album.images[2] ? track.album.images[2].url : '';
        const trackName = track.name;
        const artistName = track.artists[0].name;
        const trackUrl = track.external_urls.spotify;
        const duration = formatDuration(track.duration_ms);
        
        html += `
            <div class="track-item">
                <div class="track-number">${index + 1}</div>
                ${albumArt ? `<img src="${albumArt}" alt="${trackName}" class="track-album-art">` : ''}
                <div class="track-info">
                    <div class="track-name">${trackName}</div>
                    <div class="track-artist">${artistName}</div>
                </div>
                <div class="track-duration">${duration}</div>
                <a href="${trackUrl}" target="_blank" class="track-play-btn" title="Open in Spotify">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <path d="M10 8L16 12L10 16V8Z" fill="currentColor"/>
                    </svg>
                </a>
            </div>
        `;
    });
    
    html += '</div>'; // Close track-list-scroll
    
    // Action buttons
    html += `
        <div class="playlist-actions">
            <button class="save-spotify-btn" onclick="initiateSpotifyAuth()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                Save to Spotify
            </button>
        </div>
    `;
    
    html += '</div>'; // Close custom-playlist
    
    playerContainer.innerHTML = html;
}

// Helper function to format duration
function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ========================================
// DISPLAY PLAYLIST EMBED
// ========================================

function displayPlaylistEmbed(playlistId) {
    const playerContainer = document.getElementById('playerContainer');
    
    playerContainer.innerHTML = `
        <iframe id="spotifyPlayer" 
                class="spotify-player"
                src="https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0" 
                width="100%" 
                height="352" 
                frameBorder="0" 
                allowfullscreen="" 
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                loading="lazy">
        </iframe>
    `;
}

// ========================================
// TRY ANOTHER PLAYLIST (only for fallback mode)
// ========================================

tryAnotherBtn.addEventListener('click', function() {
    if (allMatchedPlaylists.length === 0) return;
    
    currentPlaylistIndex++;
    
    if (currentPlaylistIndex >= allMatchedPlaylists.length) {
        currentPlaylistIndex = 0;
    }
    
    const nextPlaylist = allMatchedPlaylists[currentPlaylistIndex];
    selectedPlaylistId = nextPlaylist.id;
    
    console.log('Switched to:', nextPlaylist.name);
    
    displayPlaylistEmbed(selectedPlaylistId);
});

// ========================================
// FIND ANOTHER SOUNDTRACK - JUST RELOAD
// ========================================

findAnotherBtn.addEventListener('click', function() {
    location.reload();
});