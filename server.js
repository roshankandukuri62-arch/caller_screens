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

// Make Supabase client accessible to route modules via app.locals
app.locals.supabase = supabase;

// Health Check Route
app.get('/', (req, res) => {
    res.status(200).json({ status: 'online', message: 'PDGMS Backend is running successfully!' });
});

// Import Routers
const authRouter = require('./routes/auth');
const callsRouter = require('./routes/calls');

// Mount Routers
app.use('/api', authRouter);       
app.use('/api/calls', callsRouter); 

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
