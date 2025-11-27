// AI Book Analysis using Gemini API

async function analyzeBookWithAI(bookTitle, bookAuthor, bookDescription) {
    const apiKey = CONFIG.GEMINI_API_KEY;
    
    // Create a smart prompt for Gemini
    const prompt = `Analyze this book and extract SPECIFIC musical characteristics for the perfect reading soundtrack.

Book Title: ${bookTitle}
Author: ${bookAuthor}
Full Description: ${bookDescription || 'No description available'}

CRITICAL: Be SPECIFIC, not generic. Extract actual artists, instruments, and cultural music styles.

Please respond with ONLY a valid JSON object (no markdown, no extra text) in this exact format:
{
  "mood": ["adjective1", "adjective2", "adjective3"],
  "setting_place": "SPECIFIC location (e.g., 'Konya, Turkey' not just 'Turkey')",
  "setting_era": "specific time period",
  "pace": "slow/medium/fast",
  "vibes": ["vibe1", "vibe2", "vibe3", "vibe4", "vibe5"],
  "music_genres": ["SPECIFIC genre1", "SPECIFIC genre2", "SPECIFIC genre3"],
  "cultural_sound": "SPECIFIC cultural/regional music style (e.g., 'turkish sufi music', 'fado', 'bossa nova')",
  "instruments": ["instrument1", "instrument2", "instrument3"],
  "artists": ["artist1", "artist2", "artist3"],
  "search_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}

Examples of SPECIFIC (good) vs GENERIC (bad) responses:

BAD: 
- music_genres: ["ambient", "instrumental", "world music"]
- artists: []
- instruments: []

GOOD for "The Forty Rules of Love" (Rumi, Sufism, 13th century Turkey):
- music_genres: ["sufi qawwali", "turkish classical", "sema music"]
- cultural_sound: "turkish sufi devotional music"
- instruments: ["ney flute", "oud", "bendir drum"]
- artists: ["Mercan Dede", "Kudsi Erguner", "Nusrat Fateh Ali Khan"]
- vibes: ["whirling dervishes", "mystical", "rumi poetry", "konya", "devotional"]

GOOD for "The Island of Missing Trees" (Cyprus, family, figs, love):
- music_genres: ["cypriot folk", "greek bouzouki", "mediterranean"]
- cultural_sound: "cypriot traditional music"
- instruments: ["bouzouki", "lyra", "violin"]
- artists: ["Michalis Terzis", "Alkinoos Ioannidis"]
- vibes: ["cyprus", "family", "figs", "tender love", "mediterranean nature"]

GOOD for "Giovanni's Room" (1950s Paris, jazz, love):
- music_genres: ["1950s jazz", "french cafe jazz", "cool jazz"]
- cultural_sound: "parisian jazz club"
- instruments: ["piano", "double bass", "trumpet"]
- artists: ["Miles Davis", "Chet Baker", "Bill Evans"]
- vibes: ["paris 1950s", "intimate jazz", "cigarettes", "existential", "love"]

BE SPECIFIC. Name actual artists, instruments, and cultural music traditions that match the book's setting and themes.`;

    console.log('🤖 Asking Gemini to analyze the book...');
    
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            }
        );

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0]) {
            throw new Error('No response from Gemini');
        }
        
        let responseText = data.candidates[0].content.parts[0].text;
        
        // Clean up the response - remove markdown formatting if present
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        console.log('📝 Gemini response:', responseText);
        
        // Parse the JSON response
        const analysis = JSON.parse(responseText);
        
        console.log('✅ Book analysis complete!', analysis);
        
        return analysis;
        
    } catch (error) {
        console.error('❌ Gemini API error:', error);
        
        // Fallback: return basic analysis
        return {
            mood: ['contemplative', 'atmospheric'],
            setting_place: 'unknown',
            setting_era: 'contemporary',
            pace: 'medium',
            themes: [bookTitle.toLowerCase()],
            music_genres: ['ambient', 'instrumental'],
            cultural_sound: 'none',
            instrumental_focus: 'yes',
            search_keywords: [bookTitle.toLowerCase(), 'ambient', 'reading']
        };
    }
}

// Test function
async function testBookAnalysis() {
    console.log('Testing AI book analysis...');
    
    const analysis = await analyzeBookWithAI(
        'Snow',
        'Orhan Pamuk',
        'An exiled poet returns to Turkey and is caught up in the religious and political conflicts of a remote town covered in snow.'
    );
    
    console.log('Analysis result:', analysis);
    return analysis;
}

