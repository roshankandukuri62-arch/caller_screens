const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini Client with active model
const genAI = new GoogleGenerativeAI(process.env.LLM_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// 1. Existing Companies Dropdown Options
router.get('/companies', async (req, res) => {
    const supabase = req.app.locals.supabase;
    try {
        const { data, error } = await supabase.from('call_details').select('company');
        if (error) throw error;
        
        const uniqueCompanies = [...new Set(
            data.map(r => r.company ? r.company.replace('(fictional)', '').trim() : '')
        )].filter(Boolean);

        res.status(200).json({ success: true, companies: uniqueCompanies });
    } catch (err) {
        console.error('Error fetching simulator companies:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. Roles given selected company_name
router.get('/roles', async (req, res) => {
    const supabase = req.app.locals.supabase;
    const { company_name } = req.query;
    try {
        const { data, error } = await supabase.from('call_details').select('prospect_role, company');
        if (error) throw error;

        const roles = [...new Set(
            data
                .filter(r => r.company && r.company.replace('(fictional)', '').trim() === company_name)
                .map(r => r.prospect_role)
        )].filter(Boolean);

        res.status(200).json({ success: true, roles });
    } catch (err) {
        console.error('Error fetching simulator roles:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. Company Kind given company_name & prospect_role
router.get('/company-kind', async (req, res) => {
    const supabase = req.app.locals.supabase;
    const { company_name, prospect_role } = req.query;
    try {
        const { data, error } = await supabase.from('call_details').select('company_kind, company, prospect_role');
        if (error) throw error;

        const matched = data.find(r => 
            r.company && r.company.replace('(fictional)', '').trim() === company_name &&
            r.prospect_role === prospect_role
        );

        res.status(200).json({ success: true, company_kind: matched ? matched.company_kind : '' });
    } catch (err) {
        console.error('Error fetching company kind:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 4. Build Context & Fetch Transcript History for Prompt
router.post('/context', async (req, res) => {
    const supabase = req.app.locals.supabase;
    const { isExisting, company_name, prospect_role, company_kind, moodValue, callerNotes } = req.body;

    const moodMap = {
        '1': 'highly hesitant to a conversation',
        '2': 'cautious and slightly reluctant',
        '3': 'neutral and open to listening',
        '4': 'receptive and curious',
        '5': 'highly receptive and enthusiastic'
    };
    const moodText = moodMap[String(moodValue)] || 'neutral';
    let historyJsonString = '{}';

    try {
        if (isExisting) {
            const { data: callDetails } = await supabase
                .from('call_details')
                .select('id, caller, company, company_kind, prospect_role')
                .eq('company_kind', company_kind)
                .eq('prospect_role', prospect_role);

            const filteredCalls = (callDetails || []).filter(c => c.company && c.company.replace('(fictional)', '').trim() === company_name);
            const callIds = filteredCalls.map(c => c.id);

            if (callIds.length > 0) {
                const { data: turns } = await supabase
                    .from('transcript_details_translated')
                    .select('call_details_id, turn_count, turn_speaker, turn_content, translated_content')
                    .in('call_details_id', callIds)
                    .order('turn_count', { ascending: true });

                const grouped = {};
                filteredCalls.forEach(c => {
                    const callerName = c.caller ? c.caller.split(',')[0].trim() : 'Caller';
                    const callTurns = (turns || []).filter(t => t.call_details_id === c.id);
                    
                    const callTurnObj = {};
                    callTurns.forEach(t => {
                        const speakerKey = t.turn_speaker === 'P' ? 'You' : `${callerName},From Meridian`;
                        callTurnObj[`call_turn_${t.turn_count}`] = {
                            [speakerKey]: t.translated_content || t.turn_content
                        };
                    });
                    grouped[c.id] = callTurnObj;
                });

                historyJsonString = JSON.stringify(grouped, null, 2);
            }
        }

        let systemPrompt = '';
        if (isExisting) {
            systemPrompt = `You are a prospect, who is the ${prospect_role} for the company ${company_name} which is a ${company_kind}. You will be talking to a caller from Meridian Growth Partners, who are a Growth Consultancy and Analytics firm which help indian manufacturers realise their true potential.

Your previous conversations with them are as follows -
${historyJsonString}

Learn from these conversations, maintain a mood which is ${moodText} and have a conversation with the caller from Meridian.

These are some additional information from the caller's perspective which contains the objective that he wants to achieve from this conversation and also some additional notes regarding your previous conversation or your behaviour in general. You Must consider these.

Here are the caller Notes - "${callerNotes || 'None provided'}"

You should converse only in English.

You can choose to end the conversation whenever depending on your assigned mood or if you feel that the caller is unable to engage you and when you receive a message from the caller that says "END", when the conversation ends either by you or by the caller immediately provide a report to caller with regards to how the conversation went and what the caller could have done to improve the call to meet his objective and general pointers for any future conversations with this particular prospect.`;
        } else {
            systemPrompt = `You are a prospect, who is the ${prospect_role} for the company ${company_name} which is a ${company_kind}. You will be talking to a caller from Meridian Growth Partners, who are a Growth Consultancy and Analytics firm which help indian manufacturers realise their true potential. This will be your first time talking to them, so you do not know anything about them.

Maintain a mood which is ${moodText} and have a conversation with the caller from Meridian.

These are some additional information from the caller's perspective which contains the objective that he wants to achieve from this conversation and also some additional notes regarding your previous conversation or your behaviour in general. You Must consider these.

Here are the caller Notes - "${callerNotes}"

You should converse only in English.

You can choose to end the conversation whenever depending on your assigned mood or if you feel that the caller is unable to engage you and when you receive a message from the caller that says "END", when the conversation ends either by you or by the caller immediately provide a report to caller with regards to how the conversation went and what the caller could have done to improve the call to meet his objective and general pointers for any future conversations with this particular prospect.`;
        }

        res.status(200).json({ success: true, systemPrompt });
    } catch (err) {
        console.error('Error constructing simulator context:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 5. Chat Interaction Endpoint
router.post('/chat', async (req, res) => {
    const { systemPrompt, chatHistory, userMessage } = req.body;

    try {
        if (!process.env.LLM_KEY) {
            throw new Error("LLM_KEY environment variable is missing on the server.");
        }

        let fullConversation = `${systemPrompt}\n\n--- LIVE CONVERSATION START ---\n`;
        
        (chatHistory || []).forEach(turn => {
            const speaker = turn.sender === 'user' ? 'Caller' : 'Prospect';
            fullConversation += `${speaker}: ${turn.text}\n`;
        });

        fullConversation += `Caller: ${userMessage}\nProspect:`;

        const result = await model.generateContent(fullConversation);
        const responseText = result.response.text();

        res.status(200).json({ success: true, reply: responseText.trim() });
    } catch (err) {
        console.error('Gemini API execution error:', err.message || err);
        res.status(500).json({ success: false, error: err.message || 'Failed to generate response from Gemini.' });
    }
});

module.exports = router;
