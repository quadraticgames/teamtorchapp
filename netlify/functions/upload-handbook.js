const { OpenAI } = require('openai');
const pdfParse = require('pdf-parse');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

let handbookContent = '';
let handbookSections = [];

function splitIntoSections(text) {
  const sections = [];
  let currentSection = { title: 'Introduction', content: '' };
  
  const lines = text.split('\n');
  for (let line of lines) {
    // Your existing section splitting logic here
    currentSection.content += line + '\n';
  }
  
  if (currentSection.content) {
    sections.push(currentSection);
  }
  
  return sections;
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the multipart form data
    const data = JSON.parse(event.body);
    const fileData = Buffer.from(data.file, 'base64');
    
    if (data.mimeType === 'application/pdf') {
      const pdfData = await pdfParse(fileData);
      handbookContent = pdfData.text;
    } else {
      handbookContent = fileData.toString();
    }

    // Process the handbook into sections
    handbookSections = splitIntoSections(handbookContent);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://teamtorchapp.netlify.app',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({
        message: 'Handbook uploaded successfully',
        contentLength: handbookContent.length,
        sections: handbookSections.length,
        sectionTitles: handbookSections.map(s => s.title)
      })
    };
  } catch (error) {
    console.error('Error processing handbook:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': 'https://teamtorchapp.netlify.app',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ error: 'Error processing handbook: ' + error.message })
    };
  }
};
