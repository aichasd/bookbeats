// BookTunes - Sophisticated AI Book Analysis
// Multi-dimensional analysis system for deeply personalized music curation

async function analyzeBook(bookTitle) {
    try {
        const prompt = `You are a literary and music expert tasked with creating the perfect soundtrack for reading "${bookTitle}".

Think deeply about:
1. What emotional EXPERIENCE did the author create?
2. What ATMOSPHERE pervades the book?
3. What was the author's INTENT - what should readers feel?
4. What music would the AUTHOR have listened to while writing?
5. What would a film composer choose for this story's score?

Provide a detailed analysis as JSON:

{
    "emotional_core": {
        "primary_emotions": ["2-3 specific emotions"],
        "emotional_weight": "light/medium/heavy/devastating",
        "emotional_temperature": "cold/neutral/warm/hot",
        "emotional_movement": "static/gradual/building/turbulent"
    },
    
    "atmospheric_qualities": {
        "sonic_texture": "sparse/minimal/balanced/lush/dense",
        "spatial_quality": "intimate/enclosed/expansive/vast",
        "temporal_feel": "timeless/nostalgic/contemporary/futuristic",
        "mood_descriptors": ["3-5 SPECIFIC atmospheric words"]
    },
    
    "thematic_context": {
        "subject_gravity": "lighthearted/contemplative/serious/tragic/traumatic",
        "core_themes": ["2-4 major themes"],
        "cultural_elements": "Description of cultural/ethnic context",
        "sensitive_topics": ["war", "genocide", "trauma", "violence"] or []
    },
    
    "geographic_cultural": {
        "primary_setting": "Specific country/region",
        "cultural_traditions": "Relevant musical traditions",
        "time_period": "When story takes place",
        "language_region": "Language/dialect region"
    },
    
    "musical_direction": {
        "instrument_palette": ["3-5 instruments that fit"],
        "genre_suggestions": ["3-5 specific genres"],
        "explicit_exclusions": ["genres/styles to AVOID"],
        "suggested_artists": ["3-6 specific artists with reasoning"],
        "reference_composers": ["composers/musicians whose work fits"]
    },
    
    "pacing_rhythm": {
        "reading_pace": "slow/measured/moderate/quick/intense",
        "narrative_rhythm": "meditative/flowing/dynamic/urgent",
        "sonic_density": "spacious/balanced/layered"
    }
}

CRITICAL GUIDELINES:

**EMOTIONAL_CORE:**
- primary_emotions: Be SPECIFIC. Not "sad" but "grief-stricken", "mournful", "elegiac"
  Choose from: mournful, elegiac, grief-stricken, somber, haunting, devastating, wistful, yearning, bittersweet, melancholic, contemplative, meditative, introspective, philosophical, serene, tranquil, gentle, tense, anxious, suspenseful, foreboding, ominous, eerie, unsettling, mysterious, enigmatic, ethereal, dreamlike, nostalgic, wistful, hopeful, uplifting, tender, intimate, passionate, longing, desolate, barren, stark

**ATMOSPHERIC_QUALITIES:**
- mood_descriptors: VERY SPECIFIC. Not "dark" but "oppressively dark", "twilit", "shadow-laden"
  Examples: twilit, shadow-laden, luminous, crystalline, murky, fog-drenched, sun-bleached, nocturnal, dawn-like, dust-laden, rain-soaked, snow-muffled, wind-swept, intimate whispers, vast silences, echoing voids, warm amber, cold steel, earthy, ethereal, grounded, floating, claustrophobic, agoraphobic

**THEMATIC_CONTEXT:**
- subject_gravity: BE HONEST. Genocide = "traumatic". Coming-of-age comedy = "lighthearted"
- sensitive_topics: If book deals with war, genocide, violence, trauma, death → LIST THEM
  This triggers STRICT music filtering (no party, dance, upbeat, cheerful music)

**MUSICAL_DIRECTION:**
- explicit_exclusions: For serious books, MUST exclude: "Latin pop", "reggaeton", "dance pop", "party music", "EDM", "upbeat pop", "cheerful", "festive"
- For tragic books: "happy", "optimistic", "energetic", "celebratory"
- For intimate books: "bombastic", "epic", "grandiose"
- suggested_artists: THINK CAREFULLY:
  * For Palestinian themes → Use Arabic classical musicians, oud players, Middle Eastern composers
  * For Turkish books → Tanburi Cemil Bey, Münir Nurettin Selçuk, Ottoman classical
  * For Romanian books → Maria Tănase, Dan Spătaru, Romanian folk
  * For war/genocide → Arvo Pärt, Henryk Górecki, somber classical
  * For melancholy → Nick Cave, Low, Grouper, Sufjan Stevens
  * For contemplative → Max Richter, Ólafur Arnalds, Nils Frahm
  * PRIORITIZE: Traditional/folk artists from the book's region, classical composers, ambient/modern classical

**EXAMPLES:**

For "Night" by Elie Wiesel:
- emotional_weight: "devastating"
- subject_gravity: "traumatic"
- sensitive_topics: ["genocide", "war", "trauma", "death"]
- explicit_exclusions: ["Latin pop", "reggaeton", "dance", "party", "upbeat", "cheerful", "optimistic"]
- suggested_artists: ["Arvo Pärt", "Henryk Górecki", "Kol Nidre traditional", "Jewish liturgical music"]

For "Snow" by Orhan Pamuk:
- emotional_weight: "heavy"
- primary_emotions: ["contemplative", "melancholic", "politically tense"]
- cultural_elements: "Turkish, Ottoman influences, Islamic culture"
- suggested_artists: ["Tanburi Cemil Bey", "Münir Nurettin Selçuk", "Jordi Savall", "Turkish classical ensembles"]

For "A Little Life" by Hanya Yanagihara:
- emotional_weight: "devastating"
- subject_gravity: "traumatic"
- sensitive_topics: ["trauma", "abuse", "grief"]
- explicit_exclusions: ["upbeat", "cheerful", "party", "energetic"]
- suggested_artists: ["Arvo Pärt", "Max Richter", "Jóhann Jóhannsson", "Low", "Grouper"]

Return ONLY the JSON object, no other text.`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
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
                    }],
                    generationConfig: {
                        temperature: 0.8,
                        maxOutputTokens: 2048,
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;
        
        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to extract JSON from AI response');
        }

        const analysis = JSON.parse(jsonMatch[0]);

        // Transform into format expected by music search
        const transformedAnalysis = transformAnalysis(analysis);

        console.log('🎭 DEEP ANALYSIS:');
        console.log('  Emotional weight:', analysis.emotional_core?.emotional_weight);
        console.log('  Subject gravity:', analysis.thematic_context?.subject_gravity);
        console.log('  Sensitive topics:', analysis.thematic_context?.sensitive_topics);
        console.log('  Primary emotions:', analysis.emotional_core?.primary_emotions);
        console.log('  Atmosphere:', analysis.atmospheric_qualities?.mood_descriptors);
        console.log('  Geographic setting:', analysis.geographic_cultural?.primary_setting);
        console.log('  Suggested artists:', analysis.musical_direction?.suggested_artists?.slice(0, 3));
        console.log('  EXPLICIT EXCLUSIONS:', analysis.musical_direction?.explicit_exclusions);

        return transformedAnalysis;

    } catch (error) {
        console.error('Error analyzing book:', error);
        
        // Return safe, minimal defaults
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
            atmospheric_descriptors: ['meditative', 'spacious'],
            instrument_palette: ['piano', 'strings'],
            sonic_texture: 'minimal'
        };
    }
}

