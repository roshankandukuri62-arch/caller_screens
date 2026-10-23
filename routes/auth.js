const express = require('express');
const router = express.Router();

router.post('/login', async (req, res) => {
    const supabase = req.app.locals.supabase;
    const { employee_id, password } = req.body;

    console.log(`Attempting login for Employee ID: "${employee_id}"`);

    if (!employee_id || !password) {
        return res.status(400).json({ success: false, message: 'Employee ID and password are required.' });
    }

    try {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('employee_id', employee_id)
            .eq('password', password)
            .single();

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

module.exports = router;
