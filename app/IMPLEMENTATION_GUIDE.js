// IMPLEMENTATION GUIDE: Real Web Search for Location Research
// This file shows how to replace the mock data with actual web searches

// ============================================================================
// OPTION 1: Using a Backend API (Recommended)
// ============================================================================

// Backend (Node.js/Express example)
// File: server.js
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(express.json());

app.post('/api/search-location', async (req, res) => {
    const { zipCode } = req.body;

    try {
        // Perform parallel searches
        const [housing, schools, crime] = await Promise.allSettled([
            searchZillow(zipCode),
            searchNiche(zipCode),
            searchCrimeGrade(zipCode)
        ]);

        res.json({
            housing: housing.status === 'fulfilled' ? housing.value : null,
            schools: schools.status === 'fulfilled' ? schools.value : null,
            crime: crime.status === 'fulfilled' ? crime.value : null,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});

async function searchZillow(zipCode) {
    // Option A: Use Zillow API (if available)
    // const response = await axios.get(`https://api.zillow.com/...`);

    // Option B: Web scraping (example)
    const url = `https://www.zillow.com/homes/${zipCode}_rb/`;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Extract data from the page
    const medianPrice = $('.median-price').text();
    const rentEstimate = $('.rent-estimate').text();

    return {
        summary: `Median home price: ${medianPrice}. Estimated rent: ${rentEstimate}`,
        status: 'success'
    };
}

async function searchNiche(zipCode) {
    const url = `https://www.niche.com/places-to-live/search/best-places/${zipCode}/`;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const overallGrade = $('.overall-grade').text();
    const schoolRating = $('.school-rating').text();

    return {
        summary: `Overall grade: ${overallGrade}. School rating: ${schoolRating}`,
        status: 'success'
    };
}

async function searchCrimeGrade(zipCode) {
    const url = `https://crimegrade.org/safest-places-in-${zipCode}/`;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const crimeGrade = $('.crime-grade').text();
    const safetyScore = $('.safety-score').text();

    return {
        summary: `Crime grade: ${crimeGrade}. Safety score: ${safetyScore}`,
        status: 'success'
    };
}

app.listen(3000, () => console.log('Server running on port 3000'));

// ============================================================================
// Frontend Update (app.js)
// ============================================================================

// Replace the performSearch function in LocationResearch component:
const performSearch = async (zip, index) => {
    if (!validateZipCode(zip)) {
        setErrors(prev => ({ ...prev, [index]: 'Invalid ZIP code format' }));
        return;
    }

    setErrors(prev => ({ ...prev, [index]: null }));
    setLoading(prev => ({ ...prev, [index]: true }));

    try {
        // Call backend API
        const response = await fetch('http://localhost:3000/api/search-location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zipCode: zip })
        });

        if (!response.ok) {
            throw new Error('Search failed');
        }

        const data = await response.json();

        // Update results
        setSearchResults(prev => {
            const updated = { ...prev, [zip]: data };
            localStorage.setItem(`c_${clientId}_location_data`, JSON.stringify({
                zipCodes,
                results: updated
            }));
            return updated;
        });

    } catch (error) {
        console.error('Search error:', error);
        setErrors(prev => ({
            ...prev,
            [index]: 'Search failed. Please try again later.'
        }));
    } finally {
        setLoading(prev => ({ ...prev, [index]: false }));
    }
};

// ============================================================================
// OPTION 2: Using Third-Party APIs
// ============================================================================

// Example using official APIs (requires API keys)
async function searchWithAPIs(zipCode) {
    const ZILLOW_API_KEY = 'your_zillow_api_key';
    const CRIME_API_KEY = 'your_crime_api_key';

    // Zillow API example
    const zillowResponse = await fetch(
        `https://api.zillow.com/webservice/GetRegionChildren.htm?zws-id=${ZILLOW_API_KEY}&state=&city=&childtype=zipcode&zipcode=${zipCode}`
    );

    // Crime Data API example
    const crimeResponse = await fetch(
        `https://api.usa.gov/crime/fbi/sapi/api/summarized/agencies/participation/states?api_key=${CRIME_API_KEY}`
    );

    return {
        housing: await zillowResponse.json(),
        crime: await crimeResponse.json()
    };
}

// ============================================================================
// OPTION 3: Using Web Scraping Service
// ============================================================================

// Example using ScraperAPI
const SCRAPER_API_KEY = 'your_scraper_api_key';

async function scrapeWithService(url) {
    const response = await fetch(
        `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`
    );
    return await response.text();
}

// Usage
const zillowHTML = await scrapeWithService(`https://www.zillow.com/homes/${zipCode}_rb/`);
// Parse HTML with cheerio or similar

// ============================================================================
// IMPORTANT CONSIDERATIONS
// ============================================================================

/*
1. RATE LIMITING
   - Implement rate limiting to avoid overwhelming external sites
   - Use caching to reduce redundant requests
   - Consider using a queue system for high traffic

2. ERROR HANDLING
   - Handle network errors gracefully
   - Provide fallback data when searches fail
   - Show partial results if some searches succeed

3. LEGAL & ETHICAL
   - Check terms of service for each website
   - Respect robots.txt
   - Consider using official APIs when available
   - Add appropriate delays between requests

4. CACHING
   - Cache results for a reasonable time (e.g., 24 hours)
   - Reduce load on external services
   - Improve response times

5. SECURITY
   - Validate and sanitize ZIP code input
   - Use HTTPS for all requests
   - Store API keys securely (environment variables)
   - Implement CORS properly

6. PERFORMANCE
   - Use Promise.allSettled for parallel requests
   - Set reasonable timeouts
   - Implement retry logic with exponential backoff
*/

// Example with caching and rate limiting
const cache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function searchWithCache(zipCode) {
    const cacheKey = `location_${zipCode}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }

    // Perform actual search
    const data = await performActualSearch(zipCode);

    // Cache the result
    cache.set(cacheKey, {
        data,
        timestamp: Date.now()
    });

    return data;
}
