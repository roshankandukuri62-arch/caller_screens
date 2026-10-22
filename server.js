const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// Allow requests from any frontend (like your Vercel app)
app.use(cors({
    origin: '*',
    methods: ['POST', 'GET'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Connect to Supabase using Render Environment Variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables!");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Health Check Route (So visiting the base Render URL shows it's live)
app.get('/', (req, res) => {
    res.status(200).json({ status: 'online', message: 'PDGMS Backend is running successfully!' });
});

// Login Route with Diagnostic Logging
app.post('/api/login', async (req, res) => {
    const { employee_id, password } = req.body;

    console.log(`Attempting login for Employee ID: "${employee_id}"`);

    if (!employee_id || !password) {
        return res.status(400).json({ success: false, message: 'Employee ID and password are required.' });
    }

    try {
        const { data, error } = await supabase
            .from('employees')
            .select('*') // Select all columns to debug
            .eq('employee_id', employee_id)
            .eq('password', password)
            .single();

        // Print what Supabase actually returned in Render logs
        console.log('Supabase Error:', error);
        console.log('Supabase Data Found:', data);

        if (error || !data) {
            return res.status(401).json({ success: false, message: 'Invalid credentials. Please try again.' });
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Login successful', 
            redirectUrl: '/dashboard.html' 
        });

    } catch (err) {
        console.error('Server error during login:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
