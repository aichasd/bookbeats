// BookTunes - AI Book Analysis (Fixed)

async function analyzeBook(bookTitle) {
    try {
        const prompt = `Analyze "${bookTitle}" for a music playlist.

Return ONLY valid JSON (no markdown):

{
  "mood": ["contemplative", "melancholic", "haunting"],
  "emotional_weight": "heavy",
  "themes": ["identity", "politics"],
  "geographic_setting": "Turkey",
  "time_period": "1990s",
  "sensitive_topics": [],
  "suggested_artists": ["Tanburi Cemil Bey", "Munir Nurettin Selcuk"],
  "instrument_palette": ["oud", "ney", "strings"],
  "genres": ["Turkish classical", "ambient", "folk"]
}

Guidelines:
- MOOD: specific emotions (mournful, elegiac, serene, tense, mysterious, nostalgic, wistful, somber)
- SENSITIVE_TOPICS: list if book has genocide, war, trauma, violence, abuse, death
- SUGGESTED_ARTISTS: Traditional/folk artists from book's region. Turkish books → Turkish artists, Romanian → Romanian, etc.
- GEOGRAPHIC_SETTING: Where does story take place? Critical for cultural music.

Return ONLY JSON.`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
                })
            }
        );

        if (!response.ok) {
            console.warn('Gemini API error:', response.status);
            throw new Error('API failed');
        }

        const data = await response.json();
        let text = data.candidates[0].content.parts[0].text.trim();
        
        text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found');

        const analysis = JSON.parse(jsonMatch[0]);

        let exclusions = [];
        if (analysis.sensitive_topics && analysis.sensitive_topics.length > 0) {
            exclusions = [
                'latin pop', 'reggaeton', 'dance pop', 'party', 'edm',
                'upbeat', 'cheerful', 'happy', 'festive', 'dance', 'club'
            ];
            console.log('⚠️ SENSITIVE:', analysis.sensitive_topics);
        }

        const result = {
            mood: analysis.mood || ['contemplative'],
            emotional_weight: analysis.emotional_weight || 'medium',
            themes: analysis.themes || [],
            geographic_setting: analysis.geographic_setting || null,
            time_period: analysis.time_period || null,
            sensitive_topics: analysis.sensitive_topics || [],
            suggested_artists: analysis.suggested_artists || [],
            instrument_palette: analysis.instrument_palette || ['piano'],
            genres: analysis.genres || ['ambient'],
            exclusions: exclusions
        };

        console.log('🎭 ANALYSIS:', {
            mood: result.mood.slice(0, 2),
            setting: result.geographic_setting,
            artists: result.suggested_artists.slice(0, 2)
        });

        return result;

    } catch (error) {
        console.warn('⚠️ Using smart fallback (API unavailable)');
        
        // Smart fallback based on book title
        const title = bookTitle.toLowerCase();
        let result = {
            mood: ['contemplative', 'atmospheric'],
            emotional_weight: 'medium',
            themes: [],
            geographic_setting: null,
            time_period: null,
            sensitive_topics: [],
            suggested_artists: [],
            instrument_palette: ['piano', 'strings'],
            genres: ['ambient', 'classical'],
            exclusions: []
        };
        
        // Detect geographic setting from common books
        if (title.includes('snow') || title.includes('pamuk')) {
            result.geographic_setting = 'Turkey';
            result.suggested_artists = ['Tanburi Cemil Bey', 'Munir Nurettin Selcuk'];
            result.genres = ['Turkish classical', 'Turkish folk', 'ambient'];
            result.mood = ['contemplative', 'melancholic', 'mysterious'];
        }
        
        if (title.includes('night') || title.includes('wiesel')) {
            result.sensitive_topics = ['genocide', 'war', 'trauma'];
            result.emotional_weight = 'devastating';
            result.mood = ['mournful', 'haunting', 'somber'];
            result.suggested_artists = ['Arvo Part', 'Henryk Gorecki'];
            result.exclusions = ['latin pop', 'reggaeton', 'party', 'dance', 'upbeat', 'cheerful'];
        }
        
        if (title.includes('giovanni') || title.includes('baldwin')) {
            result.mood = ['intimate', 'melancholic', 'yearning'];
            result.geographic_setting = 'France';
            result.genres = ['jazz', 'ambient', 'classical'];
        }
        
        console.log('📚 FALLBACK:', result.geographic_setting || 'generic', result.mood[0]);
        
        return result;
    }
}