// TEMPORARY: Mock AI analysis for testing while rate-limited
function getMockAnalysis(bookTitle, bookAuthor) {
    console.log('⚠️ Using mock analysis (rate limited)');
    
    // Smart mock based on book
    const mocks = {
        'snow': {
            mood: ['melancholic', 'contemplative', 'mysterious'],
            setting_place: 'Kars, Turkey',
            setting_era: '1990s',
            pace: 'slow',
            vibes: ['snow', 'turkish politics', 'identity', 'isolation', 'poetry'],
            music_genres: ['anatolian rock', 'turkish folk', 'ambient'],
            cultural_sound: 'anatolian psychedelic soul',
            instruments: ['baglama', 'ney', 'synth'],
            artists: ['Selda Bagcan', 'Erkin Koray', 'Baris Manco'],
            search_keywords: ['turkish psychedelic', 'anatolian', 'melancholic', 'contemplative']
        },
        'giovanni': {
            mood: ['intimate', 'tragic', 'passionate'],
            setting_place: 'Paris, France',
            setting_era: '1950s',
            pace: 'medium',
            vibes: ['paris 1950s', 'love', 'cigarettes', 'jazz clubs', 'existential'],
            music_genres: ['1950s jazz', 'french cafe jazz', 'cool jazz'],
            cultural_sound: 'parisian jazz club',
            instruments: ['piano', 'double bass', 'trumpet'],
            artists: ['Miles Davis', 'Chet Baker', 'Bill Evans'],
            search_keywords: ['1950s jazz', 'french jazz', 'cool jazz', 'intimate']
        },
        'forty': {
            mood: ['mystical', 'spiritual', 'contemplative'],
            setting_place: 'Konya, Turkey',
            setting_era: '13th century',
            pace: 'slow',
            vibes: ['rumi', 'whirling dervishes', 'sufism', 'devotional', 'mystical'],
            music_genres: ['sufi qawwali', 'turkish classical', 'sema music'],
            cultural_sound: 'turkish sufi devotional music',
            instruments: ['ney flute', 'oud', 'bendir drum'],
            artists: ['Mercan Dede', 'Kudsi Erguner', 'Nusrat Fateh Ali Khan'],
            search_keywords: ['sufi music', 'ney flute', 'turkish mystical', 'devotional']
        },
        'shafak': {
            mood: ['mystical', 'spiritual', 'contemplative'],
            setting_place: 'Konya, Turkey',
            setting_era: '13th century',
            pace: 'slow',
            vibes: ['rumi', 'whirling dervishes', 'sufism', 'devotional', 'mystical'],
            music_genres: ['sufi qawwali', 'turkish classical', 'sema music'],
            cultural_sound: 'turkish sufi devotional music',
            instruments: ['ney flute', 'oud', 'bendir drum'],
            artists: ['Mercan Dede', 'Kudsi Erguner', 'Nusrat Fateh Ali Khan'],
            search_keywords: ['sufi music', 'ney flute', 'turkish mystical', 'devotional']
        },
        'island': {
            mood: ['tender', 'melancholic', 'nostalgic'],
            setting_place: 'Cyprus',
            setting_era: 'contemporary',
            pace: 'medium',
            vibes: ['cyprus', 'figs', 'family', 'tender love', 'mediterranean'],
            music_genres: ['cypriot folk', 'greek bouzouki', 'mediterranean'],
            cultural_sound: 'cypriot traditional music',
            instruments: ['bouzouki', 'lyra', 'violin'],
            artists: ['Michalis Terzis', 'Alkinoos Ioannidis', 'Haris Alexiou'],
            search_keywords: ['cypriot music', 'mediterranean', 'bouzouki', 'tender']
        }
    };
    
    // Find matching mock
    const titleLower = bookTitle.toLowerCase();
    for (let key in mocks) {
        if (titleLower.includes(key)) {
            return mocks[key];
        }
    }
    
    // Default fallback
    return {
        mood: ['contemplative', 'atmospheric', 'introspective'],
        setting_place: 'contemporary',
        setting_era: 'modern',
        pace: 'medium',
        vibes: ['literary', 'thoughtful', 'reading', 'quiet', 'reflective'],
        music_genres: ['ambient', 'modern classical', 'downtempo'],
        cultural_sound: 'contemporary instrumental',
        instruments: ['piano', 'strings', 'synth'],
        artists: ['Nils Frahm', 'Olafur Arnalds', 'Max Richter'],
        search_keywords: ['ambient', 'modern classical', 'contemplative', 'instrumental']
    };
}