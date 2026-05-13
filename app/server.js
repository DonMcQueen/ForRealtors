require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rai_' + require('crypto').randomBytes(32).toString('hex');

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EMAILS_PATH = path.join(__dirname, 'authorized-emails.json');
const USERS_PATH = path.join(__dirname, 'users.json');

function loadJSON(filePath) {
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
    catch { return []; }
}

function saveUsers(users) {
    fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
}

function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    try {
        const decoded = jwt.verify(header.slice(7), JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

app.post('/api/auth/check-email', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const normalized = email.trim().toLowerCase();
    const authorized = loadJSON(EMAILS_PATH).map(e => e.toLowerCase());

    if (!authorized.includes(normalized)) {
        return res.json({ authorized: false });
    }

    const users = loadJSON(USERS_PATH);
    const existing = users.find(u => u.email === normalized);

    return res.json({ authorized: true, registered: !!existing });
});

app.post('/api/auth/register', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const normalized = email.trim().toLowerCase();
    const authorized = loadJSON(EMAILS_PATH).map(e => e.toLowerCase());

    if (!authorized.includes(normalized)) {
        return res.status(403).json({ error: 'Email not authorized' });
    }

    const users = loadJSON(USERS_PATH);
    if (users.find(u => u.email === normalized)) {
        return res.status(409).json({ error: 'Account already exists. Please sign in.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    users.push({ email: normalized, password: hash, createdAt: new Date().toISOString() });
    saveUsers(users);

    const token = jwt.sign({ email: normalized }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, email: normalized });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const normalized = email.trim().toLowerCase();
    const users = loadJSON(USERS_PATH);
    const user = users.find(u => u.email === normalized);

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ email: normalized }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, email: normalized });
});

app.get('/api/auth/verify', requireAuth, (req, res) => {
    return res.json({ email: req.user.email });
});

app.post('/api/suggest-places', requireAuth, async (req, res) => {
    const { transcripts } = req.body;

    if (!transcripts || transcripts.length === 0) {
        return res.json([]);
    }

    const transcriptText = transcripts
        .map(t => `Q (${t.category}): ${t.question}\nA: ${t.transcript}`)
        .join('\n\n');

    try {
        const response = await anthropic.messages.create({
            model: process.env.CLAUDE_MODEL || 'claude-opus-4-6',
            max_tokens: 1024,
            thinking: { type: 'adaptive' },
            messages: [{
                role: 'user',
                content: `You are a real estate assistant. Based on this client's Q&A responses, suggest nearby places and amenities they would find valuable when evaluating a neighborhood.

Client Q&A Transcripts:
${transcriptText}

Return ONLY a valid JSON array — no explanation, no markdown, no backticks. Each item must have:
  "label": short display name (e.g. "Veterinarian", "Dog Park", "Emergency Vet")
  "type": the single most specific Google Places API type string that matches ONLY this kind of place. Valid types include: veterinary_care, pet_store, park, gym, hospital, church, mosque, synagogue, school, transit_station, shopping_mall, movie_theater, hardware_store, garden_center, library, pharmacy, dentist, doctor, car_repair, gas_station, bank, atm, restaurant, cafe, bar, night_club, stadium, bowling_alley, golf_course, spa, beauty_salon, laundry, post_office, police, fire_station, storage
  "keyword": a very specific search phrase that, combined with the type, ensures ONLY relevant businesses appear (e.g. for gardening: type="garden_center" keyword="plant nursery garden supply"; for dog park: type="park" keyword="dog park off leash"; for 24hr vet: type="veterinary_care" keyword="emergency veterinary 24 hour"). The keyword must filter OUT unrelated businesses.
  "reason": one sentence explaining why this client specifically would value this place

Critical rules:
- ALWAYS provide both type AND keyword — never omit either
- The keyword must be precise enough that a Google search for "[keyword] near [city]" returns only the intended type of business
- Do NOT use overly broad keywords like "garden" or "store" — use specific phrases like "plant nursery" or "garden supply center"
- Return 3 to 8 suggestions most clearly indicated by the client's actual answers`
            }]
        });

        const textBlock = response.content.find(b => b.type === 'text');
        if (!textBlock) return res.json([]);

        const text = textBlock.text.trim();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error('No JSON array found in Claude response:', text);
            return res.json([]);
        }

        const suggestions = JSON.parse(jsonMatch[0]);
        console.log(`Returning ${suggestions.length} personalized suggestions`);
        res.json(suggestions);

    } catch (err) {
        console.error('Claude API error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Real Agent Insight running at http://localhost:${PORT}`);
});