// Transform complex analysis into format used by music search
function transformAnalysis(analysis) {
    const transformed = {
        // Legacy fields (for backward compatibility)
        mood: [
            ...(analysis.emotional_core?.primary_emotions || []),
            ...(analysis.atmospheric_qualities?.mood_descriptors || [])
        ].slice(0, 5),
        
        setting_place: mapSpatialQuality(analysis.atmospheric_qualities?.spatial_quality),
        
        // New detailed fields
        geographic_setting: analysis.geographic_cultural?.primary_setting || null,
        time_period: analysis.geographic_cultural?.time_period || null,
        cultural_context: analysis.geographic_cultural?.cultural_traditions || '',
        
        suggested_artists: analysis.musical_direction?.suggested_artists || [],
        reference_composers: analysis.musical_direction?.reference_composers || [],
        
        // Critical filtering fields
        explicit_exclusions: analysis.musical_direction?.explicit_exclusions || [],
        emotional_weight: analysis.emotional_core?.emotional_weight || 'medium',
        subject_gravity: analysis.thematic_context?.subject_gravity || 'contemplative',
        sensitive_topics: analysis.thematic_context?.sensitive_topics || [],
        
        // Atmospheric guidance
        atmospheric_descriptors: analysis.atmospheric_qualities?.mood_descriptors || [],
        sonic_texture: analysis.atmospheric_qualities?.sonic_texture || 'balanced',
        spatial_quality: analysis.atmospheric_qualities?.spatial_quality || 'balanced',
        
        // Musical direction
        instrument_palette: analysis.musical_direction?.instrument_palette || [],
        genre_suggestions: analysis.musical_direction?.genre_suggestions || [],
        
        // Pacing
        reading_pace: analysis.pacing_rhythm?.reading_pace || 'moderate',
        narrative_rhythm: analysis.pacing_rhythm?.narrative_rhythm || 'flowing',
        
        // Themes
        themes: analysis.thematic_context?.core_themes || []
    };

    // If book has sensitive topics, add aggressive exclusions
    if (transformed.sensitive_topics.length > 0) {
        const sensitiveExclusions = [
            'Latin pop', 'reggaeton', 'dance pop', 'party', 'EDM', 
            'upbeat', 'cheerful', 'festive', 'celebratory', 'energetic',
            'club', 'dance', 'happy', 'optimistic', 'fun'
        ];
        
        transformed.explicit_exclusions = [
            ...new Set([
                ...transformed.explicit_exclusions,
                ...sensitiveExclusions
            ])
        ];
        
        console.log('⚠️ SENSITIVE TOPICS DETECTED - Applying strict exclusions:', transformed.explicit_exclusions);
    }

    return transformed;
}

function mapSpatialQuality(quality) {
    const mapping = {
        'intimate': 'indoor',
        'enclosed': 'indoor',
        'expansive': 'nature',
        'vast': 'nature'
    };
    return mapping[quality] || 'unknown';
}
