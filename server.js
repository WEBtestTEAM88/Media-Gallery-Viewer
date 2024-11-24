const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const multer = require('multer');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Configure session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Login endpoint - MUST be before the static file middleware
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    console.log('Login attempt:', { username, password });

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // Read users file
        const usersData = fs.readFileSync('users.json', 'utf8');
        const users = JSON.parse(usersData).users;

        // Find matching user
        const user = users.find(u => 
            u.username === username && 
            u.password === password
        );

        if (user) {
            // Create session
            req.session.user = {
                username: user.username,
                role: user.role
            };
            console.log('Login successful:', user.username, user.role);
            res.json({ 
                success: true, 
                role: user.role,
                username: user.username 
            });
        } else {
            console.log('Login failed: Invalid credentials');
            res.status(401).json({ error: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Authentication middleware
app.use((req, res, next) => {
    // Allow access to login-related files without authentication
    if (req.path === '/login.html' || 
        req.path === '/login.js' || 
        req.path === '/login.css' || 
        req.path === '/style.css') {
        return next();
    }

    // API endpoints should return JSON
    if (req.path.startsWith('/api/')) {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return next();
    }

    // For regular pages, redirect to login if not authenticated
    if (!req.session.user) {
        if (req.path === '/') {
            return res.redirect('/login.html');
        }
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return res.redirect('/login.html');
    }

    next();
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Protected API endpoints
app.get('/files', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const galleryDir = path.join(__dirname, 'Gallery');
    
    // Check if Gallery directory exists
    if (!fs.existsSync(galleryDir)) {
        console.error('Gallery directory does not exist');
        fs.mkdirSync(galleryDir); // Create if it doesn't exist
        return res.json([]);
    }

    fs.readdir(galleryDir, (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            res.status(500).json({ error: 'Failed to load gallery items' });
        } else {
            const fileUrls = files
                .filter(file => !file.startsWith('.')) // Filter out hidden files
                .map(file => `Gallery/${file}`);
            res.json(fileUrls);
        }
    });
});

// Admin endpoints
app.get('/users', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    try {
        const users = JSON.parse(fs.readFileSync('users.json')).users;
        res.json(users.map(u => ({ username: u.username, role: u.role })));
    } catch (error) {
        res.status(500).json({ error: 'Failed to load users' });
    }
});

app.post('/users', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { username, password, role } = req.body;
    try {
        const usersData = JSON.parse(fs.readFileSync('users.json'));
        if (usersData.users.some(u => u.username === username)) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        usersData.users.push({ username, password, role });
        fs.writeFileSync('users.json', JSON.stringify(usersData, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add user' });
    }
});

app.delete('/users/:username', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const username = req.params.username;
    try {
        const usersData = JSON.parse(fs.readFileSync('users.json'));
        if (username === 'admin') {
            return res.status(400).json({ error: 'Cannot delete admin user' });
        }
        usersData.users = usersData.users.filter(u => u.username !== username);
        fs.writeFileSync('users.json', JSON.stringify(usersData, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Logout endpoint
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            res.status(500).json({ error: 'Logout failed' });
        } else {
            res.json({ success: true });
        }
    });
});

app.post('/change-password', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { currentPassword, newPassword } = req.body;
    
    try {
        const usersData = JSON.parse(fs.readFileSync('users.json'));
        const userIndex = usersData.users.findIndex(u => 
            u.username === req.session.user.username && 
            u.password === currentPassword
        );

        if (userIndex === -1) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Update password
        usersData.users[userIndex].password = newPassword;
        fs.writeFileSync('users.json', JSON.stringify(usersData, null, 2));

        res.json({ success: true });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Add this helper function at the top of server.js
function getUniqueFilename(originalPath) {
    const dir = path.dirname(originalPath);
    const ext = path.extname(originalPath);
    const baseName = path.basename(originalPath, ext);
    let newPath = originalPath;
    let counter = 0;

    while (fs.existsSync(newPath)) {
        counter++;
        const randomStr = Math.random().toString(36).substring(2, 5); // Generate random string
        newPath = path.join(dir, `${baseName}_${randomStr}${ext}`);
    }

    return newPath;
}

// Update the storage configuration for direct uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'Gallery/');
    },
    filename: function (req, file, cb) {
        const targetPath = path.join('Gallery', file.originalname);
        const uniquePath = getUniqueFilename(targetPath);
        // Extract just the filename from the full path
        cb(null, path.basename(uniquePath));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

app.post('/upload', upload.array('files'), (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    // Log uploaded files
    console.log('Uploaded files:', req.files.map(f => f.originalname));

    res.json({ 
        success: true, 
        message: 'Files uploaded successfully',
        files: req.files.map(f => f.originalname)
    });
});

// Configure multer for forApprove folder
const pendingStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const forApproveDir = path.join(__dirname, 'forApprove');
        if (!fs.existsSync(forApproveDir)) {
            fs.mkdirSync(forApproveDir);
        }
        cb(null, 'forApprove/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const pendingUpload = multer({
    storage: pendingStorage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Endpoint for user file submissions
app.post('/submit-files', pendingUpload.array('files'), (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    // Add submission info to a tracking file
    const submissions = {
        files: req.files.map(f => ({
            name: f.originalname,
            submitter: req.session.user.username,
            date: new Date(),
            type: path.extname(f.originalname).substring(1)
        }))
    };

    // You might want to store this information in a database instead
    const submissionsFile = path.join(__dirname, 'forApprove', 'submissions.json');
    try {
        let existingSubmissions = [];
        if (fs.existsSync(submissionsFile)) {
            existingSubmissions = JSON.parse(fs.readFileSync(submissionsFile)).files;
        }
        fs.writeFileSync(submissionsFile, 
            JSON.stringify({ files: [...existingSubmissions, ...submissions.files] }, null, 2)
        );
    } catch (error) {
        console.error('Error saving submission info:', error);
    }

    res.json({ success: true, message: 'Files submitted for approval' });
});

// Get pending files (admin only)
app.get('/pending-files', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const submissionsFile = path.join(__dirname, 'forApprove', 'submissions.json');
    try {
        if (fs.existsSync(submissionsFile)) {
            const submissions = JSON.parse(fs.readFileSync(submissionsFile));
            res.json(submissions.files);
        } else {
            res.json([]);
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to load pending files' });
    }
});

// Update the file approval endpoint
app.post('/file-action/:action', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { action } = req.params;
    const { fileName } = req.body;
    const sourcePath = path.join(__dirname, 'forApprove', fileName);
    
    try {
        if (action === 'approve') {
            // Check for duplicate and get unique filename
            const targetPath = path.join(__dirname, 'Gallery', fileName);
            const uniquePath = getUniqueFilename(targetPath);
            
            // Move file to Gallery folder with unique name
            await fs.promises.rename(sourcePath, uniquePath);
            console.log(`File approved and moved to: ${uniquePath}`);
        } else {
            // Delete file
            await fs.promises.unlink(sourcePath);
        }

        // Update submissions.json
        const submissionsFile = path.join(__dirname, 'forApprove', 'submissions.json');
        const submissions = JSON.parse(fs.readFileSync(submissionsFile));
        submissions.files = submissions.files.filter(f => f.name !== fileName);
        fs.writeFileSync(submissionsFile, JSON.stringify(submissions, null, 2));

        res.json({ success: true });
    } catch (error) {
        console.error(`Error ${action}ing file:`, error);
        res.status(500).json({ error: `Failed to ${action} file` });
    }
});

app.listen(PORT, "127.0.0.1", () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});