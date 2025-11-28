// BookTunes - AI Book Analysis
// Analyzes books to find the perfect musical match

async function analyzeBook(bookTitle) {
    try {
        const prompt = `Analyze the book "${bookTitle}" for creating a music playlist.

Think about: What atmosphere did the author create? What should readers feel? What music fits this book's essence?

Return ONLY valid JSON (no markdown, no explanation):

{
  "mood": ["3-5 specific emotions like: contemplative, melancholic, haunting, serene, tense, mysterious, nostalgic, wistful, somber, elegiac"],
  "emotional_weight": "light/medium/heavy/devastating",
  "themes": ["war", "love", "identity", "loss"],
  "geographic_setting": "Turkey" or "Japan" or null,
  "time_period": "1990s" or "Victorian era" or null,
  "sensitive_topics": ["genocide", "war", "trauma", "violence", "abuse", "death"] or [],
  "suggested_artists": ["Artist Name 1", "Artist Name 2", "Artist Name 3"],
  "instrument_palette": ["piano", "strings", "oud"],
  "genres": ["ambient", "classical", "folk"]
}

IMPORTANT GUIDELINES:

1. MOOD: Be specific. Not "sad" but "melancholic", "mournful", "elegiac"

2. SENSITIVE_TOPICS: If book deals with genocide, war, trauma, abuse, violence, death - LIST THEM
   This prevents inappropriate upbeat music.

3. SUGGESTED_ARTISTS: Think carefully about what fits:
   - Turkish books → Include Turkish classical/folk artists (Tanburi Cemil Bey, Munir Nurettin Selcuk)
   - Romanian books → Romanian folk artists (Maria Tanase, Dan Spataru)  
   - Palestinian/Arabic themes → Arabic classical (Marcel Khalife, Simon Shaheen)
   - Tragic books → Somber classical (Arvo Part, Henryk Gorecki, Max Richter)
   - Melancholic → Nick Cave, Low, Grouper, Sufjan Stevens
   - Contemplative → Nils Frahm, Olafur Arnalds
   - Focus on traditional, folk, and classical artists from the book's region
   - Include lesser-known/historic artists

4. GEOGRAPHIC_SETTING: Where does the book take place? This is critical for finding culturally appropriate music.

EXAMPLES:

"Night" by Elie Wiesel:
{
  "mood": ["mournful", "haunting", "devastating"],
  "emotional_weight": "devastating",
  "sensitive_topics": ["genocide", "war", "trauma", "death"],
  "suggested_artists": ["Arvo Part", "Henryk Gorecki"],
  "genres": ["classical", "liturgical"]
}

"Snow" by Orhan Pamuk:
{
  "mood": ["contemplative", "melancholic", "tense"],
  "emotional_weight": "heavy",
  "geographic_setting": "Turkey",
  "suggested_artists": ["Tanburi Cemil Bey", "Munir Nurettin Selcuk"],
  "genres": ["Turkish classical", "Turkish folk", "ambient"]
}

Return ONLY the JSON.`;

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
            throw new Error('AI analysis failed');
        }

        const data = await response.json();
        let text = data.candidates[0].content.parts[0].text.trim();
        
        // Remove markdown formatting if present
        text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Extract JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Could not parse AI response');
        }

        const analysis = JSON.parse(jsonMatch[0]);

        // Build exclusion list based on sensitive topics
        let exclusions = [];
        if (analysis.sensitive_topics && analysis.sensitive_topics.length > 0) {
            exclusions = [
                'latin pop', 'reggaeton', 'dance pop', 'party', 'edm',
                'upbeat', 'cheerful', 'happy', 'festive', 'dance', 'club'
            ];
            console.log('⚠️ SENSITIVE TOPICS:', analysis.sensitive_topics);
            console.log('🚫 AUTO-EXCLUDING:', exclusions);
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
            mood: result.mood.slice(0, 3),
            weight: result.emotional_weight,
            setting: result.geographic_setting,
            artists: result.suggested_artists.slice(0, 3),
            exclusions: result.exclusions.slice(0, 5)
        });

        return result;

    } catch (error) {
        console.error('❌ Analysis error:', error);
        
        // Safe fallback
        return {
            mood: ['contemplative', 'atmospheric'],
            emotional_weight: 'medium',
            themes: [],
            geographic_setting: null,
            time_period: null,
            sensitive_topics: [],
            suggested_artists: [],
            instrument_palette: ['piano'],
            genres: ['ambient'],
            exclusions: []
        };
    }
}
