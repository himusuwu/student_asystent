// Fact-checking Module - Student Assistant v2.1
// Weryfikacja faktów z dostępem do internetu (bez hardcodowanych dat)

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Fact-checking service for verifying names, dates, and other facts
 * Uses web search to verify information from transcription
 */
class FactChecker {
  constructor() {
    this.searchEngines = [
      {
        name: 'DuckDuckGo',
        url: 'https://api.duckduckgo.com/',
        enabled: true
      }
    ];
  }

  /**
   * Search for information using DuckDuckGo Instant Answer API via curl
   * @param {string} query - Search query
   * @returns {Promise<Object>} Search results
   */
  async searchDuckDuckGo(query) {
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`;
      
      console.log(`[FactChecker] Searching DuckDuckGo: "${query}"`);
      
      // Use curl because Node.js fetch doesn't work with DuckDuckGo API
      const curlCommand = `curl -s "${url}"`;
      const { stdout, stderr } = await execAsync(curlCommand);
      
      if (stderr) {
        console.error(`[FactChecker] Curl error: ${stderr}`);
        return null;
      }
      
      if (!stdout || stdout.trim().length === 0) {
        console.log(`[FactChecker] Empty response from DuckDuckGo for: "${query}"`);
        return null;
      }
      
      let data;
      try {
        data = JSON.parse(stdout);
      } catch (parseError) {
        console.log(`[FactChecker] JSON parse error for "${query}": ${parseError.message}`);
        return null;
      }
      
      return {
        abstract: data.Abstract || '',
        abstractText: data.AbstractText || '',
        abstractSource: data.AbstractSource || '',
        abstractURL: data.AbstractURL || '',
        definition: data.Definition || '',
        definitionSource: data.DefinitionSource || '',
        definitionURL: data.DefinitionURL || '',
        relatedTopics: data.RelatedTopics || [],
        results: data.Results || [],
        answer: data.Answer || '',
        answerType: data.AnswerType || '',
        type: data.Type || '',
        infobox: data.Infobox || null
      };
      
    } catch (error) {
      console.error(`[FactChecker] DuckDuckGo search error:`, error);
      return null;
    }
  }

  /**
   * Extract names (people, places) from text
   * @param {string} text - Input text
   * @returns {Array} Array of extracted names
   */
  extractNames(text) {
    const names = [];
    
    // Simple regex patterns for Polish names
    const patterns = [
      // Full names (Imię Nazwisko)
      /\b[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+ [A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:-[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)?\b/g,
      // Single surnames with common prefixes
      /\b(?:profesor|prof\.|dr|doktor|pan|pani)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:-[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)?)\b/gi,
      // Historical figures or famous people
      /\b[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+\s+(?:z|von|de|van)\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+\b/g
    ];
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleanName = match.replace(/^(?:profesor|prof\.|dr|doktor|pan|pani)\s+/i, '').trim();
          if (cleanName.length > 2 && !names.includes(cleanName)) {
            // Filter out obvious non-person entities
            const isPersonName = this.isLikelyPersonName(cleanName);
            if (isPersonName) {
              names.push(cleanName);
            }
          }
        });
      }
    });
    
    return names;
  }

  /**
   * Check if a name is likely a person's name (vs institution, award, etc.)
   * @param {string} name - Name to check
   * @returns {boolean} True if likely a person's name
   */
  isLikelyPersonName(name) {
    const lowerName = name.toLowerCase();
    
    // Exclude obvious institutions/awards/organizations
    const exclusionPatterns = [
      /universitet|uniwersytet/i,
      /akademia|academy/i,
      /instytut|institute/i,
      /szkoła|school/i,
      /fundacja|foundation/i,
      /nagroda|nagrodę|award|prize/i,
      /nobel/i,
      /organizacja|organization/i,
      /towarzyst|society/i,
      /centrum|center/i,
      /biuro|office/i,
      /ministerstwo|ministry/i,
      /urząd|bureau/i,
      /komitet|committee/i,
      /rada|council/i,
      /sejm|parliament/i
    ];
    
    // Return false if matches exclusion patterns
    if (exclusionPatterns.some(pattern => pattern.test(lowerName))) {
      return false;
    }
    
    // Additional checks for person names
    // Person names typically have 2-4 parts
    const parts = name.split(/\s+/);
    if (parts.length < 1 || parts.length > 4) {
      return false;
    }
    
    // All parts should start with capital letter (already covered by regex)
    // and be reasonable length
    return parts.every(part => part.length >= 2 && part.length <= 20);
  }

  /**
   * Extract dates from text
   * @param {string} text - Input text
   * @returns {Array} Array of extracted dates
   */
  extractDates(text) {
    const dates = [];
    
    const patterns = [
      // DD.MM.YYYY, DD/MM/YYYY
      /\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/g,
      // DD.MM.YY, DD/MM/YY
      /\b(\d{1,2})[./](\d{1,2})[./](\d{2})\b/g,
      // YYYY-MM-DD
      /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g,
      // Years
      /\b(19\d{2}|20\d{2})\s*(?:rok|roku|r\.)\b/g,
      // Polish date formats
      /\b(\d{1,2})\s+(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia)\s+(\d{4})\b/gi,
      // Historical periods
      /\b(XV|XVI|XVII|XVIII|XIX|XX|XXI)\s*wiek/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        dates.push(...matches.filter(date => !dates.includes(date)));
      }
    });
    
    return dates;
  }

  /**
   * Extract places from text
   * @param {string} text - Input text
   * @returns {Array} Array of extracted places
   */
  extractPlaces(text) {
    const places = [];
    
    // Common Polish city patterns and geographic names
    const patterns = [
      // Cities with typical Polish endings
      /\b[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:ów|owo|ice|ica|yn|sko|śl|ek|ak)\b/g,
      // Known major cities
      /\b(?:Warszawa|Kraków|Gdańsk|Wrocław|Poznań|Łódź|Szczecin|Bydgoszcz|Lublin|Katowice|Białystok|Częstochowa|Radom|Toruń|Sosnowiec|Rzeszów|Kielce|Gliwice|Zabrze|Olsztyn|Bielsko-Biała|Bytom|Zielona Góra|Rybnik|Ruda Śląska|Opole|Tychy|Gorzów Wielkopolski|Dąbrowa Górnicza|Elbląg|Płock|Wałbrzych|Włocławek|Tarnów|Chorzów|Koszalin|Kalisz|Legnica|Grudziądz|Słupsk|Jaworzno|Jastrzębie-Zdrój|Nowy Sącz|Jelenia Góra|Siedlce|Mysłowice|Konin|Piła|Ostrowiec Świętokrzyski|Gniezno|Stargard|Piotrków Trybunalski|Lubin|Ostrów Wielkopolski|Suwałki|Chełm|Tomaszów Mazowiecki|Zamość|Leszno|Przemyśl|Stalowa Wola|Mielec|Zgierz|Tarnowskie Góry|Zawiercie|Wodzisław Śląski|Puławy|Inowrocław|Ostróda|Zgierz|Świętochłowice|Starachowice|Będzin|Racibórz|Żory|Bolesławiec|Świdnica|Kędzierzyn-Koźle|Pabianice|Skierniewice|Radomsko|Żary|Kraśnik|Biała Podlaska|Augustów|Cieszyn|Oława|Sanok|Kętrzyn|Września|Nysa|Wejherowo|Łomża|Łuków|Giżycko|Sopot|Gdynia)\b/g,
      // Countries
      /\b(?:Polska|Polsce|Niemcy|Niemczech|Francja|Francji|Anglia|Anglii|Włochy|Włoszech|Hiszpania|Hiszpanii|Rosja|Rosji|Ukraina|Ukrainie|Czechy|Czechach|Słowacja|Słowacji|Litwa|Litwie|Białoruś|Białorusi|Austria|Austrii|Szwajcaria|Szwajcarii|Belgia|Belgii|Holandia|Holandii|Dania|Danii|Szwecja|Szwecji|Norwegia|Norwegii|Finlandia|Finlandii|USA|Ameryka|Ameryce|Kanada|Kanadzie|Australia|Australii|Japonia|Japonii|Chiny|Chinach|Indie|Indiach|Brazylia|Brazylii|Argentyna|Argentynie|Meksyk|Meksyku|Egipt|Egipcie|Turcja|Turcji|Grecja|Grecji|Izrael|Izraelu|Iran|Iranie|Irak|Iraku|Afganistan|Afganistanie|Pakistan|Pakistanie|Bangladesz|Bangladeszu|Tajlandia|Tajlandii|Wietnam|Wietnamie|Indonezja|Indonezji|Malezja|Malezji|Singapur|Singapurze|Korea|Korei|Mongolia|Mongolii|Kazachstan|Kazachstanie|Uzbekistan|Uzbekistanie|Kirgistan|Kirgistanie|Tadżykistan|Tadżykistanie|Turkmenistan|Turkmenistanie|Azerbejdżan|Azerbejdżanie|Armenia|Armenii|Gruzja|Gruzji|Bułgaria|Bułgarii|Rumunia|Rumunii|Węgry|Węgrzech|Słowenia|Słowenii|Chorwacja|Chorwacji|Serbia|Serbii|Bośnia|Bośni|Hercegowina|Hercegowinie|Czarnogóra|Czarnogórze|Albania|Albanii|Macedonia|Macedonii|Kosowo|Kosowie|Mołdawia|Mołdawii|Estonia|Estonii|Łotwa|Łotwie|Litwa|Litwie)\b/g
    ];
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (!places.includes(match) && match.length > 2) {
            places.push(match);
          }
        });
      }
    });
    
    return places;
  }

  /**
   * Find potential corrections for misspelled names
   * @param {string} name - The potentially misspelled name
   * @returns {Array} Array of possible corrections
   */
  findNameCorrections(name) {
    const corrections = [];
    const lowerName = name.toLowerCase();
    
    // Common misspellings and their corrections
    const commonCorrections = {
      // Scientists
      'alber ajnsztajn': 'Albert Einstein',
      'albert ajnsztajn': 'Albert Einstein',
      'ajnsztajn': 'Albert Einstein',
      'isaac niuton': 'Isaac Newton',
      'isaac newton': 'Isaac Newton',
      'niuton': 'Isaac Newton',
      'nikola tesla': 'Nikola Tesla',
      'galileusz': 'Galileo Galilei',
      'galileo galilei': 'Galileo Galilei',
      'kepler': 'Johannes Kepler',
      'johannes kepler': 'Johannes Kepler',
      'copernicus': 'Mikołaj Kopernik',
      'kopernik': 'Mikołaj Kopernik',
      'mikołaj kopernik': 'Mikołaj Kopernik',
      'darwin': 'Charles Darwin',
      'charles darwin': 'Charles Darwin',
      'mendel': 'Gregor Mendel',
      'gregor mendel': 'Gregor Mendel',
      'pasteur': 'Louis Pasteur',
      'louis pasteur': 'Louis Pasteur',
      
      // Curie family
      'curie': 'Marie Curie',
      'maria curie': 'Marie Curie',
      'marie curie': 'Marie Curie',
      'skłodowska': 'Marie Skłodowska-Curie',
      'maria skłodowska': 'Marie Skłodowska-Curie',
      'skłodowska-curie': 'Marie Skłodowska-Curie',
      'maria skłodowska-curie': 'Marie Skłodowska-Curie',
      
      // Historical figures - WWI
      'franc ferdynand': 'Archduke Franz Ferdinand',
      'franciszek ferdynand': 'Archduke Franz Ferdinand',
      'franz ferdinand': 'Archduke Franz Ferdinand',
      'wilhelm ii': 'Kaiser Wilhelm II',
      'wilhelm drugi': 'Kaiser Wilhelm II',
      'woodrow wilson': 'Woodrow Wilson',
      'wilson': 'Woodrow Wilson',
      'lloyd george': 'David Lloyd George',
      'georges clemenceau': 'Georges Clemenceau',
      'clemenceau': 'Georges Clemenceau',
      
      // Historical figures - WWII
      'adolf hitler': 'Adolf Hitler',
      'hitler': 'Adolf Hitler',
      'winston churchill': 'Winston Churchill',
      'churchill': 'Winston Churchill',
      'franklin roosevelt': 'Franklin D. Roosevelt',
      'roosevelt': 'Franklin D. Roosevelt',
      'józef stalin': 'Joseph Stalin',
      'stalin': 'Joseph Stalin',
      'benito mussolini': 'Benito Mussolini',
      'mussolini': 'Benito Mussolini'
    };
    
    // Check for exact matches first
    if (commonCorrections[lowerName]) {
      corrections.push(commonCorrections[lowerName]);
      return corrections;
    }
    
    // Check for partial matches (contains)
    for (const [misspelled, correct] of Object.entries(commonCorrections)) {
      if (lowerName.includes(misspelled) || misspelled.includes(lowerName)) {
        corrections.push(correct);
        break;
      }
    }
    
    return corrections;
  }

  /**
   * Verify a name using web search
   * @param {string} name - Name to verify
   * @returns {Promise<Object>} Verification result
   */
  async verifyName(name) {
    console.log(`[FactChecker] Verifying name: "${name}"`);
    
    // Skip obvious non-names
    const skipPatterns = [
      /nagrod[aąeę]/i,  // Awards like "Nagroda", "Nagrodę"
      /uniwersytet/i,   // Universities
      /instytut/i,      // Institutes
      /akademia/i,      // Academies
      /szkoła/i,        // Schools
      /fundacja/i,      // Foundations
      /organizacja/i    // Organizations
    ];
    
    const shouldSkip = skipPatterns.some(pattern => pattern.test(name));
    if (shouldSkip) {
      console.log(`[FactChecker] Skipping "${name}" - appears to be institution/award, not a person`);
      return {
        name,
        verified: false,
        confidence: 0,
        correction: null,
        source: null,
        reason: 'Not a person name'
      };
    }
    
    // Try to find potential corrections for common misspellings
    const corrections = this.findNameCorrections(name);
    let searchQuery = name;
    
    if (corrections.length > 0) {
      console.log(`[FactChecker] Trying correction: "${corrections[0]}" for "${name}"`);
      searchQuery = corrections[0];
    }
    
    const searchResult = await this.searchDuckDuckGo(searchQuery);
    
    if (!searchResult) {
      return {
        name,
        verified: false,
        confidence: 0,
        correction: null,
        source: null
      };
    }
    
    // Check if we got meaningful results
    const hasDefinition = searchResult.definition && searchResult.definition.length > 0;
    const hasAbstract = searchResult.abstractText && searchResult.abstractText.length > 0;
    const hasAnswer = searchResult.answer && searchResult.answer.length > 0;
    
    if (hasDefinition || hasAbstract || hasAnswer) {
      return {
        name,
        verified: true,
        confidence: 0.8,
        correction: corrections.length > 0 ? corrections[0] : null,
        source: searchResult.definitionSource || searchResult.abstractSource || 'DuckDuckGo',
        info: {
          definition: searchResult.definition,
          abstract: searchResult.abstractText,
          answer: searchResult.answer,
          url: searchResult.definitionURL || searchResult.abstractURL
        }
      };
    }
    
    return {
      name,
      verified: false,
      confidence: 0.2,
      correction: null,
      source: null
    };
  }

  /**
   * Verify a date using intelligent web search (NO hardcoded dates)
   * @param {string} date - Date to verify
   * @param {string} context - Surrounding context
   * @returns {Promise<Object>} Verification result
   */
  async verifyDate(date, context = '') {
    console.log(`[FactChecker] Verifying date: "${date}" with context: "${context.substring(0, 100)}..."`);
    
    // Extract year from date
    const yearMatch = date.match(/\b(1\d{3}|20\d{2})\b/);
    let year = null;
    if (yearMatch) {
      year = parseInt(yearMatch[1]);
    }
    
    // Basic date validation
    const currentYear = new Date().getFullYear();
    let isValidRange = true;
    
    if (year) {
      if (year < 1000 || year > currentYear + 10) {
        isValidRange = false;
      }
    }
    
    // Extract meaningful context terms
    const contextTerms = this.extractContextualTerms(context);
    let bestResult = null;
    let bestConfidence = 0;
    
    // Try multiple intelligent search strategies with English translations
    const searchStrategies = [
      // Strategy 1: World War I specific (if context indicates WWI)
      ...(context.toLowerCase().includes('pierwsza wojna') || context.toLowerCase().includes('wielka wojna') ? 
        ['World War 1', 'World War I', 'First World War'] : []),
      // Strategy 2: World War II specific (if context indicates WWII)  
      ...(context.toLowerCase().includes('druga wojna') || context.toLowerCase().includes('ii wojna') ? 
        ['World War 2', 'World War II', 'Second World War'] : []),
      // Strategy 3: "When did [event] happen?"
      `when did ${contextTerms.slice(0, 3).join(' ')} happen`,
      // Strategy 4: [Event] + year
      `${contextTerms.slice(0, 3).join(' ')} year date`,
      // Strategy 5: [Event] + "started" or "began"
      `${contextTerms.slice(0, 3).join(' ')} started began`,
      // Strategy 6: [Event] + "ended" or "finished"  
      `${contextTerms.slice(0, 3).join(' ')} ended finished`,
      // Strategy 7: Direct context + original date
      `${contextTerms.slice(0, 4).join(' ')} ${year}`
    ];
    
    for (const query of searchStrategies) {
      if (query.trim().length < 8) continue;
      
      console.log(`[FactChecker] Searching: "${query}"`);
      const searchResult = await this.searchDuckDuckGo(query);
      
      if (searchResult && (searchResult.abstractText || searchResult.answer || searchResult.definition)) {
        const resultText = (searchResult.abstractText || searchResult.answer || searchResult.definition || '').toLowerCase();
        
        // Also check Infobox for additional date information
        let infoboxText = '';
        if (searchResult.infobox && searchResult.infobox.content) {
          infoboxText = JSON.stringify(searchResult.infobox.content).toLowerCase();
        }
        
        const combinedText = resultText + ' ' + infoboxText;
        
        // Look for years in the search results (including common date ranges like 1914-1918)
        const foundYears = combinedText.match(/\b(1\d{3}|20\d{2})\b/g);
        
        // Special handling for date ranges like "1914–1918" or "1914-1918"
        const dateRanges = combinedText.match(/\b(1\d{3}|20\d{2})\s*[–\-]\s*(1\d{3}|20\d{2})\b/g);
        
        if (foundYears && year) {
          let foundYearNumbers = foundYears.map(y => parseInt(y));
          
          // If we found date ranges like "1914-1918", prefer those years
          if (dateRanges && dateRanges.length > 0) {
            console.log(`[FactChecker] Found date ranges: ${dateRanges.join(', ')}`);
            const rangeYears = [];
            dateRanges.forEach(range => {
              const years = range.match(/\b(1\d{3}|20\d{2})\b/g);
              if (years && years.length >= 2) {
                rangeYears.push(parseInt(years[0]), parseInt(years[1]));
              }
            });
            if (rangeYears.length > 0) {
              foundYearNumbers = rangeYears;
            }
          }
          
          // Check if our year appears in the results
          const exactMatch = foundYearNumbers.includes(year);
          
          // Check for close years (±1-2 years for events that span time)
          const closeMatch = foundYearNumbers.some(foundYear => Math.abs(foundYear - year) <= 2);
          
          let confidence = 0;
          let suggestedYear = year;
          let correction = null;
          
          if (exactMatch) {
            confidence = 0.8;
          } else if (closeMatch) {
            // Higher confidence if we found date ranges (more reliable)
            confidence = dateRanges && dateRanges.length > 0 ? 0.75 : 0.6;
            // Find the closest year
            const closest = foundYearNumbers.reduce((prev, curr) => 
              Math.abs(curr - year) < Math.abs(prev - year) ? curr : prev
            );
            suggestedYear = closest;
            
            // For date ranges, suggest the start year if input year is close to start,
            // or create a range correction if applicable
            if (dateRanges && dateRanges.length > 0) {
              const rangeMatch = dateRanges[0].match(/\b(1\d{3}|20\d{2})\b/g);
              if (rangeMatch && rangeMatch.length >= 2) {
                const startYear = parseInt(rangeMatch[0]);
                const endYear = parseInt(rangeMatch[1]);
                
                // If original year is close to start, suggest start year
                if (Math.abs(year - startYear) <= Math.abs(year - endYear)) {
                  suggestedYear = startYear;
                  correction = date.replace(/\b\d{4}\b/, startYear.toString());
                } else {
                  suggestedYear = endYear;
                  correction = date.replace(/\b\d{4}\b/, endYear.toString());
                }
              }
            } else {
              correction = date.replace(/\b\d{4}\b/, closest.toString());
            }
          } else {
            // Look for any reasonable year in the context
            const contextualYears = foundYearNumbers.filter(y => 
              y >= 1800 && y <= currentYear && Math.abs(y - year) <= 50
            );
            
            if (contextualYears.length > 0) {
              confidence = 0.4;
              // Find most frequent or most relevant year
              const mostRelevant = contextualYears.sort((a, b) => 
                foundYearNumbers.filter(x => x === b).length - foundYearNumbers.filter(x => x === a).length
              )[0];
              suggestedYear = mostRelevant;
              correction = date.replace(/\b\d{4}\b/, mostRelevant.toString());
            } else {
              confidence = 0.2;
            }
          }
          
          if (confidence > bestConfidence) {
            bestConfidence = confidence;
            bestResult = {
              date,
              verified: confidence > 0.6,
              confidence: confidence,
              correction: correction,
              source: searchResult.abstractSource || searchResult.definitionSource || 'DuckDuckGo',
              info: {
                originalYear: year,
                suggestedYear: suggestedYear,
                foundInSearch: foundYearNumbers,
                searchQuery: query,
                resultText: resultText.substring(0, 200)
              }
            };
          }
        }
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // If no good results, return basic validation
    if (!bestResult) {
      return {
        date,
        verified: isValidRange,
        confidence: isValidRange ? 0.3 : 0.1,
        correction: null,
        source: null,
        info: {
          originalYear: year,
          reason: 'No contextual verification found in web search'
        }
      };
    }
    
    return bestResult;
  }

  /**
   * Extract meaningful terms from context for intelligent search
   * @param {string} context - Context text
   * @returns {Array} Array of search terms
   */
  extractContextualTerms(context) {
    const terms = [];
    const lowerContext = context.toLowerCase();
    
    // Map Polish historical terms to English for better search results
    const polishToEnglish = {
      'pierwsza wojna światowa': 'World War I',
      'pierwsza wojna': 'World War 1',
      'wielka wojna': 'Great War',
      'druga wojna światowa': 'World War II',
      'druga wojna': 'World War 2',
      'ii wojna światowa': 'World War 2',
      'rewolucja francuska': 'French Revolution',
      'rewolucja październikowa': 'October Revolution',
      'rewolucja rosyjska': 'Russian Revolution'
    };
    
    // Check for direct matches of historical events
    for (const [polish, english] of Object.entries(polishToEnglish)) {
      if (lowerContext.includes(polish)) {
        terms.push(english);
        console.log(`[FactChecker] Mapped "${polish}" to "${english}"`);
        return [english]; // Return immediately for historical events
      }
    }
    
    // Remove common words and extract meaningful terms
    const commonWords = ['w', 'z', 'i', 'a', 'o', 'na', 'do', 'od', 'że', 'się', 'jest', 'był', 'było', 'była', 'były', 'roku', 'year', 'in', 'the', 'of', 'and', 'or', 'at'];
    
    // Split into words and filter
    const words = lowerContext
      .replace(/[^\w\sąćęłńóśźż]/g, ' ') // Keep Polish characters
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !commonWords.includes(word) &&
        !/^\d+$/.test(word) // Remove pure numbers
      );
    
    // Take most meaningful words (proper nouns, longer words)
    const meaningfulWords = words
      .filter(word => word.length >= 4) // Prefer longer words
      .slice(0, 10); // Limit to avoid too long queries
    
    return meaningfulWords;
  }

  /**
   * Verify a place using web search
   * @param {string} place - Place to verify
   * @returns {Promise<Object>} Verification result
   */
  async verifyPlace(place) {
    console.log(`[FactChecker] Verifying place: "${place}"`);
    
    // Try multiple search strategies for places
    const searchQueries = [
      `${place} miasto Polska`,  // City in Poland
      `${place} miasto`,         // City generally
      `${place} kraj`,           // Country
      `${place} region`,         // Region
      `${place} lokalizacja geografia`  // General location
    ];
    
    let bestResult = null;
    let bestConfidence = 0;
    
    for (const query of searchQueries) {
      const searchResult = await this.searchDuckDuckGo(query);
      if (searchResult && searchResult.abstractText) {
        const abstract = searchResult.abstractText.toLowerCase();
        
        // Check for location-related keywords in abstract
        const locationKeywords = [
          'miasto', 'city', 'town', 'village',
          'kraj', 'country', 'nation',
          'województwo', 'voivodeship', 'province',
          'region', 'area', 'district',
          'stolica', 'capital',
          'położ', 'located', 'situated',
          'geografia', 'geography'
        ];
        
        const keywordMatches = locationKeywords.filter(keyword => 
          abstract.includes(keyword)
        ).length;
        
        const confidence = Math.min(0.9, keywordMatches * 0.15 + 0.3);
        
        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestResult = {
            place,
            verified: confidence > 0.5,
            confidence: confidence,
            correction: null,
            source: searchResult.abstractSource || 'DuckDuckGo',
            info: {
              abstract: searchResult.abstractText,
              url: searchResult.abstractURL
            }
          };
        }
        
        // Small delay between queries
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    if (bestResult) {
      return bestResult;
    }
    
    return {
      place,
      verified: false,
      confidence: 0,
      correction: null,
      source: null
    };
  }

  /**
   * Perform comprehensive fact-checking on text
   * @param {string} text - Text to fact-check
   * @returns {Promise<Object>} Fact-checking results
   */
  async factCheck(text) {
    console.log(`[FactChecker] Starting fact-check of ${text.length} characters`);
    
    const startTime = Date.now();
    const results = {
      names: [],
      dates: [],
      places: [],
      summary: {
        totalVerified: 0,
        totalChecked: 0,
        confidence: 0,
        duration: 0
      }
    };
    
    try {
      // Extract entities
      const names = this.extractNames(text);
      const dates = this.extractDates(text);
      const places = this.extractPlaces(text);
      
      console.log(`[FactChecker] Extracted: ${names.length} names, ${dates.length} dates, ${places.length} places`);
      
      // Verify names (limit to avoid too many API calls)
      const namesToCheck = names.slice(0, 10);
      for (const name of namesToCheck) {
        const verification = await this.verifyName(name);
        results.names.push(verification);
        if (verification.verified) results.summary.totalVerified++;
        results.summary.totalChecked++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Verify dates (with context)
      const datesToCheck = dates.slice(0, 5);
      for (const date of datesToCheck) {
        // Get context around the date
        const dateIndex = text.indexOf(date);
        const contextStart = Math.max(0, dateIndex - 100);
        const contextEnd = Math.min(text.length, dateIndex + date.length + 100);
        const context = text.substring(contextStart, contextEnd);
        
        const verification = await this.verifyDate(date, context);
        results.dates.push(verification);
        if (verification.verified) results.summary.totalVerified++;
        results.summary.totalChecked++;
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Verify places
      const placesToCheck = places.slice(0, 5);
      for (const place of placesToCheck) {
        const verification = await this.verifyPlace(place);
        results.places.push(verification);
        if (verification.verified) results.summary.totalVerified++;
        results.summary.totalChecked++;
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Calculate overall confidence
      if (results.summary.totalChecked > 0) {
        results.summary.confidence = results.summary.totalVerified / results.summary.totalChecked;
      }
      
      results.summary.duration = Date.now() - startTime;
      
      console.log(`[FactChecker] Completed: ${results.summary.totalVerified}/${results.summary.totalChecked} verified (${(results.summary.confidence * 100).toFixed(1)}%) in ${results.summary.duration}ms`);
      
      return results;
      
    } catch (error) {
      console.error('[FactChecker] Error during fact-checking:', error);
      results.summary.duration = Date.now() - startTime;
      return results;
    }
  }

  /**
   * Apply corrections to text based on fact-checking results
   * @param {string} text - Original text
   * @param {Object} factCheckResults - Results from factCheck()
   * @returns {Object} Corrected text and change log
   */
  applyCorrections(text, factCheckResults) {
    let correctedText = text;
    const changes = [];
    
    // Apply name corrections
    factCheckResults.names.forEach(nameResult => {
      if (nameResult.correction && nameResult.confidence >= 0.7) {
        const regex = new RegExp(nameResult.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        correctedText = correctedText.replace(regex, nameResult.correction);
        changes.push({
          type: 'name',
          original: nameResult.name,
          corrected: nameResult.correction,
          confidence: nameResult.confidence,
          source: nameResult.source
        });
      }
    });
    
    // Apply date corrections
    factCheckResults.dates.forEach(dateResult => {
      if (dateResult.correction && dateResult.confidence >= 0.7) {
        const regex = new RegExp(dateResult.date.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        correctedText = correctedText.replace(regex, dateResult.correction);
        changes.push({
          type: 'date',
          original: dateResult.date,
          corrected: dateResult.correction,
          confidence: dateResult.confidence,
          source: dateResult.source
        });
      }
    });
    
    // Apply place corrections
    factCheckResults.places.forEach(placeResult => {
      if (placeResult.correction && placeResult.confidence >= 0.7) {
        const regex = new RegExp(placeResult.place.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        correctedText = correctedText.replace(regex, placeResult.correction);
        changes.push({
          type: 'place',
          original: placeResult.place,
          corrected: placeResult.correction,
          confidence: placeResult.confidence,
          source: placeResult.source
        });
      }
    });
    
    return {
      originalText: text,
      correctedText,
      changes,
      hasChanges: changes.length > 0
    };
  }
}

export default FactChecker;