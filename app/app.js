const { useState, useEffect, useRef } = React;
// Questions loaded from window.questions (data.js)

// --- Components ---


const Recorder = ({ onTranscriptUpdate, onRecordingComplete }) => {
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef(null);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                onTranscriptUpdate(finalTranscript, interimTranscript);
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                setIsRecording(false);
            };
        } else {
            console.warn("Web Speech API not supported in this browser.");
        }
    }, []);

    const toggleRecording = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
            onRecordingComplete();
        } else {
            onTranscriptUpdate("", "", true); // Clear previous transcript
            recognitionRef.current?.start();
            setIsRecording(true);
        }
    };

    return (
        <div className="recorder-controls">
            <button
                className={`record-btn ${isRecording ? 'recording' : ''}`}
                onClick={toggleRecording}
                title={isRecording ? "Stop Recording" : "Start Recording"}
            />
            <div className="status-text">
                {isRecording ? "Listening... (Speak now)" : "Click to Record Answer"}
            </div>
        </div>
    );
};

const LoginView = ({ onLogin }) => {
    const [step, setStep] = useState('email');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const validatePassword = (pwd) => {
        const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
        return regex.test(pwd);
    };

    const handleCheckEmail = async (e) => {
        e.preventDefault();
        setError('');
        if (!email.trim()) { setError('Please enter your email.'); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/check-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() })
            });
            const data = await res.json();
            if (!data.authorized) {
                setError('This email is not authorized. Contact your administrator for access.');
            } else if (data.registered) {
                setStep('login');
            } else {
                setStep('register');
            }
        } catch {
            setError('Unable to reach the server. Please try again.');
        } finally { setLoading(false); }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        if (!password) { setError('Please enter your password.'); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), password })
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Login failed.'); return; }
            localStorage.setItem('rai_token', data.token);
            localStorage.setItem('rai_email', data.email);
            onLogin(data.email);
        } catch {
            setError('Unable to reach the server. Please try again.');
        } finally { setLoading(false); }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        if (!validatePassword(password)) {
            setError('Password must be at least 8 characters, include 1 uppercase letter, 1 number, and 1 special character (!@#$%^&*).');
            return;
        }
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), password })
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Registration failed.'); return; }
            localStorage.setItem('rai_token', data.token);
            localStorage.setItem('rai_email', data.email);
            onLogin(data.email);
        } catch {
            setError('Unable to reach the server. Please try again.');
        } finally { setLoading(false); }
    };

    const handleGoogleLogin = () => {
        setError('Google Sign-In is not yet available. Please use your email and password.');
    };

    const handleBack = () => {
        setStep('email');
        setPassword('');
        setConfirmPassword('');
        setError('');
    };

    return (
        <div className="login-container">
            <div className="glass-panel login-card">
                <h1 style={{ marginBottom: '0.5rem' }}>Real Agent <span style={{ color: 'var(--accent-color)' }}>Insight</span></h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Sign in to access your dashboard</p>

                <button className="google-btn" style={{ width: '100%' }} onClick={handleGoogleLogin}>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="18" height="18" />
                    Sign in with Google
                </button>

                <div className="divider">OR</div>

                {step === 'email' && (
                    <form className="login-form" onSubmit={handleCheckEmail}>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                type="email"
                                className="form-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                autoFocus
                            />
                        </div>
                        {error && <div className="error-msg">{error}</div>}
                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? 'Checking...' : 'Continue'}
                        </button>
                    </form>
                )}

                {step === 'login' && (
                    <form className="login-form" onSubmit={handleLogin}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            Signing in as <strong style={{ color: 'var(--gold)' }}>{email}</strong>
                            <button type="button" onClick={handleBack} style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.85rem', padding: 0 }}>Change</button>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                autoFocus
                            />
                        </div>
                        {error && <div className="error-msg">{error}</div>}
                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                )}

                {step === 'register' && (
                    <form className="login-form" onSubmit={handleRegister}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                            Welcome! Set up your account for <strong style={{ color: 'var(--gold)' }}>{email}</strong>
                            <button type="button" onClick={handleBack} style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.85rem', padding: 0 }}>Change</button>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.7 }}>
                            Min 8 characters, 1 uppercase, 1 number, 1 special character (!@#$%^&*)
                        </p>
                        <div className="form-group">
                            <label className="form-label">Create Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Create a password"
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm your password"
                            />
                        </div>
                        {error && <div className="error-msg">{error}</div>}
                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

const ClientDashboard = ({ onSelectClient }) => {
    const [clients, setClients] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [newClient, setNewClient] = useState({ name: "", age: "", phone: "", email: "" });
    const [editingClient, setEditingClient] = useState(null);
    const [deletingClient, setDeletingClient] = useState(null);

    useEffect(() => {
        const savedClients = localStorage.getItem("clients");
        if (savedClients) {
            setClients(JSON.parse(savedClients));
        }
    }, []);

    const handleCreateClient = (e) => {
        e.preventDefault();
        const client = {
            id: Date.now().toString(),
            ...newClient,
            createdAt: new Date().toISOString()
        };

        const updatedClients = [...clients, client];
        setClients(updatedClients);
        localStorage.setItem("clients", JSON.stringify(updatedClients));
        setShowModal(false);
        setNewClient({ name: "", age: "", phone: "", email: "" });
    };

    const handleEditClick = (e, client) => {
        e.stopPropagation(); // Prevent card click
        setEditingClient({ ...client });
        setShowEditModal(true);
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        const updatedClients = clients.map(c =>
            c.id === editingClient.id ? editingClient : c
        );
        setClients(updatedClients);
        localStorage.setItem("clients", JSON.stringify(updatedClients));
        setShowEditModal(false);
        setEditingClient(null);
    };

    const handleDeleteClick = (e, client) => {
        e.stopPropagation(); // Prevent card click
        setDeletingClient(client);
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = () => {
        // Remove client from list
        const updatedClients = clients.filter(c => c.id !== deletingClient.id);
        setClients(updatedClients);
        localStorage.setItem("clients", JSON.stringify(updatedClients));

        // Delete all associated question data
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(`c_${deletingClient.id}_`)) {
                localStorage.removeItem(key);
            }
        });

        setShowDeleteConfirm(false);
        setDeletingClient(null);
    };

    return (
        <div className="login-container" style={{ alignItems: 'flex-start', paddingTop: '4rem' }}>
            <div style={{ width: '100%', maxWidth: '1000px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ margin: 0 }}>Select Client</h1>
                        <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>Choose a client profile to manage</p>
                    </div>
                    <button className="submit-btn" style={{ margin: 0 }} onClick={() => setShowModal(true)}>
                        + New Client
                    </button>
                </div>

                <div className="client-grid">
                    <button className="add-client-card" onClick={() => setShowModal(true)}>
                        <span className="add-icon">+</span>
                        <span>Create New Profile</span>
                    </button>

                    {clients.map(client => (
                        <div key={client.id} className="client-card" onClick={() => onSelectClient(client)}>
                            <div className="client-card-actions">
                                <button
                                    className="client-action-btn edit-btn"
                                    onClick={(e) => handleEditClick(e, client)}
                                    title="Edit client"
                                >
                                    ✏️
                                </button>
                                <button
                                    className="client-action-btn delete-btn"
                                    onClick={(e) => handleDeleteClick(e, client)}
                                    title="Delete client"
                                >
                                    🗑️
                                </button>
                            </div>
                            <h3>{client.name}</h3>
                            <div className="client-info">Age: {client.age}</div>
                            <div className="client-info">Phone: {client.phone}</div>
                            <div className="client-info">Email: {client.email}</div>
                            <div className="client-info" style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
                                Created: {new Date(client.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
                        <h2 style={{ marginTop: 0 }}>New Client Profile</h2>
                        <form className="login-form" onSubmit={handleCreateClient}>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input
                                    required
                                    className="form-input"
                                    value={newClient.name}
                                    onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Age</label>
                                <input
                                    required
                                    type="number"
                                    className="form-input"
                                    value={newClient.age}
                                    onChange={e => setNewClient({ ...newClient, age: e.target.value })}
                                    placeholder="35"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone Number</label>
                                <input
                                    required
                                    type="tel"
                                    className="form-input"
                                    value={newClient.phone}
                                    onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                                    placeholder="(555) 123-4567"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input
                                    required
                                    type="email"
                                    className="form-input"
                                    value={newClient.email}
                                    onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                                    placeholder="john@example.com"
                                />
                            </div>
                            <button type="submit" className="submit-btn">Create Profile</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingClient && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="close-btn" onClick={() => { setShowEditModal(false); setEditingClient(null); }}>×</button>
                        <h2 style={{ marginTop: 0 }}>Edit Client Profile</h2>
                        <form className="login-form" onSubmit={handleEditSubmit}>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input
                                    required
                                    className="form-input"
                                    value={editingClient.name}
                                    onChange={e => setEditingClient({ ...editingClient, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Age</label>
                                <input
                                    required
                                    type="number"
                                    className="form-input"
                                    value={editingClient.age}
                                    onChange={e => setEditingClient({ ...editingClient, age: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone Number</label>
                                <input
                                    required
                                    type="tel"
                                    className="form-input"
                                    value={editingClient.phone}
                                    onChange={e => setEditingClient({ ...editingClient, phone: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input
                                    required
                                    type="email"
                                    className="form-input"
                                    value={editingClient.email}
                                    onChange={e => setEditingClient({ ...editingClient, email: e.target.value })}
                                />
                            </div>
                            <button type="submit" className="submit-btn">Save Changes</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && deletingClient && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <h2 style={{ marginTop: 0, color: 'var(--red)' }}>Delete Client?</h2>
                        <p style={{ marginBottom: '1.5rem' }}>
                            Are you sure you want to delete <strong>{deletingClient.name}</strong>?
                            This will permanently remove all their recorded answers.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button
                                className="nav-btn"
                                onClick={() => { setShowDeleteConfirm(false); setDeletingClient(null); }}
                            >
                                Cancel
                            </button>
                            <button
                                className="submit-btn"
                                style={{ background: 'var(--red)' }}
                                onClick={handleDeleteConfirm}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const QuestionView = ({ question, onNext, onPrev, hasNext, hasPrev, clientId }) => {
    const [transcript, setTranscript] = useState("");
    const [interim, setInterim] = useState("");
    const [summary, setSummary] = useState("");
    const [isSummarizing, setIsSummarizing] = useState(false);

    // Use ref to always have current question - fixes closure bug
    const currentQuestionRef = useRef(question);

    // Update ref whenever question changes
    useEffect(() => {
        currentQuestionRef.current = question;
    }, [question]);

    // Load saved data for this question AND client
    useEffect(() => {
        const key = `c_${clientId}_q_${question.id}`;
        const saved = localStorage.getItem(key);
        console.log('LOADING:', key, 'Question:', question.text.substring(0, 50));
        if (saved) {
            const data = JSON.parse(saved);
            console.log('Found data:', data);
            setTranscript(data.transcript || "");
            setSummary(data.summary || "");
        } else {
            console.log('No data found, clearing');
            setTranscript("");
            setSummary("");
        }
        setInterim("");
    }, [question.id, clientId]);

    const handleTranscriptUpdate = (final, temp, clear = false) => {
        if (clear) {
            setTranscript("");
            setInterim("");
            return;
        }
        if (final) {
            setTranscript(prev => {
                const newTranscript = prev + " " + final;
                saveData(newTranscript, summary);
                return newTranscript;
            });
        }
        setInterim(temp);
    };

    const handleRecordingComplete = () => {
        if (transcript.length > 10) {
            setIsSummarizing(true);
            setTimeout(() => {
                const mockSummary = `Client discussed ${currentQuestionRef.current.category.toLowerCase()} preferences. Key points: ${transcript.substring(0, 50)}...`;
                setSummary(mockSummary);
                saveData(transcript, mockSummary);
                setIsSummarizing(false);
            }, 1500);
        }
    };

    const saveData = (t, s) => {
        // CRITICAL FIX: Use ref to get current question, not closure
        const currentQuestion = currentQuestionRef.current;
        const key = `c_${clientId}_q_${currentQuestion.id}`;
        const data = {
            transcript: t,
            summary: s,
            timestamp: new Date().toISOString(),
            questionText: currentQuestion.text // Add for debugging
        };
        console.log('SAVING:', key, 'Question:', currentQuestion.text.substring(0, 50));
        console.log('Data:', data);
        localStorage.setItem(key, JSON.stringify(data));
    };

    return (
        <div className="glass-panel question-card">
            <div className="label">{question.category}</div>
            <div className="question-text">{question.text}</div>

            <Recorder
                onTranscriptUpdate={handleTranscriptUpdate}
                onRecordingComplete={handleRecordingComplete}
            />

            {(transcript || interim) && (
                <div className="response-area">
                    <div className="transcript-box">
                        <span className="label">Live Transcript</span>
                        <div className="content">
                            {transcript} <span style={{ opacity: 0.5 }}>{interim}</span>
                        </div>
                    </div>
                </div>
            )}

            {isSummarizing && (
                <div className="summary-box" style={{ marginTop: '1rem' }}>
                    <span className="label">Generating Insight...</span>
                    <div className="content" style={{ fontStyle: 'italic', opacity: 0.7 }}>
                        Analyzing client response...
                    </div>
                </div>
            )}

            {summary && !isSummarizing && (
                <div className="summary-box" style={{ marginTop: '1rem', borderLeft: '3px solid var(--accent-color)' }}>
                    <span className="label" style={{ color: 'var(--accent-color)' }}>Agent Insight (Summary)</span>
                    <div className="content">{summary}</div>
                </div>
            )}

            <div className="nav-buttons">
                <button className="nav-btn" onClick={onPrev} disabled={!hasPrev}>Previous</button>
                <button className="nav-btn" onClick={onNext} disabled={!hasNext}>Next Question</button>
            </div>
        </div>
    );
};

// --- Mock Data ---
const MOCK_HOMES = [
    { id: 1, zip: '90210', price: 3250000, beds: 3, baths: 4, sqft: 2644, address: '2533 Benedict Canyon Dr', img: 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?auto=format&fit=crop&w=400&q=80', url: 'https://www.zillow.com/homedetails/2533-Benedict-Canyon-Dr-Beverly-Hills-CA-90210/20539343_zpid/' },
    { id: 2, zip: '90210', price: 4888000, beds: 5, baths: 5, sqft: 4905, address: '9626 Highridge Dr', img: 'https://images.unsplash.com/photo-1628624747186-a941c725611b?auto=format&fit=crop&w=400&q=80', url: 'https://www.zillow.com/homedetails/9626-Highridge-Dr-Beverly-Hills-CA-90210/20531557_zpid/' },
    { id: 3, zip: '90210', price: 1895000, beds: 4, baths: 2, sqft: 1946, address: '9844 Wanda Park Dr', img: 'https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?auto=format&fit=crop&w=400&q=80', url: 'https://www.zillow.com/homedetails/9844-Wanda-Park-Dr-Beverly-Hills-CA-90210/20524417_zpid/' },
    { id: 4, zip: '90210', price: 2499000, beds: 1, baths: 2, sqft: 1752, address: '425 N Palm Dr #104', img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80', url: 'https://www.zillow.com/homedetails/425-N-Palm-Dr-104-Beverly-Hills-CA-90210/2053258830_zpid/' },
    { id: 5, zip: '90210', price: 2900000, beds: 3, baths: 3, sqft: 1800, address: '403 N Palm Dr #3', img: 'https://images.unsplash.com/photo-1515263487990-61b07816b324?auto=format&fit=crop&w=400&q=80', url: 'https://www.zillow.com/homedetails/403-N-Palm-Dr-3-Beverly-Hills-CA-90210/2065842813_zpid/' },

    // NYC Demo Data
    { id: 6, zip: '10001', price: 1250000, beds: 1, baths: 1, sqft: 850, address: '50 W 34th St #4B', img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=400&q=80', url: 'https://www.zillow.com/homes/10001_rb/' },
    { id: 7, zip: '10001', price: 3500000, beds: 3, baths: 2, sqft: 1800, address: '15 Hudson Yards', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80', url: 'https://www.zillow.com/homes/10001_rb/' },
];

// --- Mock Data Generator Configuration ---
const STREET_NAMES = [
    'Maple', 'Oak', 'Washington', 'Highland', 'Park', 'Main', 'Elm', 'Cedar',
    'Sunset', 'Pine', 'Lake', 'Hill', 'Valley', 'View', 'Forest', 'Meadow',
    'Willow', 'River', 'Spring', 'Ridge', 'Aspen', 'Cherry', 'Magnolia'
];

const SUFFIXES = ['St', 'Ave', 'Blvd', 'Ln', 'Dr', 'Rd', 'Ct', 'Way', 'Pl'];

const generateMockHomes = (zip, min, max) => {
    const images = [
        'https://images.unsplash.com/photo-1580587771525-78b9dba3b91d?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1600596542815-2495db9dc2c3?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=400&q=80'
    ];

    const homes = [];
    const count = Math.floor(Math.random() * 3) + 3; // 3 to 5 homes

    const effectiveMin = min === 0 ? 300000 : min;
    const effectiveMax = max === Infinity ? 1500000 : max;

    for (let i = 0; i < count; i++) {
        const price = Math.floor(Math.random() * (effectiveMax - effectiveMin + 1)) + effectiveMin;
        const beds = Math.floor(Math.random() * 3) + 2; // 2-4 beds
        const baths = Math.floor(Math.random() * 2) + 2; // 2-3 baths
        const sqft = beds * 500 + Math.floor(Math.random() * 500);

        const street = STREET_NAMES[Math.floor(Math.random() * STREET_NAMES.length)];
        const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
        const number = Math.floor(Math.random() * 9000) + 100;

        homes.push({
            id: `gen_${zip}_${i}`,
            zip: zip,
            price: price,
            beds: beds,
            baths: baths,
            sqft: sqft,
            address: `${number} ${street} ${suffix}`,
            img: images[i % images.length],
            url: `https://www.zillow.com/homes/${zip}_rb/`,
            isSimulated: true // Flag for UI
        });
    }
    return homes;
};

// --- Service Provider Categories ---
const SERVICE_CATEGORIES = [
    { name: 'Structural & Exterior', services: [
        { label: 'General Contractor', keyword: 'general contractor home renovation remodel', description: 'Oversees large renovation or remodel projects, coordinates subcontractors' },
        { label: 'Roofer', keyword: 'roofing contractor roof repair replacement', type: 'roofing_contractor', description: 'Repairs, replaces, and inspects roofs and gutters' },
        { label: 'Siding Contractor', keyword: 'siding contractor vinyl wood fiber cement', description: 'Installs and repairs exterior siding' },
        { label: 'Foundation/Structural Engineer', keyword: 'foundation repair structural engineer', description: 'Assesses and repairs foundation cracks, settling, and structural integrity' },
        { label: 'Waterproofing Specialist', keyword: 'basement waterproofing crawl space moisture', description: 'Addresses basement and crawl space moisture, drainage, and sealing' },
        { label: 'Mason/Bricklayer', keyword: 'masonry bricklayer stone chimney retaining wall', description: 'Builds and repairs brick, stone, and block work' },
        { label: 'Concrete Contractor', keyword: 'concrete contractor driveway sidewalk patio', description: 'Pours and repairs driveways, sidewalks, patios, and slabs' },
        { label: 'Excavation Contractor', keyword: 'excavation grading land clearing drainage', description: 'Grading, land clearing, drainage trenching, and site prep' },
    ]},
    { name: 'Mechanical Systems', services: [
        { label: 'Plumber', keyword: 'plumber plumbing water heater drain', type: 'plumber', description: 'Water supply, drain lines, water heaters, fixtures, gas lines' },
        { label: 'Electrician', keyword: 'electrician wiring panel outlets lighting', type: 'electrician', description: 'Wiring, panel upgrades, outlets, lighting, ceiling fan installs' },
        { label: 'HVAC Technician', keyword: 'HVAC heating air conditioning ductwork', description: 'Heating, air conditioning, ductwork, ventilation, and air quality' },
        { label: 'Geothermal Installer', keyword: 'geothermal heat pump installer', description: 'Installs and services ground-source heat pump systems' },
        { label: 'Solar Panel Installer', keyword: 'solar panel installer residential', description: 'Designs and installs residential solar energy systems' },
        { label: 'Generator Installer', keyword: 'whole home standby generator installer', description: 'Installs whole-home standby or portable generator systems' },
        { label: 'Low-Voltage/Smart Home Tech', keyword: 'smart home automation security wiring low voltage', description: 'Home automation, security wiring, structured cabling, AV systems' },
    ]},
    { name: 'Water & Waste', services: [
        { label: 'Well Driller/Technician', keyword: 'well driller water well service', description: 'Drills, maintains, and tests private water wells' },
        { label: 'Septic System Installer', keyword: 'septic system installer pumper repair', description: 'Installs, inspects, pumps, and repairs septic systems' },
        { label: 'Water Treatment Specialist', keyword: 'water softener filtration purification treatment', description: 'Water softeners, filtration systems, UV purification, iron/sulfur removal' },
        { label: 'Sewer Line Specialist', keyword: 'sewer line cleaning inspection camera repair', description: 'Cleans, inspects, and repairs sewer and drain lines' },
    ]},
    { name: 'Interior Finishes', services: [
        { label: 'Painter', keyword: 'house painter interior exterior painting', type: 'painter', description: 'Surface prep, painting, staining, wallpaper' },
        { label: 'Drywall Contractor', keyword: 'drywall contractor taping mudding repair', description: 'Tapes, muds, and repairs drywall and plaster' },
        { label: 'Flooring Installer', keyword: 'flooring installer hardwood tile LVP carpet', description: 'Hardwood, tile, LVP, carpet, laminate installation and refinishing' },
        { label: 'Tile Setter', keyword: 'tile setter backsplash shower bathroom', description: 'Backsplashes, showers, bathroom floors, decorative tile work' },
        { label: 'Carpenter/Trim Carpenter', keyword: 'carpenter trim cabinetry molding built-ins', description: 'Custom cabinetry, built-ins, molding, door hanging, shelving' },
        { label: 'Countertop Fabricator', keyword: 'countertop fabricator installer granite quartz', description: 'Measures, cuts, and installs granite, quartz, butcher block countertops' },
        { label: 'Cabinet Refacer/Installer', keyword: 'cabinet refacing installer kitchen bath', description: 'Replaces or refinishes kitchen and bath cabinetry' },
        { label: 'Closet/Organization Designer', keyword: 'custom closet organizer designer pantry garage', description: 'Custom closet systems, pantry organizers, garage storage' },
    ]},
    { name: 'Windows & Doors', services: [
        { label: 'Window Installer', keyword: 'window replacement installer energy efficient', description: 'New windows, storm windows, energy efficiency upgrades' },
        { label: 'Door Installer', keyword: 'door installer entry interior patio storm', description: 'Interior doors, entry doors, sliding/patio doors, storm doors' },
        { label: 'Garage Door Technician', keyword: 'garage door repair installer opener', description: 'Installs, repairs, and maintains garage doors and openers' },
        { label: 'Glass/Glazier', keyword: 'glass glazier mirror shower enclosure window', description: 'Custom glass, mirrors, shower enclosures, window glass replacement' },
    ]},
    { name: 'Outdoor & Landscaping', services: [
        { label: 'Landscaper', keyword: 'landscaper landscape design planting hardscaping', description: 'Lawn design, planting, mulching, hardscaping, overall yard care' },
        { label: 'Lawn Care Service', keyword: 'lawn care mowing fertilizing weed control', description: 'Regular mowing, fertilizing, weed control, aeration' },
        { label: 'Arborist/Tree Service', keyword: 'arborist tree trimming removal stump grinding', description: 'Tree trimming, removal, health assessment, stump grinding' },
        { label: 'Irrigation Specialist', keyword: 'irrigation sprinkler system install maintenance', description: 'Sprinkler system design, install, and seasonal maintenance' },
        { label: 'Fence Installer', keyword: 'fence installer wood vinyl chain link aluminum', description: 'Wood, vinyl, chain link, aluminum fencing and gates' },
        { label: 'Deck/Patio Builder', keyword: 'deck builder patio pergola screened porch', description: 'Designs and builds decks, porches, pergolas, screened-in areas' },
        { label: 'Paving/Asphalt Contractor', keyword: 'asphalt paving driveway sealing contractor', description: 'Driveway paving, sealing, and patching' },
        { label: 'Retaining Wall Builder', keyword: 'retaining wall builder erosion control', description: 'Erosion control, decorative and structural retaining walls' },
        { label: 'Outdoor Lighting Installer', keyword: 'landscape outdoor lighting pathway security', description: 'Landscape lighting, pathway lights, security lighting' },
        { label: 'Pool Contractor', keyword: 'pool contractor construction maintenance liner', description: 'Pool construction, maintenance, liner replacement, opening/closing' },
        { label: 'Hot Tub/Spa Technician', keyword: 'hot tub spa repair installation service', description: 'Installation, repair, and winterization of spas' },
    ]},
    { name: 'Pest & Wildlife', services: [
        { label: 'Pest Control', keyword: 'pest control exterminator ants roaches spiders', type: 'pest_control', description: 'Ants, roaches, spiders, preventive treatments' },
        { label: 'Termite Specialist', keyword: 'termite inspection treatment damage repair', description: 'Inspection, treatment, and damage repair for termites' },
        { label: 'Wildlife/Animal Removal', keyword: 'wildlife animal removal bats raccoons squirrels', description: 'Bats, raccoons, squirrels, snakes, groundhogs in or around the home' },
        { label: 'Mosquito/Tick Treatment', keyword: 'mosquito tick yard spraying barrier treatment', description: 'Yard spraying and barrier treatments for outdoor pests' },
        { label: 'Bed Bug Specialist', keyword: 'bed bug treatment heat chemical exterminator', description: 'Heat treatment and chemical treatment for bed bug infestations' },
    ]},
    { name: 'Safety & Environmental', services: [
        { label: 'Radon Mitigation', keyword: 'radon mitigation testing reduction system', description: 'Tests for and installs systems to reduce radon gas levels' },
        { label: 'Mold Remediation', keyword: 'mold remediation removal prevention specialist', description: 'Identifies, removes, and prevents mold growth' },
        { label: 'Asbestos Abatement', keyword: 'asbestos abatement removal contractor', description: 'Safely removes asbestos from older homes' },
        { label: 'Lead Paint Abatement', keyword: 'lead paint testing removal abatement', description: 'Tests for and safely removes lead-based paint in pre-1978 homes' },
        { label: 'Fire/Smoke Damage Restoration', keyword: 'fire smoke damage restoration cleanup repair', description: 'Cleanup, repair, and odor removal after fire events' },
        { label: 'Water Damage Restoration', keyword: 'water damage restoration emergency extraction drying', description: 'Emergency water extraction, drying, and repair after flooding or leaks' },
        { label: 'Air Quality/Duct Cleaning', keyword: 'air duct cleaning dryer vent indoor air quality', description: 'Cleans HVAC ducts, dryer vents, and tests indoor air quality' },
        { label: 'Chimney Sweep/Inspector', keyword: 'chimney sweep inspector cleaning repair flue', description: 'Cleans, inspects, and repairs chimneys, flues, and fireplaces' },
    ]},
    { name: 'Security & Technology', services: [
        { label: 'Locksmith', keyword: 'locksmith lock change rekey smart lock', type: 'locksmith', description: 'Lock changes, rekeying, smart lock installation, lockouts' },
        { label: 'Security System Installer', keyword: 'security system alarm camera doorbell monitoring', description: 'Alarm systems, cameras, doorbell cameras, monitoring setup' },
        { label: 'Home Theater/AV Installer', keyword: 'home theater surround sound projector AV installer', description: 'Surround sound, projectors, in-wall speakers, media rooms' },
        { label: 'Network/IT Specialist', keyword: 'home network WiFi ethernet mesh setup IT', description: 'Home Wi-Fi optimization, ethernet wiring, mesh network setup' },
    ]},
    { name: 'Specialty & Miscellaneous', services: [
        { label: 'Insulation Contractor', keyword: 'insulation contractor attic spray foam blown-in', description: 'Attic, wall, and crawl space insulation' },
        { label: 'Weatherization Specialist', keyword: 'weatherization energy audit air sealing draft', description: 'Air sealing, energy audits, draft reduction' },
        { label: 'Appliance Repair', keyword: 'appliance repair washer dryer refrigerator dishwasher', description: 'Repairs washers, dryers, refrigerators, dishwashers, ovens' },
        { label: 'Handyman', keyword: 'handyman general home repair odd jobs', description: 'Small general repairs and odd jobs' },
        { label: 'Junk Removal/Hauling', keyword: 'junk removal hauling debris cleanout service', description: 'Removes furniture, debris, construction waste, and cleanout services' },
        { label: 'Cleaning Service', keyword: 'house cleaning service move-in move-out deep clean', description: 'Regular, deep, and move-in/move-out cleaning' },
        { label: 'Pressure Washing', keyword: 'pressure washing siding deck driveway patio', description: 'Cleans siding, decks, driveways, patios, and fences' },
        { label: 'Window Cleaning', keyword: 'window cleaning service interior exterior', description: 'Interior and exterior window washing' },
    ]},
    { name: 'Moving & Logistics', services: [
        { label: 'Moving Company', keyword: 'moving company packing loading transporting', type: 'moving_company', description: 'Packing, loading, transporting, and unloading household belongings' },
        { label: 'Storage Company', keyword: 'storage unit facility short long term', type: 'storage', description: 'Short or long-term storage for furniture and belongings' },
        { label: 'Specialty Mover', keyword: 'piano safe specialty mover heavy items', description: 'Moves extremely heavy or delicate items requiring special equipment' },
    ]},
];

// --- Service Provider Directory Component ---
const ServiceProviderDirectory = ({ zipCode, resultsRef }) => {
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [results, setResults] = useState({});

    useEffect(() => {
        if (resultsRef) resultsRef.current = results;
    }, [results]);
    const [centerLatLng, setCenterLatLng] = useState(null);
    const [geocodeError, setGeocodeError] = useState(null);
    const mapDummyRef = useRef(null);
    const placesServiceRef2 = useRef(null);

    useEffect(() => {
        if (!zipCode || !window.google || !window.google.maps) return;
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: zipCode + ', USA' }, (res, status) => {
            if (status === 'OK' && res[0]) {
                const loc = res[0].geometry.location;
                setCenterLatLng({ lat: loc.lat(), lng: loc.lng() });
            } else {
                setGeocodeError('Could not locate ZIP code');
            }
        });
    }, [zipCode]);

    useEffect(() => {
        if (!centerLatLng || !window.google) return;
        if (!mapDummyRef.current) return;
        if (!placesServiceRef2.current) {
            const dummyMap = new google.maps.Map(mapDummyRef.current);
            placesServiceRef2.current = new google.maps.places.PlacesService(dummyMap);
        }
    }, [centerLatLng]);

    const getDistance = (place) => {
        if (!place || !place.geometry || !centerLatLng) return Infinity;
        const loc = place.geometry.location;
        const R = 6371000;
        const dLat = (loc.lat() - centerLatLng.lat) * Math.PI / 180;
        const dLng = (loc.lng() - centerLatLng.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(centerLatLng.lat * Math.PI / 180) * Math.cos(loc.lat() * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const formatDistance = (meters) => {
        const miles = meters / 1609.34;
        return miles < 0.1 ? '< 0.1 mi' : miles.toFixed(1) + ' mi';
    };

    const fetchPlaceDetails = (placeId, callback) => {
        if (!placesServiceRef2.current) { callback(null); return; }
        placesServiceRef2.current.getDetails(
            { placeId: placeId, fields: ['formatted_phone_number', 'opening_hours', 'website'] },
            (detail, detailStatus) => {
                if (detailStatus === google.maps.places.PlacesServiceStatus.OK && detail) {
                    callback(detail);
                } else {
                    callback(null);
                }
            }
        );
    };

    const searchCategory = (categoryName, services) => {
        if (results[categoryName]) return;
        if (!placesServiceRef2.current || !centerLatLng) return;

        const svc = placesServiceRef2.current;
        const catResults = {};
        services.forEach(s => { catResults[s.label] = { loading: true, nearest: null, bestRated: null, error: null }; });
        setResults(prev => ({ ...prev, [categoryName]: catResults }));

        services.forEach(service => {
            const request = { location: centerLatLng, radius: 50000, keyword: service.keyword };
            if (service.type) request.type = service.type;

            svc.nearbySearch(request, (places, status) => {
                if (status !== google.maps.places.PlacesServiceStatus.OK || !places || places.length === 0) {
                    setResults(prev => ({
                        ...prev,
                        [categoryName]: {
                            ...prev[categoryName],
                            [service.label]: { loading: false, nearest: null, bestRated: null, error: null }
                        }
                    }));
                    return;
                }

                const withDist = places.map(p => ({ ...p, _dist: getDistance(p) }));
                const byDistance = [...withDist].sort((a, b) => a._dist - b._dist);
                const byRating = [...withDist].sort((a, b) => (b.rating || 0) - (a.rating || 0));
                const nearestPlace = byDistance[0];
                const bestPlace = byRating[0];
                const isSame = nearestPlace.place_id === bestPlace.place_id;

                const placeIds = isSame ? [nearestPlace.place_id] : [nearestPlace.place_id, bestPlace.place_id];
                let detailsDone = 0;
                const details = {};

                placeIds.forEach(pid => {
                    fetchPlaceDetails(pid, (detail) => {
                        details[pid] = detail;
                        detailsDone++;
                        if (detailsDone === placeIds.length) {
                            const enrichNearest = {
                                ...nearestPlace,
                                _phone: details[nearestPlace.place_id]?.formatted_phone_number || null,
                                _hours: details[nearestPlace.place_id]?.opening_hours || null,
                                _website: details[nearestPlace.place_id]?.website || null,
                                _distFormatted: formatDistance(nearestPlace._dist)
                            };
                            const enrichBest = isSame ? enrichNearest : {
                                ...bestPlace,
                                _phone: details[bestPlace.place_id]?.formatted_phone_number || null,
                                _hours: details[bestPlace.place_id]?.opening_hours || null,
                                _website: details[bestPlace.place_id]?.website || null,
                                _distFormatted: formatDistance(bestPlace._dist)
                            };
                            setResults(prev => ({
                                ...prev,
                                [categoryName]: {
                                    ...prev[categoryName],
                                    [service.label]: { loading: false, nearest: enrichNearest, bestRated: isSame ? null : enrichBest, error: null }
                                }
                            }));
                        }
                    });
                });
            });
        });
    };

    const toggleCategory = (catName, services) => {
        if (expandedCategory === catName) {
            setExpandedCategory(null);
        } else {
            setExpandedCategory(catName);
            searchCategory(catName, services);
        }
    };

    const renderStars = (rating) => {
        if (!rating) return null;
        const full = Math.floor(rating);
        const half = rating - full >= 0.3;
        const stars = [];
        for (let i = 0; i < full; i++) stars.push('\u2605');
        if (half) stars.push('\u00BD');
        return (
            <span style={{ color: '#c8a96e', fontSize: '0.8rem', letterSpacing: '1px' }}>
                {stars.join('')}
                <span style={{ color: 'var(--cream-60)', marginLeft: '4px', fontSize: '0.75rem' }}>{rating.toFixed(1)}</span>
            </span>
        );
    };

    const renderPriceLevel = (level) => {
        if (!level && level !== 0) return null;
        return (
            <span style={{ color: 'var(--cream-30)', fontSize: '0.75rem', marginLeft: '6px' }}>
                {'$'.repeat(level + 1)}
            </span>
        );
    };

    if (geocodeError) return null;

    return (
        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--gold-line)', paddingTop: '2rem' }}>
            <h3 style={{ color: 'var(--accent-color)', marginTop: 0, marginBottom: '1rem' }}>Service Providers & Contractors</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', opacity: 0.7 }}>
                Nearest and top-rated providers within 30 miles of {zipCode}
            </p>

            <div ref={mapDummyRef} style={{ display: 'none' }} />

            {SERVICE_CATEGORIES.map(cat => {
                const isExpanded = expandedCategory === cat.name;
                const catResults = results[cat.name];
                const loadedCount = catResults ? Object.values(catResults).filter(r => !r.loading).length : 0;
                const foundCount = catResults ? Object.values(catResults).filter(r => !r.loading && r.place).length : 0;

                return (
                    <div key={cat.name} style={{
                        marginBottom: '4px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: isExpanded ? '1px solid var(--gold-line)' : '1px solid rgba(200,169,110,0.1)',
                        transition: 'border-color 0.25s ease'
                    }}>
                        <button
                            onClick={() => toggleCategory(cat.name, cat.services)}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '0.85rem 1.1rem', cursor: 'pointer', border: 'none',
                                background: isExpanded ? 'rgba(200,169,110,0.08)' : 'rgba(13,13,18,0.5)',
                                color: isExpanded ? 'var(--gold)' : 'var(--cream)',
                                fontFamily: 'var(--ff-ui)', fontSize: '0.88rem', fontWeight: '600',
                                letterSpacing: '0.02em', textAlign: 'left',
                                transition: 'background 0.2s ease, color 0.2s ease'
                            }}
                            onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'rgba(200,169,110,0.05)'; }}
                            onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'rgba(13,13,18,0.5)'; }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                {cat.name}
                                <span style={{ fontSize: '0.7rem', color: 'var(--cream-30)', fontWeight: '400' }}>
                                    {cat.services.length} services
                                    {catResults && loadedCount === cat.services.length && (
                                        <span style={{ marginLeft: '6px', color: 'var(--gold)', opacity: 0.6 }}>
                                            ({foundCount} found)
                                        </span>
                                    )}
                                </span>
                            </span>
                            <span style={{
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.25s ease',
                                fontSize: '0.7rem', opacity: 0.5
                            }}>
                                &#9660;
                            </span>
                        </button>

                        {isExpanded && (
                            <div style={{ padding: '0.25rem 0' }}>
                                {cat.services.map((service, idx) => {
                                    const result = catResults ? catResults[service.label] : null;
                                    const isLoading = !result || result.loading;
                                    const nearest = result ? result.nearest : null;
                                    const bestRated = result ? result.bestRated : null;

                                    const renderProviderCard = (place, badge) => (
                                        <div style={{
                                            padding: '0.5rem 0.7rem',
                                            background: 'rgba(7,7,10,0.5)',
                                            borderRadius: '6px',
                                            border: '1px solid rgba(200,169,110,0.08)',
                                            flex: 1, minWidth: '200px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                <span style={{
                                                    fontSize: '0.6rem', fontWeight: '700', textTransform: 'uppercase',
                                                    letterSpacing: '0.05em', padding: '1px 5px', borderRadius: '3px',
                                                    background: badge === 'Nearest' ? 'rgba(125,211,168,0.15)' : 'rgba(200,169,110,0.15)',
                                                    color: badge === 'Nearest' ? '#7dd3a8' : '#c8a96e'
                                                }}>{badge}</span>
                                                {place._distFormatted && (
                                                    <span style={{ fontSize: '0.63rem', color: 'var(--cream-30)' }}>{place._distFormatted}</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--cream)', marginBottom: '3px', lineHeight: '1.3' }}>
                                                {place.name}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '3px' }}>
                                                {renderStars(place.rating)}
                                                {renderPriceLevel(place.price_level)}
                                                {place.user_ratings_total && (
                                                    <span style={{ fontSize: '0.68rem', color: 'var(--cream-30)', marginLeft: '4px' }}>({place.user_ratings_total})</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--cream-30)', lineHeight: '1.3', marginBottom: '3px' }}>
                                                {place.vicinity || ''}
                                            </div>
                                            {place._phone && (
                                                <div style={{ marginBottom: '3px' }}>
                                                    <a href={'tel:' + place._phone.replace(/[^+\d]/g, '')} style={{
                                                        fontSize: '0.72rem', color: 'var(--cream)', textDecoration: 'none',
                                                        fontWeight: '500', transition: 'color 0.15s'
                                                    }}
                                                    onMouseEnter={e => e.target.style.color = 'var(--gold)'}
                                                    onMouseLeave={e => e.target.style.color = 'var(--cream)'}>
                                                        {place._phone}
                                                    </a>
                                                </div>
                                            )}
                                            {place._hours && (
                                                <span style={{
                                                    fontSize: '0.65rem', fontWeight: '500',
                                                    color: place._hours.isOpen() ? '#7dd3a8' : '#f07a7a'
                                                }}>
                                                    {place._hours.isOpen() ? 'Open now' : 'Closed'}
                                                </span>
                                            )}
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                                <a href={'https://www.google.com/maps/place/?q=place_id:' + place.place_id}
                                                    target="_blank" rel="noopener noreferrer"
                                                    style={{ fontSize: '0.68rem', color: 'var(--gold)', textDecoration: 'none', opacity: 0.7, transition: 'opacity 0.15s' }}
                                                    onMouseEnter={e => e.target.style.opacity = 1}
                                                    onMouseLeave={e => e.target.style.opacity = 0.7}>
                                                    Google Maps &#8599;
                                                </a>
                                                {place._website && (
                                                    <a href={place._website} target="_blank" rel="noopener noreferrer"
                                                        style={{ fontSize: '0.68rem', color: 'var(--gold)', textDecoration: 'none', opacity: 0.7, transition: 'opacity 0.15s' }}
                                                        onMouseEnter={e => e.target.style.opacity = 1}
                                                        onMouseLeave={e => e.target.style.opacity = 0.7}>
                                                        Website &#8599;
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    );

                                    return (
                                        <div key={service.label} style={{
                                            padding: '0.75rem 1.1rem',
                                            borderTop: idx > 0 ? '1px solid rgba(200,169,110,0.06)' : 'none'
                                        }}>
                                            <div style={{ marginBottom: '0.5rem' }}>
                                                <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--cream)', marginBottom: '2px', fontFamily: 'var(--ff-ui)' }}>
                                                    {service.label}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--cream-30)', lineHeight: '1.4' }}>
                                                    {service.description}
                                                </div>
                                            </div>

                                            {isLoading ? (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--cream-30)', padding: '0.5rem 0' }}>
                                                    <span style={{
                                                        display: 'inline-block', width: '8px', height: '8px',
                                                        borderRadius: '50%', border: '1.5px solid var(--gold)',
                                                        borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite',
                                                        marginRight: '6px', verticalAlign: 'middle'
                                                    }} />
                                                    Searching...
                                                </div>
                                            ) : nearest ? (
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    {renderProviderCard(nearest, 'Nearest')}
                                                    {bestRated && renderProviderCard(bestRated, 'Best Rated')}
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '0.72rem', color: 'var(--cream-30)', opacity: 0.5, padding: '0.3rem 0' }}>
                                                    No providers found within 30 miles
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// --- Google Maps Dark Style ---
const DARK_MAP_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#0d0d12' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#c8a96e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#07070a' }] },
    { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#3a3020' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#ede8df' }] },
    { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#0a0a0f' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#141419' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#8a7a5a' }] },
    { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#0f1810' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e1c25' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9a8a6a' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#252230' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#302c1a' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#c8a96e' }] },
    { featureType: 'transit.line', elementType: 'geometry.fill', stylers: [{ color: '#1a1820' }] },
    { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#141419' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#07070a' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a4030' }] },
];

// --- Star Rating ---
const StarRating = ({ rating, totalRatings }) => {
    if (!rating) return null;
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    const stars = Array.from({ length: 5 }, (_, i) => {
        if (i < full) return '★';
        if (i === full && half) return '⯨';
        return '☆';
    });
    return (
        <span>
            <span style={{ color: 'var(--gold)' }}>{stars.join('')}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '0.3rem' }}>
                {rating.toFixed(1)}{totalRatings ? ` (${totalRatings.toLocaleString()})` : ''}
            </span>
        </span>
    );
};

// Generic types that add no useful info — skip these when picking a descriptor
const GENERIC_TYPES = new Set([
    'point_of_interest', 'establishment', 'food', 'store', 'premise',
    'political', 'locality', 'sublocality', 'neighborhood', 'route',
]);

const placeDescriptor = (types) => {
    if (!types || types.length === 0) return null;
    const specific = types.find(t => !GENERIC_TYPES.has(t));
    if (!specific) return null;
    return specific.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

// --- Place Card ---
const PlaceCard = ({ place }) => {
    const isOpen = place.opening_hours ? place.opening_hours.isOpen?.() : null;
    const priceStr = place.price_level != null ? '$'.repeat(place.price_level + 1) : null;
    const photoUrl = place.photos && place.photos.length > 0
        ? place.photos[0].getUrl({ maxWidth: 80, maxHeight: 80 })
        : null;
    const descriptor = placeDescriptor(place.types);
    return (
        <div className="place-card">
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                {photoUrl ? (
                    <img
                        src={photoUrl}
                        alt={place.name}
                        style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '0.4rem', flexShrink: 0 }}
                    />
                ) : (
                    <div style={{ width: '72px', height: '72px', borderRadius: '0.4rem', flexShrink: 0, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                        🏢
                    </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem' }}>
                        <div style={{ fontWeight: '500', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {place.name}
                        </div>
                        {isOpen !== null && (
                            <span style={{
                                fontSize: '0.72rem', padding: '0.2rem 0.45rem', borderRadius: '1rem', whiteSpace: 'nowrap', flexShrink: 0,
                                background: isOpen ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
                                color: isOpen ? 'var(--success-color)' : 'var(--danger-color)',
                            }}>
                                {isOpen ? 'Open' : 'Closed'}
                            </span>
                        )}
                    </div>
                    {descriptor && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-color)', marginBottom: '0.15rem', opacity: 0.8 }}>
                            {descriptor}
                        </div>
                    )}
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {place.vicinity}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <StarRating rating={place.rating} totalRatings={place.user_ratings_total} />
                        {priceStr && <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{priceStr}</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Map Explorer ---
const PLACE_CATEGORIES = [
    { key: 'schools',     label: 'Schools',     color: '#fbbf24', type: 'school'     },
    { key: 'restaurants', label: 'Restaurants', color: '#f87171', type: 'restaurant' },
    { key: 'amenities',   label: 'Amenities',   color: '#4ade80', type: 'park'       },
    { key: 'businesses',  label: 'Businesses',  color: '#a78bfa', type: 'store'      },
];

const FOR_YOU_COLORS = ['#fb923c', '#2dd4bf', '#e879f9', '#facc15', '#60a5fa', '#34d399', '#f472b6', '#c084fc'];

const assignForYouColors = (suggestions) =>
    suggestions.map((s, i) => ({ ...s, color: FOR_YOU_COLORS[i % FOR_YOU_COLORS.length] }));

const MapExplorer = ({ zipCode, homes, clientId }) => {
    const mapDivRef = useRef(null);
    const streetViewDivRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const infoWindowRef = useRef(null);
    const placesServiceRef = useRef(null);
    const homeMarkersRef = useRef([]);
    const placeMarkersRef = useRef({ schools: [], restaurants: [], amenities: [], businesses: [] });
    const forYouMarkersRef = useRef({});
    const svInitializedRef = useRef(false);
    const favoritesRef = useRef([]);
    const favMarkersRef = useRef([]);
    const distanceMarkerRef = useRef(null);
    const [activeTab, setActiveTab] = useState('map');
    const [activeFilters, setActiveFilters] = useState({ schools: false, restaurants: false, amenities: false, businesses: false });
    const [nearbyPlaces, setNearbyPlaces] = useState({ schools: [], restaurants: [], amenities: [], businesses: [] });
    const [placesLoading, setPlacesLoading] = useState(true);
    const [mapError, setMapError] = useState(null);
    const [forYouSuggestions, setForYouSuggestions] = useState([]);
    const [forYouPlaces, setForYouPlaces] = useState({});
    const [forYouFilters, setForYouFilters] = useState({});
    const [forYouLoading, setForYouLoading] = useState(false);
    const [forYouError, setForYouError] = useState(null);
    const [mapReady, setMapReady] = useState(false);
    const [favorites, setFavorites] = useState([]);
    const [distanceAddress, setDistanceAddress] = useState('');
    const [distanceResults, setDistanceResults] = useState([]);
    const [distanceLoading, setDistanceLoading] = useState(false);
    const [distanceError, setDistanceError] = useState(null);

    // Main init: geocode, build map, fetch places
    useEffect(() => {
        if (!zipCode) return;
        setNearbyPlaces({ schools: [], restaurants: [], amenities: [], businesses: [] });
        setActiveFilters({ schools: false, restaurants: false, amenities: false, businesses: false });
        setPlacesLoading(true);
        setMapError(null);
        setMapReady(false);
        setDistanceResults([]);
        setDistanceError(null);
        if (distanceMarkerRef.current) { distanceMarkerRef.current.setMap(null); distanceMarkerRef.current = null; }
        svInitializedRef.current = false;
        mapInstanceRef.current = null;
        PLACE_CATEGORIES.forEach(function(c) { placeMarkersRef.current[c.key] = []; });
        // Clear for-you markers on ZIP change
        Object.values(forYouMarkersRef.current).forEach(function(markers) { markers.forEach(function(m) { m.setMap(null); }); });
        forYouMarkersRef.current = {};

        const doInit = () => {
            if (!mapDivRef.current) {
                setMapError('Map container not available. Please try refreshing.');
                setPlacesLoading(false);
                return;
            }
            if (!window.google || !window.google.maps || !window.google.maps.places) {
                setMapError('Google Maps Places library not loaded. Ensure &libraries=places is in your Maps API script URL.');
                setPlacesLoading(false);
                return;
            }
            try {
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ address: zipCode + ', USA' }, function(geoResults, status) {
                    try {
                        if (status !== 'OK' || !geoResults || !geoResults[0]) {
                            setMapError('Could not locate ZIP code (status: ' + status + '). Ensure Geocoding API is enabled.');
                            setPlacesLoading(false);
                            return;
                        }
                        const location = geoResults[0].geometry.location;
                        const latLng = { lat: location.lat(), lng: location.lng() };

                        const map = new google.maps.Map(mapDivRef.current, {
                            center: latLng, zoom: 14, styles: DARK_MAP_STYLE,
                            mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
                            zoomControl: true,
                            zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
                        });
                        mapInstanceRef.current = map;
                        setMapReady(true);
                        infoWindowRef.current = new google.maps.InfoWindow();

                        // Home markers
                        homeMarkersRef.current.forEach(function(m) { m.setMap(null); });
                        homeMarkersRef.current = [];
                        homes.forEach(function(home, i) {
                            const angle = (i / Math.max(homes.length, 1)) * 2 * Math.PI;
                            const radius = 0.004 + (i % 3) * 0.002;
                            const pos = { lat: latLng.lat + Math.cos(angle) * radius, lng: latLng.lng + Math.sin(angle) * radius };
                            const marker = new google.maps.Marker({
                                position: pos, map: map, title: home.address,
                                icon: { path: google.maps.SymbolPath.CIRCLE, scale: 11, fillColor: '#c8a96e', fillOpacity: 0.9, strokeColor: '#07070a', strokeWeight: 2 },
                            });
                            marker.addListener('click', function() {
                                const favId = 'home_' + i;
                                const isFav = favoritesRef.current.find(function(f) { return f.id === favId; });
                                const escAddr = home.address.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                                infoWindowRef.current.setContent(
                                    '<div style="color:#0f172a;padding:8px;min-width:160px">' +
                                    '<div style="font-weight:bold;font-size:1rem;margin-bottom:4px">$' + home.price.toLocaleString() + '</div>' +
                                    '<div style="font-size:0.85rem;margin-bottom:2px">' + home.address + '</div>' +
                                    '<div style="font-size:0.78rem;color:#64748b;margin-bottom:6px">' + home.beds + ' bd \u00b7 ' + home.baths + ' ba \u00b7 ' + home.sqft.toLocaleString() + ' sqft</div>' +
                                    '<button onclick="window.__mapToggleFav(\'' + favId + '\',\'' + escAddr + '\',' + pos.lat + ',' + pos.lng + ')" style="padding:3px 10px;background:' + (isFav ? '#ef4444' : '#fbbf24') + ';color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:0.75rem;font-weight:600">' + (isFav ? 'Unfavorite' : '\u2605 Favorite') + '</button>' +
                                    '</div>'
                                );
                                infoWindowRef.current.open(map, marker);
                                if (svInitializedRef.current && mapInstanceRef.current) {
                                    mapInstanceRef.current.getStreetView().setPosition(pos);
                                }
                            });
                            homeMarkersRef.current.push(marker);
                        });

                        // Fetch nearby places for all categories
                        const service = new google.maps.places.PlacesService(map);
                        placesServiceRef.current = service;
                        const accumulated = { schools: [], restaurants: [], amenities: [], businesses: [] };
                        let done = 0;
                        PLACE_CATEGORIES.forEach(function(cat) {
                            service.nearbySearch({ location: location, radius: 2000, type: cat.type }, function(placeResults, placeStatus) {
                                if (placeStatus === google.maps.places.PlacesServiceStatus.OK && placeResults) {
                                    accumulated[cat.key] = placeResults.slice(0, 15).sort(function(a, b) { return (b.rating || 0) - (a.rating || 0); });
                                }
                                done++;
                                if (done === PLACE_CATEGORIES.length) {
                                    setNearbyPlaces({ schools: accumulated.schools, restaurants: accumulated.restaurants, amenities: accumulated.amenities, businesses: accumulated.businesses });
                                    setPlacesLoading(false);
                                }
                            });
                        });

                    } catch (innerErr) {
                        console.error('[MapExplorer] geocoder error:', innerErr);
                        setMapError('Map error: ' + innerErr.message);
                        setPlacesLoading(false);
                    }
                });
            } catch (outerErr) {
                console.error('[MapExplorer] init error:', outerErr);
                setMapError('Map init error: ' + outerErr.message);
                setPlacesLoading(false);
            }
        };

        if (window.google && window.google.maps) {
            doInit();
        } else {
            const check = setInterval(function() {
                if (window.google && window.google.maps) { clearInterval(check); clearTimeout(giveUp); doInit(); }
            }, 300);
            const giveUp = setTimeout(function() {
                clearInterval(check);
                setMapError('Google Maps did not load. Set your API key in index.html and enable Maps JavaScript API, Places API, and Geocoding API.');
                setPlacesLoading(false);
            }, 15000);
            return function() { clearInterval(check); clearTimeout(giveUp); };
        }
    }, [zipCode]);

    // Load favorites from localStorage on mount
    useEffect(function() {
        if (!clientId) return;
        const saved = localStorage.getItem('mapFav_' + clientId);
        if (saved) try { setFavorites(JSON.parse(saved)); } catch(e) {}
    }, [clientId]);

    // Keep ref in sync and persist favorites
    useEffect(function() {
        favoritesRef.current = favorites;
        if (clientId) localStorage.setItem('mapFav_' + clientId, JSON.stringify(favorites));
    }, [favorites, clientId]);

    // Global callback so info-window HTML buttons can toggle favorites
    useEffect(function() {
        window.__mapToggleFav = function(id, name, lat, lng) {
            setFavorites(function(prev) {
                const exists = prev.find(function(f) { return f.id === id; });
                if (exists) return prev.filter(function(f) { return f.id !== id; });
                return prev.concat([{ id: id, name: name, lat: lat, lng: lng }]);
            });
        };
        return function() { delete window.__mapToggleFav; };
    }, []);

    // When places data arrives, create markers (hidden by default)
    useEffect(function() {
        if (!mapInstanceRef.current || !window.google || !window.google.maps) return;
        const map = mapInstanceRef.current;

        PLACE_CATEGORIES.forEach(function(cat) {
            // Clear old place markers for this category
            placeMarkersRef.current[cat.key].forEach(function(m) { m.setMap(null); });
            placeMarkersRef.current[cat.key] = [];

            nearbyPlaces[cat.key].forEach(function(place) {
                if (!place.geometry || !place.geometry.location) return;
                const pos = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
                const labelText = place.name.length > 22 ? place.name.substring(0, 21) + '…' : place.name;
                const marker = new google.maps.Marker({
                    position: pos,
                    map: activeFilters[cat.key] ? map : null,
                    title: place.name,
                    label: {
                        text: labelText,
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: '600',
                    },
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 7,
                        fillColor: cat.color,
                        fillOpacity: 0.9,
                        strokeColor: '#ffffff',
                        strokeWeight: 1.5,
                        labelOrigin: new google.maps.Point(0, -2.5),
                    },
                });
                marker.addListener('click', function() {
                    const desc = placeDescriptor(place.types);
                    const ratingStr = place.rating ? ' \u00b7 \u2605 ' + place.rating.toFixed(1) : '';
                    const favId = 'place_' + (place.place_id || place.name);
                    const escName = place.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                    const pLat = place.geometry.location.lat();
                    const pLng = place.geometry.location.lng();

                    const buildContent = function(website) {
                        const isFav = favoritesRef.current.find(function(f) { return f.id === favId; });
                        return '<div style="color:#0f172a;padding:8px;min-width:160px;max-width:220px">' +
                            '<div style="font-weight:bold;font-size:0.9rem;margin-bottom:2px">' + place.name + '</div>' +
                            (desc ? '<div style="font-size:0.75rem;color:#6366f1;margin-bottom:3px">' + desc + '</div>' : '') +
                            '<div style="font-size:0.78rem;color:#64748b;margin-bottom:6px">' + (place.vicinity || '') + ratingStr + '</div>' +
                            (website
                                ? '<a href="' + website + '" target="_blank" rel="noopener noreferrer" style="font-size:0.78rem;color:#2563eb;text-decoration:none;font-weight:500">Visit Website \u2197</a>'
                                : '<span style="font-size:0.75rem;color:#94a3b8">No website listed</span>'
                            ) +
                            '<br><button onclick="window.__mapToggleFav(\'' + favId + '\',\'' + escName + '\',' + pLat + ',' + pLng + ')" style="margin-top:6px;padding:3px 10px;background:' + (isFav ? '#ef4444' : '#fbbf24') + ';color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:0.75rem;font-weight:600">' + (isFav ? 'Unfavorite' : '\u2605 Favorite') + '</button>' +
                            '</div>';
                    };

                    // Show immediately with a loading placeholder for the link
                    infoWindowRef.current.setContent(
                        '<div style="color:#0f172a;padding:8px;min-width:160px;max-width:220px">' +
                        '<div style="font-weight:bold;font-size:0.9rem;margin-bottom:2px">' + place.name + '</div>' +
                        (desc ? '<div style="font-size:0.75rem;color:#6366f1;margin-bottom:3px">' + desc + '</div>' : '') +
                        '<div style="font-size:0.78rem;color:#64748b;margin-bottom:6px">' + (place.vicinity || '') + ratingStr + '</div>' +
                        '<span style="font-size:0.75rem;color:#94a3b8">Loading...</span>' +
                        '</div>'
                    );
                    infoWindowRef.current.open(map, marker);

                    // Fetch website from Places Details API
                    if (placesServiceRef.current && place.place_id) {
                        placesServiceRef.current.getDetails(
                            { placeId: place.place_id, fields: ['website'] },
                            function(details, detailStatus) {
                                const website = (detailStatus === google.maps.places.PlacesServiceStatus.OK && details && details.website)
                                    ? details.website : null;
                                infoWindowRef.current.setContent(buildContent(website));
                            }
                        );
                    } else {
                        infoWindowRef.current.setContent(buildContent(null));
                    }
                });
                placeMarkersRef.current[cat.key].push(marker);
            });
        });
    }, [nearbyPlaces]);

    // Toggle place marker visibility when filters change
    useEffect(function() {
        if (!mapInstanceRef.current || !window.google || !window.google.maps) return;
        const map = mapInstanceRef.current;
        PLACE_CATEGORIES.forEach(function(cat) {
            placeMarkersRef.current[cat.key].forEach(function(m) {
                m.setMap(activeFilters[cat.key] ? map : null);
            });
        });
    }, [activeFilters]);

    // Map resize on tab switch; lazy Street View init
    useEffect(function() {
        if (activeTab === 'map' && mapInstanceRef.current && window.google && window.google.maps) {
            setTimeout(function() { google.maps.event.trigger(mapInstanceRef.current, 'resize'); }, 50);
        }
        if (activeTab === 'street' && mapInstanceRef.current && streetViewDivRef.current && !svInitializedRef.current) {
            try {
                const panorama = new google.maps.StreetViewPanorama(streetViewDivRef.current, {
                    position: mapInstanceRef.current.getCenter(),
                    pov: { heading: 34, pitch: 10 }, zoom: 1,
                    addressControl: true, fullscreenControl: false,
                });
                mapInstanceRef.current.setStreetView(panorama);
                svInitializedRef.current = true;
            } catch (e) { console.error('[MapExplorer] Street View error:', e); }
        }
    }, [activeTab]);

    // Shared logic: collect transcripts, check cache, call API
    const fetchForYouSuggestions = function(forceRefresh) {
        if (!zipCode || !clientId) return;

        const allQuestions = window.questions || [];
        const transcripts = [];
        allQuestions.forEach(function(q) {
            const saved = localStorage.getItem('c_' + clientId + '_q_' + q.id);
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    if (data.transcript && data.transcript.trim().length > 5) {
                        transcripts.push({ category: q.category, question: q.text, transcript: data.transcript });
                    }
                } catch (e) {}
            }
        });

        if (transcripts.length === 0) return;

        const cacheKey = 'forYou_' + clientId + '_' + zipCode;

        if (!forceRefresh) {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (parsed._transcriptCount === transcripts.length) {
                        setForYouSuggestions(assignForYouColors(parsed.suggestions));
                        return;
                    }
                } catch (e) { /* ignore bad cache */ }
            }
        } else {
            // Clear stale cache before re-fetching
            localStorage.removeItem(cacheKey);
            setForYouSuggestions([]);
            setForYouFilters({});
        }

        setForYouLoading(true);
        setForYouError(null);

        const authToken = localStorage.getItem('rai_token');
        fetch('/api/suggest-places', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (authToken || '') },
            body: JSON.stringify({ transcripts: transcripts }),
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (Array.isArray(data) && data.length > 0) {
                localStorage.setItem(cacheKey, JSON.stringify({ suggestions: data, _transcriptCount: transcripts.length }));
                setForYouSuggestions(assignForYouColors(data));
            }
            setForYouLoading(false);
        })
        .catch(function(err) {
            console.error('Suggest places error:', err);
            setForYouError('Could not load personalized suggestions.');
            setForYouLoading(false);
        });
    };

    // Auto-fetch suggestions when ZIP+client first loads
    useEffect(function() {
        fetchForYouSuggestions(false);
    }, [zipCode, clientId]);

    // Once suggestions are ready and map/placesService are loaded, run nearbySearch for each
    useEffect(function() {
        if (!mapInstanceRef.current || !placesServiceRef.current || placesLoading) return;
        if (forYouSuggestions.length === 0) return;

        const map = mapInstanceRef.current;

        // Clear old for-you markers
        Object.values(forYouMarkersRef.current).forEach(function(markers) {
            markers.forEach(function(m) { m.setMap(null); });
        });
        forYouMarkersRef.current = {};

        const newPlaces = {};
        let done = 0;

        forYouSuggestions.forEach(function(suggestion) {
            const searchParams = { location: map.getCenter(), radius: 3000 };
            // Use both type AND keyword together for precise results
            if (suggestion.type) searchParams.type = suggestion.type;
            if (suggestion.keyword) searchParams.keyword = suggestion.keyword;

            placesServiceRef.current.nearbySearch(searchParams, function(results, status) {
                const places = (status === google.maps.places.PlacesServiceStatus.OK && results)
                    ? results.slice(0, 10) : [];

                newPlaces[suggestion.label] = places;
                forYouMarkersRef.current[suggestion.label] = [];

                places.forEach(function(place) {
                    if (!place.geometry || !place.geometry.location) return;
                    const pos = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
                    const labelText = place.name.length > 22 ? place.name.substring(0, 21) + '\u2026' : place.name;
                    const capturedSuggestion = suggestion;
                    const marker = new google.maps.Marker({
                        position: pos,
                        map: null, // hidden by default
                        title: place.name,
                        label: { text: labelText, color: '#ffffff', fontSize: '10px', fontWeight: '600' },
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 7,
                            fillColor: capturedSuggestion.color,
                            fillOpacity: 0.9,
                            strokeColor: '#ffffff',
                            strokeWeight: 1.5,
                            labelOrigin: new google.maps.Point(0, -2.5),
                        },
                    });
                    marker.addListener('click', function() {
                        const ratingStr = place.rating ? ' \u00b7 \u2605 ' + place.rating.toFixed(1) : '';
                        const favId = 'place_' + (place.place_id || place.name);
                        const escName = place.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                        const pLat = place.geometry.location.lat();
                        const pLng = place.geometry.location.lng();
                        const buildContent = function(website) {
                            const isFav = favoritesRef.current.find(function(f) { return f.id === favId; });
                            return '<div style="color:#0f172a;padding:8px;min-width:160px;max-width:220px">' +
                                '<div style="font-weight:bold;font-size:0.9rem;margin-bottom:2px">' + place.name + '</div>' +
                                '<div style="font-size:0.75rem;color:#6366f1;margin-bottom:3px">' + capturedSuggestion.label + '</div>' +
                                '<div style="font-size:0.78rem;color:#64748b;margin-bottom:4px">' + (place.vicinity || '') + ratingStr + '</div>' +
                                '<div style="font-size:0.72rem;color:#94a3b8;font-style:italic;margin-bottom:6px">' + capturedSuggestion.reason + '</div>' +
                                (website
                                    ? '<a href="' + website + '" target="_blank" rel="noopener noreferrer" style="font-size:0.78rem;color:#2563eb;text-decoration:none;font-weight:500">Visit Website \u2197</a>'
                                    : '<span style="font-size:0.75rem;color:#94a3b8">No website listed</span>') +
                                '<br><button onclick="window.__mapToggleFav(\'' + favId + '\',\'' + escName + '\',' + pLat + ',' + pLng + ')" style="margin-top:6px;padding:3px 10px;background:' + (isFav ? '#ef4444' : '#fbbf24') + ';color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:0.75rem;font-weight:600">' + (isFav ? 'Unfavorite' : '\u2605 Favorite') + '</button>' +
                                '</div>';
                        };
                        infoWindowRef.current.setContent(buildContent(null));
                        infoWindowRef.current.open(map, marker);
                        if (placesServiceRef.current && place.place_id) {
                            placesServiceRef.current.getDetails({ placeId: place.place_id, fields: ['website'] }, function(details, detailStatus) {
                                const website = (detailStatus === google.maps.places.PlacesServiceStatus.OK && details && details.website) ? details.website : null;
                                infoWindowRef.current.setContent(buildContent(website));
                            });
                        }
                    });
                    forYouMarkersRef.current[suggestion.label].push(marker);
                });

                done++;
                if (done === forYouSuggestions.length) {
                    setForYouPlaces(Object.assign({}, newPlaces));
                    setForYouFilters(function(prev) {
                        const next = Object.assign({}, prev);
                        forYouSuggestions.forEach(function(s) {
                            if (!(s.label in next)) next[s.label] = false;
                        });
                        return next;
                    });
                }
            });
        });
    }, [forYouSuggestions, placesLoading]);

    // Toggle for-you marker visibility when forYouFilters changes
    useEffect(function() {
        if (!mapInstanceRef.current || !window.google) return;
        const map = mapInstanceRef.current;
        Object.entries(forYouMarkersRef.current).forEach(function(entry) {
            const label = entry[0];
            const markers = entry[1];
            markers.forEach(function(m) { m.setMap(forYouFilters[label] ? map : null); });
        });
    }, [forYouFilters]);

    const toggleFilter = function(key) {
        setActiveFilters(function(prev) {
            const next = {};
            Object.keys(prev).forEach(function(k) { next[k] = prev[k]; });
            next[key] = !prev[key];
            return next;
        });
    };

    const toggleForYouFilter = function(label) {
        setForYouFilters(function(prev) { return Object.assign({}, prev, { [label]: !prev[label] }); });
    };

    // Render gold-star markers for all favorites
    useEffect(function() {
        if (!mapReady || !mapInstanceRef.current || !window.google) return;
        const map = mapInstanceRef.current;
        favMarkersRef.current.forEach(function(m) { m.setMap(null); });
        favMarkersRef.current = [];
        favorites.forEach(function(fav) {
            const marker = new google.maps.Marker({
                position: { lat: fav.lat, lng: fav.lng },
                map: map,
                title: fav.name,
                zIndex: 999,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 14,
                    fillColor: '#c8a96e',
                    fillOpacity: 1,
                    strokeColor: '#07070a',
                    strokeWeight: 2,
                    labelOrigin: new google.maps.Point(0, 0),
                },
                label: { text: '\u2605', color: '#ffffff', fontSize: '14px', fontWeight: 'bold' },
            });
            marker.addListener('click', function() {
                const escName = fav.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                infoWindowRef.current.setContent(
                    '<div style="color:#0f172a;padding:8px;min-width:160px">' +
                    '<div style="font-weight:bold;font-size:0.9rem;margin-bottom:2px">\u2605 ' + fav.name + '</div>' +
                    '<div style="font-size:0.75rem;color:#64748b;margin-bottom:6px">Saved location</div>' +
                    '<button onclick="window.__mapToggleFav(\'' + fav.id + '\',\'' + escName + '\',' + fav.lat + ',' + fav.lng + ')" style="padding:3px 10px;background:#ef4444;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:0.75rem;font-weight:600">Remove Favorite</button>' +
                    '</div>'
                );
                infoWindowRef.current.open(map, marker);
            });
            favMarkersRef.current.push(marker);
        });
    }, [favorites, mapReady]);

    const calcDistances = function() {
        if (!distanceAddress.trim() || favorites.length === 0 || !window.google) return;
        setDistanceLoading(true);
        setDistanceError(null);
        setDistanceResults([]);
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: distanceAddress }, function(geoResults, status) {
            if (status !== 'OK' || !geoResults || !geoResults[0]) {
                setDistanceError('Could not find that address. Try a full street address.');
                setDistanceLoading(false);
                return;
            }
            const fromLatLng = geoResults[0].geometry.location;
            if (distanceMarkerRef.current) distanceMarkerRef.current.setMap(null);
            if (mapInstanceRef.current) {
                distanceMarkerRef.current = new google.maps.Marker({
                    position: fromLatLng,
                    map: mapInstanceRef.current,
                    title: distanceAddress,
                    zIndex: 1000,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 12,
                        fillColor: '#f43f5e',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                        labelOrigin: new google.maps.Point(0, 0),
                    },
                    label: { text: 'A', color: '#ffffff', fontSize: '11px', fontWeight: 'bold' },
                });
            }
            const service = new google.maps.DistanceMatrixService();
            service.getDistanceMatrix({
                origins: [fromLatLng],
                destinations: favorites.map(function(f) { return new google.maps.LatLng(f.lat, f.lng); }),
                travelMode: google.maps.TravelMode.DRIVING,
                unitSystem: google.maps.UnitSystem.IMPERIAL,
            }, function(response, dmStatus) {
                if (dmStatus !== 'OK') {
                    setDistanceError('Distance calculation failed. Ensure Distance Matrix API is enabled in Google Cloud Console.');
                    setDistanceLoading(false);
                    return;
                }
                const elements = response.rows[0].elements;
                const results = favorites.map(function(fav, i) {
                    const el = elements[i];
                    return {
                        name: fav.name,
                        distance: el.status === 'OK' ? el.distance.text : 'N/A',
                        duration: el.status === 'OK' ? el.duration.text : 'N/A',
                        value: el.status === 'OK' ? el.distance.value : Infinity,
                    };
                });
                results.sort(function(a, b) { return a.value - b.value; });
                setDistanceResults(results);
                setDistanceLoading(false);
            });
        });
    };

    return (
        <div style={{ marginTop: '1rem' }}>
            <h3 style={{ color: 'var(--accent-color)', marginTop: 0, marginBottom: '1rem' }}>Area Explorer</h3>

            {mapError && (
                <div style={{ padding: '1rem', background: 'rgba(248,113,113,0.1)', border: '1px solid var(--danger-color)', borderRadius: '0.5rem', color: 'var(--danger-color)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    {mapError}
                </div>
            )}

            <div className="map-tabs">
                {[{ id: 'map', label: 'Property Map' }, { id: 'street', label: 'Street View' }].map(function(t) {
                    return (
                        <button key={t.id} className={'map-tab' + (activeTab === t.id ? ' active' : '')} onClick={function() { setActiveTab(t.id); }}>
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* Map tab */}
            <div style={{ display: activeTab === 'map' ? 'block' : 'none' }}>
                {/* Filter chips */}
                <div style={{ display: 'flex', gap: '0.5rem', padding: '0.65rem 0.75rem', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--glass-border)', borderTop: 'none', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: '0.25rem' }}>Show:</span>
                    {PLACE_CATEGORIES.map(function(cat) {
                        const active = activeFilters[cat.key];
                        const count = nearbyPlaces[cat.key].length;
                        return (
                            <button
                                key={cat.key}
                                onClick={function() { toggleFilter(cat.key); }}
                                disabled={placesLoading}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                                    padding: '0.3rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem',
                                    cursor: placesLoading ? 'not-allowed' : 'pointer',
                                    border: '1px solid ' + (active ? cat.color : 'rgba(255,255,255,0.15)'),
                                    background: active ? cat.color + '22' : 'transparent',
                                    color: active ? cat.color : 'var(--text-secondary)',
                                    opacity: placesLoading ? 0.5 : 1,
                                    transition: 'all 0.15s',
                                    fontFamily: 'var(--ff-ui)',
                                }}
                            >
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color, display: 'inline-block', flexShrink: 0 }} />
                                {cat.label}
                                {!placesLoading && count > 0 && (
                                    <span style={{ opacity: 0.7, fontSize: '0.72rem' }}>({count})</span>
                                )}
                                {placesLoading && <span style={{ opacity: 0.5, fontSize: '0.72rem' }}>...</span>}
                            </button>
                        );
                    })}

                    {/* For You divider + chips */}
                    {(forYouLoading || forYouSuggestions.length > 0) && (
                        <span style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)', margin: '0 0.25rem', alignSelf: 'center' }} />
                    )}
                    {forYouLoading && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ animation: 'pulse 1.5s infinite', display: 'inline-block' }}>✨</span> Personalizing...
                        </span>
                    )}
                    {forYouError && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--danger-color)' }} title={forYouError}>⚠ Suggestions unavailable</span>
                    )}
                    {forYouSuggestions.map(function(s) {
                        const active = forYouFilters[s.label];
                        const count = (forYouPlaces[s.label] || []).length;
                        return (
                            <button
                                key={s.label}
                                onClick={function() { toggleForYouFilter(s.label); }}
                                title={s.reason}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                                    padding: '0.3rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    border: '1px solid ' + (active ? s.color : 'rgba(255,255,255,0.15)'),
                                    background: active ? s.color + '22' : 'transparent',
                                    color: active ? s.color : 'var(--text-secondary)',
                                    transition: 'all 0.15s',
                                    fontFamily: 'var(--ff-ui)',
                                }}
                            >
                                <span style={{ fontSize: '0.7rem' }}>✨</span>
                                {s.label}
                                {count > 0 && <span style={{ opacity: 0.7, fontSize: '0.72rem' }}>({count})</span>}
                            </button>
                        );
                    })}

                    {/* Refresh suggestions button */}
                    <span style={{ marginLeft: 'auto' }}>
                        <button
                            onClick={function() { fetchForYouSuggestions(true); }}
                            disabled={forYouLoading}
                            title="Re-fetch personalized suggestions based on latest answers"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.35rem',
                                padding: '0.3rem 0.75rem', borderRadius: '1rem', fontSize: '0.78rem',
                                cursor: forYouLoading ? 'not-allowed' : 'pointer',
                                border: '1px solid var(--gold-line)',
                                background: 'transparent',
                                color: 'var(--gold)',
                                opacity: forYouLoading ? 0.5 : 1,
                                transition: 'all 0.15s',
                                fontFamily: 'var(--ff-ui)',
                                letterSpacing: '0.03em',
                            }}
                        >
                            {forYouLoading ? '...' : '↻'} Refresh Suggestions
                        </button>
                    </span>
                </div>
                <div ref={mapDivRef} className="map-container" style={{ borderRadius: '0 0 0.5rem 0.5rem', borderTop: 'none' }} />
            </div>

            {/* Street View tab */}
            <div style={{ display: activeTab === 'street' ? 'block' : 'none' }}>
                <div ref={streetViewDivRef} className="map-container" />
                <div style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', fontSize: '0.78rem', color: 'var(--text-secondary)', borderRadius: '0 0 0.5rem 0.5rem' }}>
                    Tip: Click a property marker on the map to move Street View to that location.
                </div>
            </div>

            {/* Favorites + Distance Calculator */}
            {mapReady && (
                <div style={{ marginTop: '1.25rem', background: 'rgba(13,13,18,0.7)', border: '1px solid var(--gold-line)', borderRadius: '0.5rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span style={{ color: 'var(--gold)', fontSize: '1rem' }}>\u2605</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.9rem' }}>Saved Locations</span>
                        {favorites.length > 0 && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({favorites.length})</span>
                        )}
                    </div>

                    {favorites.length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                            Click any marker on the map and tap "Favorite" to save locations here.
                        </p>
                    ) : (
                        <>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                                {favorites.map(function(fav) {
                                    return (
                                        <div key={fav.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.6rem', background: 'var(--gold-glow)', border: '1px solid var(--gold-dim)', borderRadius: '1rem', fontSize: '0.78rem', color: 'var(--gold)' }}>
                                            <span>\u2605</span>
                                            <span style={{ color: 'var(--text-primary)' }}>{fav.name}</span>
                                            <button
                                                onClick={function() { setFavorites(function(prev) { return prev.filter(function(f) { return f.id !== fav.id; }); }); }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '0 2px', lineHeight: 1 }}
                                                title="Remove"
                                            >\u00d7</button>
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ borderTop: '1px solid var(--gold-line)', paddingTop: '0.75rem' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '0.5rem' }}>Distance Calculator</div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <input
                                        type="text"
                                        value={distanceAddress}
                                        onChange={function(e) { setDistanceAddress(e.target.value); }}
                                        onKeyDown={function(e) { if (e.key === 'Enter') calcDistances(); }}
                                        placeholder="Enter an address (e.g. workplace, school)"
                                        style={{ flex: '1', minWidth: '220px', padding: '0.45rem 0.75rem', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', borderRadius: '0.375rem', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-family)' }}
                                    />
                                    <button
                                        onClick={calcDistances}
                                        disabled={distanceLoading || !distanceAddress.trim()}
                                        style={{ padding: '0.45rem 1rem', background: 'var(--gold)', color: 'var(--ink)', border: 'none', borderRadius: '0.375rem', cursor: distanceLoading || !distanceAddress.trim() ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: distanceLoading || !distanceAddress.trim() ? 0.5 : 1, fontFamily: 'var(--ff-ui)' }}
                                    >
                                        {distanceLoading ? 'Calculating...' : 'Calculate'}
                                    </button>
                                </div>

                                {distanceError && (
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--danger-color)' }}>{distanceError}</div>
                                )}

                                {distanceResults.length > 0 && (
                                    <div style={{ marginTop: '0.75rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Driving distances from "{distanceAddress}" — sorted nearest first</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                            {distanceResults.map(function(r, i) {
                                                return (
                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.65rem', background: 'var(--gold-glow)', border: '1px solid var(--gold-line)', borderRadius: '0.375rem' }}>
                                                        <span style={{ fontSize: '0.82rem', color: 'var(--cream)' }}><span style={{ color: 'var(--gold)' }}>\u2605</span> {r.name}</span>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', marginLeft: '0.75rem' }}>
                                                            {r.distance === 'N/A' ? 'N/A' : r.distance + ' \u00b7 ' + r.duration}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

const LocationResearch = ({ clientId }) => {
    const [zipCode, setZipCode] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [exporting, setExporting] = useState(false);
    const serviceResultsRef = useRef({});

    useEffect(() => {
        console.log("LocationResearch Component Loaded (v3)");
        const saved = localStorage.getItem('c_' + clientId + '_location');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                setZipCode(data.zipCode || '');
                setMinPrice(data.minPrice || '');
                setMaxPrice(data.maxPrice || '');
                setResults(data.results || null);
            } catch (e) {
                console.error('Error loading saved data:', e);
            }
        }
    }, [clientId]);

    const validateZip = (zip) => {
        return /^\d{5}(-\d{4})?$/.test(zip.trim());
    };

    const doSearch = async () => {
        const zip = zipCode.trim();
        if (!validateZip(zip)) {
            setError('Invalid ZIP code. Use format: 12345 or 12345-6789');
            return;
        }

        setError('');
        setLoading(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Default to 0 and Infinity if empty
            const min = minPrice && !isNaN(parseInt(minPrice)) ? parseInt(minPrice) : 0;
            const max = maxPrice && !isNaN(parseInt(maxPrice)) ? parseInt(maxPrice) : Infinity;

            // 1. Check if we have static data for this ZIP (ignoring price)
            const staticHomesInZip = MOCK_HOMES.filter(h => h.zip === zip);
            let matchedHomes = [];

            if (staticHomesInZip.length > 0) {
                // We have real/static data for this ZIP. Filter IT by price.
                matchedHomes = staticHomesInZip.filter(h => h.price >= min && h.price <= max);
            } else {
                // No static data exists for this ZIP. Generate dynamic data.
                console.log("No static data for ZIP, generating dynamic homes...");
                matchedHomes = generateMockHomes(zip, min, max);
            }

            const data = {
                zipCode: zip,
                minPrice: minPrice,
                maxPrice: maxPrice,
                timestamp: new Date().toISOString(),
                homes: matchedHomes,
                housing: {
                    summary: 'Housing market data for ZIP ' + zip + ': Based on recent market analysis, this area shows moderate home prices with steady appreciation. Rental market is active with competitive rates.',
                    medianPrice: 'Contact local agents',
                    rentRange: 'Varies by type',
                    trend: 'Stable'
                },
                schools: {
                    summary: 'School data for ZIP ' + zip + ': The area features public and private schools. Neighborhood includes family-friendly amenities and community services.',
                    rating: 'Mixed - research specific schools',
                    grade: 'B+ average',
                    familyFriendly: 'Yes'
                },
                crime: {
                    summary: 'Safety data for ZIP ' + zip + ': Overall safety metrics indicate moderate crime rate. Local law enforcement maintains active community programs.',
                    crimeGrade: 'C+ to B-',
                    safetyScore: 'Moderate',
                    trend: 'Stable'
                }
            };

            setResults(data);
            localStorage.setItem('c_' + clientId + '_location', JSON.stringify({
                zipCode: zip,
                minPrice,
                maxPrice,
                results: data
            }));
        } catch (err) {
            console.error("Search error:", err);
            setError('Search failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const generateReport = (cId, resData, svcResults) => {
        setExporting(true);
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const margin = 18;
            const contentW = pageW - margin * 2;
            let y = margin;

            const checkPage = (needed) => {
                if (y + needed > pageH - 15) { doc.addPage(); y = margin; }
            };

            const drawLine = () => {
                doc.setDrawColor(200, 169, 110);
                doc.setLineWidth(0.3);
                doc.line(margin, y, pageW - margin, y);
                y += 4;
            };

            // Header
            doc.setFillColor(13, 13, 18);
            doc.rect(0, 0, pageW, 40, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.setTextColor(200, 169, 110);
            doc.text('Real Agent Insight', margin, 18);
            doc.setFontSize(11);
            doc.setTextColor(237, 232, 223);
            doc.text('Location Research Report', margin, 26);
            doc.setFontSize(8);
            doc.setTextColor(180, 170, 150);
            doc.text('ZIP Code: ' + resData.zipCode + '  |  Generated: ' + new Date().toLocaleDateString(), margin, 33);
            y = 48;

            // Location Overview
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(200, 169, 110);
            doc.text('Location Overview', margin, y);
            y += 7;

            const sections = [
                { title: 'Housing Market', data: resData.housing },
                { title: 'Schools & Neighborhood', data: resData.schools },
                { title: 'Crime & Safety', data: resData.crime }
            ];

            sections.forEach(sec => {
                checkPage(25);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(237, 232, 223);
                doc.text(sec.title, margin, y);
                y += 5;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(180, 170, 150);
                const lines = doc.splitTextToSize(sec.data.summary, contentW);
                doc.text(lines, margin, y);
                y += lines.length * 3.5 + 4;
            });

            drawLine();
            y += 2;

            // Favorited Locations
            const favData = localStorage.getItem('mapFav_' + cId);
            const favorites = favData ? JSON.parse(favData) : [];
            checkPage(15);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(200, 169, 110);
            doc.text('Favorited Locations (' + favorites.length + ')', margin, y);
            y += 7;

            if (favorites.length === 0) {
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(8);
                doc.setTextColor(150, 140, 130);
                doc.text('No locations have been favorited yet.', margin, y);
                y += 6;
            } else {
                favorites.forEach((fav, i) => {
                    checkPage(10);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.setTextColor(237, 232, 223);
                    doc.text((i + 1) + '. ' + fav.name, margin + 2, y);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7);
                    doc.setTextColor(150, 140, 130);
                    doc.text('Lat: ' + fav.lat.toFixed(5) + ', Lng: ' + fav.lng.toFixed(5), margin + 2, y + 3.5);
                    y += 9;
                });
            }

            y += 2;
            drawLine();
            y += 2;

            // Service Providers
            checkPage(15);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(200, 169, 110);
            doc.text('Service Providers & Contractors', margin, y);
            y += 7;

            SERVICE_CATEGORIES.forEach(cat => {
                const catData = svcResults[cat.name];
                if (!catData) return;

                const servicesWithResults = cat.services.filter(s => {
                    const r = catData[s.label];
                    return r && !r.loading && r.nearest;
                });
                if (servicesWithResults.length === 0) return;

                checkPage(12);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(200, 169, 110);
                doc.text(cat.name, margin, y);
                y += 6;

                servicesWithResults.forEach(service => {
                    const r = catData[service.label];
                    const places = [r.nearest];
                    if (r.bestRated) places.push(r.bestRated);

                    checkPage(8 + places.length * 12);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.setTextColor(237, 232, 223);
                    doc.text(service.label, margin + 2, y);
                    y += 5;

                    places.forEach(place => {
                        checkPage(12);
                        const badge = place === r.nearest ? 'NEAREST' : 'BEST RATED';
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(7);
                        doc.setTextColor(200, 169, 110);
                        doc.text('[' + badge + ']', margin + 4, y);
                        doc.setTextColor(237, 232, 223);
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(8);
                        doc.text(place.name || '', margin + 4 + doc.getTextWidth('[' + badge + '] '), y);
                        y += 3.5;
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(7);
                        doc.setTextColor(150, 140, 130);
                        const infoLine = [
                            place.rating ? place.rating.toFixed(1) + ' stars' : '',
                            place._distFormatted || '',
                            place.vicinity || ''
                        ].filter(Boolean).join('  |  ');
                        doc.text(infoLine, margin + 4, y);
                        y += 3.5;
                        if (place._phone) {
                            doc.setTextColor(200, 169, 110);
                            doc.text(place._phone, margin + 4, y);
                            y += 3.5;
                        }
                        y += 2;
                    });
                    y += 1;
                });
                y += 2;
            });

            // Footer on every page
            const totalPages = doc.internal.getNumberOfPages();
            for (let p = 1; p <= totalPages; p++) {
                doc.setPage(p);
                doc.setFillColor(13, 13, 18);
                doc.rect(0, pageH - 10, pageW, 10, 'F');
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.setTextColor(150, 140, 130);
                doc.text('Real Agent Insight  |  Page ' + p + ' of ' + totalPages, margin, pageH - 4);
                doc.text('Confidential', pageW - margin - doc.getTextWidth('Confidential'), pageH - 4);
            }

            doc.save('Location-Report-' + resData.zipCode + '-' + new Date().toISOString().slice(0, 10) + '.pdf');
        } catch (err) {
            console.error('PDF generation error:', err);
            alert('Failed to generate report. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="question-container">
            <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
                <h2 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1.3rem' }}>Location Research</h2>

                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ZIP Code</label>
                            <input
                                type="text"
                                className="form-input"
                                value={zipCode}
                                onChange={(e) => setZipCode(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && doSearch()}
                                placeholder="90210"
                                maxLength="10"
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Min Price</label>
                            <input
                                type="number"
                                className="form-input"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                placeholder="Min $"
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Max Price</label>
                            <input
                                type="number"
                                className="form-input"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                placeholder="Max $"
                                disabled={loading}
                            />
                        </div>
                        <button
                            className="submit-btn"
                            onClick={doSearch}
                            disabled={loading || !zipCode.trim()}
                            style={{ minWidth: '100px', height: '42px', marginBottom: '1px' }}
                        >
                            {loading ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                    {error && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{error}</div>}
                </div>
            </div>

            {results && (
                <MapExplorer zipCode={results.zipCode} homes={results.homes || []} clientId={clientId} />
            )}

            {results && (
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ color: 'var(--accent-color)', marginTop: 0 }}>
                        Results for ZIP Code: {results.zipCode}
                    </h3>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ marginBottom: '0.75rem' }}>🏠 Housing Market</h4>
                        <div className="result-card">
                            <p style={{ margin: 0, lineHeight: '1.6' }}>{results.housing.summary}</p>
                            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(200,169,110,0.05)', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                                <div><strong>Median Price:</strong> {results.housing.medianPrice}</div>
                                <div><strong>Rent Range:</strong> {results.housing.rentRange}</div>
                                <div><strong>Market Trend:</strong> {results.housing.trend}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ marginBottom: '0.75rem' }}>🎓 Schools & Neighborhood</h4>
                        <div className="result-card">
                            <p style={{ margin: 0, lineHeight: '1.6' }}>{results.schools.summary}</p>
                            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(200,169,110,0.05)', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                                <div><strong>School Rating:</strong> {results.schools.rating}</div>
                                <div><strong>Neighborhood Grade:</strong> {results.schools.grade}</div>
                                <div><strong>Family Friendly:</strong> {results.schools.familyFriendly}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ marginBottom: '0.75rem' }}>🛡️ Crime & Safety</h4>
                        <div className="result-card">
                            <p style={{ margin: 0, lineHeight: '1.6' }}>{results.crime.summary}</p>
                            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(200,169,110,0.05)', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                                <div><strong>Crime Grade:</strong> {results.crime.crimeGrade}</div>
                                <div><strong>Safety Score:</strong> {results.crime.safetyScore}</div>
                                <div><strong>Trend:</strong> {results.crime.trend}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--gold-glow)', border: '1px solid var(--gold-line)', borderRadius: '0.5rem', fontSize: '0.875rem', color: 'var(--gold)' }}>
                        ℹ️ <strong>Note:</strong> This data is simulated for demonstration. For accurate information, consult Zillow.com, Niche.com, and CrimeGrade.org directly.
                    </div>

                    <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Last updated: {new Date(results.timestamp).toLocaleString()}
                    </div>

                    <ServiceProviderDirectory zipCode={results.zipCode} resultsRef={serviceResultsRef} />

                    <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--gold-line)', textAlign: 'center' }}>
                        <button
                            className="submit-btn"
                            onClick={() => generateReport(clientId, results, serviceResultsRef.current)}
                            disabled={exporting}
                            style={{
                                padding: '0.75rem 2rem', fontSize: '0.9rem',
                                background: 'transparent', border: '1px solid var(--gold-line)',
                                color: 'var(--gold)', cursor: exporting ? 'wait' : 'pointer',
                                transition: 'background 0.2s, color 0.2s', borderRadius: '6px'
                            }}
                            onMouseEnter={e => { if (!exporting) { e.target.style.background = 'var(--gold)'; e.target.style.color = '#0d0d12'; }}}
                            onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--gold)'; }}
                        >
                            {exporting ? 'Generating PDF...' : 'Export Report as PDF'}
                        </button>
                        <p style={{ fontSize: '0.7rem', color: 'var(--cream-30)', marginTop: '0.5rem' }}>
                            Includes location data, service providers, and favorited places
                        </p>
                    </div>

                </div>
            )}

            {!results && !loading && (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
                    Enter a ZIP code above to start researching locations
                </div>
            )}
        </div>
    );
};

const SummaryView = ({ clientId }) => {
    const [clientData, setClientData] = useState([]);
    const [masterInsight, setMasterInsight] = useState("");

    useEffect(() => {
        const data = [];
        questions.forEach(q => {
            const saved = localStorage.getItem(`c_${clientId}_q_${q.id}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.transcript) {
                    data.push({ ...q, ...parsed });
                }
            }
        });
        setClientData(data);

        if (data.length > 0) {
            setMasterInsight("Based on the client's responses, they are a high-intent buyer focused on long-term value. Key priorities include family stability and financial prudence. They show a preference for modern amenities but are willing to compromise for location.");
        } else {
            setMasterInsight("No data collected yet. Start asking questions to generate a profile.");
        }
    }, [clientId]);

    const grouped = clientData.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {});

    return (
        <div className="question-container">
            <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid var(--accent-color)' }}>
                <h2 style={{ marginTop: 0, fontSize: '1.8rem' }}>Client Profile Analysis</h2>
                <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                    {masterInsight}
                </p>
            </div>

            {Object.keys(grouped).length === 0 && (
                <div style={{ textAlign: 'center', opacity: 0.6, marginTop: '2rem' }}>
                    No answers recorded yet. Go back to questions to start building the profile.
                </div>
            )}

            {Object.entries(grouped).map(([category, items]) => (
                <div key={category} className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ color: 'var(--accent-color)', marginTop: 0 }}>{category}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {items.map(item => (
                            <div key={item.id}>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                    {item.text}
                                </div>
                                <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--cream-08)', padding: '1rem', borderRadius: '0.5rem' }}>
                                    <div style={{ marginBottom: '0.5rem' }}>"{item.transcript}"</div>
                                    {item.summary && (
                                        <div style={{ fontSize: '0.85rem', color: 'var(--success-color)', fontStyle: 'italic' }}>
                                            Insight: {item.summary}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const App = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [authChecking, setAuthChecking] = useState(true);
    const [currentClient, setCurrentClient] = useState(null);
    const [activeCategory, setActiveCategory] = useState("Financial");
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [viewMode, setViewMode] = useState("location");

    useEffect(() => {
        const token = localStorage.getItem('rai_token');
        if (!token) { setAuthChecking(false); return; }
        fetch('/api/auth/verify', { headers: { 'Authorization': 'Bearer ' + token } })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => { setIsAuthenticated(true); setUserEmail(data.email); })
            .catch(() => { localStorage.removeItem('rai_token'); localStorage.removeItem('rai_email'); })
            .finally(() => setAuthChecking(false));
    }, []);

    // Reset question index when client or category changes
    useEffect(() => {
        setCurrentQuestionIndex(0);
    }, [currentClient?.id, activeCategory]);

    const filteredQuestions = questions.filter(q => q.category === activeCategory);

    const currentQuestion = filteredQuestions[currentQuestionIndex];

    const handleNext = () => {
        if (currentQuestionIndex < filteredQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleCategoryChange = (cat) => {
        setActiveCategory(cat);
        setCurrentQuestionIndex(0);
        setViewMode("questions");
    };

    const handleLogout = () => {
        localStorage.removeItem('rai_token');
        localStorage.removeItem('rai_email');
        setIsAuthenticated(false);
        setUserEmail('');
        setCurrentClient(null);
        setViewMode("questions");
        setActiveCategory("Financial");
        setCurrentQuestionIndex(0);
    };

    const handleSwitchClient = () => {
        setCurrentClient(null);
        setViewMode("questions");
        setActiveCategory("Financial");
        setCurrentQuestionIndex(0);
    };

    if (authChecking) {
        return (
            <div className="login-container">
                <div className="glass-panel login-card" style={{ textAlign: 'center' }}>
                    <h1 style={{ marginBottom: '0.5rem' }}>Real Agent <span style={{ color: 'var(--accent-color)' }}>Insight</span></h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <LoginView onLogin={(email) => { setIsAuthenticated(true); setUserEmail(email); }} />;
    }

    if (!currentClient) {
        return <ClientDashboard onSelectClient={setCurrentClient} />;
    }

    return (
        <div>
            <header className="app-header" style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', gap: '1rem' }}>
                    <div className="client-header-info">
                        <span className="client-badge">Client: {currentClient.name}</span>
                    </div>
                    <button className="logout-btn" onClick={handleSwitchClient}>Switch Client</button>
                    <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
                </div>

                <h1>Real Agent <span style={{ color: 'var(--accent-color)' }}>Insight</span></h1>
                <p style={{ color: 'var(--text-secondary)' }}>Client Discovery & Intelligence Tool</p>
            </header>

            <div className="main-grid">
                <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
                    <button
                        className={`category-btn ${viewMode === 'summary' ? 'active' : ''}`}
                        style={{
                            width: '100%',
                            marginBottom: '1.5rem',
                            textAlign: 'center',
                            border: '1px solid var(--accent-color)',
                            color: viewMode === 'summary' ? 'var(--accent-color)' : 'var(--text-primary)'
                        }}
                        onClick={() => setViewMode("summary")}
                    >
                        ★ Client Profile
                    </button>

                    <button
                        className={`category-btn ${viewMode === 'location' ? 'active' : ''}`}
                        style={{
                            width: '100%',
                            marginBottom: '1.5rem',
                            textAlign: 'center',
                            border: '1px solid var(--success-color)',
                            color: viewMode === 'location' ? 'var(--success-color)' : 'var(--text-primary)'
                        }}
                        onClick={() => setViewMode("location")}
                    >
                        📍 Location Research
                    </button>

                    <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.2rem' }}>Domains</h3>
                    <div className="category-list">
                        {[...new Set(questions.map(q => q.category))].map(cat => (
                            <button
                                key={cat}
                                className={`category-btn ${activeCategory === cat && viewMode === 'questions' ? 'active' : ''}`}
                                onClick={() => handleCategoryChange(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="question-container">
                    {viewMode === 'summary' ? (
                        <SummaryView clientId={currentClient.id} />
                    ) : viewMode === 'location' ? (
                        <LocationResearch clientId={currentClient.id} />
                    ) : (
                        filteredQuestions.length > 0 ? (
                            <QuestionView
                                question={currentQuestion}
                                onNext={handleNext}
                                onPrev={handlePrev}
                                hasNext={currentQuestionIndex < filteredQuestions.length - 1}
                                hasPrev={currentQuestionIndex > 0}
                                clientId={currentClient.id}
                            />
                        ) : (
                            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                                No questions found in this category.
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
