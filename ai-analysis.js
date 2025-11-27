// BookTunes - Sophisticated AI Book Analysis (DEBUGGED)
// Multi-dimensional analysis for deeply personalized music curation

async function analyzeBook(bookTitle) {
    try {
        const prompt = `You are a literary and music expert creating the perfect soundtrack for reading "${bookTitle}".

Analyze deeply:
1. What emotional EXPERIENCE did the author create?
2. What ATMOSPHERE pervades the book?
3. What music would fit this book's essence?
4. What should readers FEEL while reading?

Return ONLY a JSON object with this structure:

{
  "emotional_weight": "light/medium/heavy/devastating",
  "subject_gravity": "lighthearted/contemplative/serious/tragic/traumatic",
  "primary_emotions": ["2-4 specific emotions"],
  "atmospheric_descriptors": ["3-5 specific atmospheric words"],
  "sensitive_topics": [],
  "geographic_setting": "Country or region where book takes place",
  "time_period": "When story takes place",
  "cultural_context": "Brief cultural description",
  "suggested_artists": ["3-6 specific artist names"],
  "instrument_palette": ["3-5 instruments"],
  "genre_suggestions": ["3-5 genres"],
  "explicit_exclusions": ["genres to AVOID"],
  "themes": ["2-4 major themes"]
}

CRITICAL GUIDELINES:

1. PRIMARY_EMOTIONS: Be SPECIFIC. Choose from:
   mournful, elegiac, grief-stricken, somber, haunting, devastating, wistful, yearning, 
   bittersweet, melancholic, contemplative, meditative, introspective, philosophical, 
   serene, tranquil, gentle, tense, anxious, suspenseful, foreboding, ominous, eerie, 
   unsettling, mysterious, enigmatic, ethereal, dreamlike, nostalgic, hopeful, uplifting, 
   tender, intimate, passionate, longing, desolate, barren, stark

2. ATMOSPHERIC_DESCRIPTORS: Very specific. Examples:
   twilit, shadow-laden, luminous, crystalline, murky, fog-drenched, sun-bleached, 
   nocturnal, dawn-like, dust-laden, rain-soaked, snow-muffled, wind-swept, 
   intimate whispers, vast silences, echoing voids, warm amber, cold steel, 
   earthy, floating, claustrophobic, expansive

3. SUBJECT_GRAVITY: Be honest.
   - Genocide/war/trauma = "traumatic"
   - Death/loss/serious themes = "serious" or "tragic"
   - Light fiction = "lighthearted"

4. SENSITIVE_TOPICS: If book deals with war, genocide, violence, trauma, abuse, death - LIST THEM
   This triggers strict music filtering to prevent inappropriate matches.

5. EXPLICIT_EXCLUSIONS: For serious/tragic books, MUST exclude:
   "Latin pop", "reggaeton", "dance pop", "party music", "EDM", "upbeat pop", 
   "cheerful", "festive", "celebratory", "club", "dance"

6. SUGGESTED_ARTISTS: Think carefully:
   - For geographic regions: Include traditional/folk artists from that region
   - For Turkish books: Tanburi Cemil Bey, Munir Nurettin Selcuk
   - For Romanian books: Maria Tanase, Dan Spataru
   - For Palestinian/Arabic themes: Marcel Khalife, Simon Shaheen, oud players
   - For tragic books: Arvo Part, Henryk Gorecki, Max Richter
   - For melancholic: Nick Cave, Low, Grouper, Sufjan Stevens
   - For contemplative: Nils Frahm, Olafur Arnalds, Johann Johannsson

EXAMPLES:

Book: "Night" by Elie Wiesel
{
  "emotional_weight": "devastating",
  "subject_gravity": "traumatic",
  "primary_emotions": ["grief-stricken", "mournful", "haunting"],
  "sensitive_topics": ["genocide", "war", "trauma", "death"],
  "explicit_exclusions": ["Latin pop", "reggaeton", "dance", "party", "upbeat", "cheerful"],
  "suggested_artists": ["Arvo Part", "Henryk Gorecki", "Jewish liturgical music"]
}

Book: "Snow" by Orhan Pamuk
{
  "emotional_weight": "heavy",
  "subject_gravity": "serious",
  "primary_emotions": ["contemplative", "melancholic", "tense"],
  "geographic_setting": "Turkey",
  "suggested_artists": ["Tanburi Cemil Bey", "Munir Nurettin Selcuk", "Turkish classical"]
}

Return ONLY the JSON object, no markdown, no explanation.`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.8,
                        maxOutputTokens: 2048
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;
        
        // Extract JSON from response (remove markdown if present)
        let jsonText = text.trim();
        jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('AI response:', text);
            throw new Error('Could not extract JSON from AI response');
        }

        const analysis = JSON.parse(jsonMatch[0]);

        // Transform to expected format
        const transformed = {
            // Core fields
            mood: [
                ...(analysis.primary_emotions || []),
                ...(analysis.atmospheric_descriptors || [])
            ].slice(0, 6),
            
            setting_place: 'unknown',
            geographic_setting: analysis.geographic_setting || null,
            time_period: analysis.time_period || null,
            cultural_context: analysis.cultural_context || '',
            
            // Critical fields
            suggested_artists: analysis.suggested_artists || [],
            explicit_exclusions: analysis.explicit_exclusions || [],
            emotional_weight: analysis.emotional_weight || 'medium',
            subject_gravity: analysis.subject_gravity || 'contemplative',
            sensitive_topics: analysis.sensitive_topics || [],
            
            // Atmospheric
            atmospheric_descriptors: analysis.atmospheric_descriptors || [],
            
            // Musical
            instrument_palette: analysis.instrument_palette || ['piano', 'strings'],
            genre_suggestions: analysis.genre_suggestions || [],
            
            // Themes
            themes: analysis.themes || []
        };

        // Auto-add exclusions for sensitive topics
        if (transformed.sensitive_topics && transformed.sensitive_topics.length > 0) {
            const autoExclusions = [
                'Latin pop', 'reggaeton', 'dance pop', 'party', 'EDM',
                'upbeat', 'cheerful', 'festive', 'club', 'dance', 'happy'
            ];
            
            transformed.explicit_exclusions = [
                ...new Set([
                    ...(transformed.explicit_exclusions || []),
                    ...autoExclusions
                ])
            ];
            
            console.log('⚠️ SENSITIVE TOPICS DETECTED:', transformed.sensitive_topics);
            console.log('🚫 Auto-applied exclusions:', transformed.explicit_exclusions);
        }

        console.log('🎭 ANALYSIS COMPLETE:');
        console.log('   Weight:', transformed.emotional_weight);
        console.log('   Gravity:', transformed.subject_gravity);
        console.log('   Emotions:', transformed.mood.slice(0, 3));
        console.log('   Setting:', transformed.geographic_setting);
        console.log('   Artists:', transformed.suggested_artists.slice(0, 3));
        console.log('   Exclusions:', transformed.explicit_exclusions.slice(0, 5));

        return transformed;

    } catch (error) {
        console.error('❌ Analysis error:', error);
        
        // Safe fallback
        return {
            mood: ['contemplative', 'atmospheric'],
            setting_place: 'unknown',
            geographic_setting: null,
            time_period: null,
            suggested_artists: [],
            explicit_exclusions: [],
            emotional_weight: 'medium',
            subject_gravity: 'contemplative',
            sensitive_topics: [],
            atmospheric_descriptors: ['meditative'],
            instrument_palette: ['piano', 'strings'],
            genre_suggestions: [],
            themes: []
        };
    }
}
