const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const axios = require('axios');
const fs = require('fs');

const apiKey = process.env.ELEVENLABS_API_KEY;

async function listAllUserVoices() {
  try {
    const resp = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey }
    });
    
    console.log('=== TOTAL VOICES AVAILABLE IN ACCOUNT:', resp.data.voices.length, '===');
    const summary = resp.data.voices.map(v => ({
      voice_id: v.voice_id,
      name: v.name,
      category: v.category,
      labels: v.labels,
      preview_url: v.preview_url
    }));
    
    fs.writeFileSync(path.join(__dirname, 'available_voices.json'), JSON.stringify(summary, null, 2));
    
    summary.forEach(v => {
      console.log(`ID: ${v.voice_id} | Name: ${v.name} | Category: ${v.category} | Accent/Gender: ${v.labels?.accent || ''} ${v.labels?.gender || ''} ${v.labels?.age || ''} ${v.labels?.description || ''}`);
    });
  } catch (err) {
    console.error('Error fetching voices:', err.response?.data || err.message);
  }
}

listAllUserVoices();
