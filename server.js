require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const bcrypt = require('bcrypt');
const path = require('path');
const cors = require('cors');


const app = express();
const port = 3000;

// Update the CORS configuration to be more permissive in development
app.use(cors({
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// MySQL connection configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'your_generated_username',
    password: process.env.DB_PASSWORD || 'your_generated_password',
    database: process.env.DB_NAME || 'your_generated_database_name'
};

// Create MySQL connection pool
const pool = mysql.createPool(dbConfig);

// Session store configuration
const sessionStore = new MySQLStore({
    expiration: 86400000, // Session expiration (24 hours)
    createDatabaseTable: true
}, pool);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use(session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 86400000,
        sameSite: 'lax',
        httpOnly: true
    }
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

// Routes
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Get user from database
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Set session
        req.session.userId = user.id;
        req.session.username = user.username;

        res.json({
            username: user.username,
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ message: 'Logout successful' });
    });
});

app.get('/api/check-auth', (req, res) => {
    if (req.session.userId) {
        res.json({
            isAuthenticated: true,
            username: req.session.username
        });
    } else {
        res.json({ isAuthenticated: false });
    }
});

// Get user's tickets for today's draw
app.get('/api/tickets', requireAuth, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const [rows] = await pool.execute(
            'SELECT numbers FROM tickets WHERE user_id = ? AND draw_date = ?',
            [req.session.userId, today]
        );

        const tickets = rows.map(row => JSON.parse(row.numbers));
        res.json({ tickets });
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

// Add this helper function at the top of the file
function getLocalDate(daysOffset = 0) {
    const now = new Date();
    const date = new Date(now.getTime() - (now.getTimezoneOffset() * 60000) + (daysOffset * 86400000));
    return date.toISOString().split('T')[0];
}

// Add these helper functions at the top of your file
async function getOrCreateDailyDraw(date) {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM daily_draws WHERE draw_date = ?',
            [date]
        );

        if (rows.length === 0) {
            // Create new draw for the day with initial prize pool
            await pool.execute(
                'INSERT INTO daily_draws (draw_date, prize_pool) VALUES (?, ?)',
                [date, 1000000] // Starting with $1M pool
            );
            
            // Fetch the newly created draw
            const [newDraw] = await pool.execute(
                'SELECT * FROM daily_draws WHERE draw_date = ?',
                [date]
            );
            
            return newDraw[0];
        }

        return rows[0];
    } catch (error) {
        console.error('Error in getOrCreateDailyDraw:', error);
        throw error;
    }
}

// Add this helper function to find matching numbers
function countMatches(ticketNumbers, winningNumbers) {
    return ticketNumbers.filter(num => winningNumbers.includes(num)).length;
}

// Add this helper function to get the best ticket
async function getBestTicketForDate(userId, date, winningNumbers) {
    const [tickets] = await pool.execute(
        'SELECT numbers FROM tickets WHERE user_id = ? AND draw_date = ?',
        [userId, date]
    );
    
    if (tickets.length === 0) return null;
    
    let bestTicket = null;
    let maxMatches = -1;
    
    for (const ticket of tickets) {
        const numbers = JSON.parse(ticket.numbers);
        const matches = countMatches(numbers, winningNumbers);
        if (matches > maxMatches) {
            maxMatches = matches;
            bestTicket = numbers;
        }
    }
    
    return { numbers: bestTicket, matches: maxMatches };
}

// Modify the draw-info endpoint to include best ticket
app.get('/api/draw-info', async (req, res) => {
    try {
        const today = getLocalDate();
        const yesterday = getLocalDate(-1);

        // Get today's and yesterday's draw info
        const [todayDraw, yesterdayDraw] = await Promise.all([
            getOrCreateDailyDraw(today),
            getOrCreateDailyDraw(yesterday)
        ]);

        // Get winning numbers for today
        const winningNumbers = todayDraw.winning_numbers 
            ? JSON.parse(todayDraw.winning_numbers)
            : [12, 24, 35, 42, 48, 50];

        // Get yesterday's winning numbers
        const yesterdayWinningNumbers = yesterdayDraw.winning_numbers
            ? JSON.parse(yesterdayDraw.winning_numbers)
            : [1, 2, 3, 4, 5, 6]; // Default numbers

        // Get user's best ticket from yesterday if logged in
        let bestTicket = null;
        if (req.session.userId) {
            bestTicket = await getBestTicketForDate(
                req.session.userId, 
                yesterday,
                yesterdayWinningNumbers
            );
        }

        res.json({
            currentPool: todayDraw.prize_pool,
            previousPayout: yesterdayDraw.prize_pool,
            winningNumbers,
            yesterdayWinningNumbers,
            bestTicket
        });
    } catch (error) {
        console.error('Error fetching draw info:', error);
        res.status(500).json({ error: 'Failed to fetch draw information' });
    }
});

// Update the buy-ticket endpoint
app.post('/api/buy-ticket', requireAuth, async (req, res) => {
    try {
        const numbers = Array.from({ length: 6 }, () => 
            Math.floor(Math.random() * 50) + 1
        ).sort((a, b) => a - b);

        const today = getLocalDate();
        
        // Start a transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Ensure daily draw exists for today
            const todayDraw = await getOrCreateDailyDraw(today);

            // Store the ticket
            await connection.execute(
                'INSERT INTO tickets (user_id, numbers, draw_date) VALUES (?, ?, ?)',
                [req.session.userId, JSON.stringify(numbers), today]
            );

            // Update prize pool (add $1 for each ticket)
            await connection.execute(
                'UPDATE daily_draws SET prize_pool = prize_pool + 1 WHERE draw_date = ?',
                [today]
            );

            await connection.commit();
            
            // Get updated pool amount
            const [drawInfo] = await connection.execute(
                'SELECT prize_pool FROM daily_draws WHERE draw_date = ?',
                [today]
            );

            connection.release();

            res.json({ 
                message: 'Ticket purchased successfully',
                numbers,
                currentPool: drawInfo[0].prize_pool
            });
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    } catch (error) {
        console.error('Error buying ticket:', error);
        res.status(500).json({ error: 'Failed to purchase ticket' });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Basic validation
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Check if username already exists
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        // Hash password and create user
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.execute(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword]
        );

        res.status(201).json({ message: 'Registration successful' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
