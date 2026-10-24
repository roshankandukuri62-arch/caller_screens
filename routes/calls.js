const express = require('express');
const router = express.Router();

// 1. Live Total Calls Made Counter
router.get('/stats', async (req, res) => {
    console.log('API Request: GET /api/calls/stats');
    const supabase = req.app.locals.supabase;
    try {
        const { data, error } = await supabase.from('call_details').select('id');
        if (error) throw error;
        
        // Count distinct call IDs
        const uniqueCalls = new Set(data.map(row => row.id));
        console.log(`Stats fetched successfully. Total unique calls: ${uniqueCalls.size}`);
        res.status(200).json({ calls_made: uniqueCalls.size });
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ error: 'Failed to fetch call stats' });
    }
});

// 2. Filter Options Endpoint for Dropdowns
router.get('/filter-options/:field', async (req, res) => {
    const { field } = req.params;
    console.log(`API Request: GET /api/calls/filter-options/${field}`);
    const supabase = req.app.locals.supabase;

    try {
        if (field === 'caller_name') {
            const { data, error } = await supabase.from('call_details').select('caller');
            if (error) throw error;
            const uniqueCallers = [...new Set(data.map(r => r.caller ? r.caller.split(',')[0].trim() : ''))].filter(Boolean);
            return res.status(200).json({ options: uniqueCallers });
        }

        if (field === 'company_name') {
            const { data, error } = await supabase.from('call_details').select('company');
            if (error) throw error;
            const uniqueCompanies = [...new Set(data.map(r => r.company ? r.company.replace('(fictional)', '').trim() : ''))].filter(Boolean);
            return res.status(200).json({ options: uniqueCompanies });
        }

        let queryField = '';
        if (field === 'call_id') queryField = 'id';
        else if (field === 'call_duration') queryField = 'duration_seconds';
        else if (field === 'call_outcome') queryField = 'outcome';
        else if (field === 'company_kind') queryField = 'company_kind';
        else if (field === 'prospect_role') queryField = 'prospect_role';
        else return res.status(400).json({ error: 'Invalid filter field' });

        const { data, error } = await supabase.from('call_details').select(queryField);
        if (error) throw error;

        const options = [...new Set(data.map(r => r[queryField]))].filter(val => val !== null && val !== undefined);
        res.status(200).json({ options });
    } catch (err) {
        console.error(`Error fetching options for ${field}:`, err);
        res.status(500).json({ error: 'Failed to fetch filter options' });
    }
});

// 3. Search and Filter Calls Endpoint
router.post('/search', async (req, res) => {
    console.log('API Request: POST /api/calls/search with payload:', req.body);
    const supabase = req.app.locals.supabase;
    const { callId, durationGt, durationLt, outcome, callerName, companyKind, companyName, prospectRole, conversationContains } = req.body;

    try {
        let query = supabase.from('call_details').select('*');

        if (callId) query = query.ilike('id', `%${callId}%`);
        if (durationGt !== undefined && durationGt !== '') query = query.gte('duration_seconds', Number(durationGt));
        if (durationLt !== undefined && durationLt !== '') query = query.lte('duration_seconds', Number(durationLt));
        if (outcome) query = query.ilike('outcome', `%${outcome}%`);
        if (companyKind) query = query.ilike('company_kind', `%${companyKind}%`);
        if (prospectRole) query = query.ilike('prospect_role', `%${prospectRole}%`);

        const { data: callDetails, error } = await query;
        if (error) throw error;

        let formattedData = callDetails.map(r => ({
            call_id: r.id,
            call_duration: r.duration_seconds,
            call_outcome: r.outcome,
            caller_name: r.caller ? r.caller.split(',')[0].trim() : '',
            company_kind: r.company_kind,
            company_name: r.company ? r.company.replace('(fictional)', '').trim() : '',
            prospect_role: r.prospect_role
        }));

        if (callerName) {
            formattedData = formattedData.filter(d => d.caller_name.toLowerCase().includes(callerName.toLowerCase()));
        }
        if (companyName) {
            formattedData = formattedData.filter(d => d.company_name.toLowerCase().includes(companyName.toLowerCase()));
        }

        // Handle conversation contains filter
        if (conversationContains && conversationContains.trim() !== '') {
            const { data: transcripts, error: transcriptError } = await supabase
                .from('transcript_details_translated')
                .select('call_details_id')
                .or(`translated_content.ilike.%${conversationContains}%,turn_content.ilike.%${conversationContains}%`);

            if (!transcriptError && transcripts) {
                const matchingCallIds = new Set(transcripts.map(t => t.call_details_id));
                formattedData = formattedData.filter(d => matchingCallIds.has(d.call_id));
            } else {
                formattedData = []; // No conversation matches found
            }
        }

        console.log(`Search completed. Returning ${formattedData.length} matching rows.`);
        res.status(200).json({ data: formattedData });
    } catch (err) {
        console.error('Error executing search query:', err);
        res.status(500).json({ error: 'Search execution failed' });
    }
});

// 4. Get Full Transcript for a Specific Call ID
router.get('/:id/transcript', async (req, res) => {
    const { id } = req.params;
    console.log(`API Request: GET /api/calls/${id}/transcript`);
    const supabase = req.app.locals.supabase;

    try {
        // Fetch caller name for speaker labeling
        const { data: callData } = await supabase
            .from('call_details')
            .select('caller')
            .eq('id', id)
            .single();

        const callerName = callData?.caller ? callData.caller.split(',')[0].trim() : 'Caller';

        // Fetch turn details ordered by turn_count asc
        const { data: turns, error } = await supabase
            .from('transcript_details_translated')
            .select('turn_count, turn_speaker, turn_content, translated_content')
            .eq('call_details_id', id)
            .order('turn_count', { ascending: true });

        if (error) throw error;

        const formattedTurns = turns.map(t => ({
            Turn: t.turn_count,
            Speaker: t.turn_speaker === 'C' ? callerName : 'Prospect',
            Content: t.translated_content || t.turn_content
        }));

        console.log(`Transcript fetched successfully for call ${id} with ${formattedTurns.length} turns.`);
        res.status(200).json({ turns: formattedTurns });
    } catch (err) {
        console.error('Error fetching transcript:', err);
        res.status(500).json({ error: 'Failed to fetch transcript' });
    }
});

// 5. Save Live Call Log Endpoint
router.post('/save-log', async (req, res) => {
    console.log('API Request: POST /api/calls/save-log with payload:', req.body);
    const supabase = req.app.locals.supabase;

    try {
        const {
            employee_id,
            company_name,
            prospect_name,
            prospect_role,
            is_new_prospect,
            final_stage_reached,
            final_mood,
            stage_notes,
            selected_responses
        } = req.body;

        // Basic validation
        if (!company_name || !prospect_name || !employee_id) {
            return res.status(400).json({ success: false, error: "Missing required fields." });
        }

        // Insert into Supabase (call_logger_id generates automatically)
        const { data, error } = await supabase
            .from('call_logs')
            .insert([{
                employee_id,
                company_name,
                prospect_name,
                prospect_role,
                is_new_prospect,
                final_stage_reached,
                final_mood,
                stage_notes: stage_notes || {},
                selected_responses: selected_responses || {}
            }])
            .select();

        if (error) throw error;

        console.log(`Call log saved successfully. Assigned ID: ${data[0].call_logger_id}`);
        return res.status(200).json({ 
            success: true, 
            message: "Call log saved successfully", 
            call_logger_id: data[0].call_logger_id 
        });

    } catch (err) {
        console.error("Error inserting call log:", err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
