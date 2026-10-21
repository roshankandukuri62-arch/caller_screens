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
const supabase = createClient(supabaseUrl, supabaseKey);


// Login Route
app.post('/api/login', async (req, res) => {
    const { employee_id, password } = req.body;


    if (!employee_id || !password) {
        return res.status(400).json({ success: false, message: 'Employee ID and password are required.' });
    }


    try {
        const { data, error } = await supabase
            .from('employees')
            .select('employee_id')
            .eq('employee_id', employee_id)
            .eq('password', password)
            .single();


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
