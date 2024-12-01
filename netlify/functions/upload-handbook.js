const { OpenAI } = require('openai');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

// Remove OpenAI initialization for now
// const openai = process.env.OPENAI_API_KEY 
//   ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) 
//   : null;

function splitIntoSections(text) {
  const sections = [];
  let currentSection = { title: 'Introduction', content: '' };
  
  const lines = text.split('\n');
  for (let line of lines) {
    // Basic section splitting logic
    if (line.trim().toUpperCase() === line.trim() && line.trim().length > 0) {
      // Potential section title
      if (currentSection.content) {
        sections.push(currentSection);
      }
      currentSection = { title: line.trim(), content: '' };
    } else {
      currentSection.content += line + '\n';
    }
  }
  
  if (currentSection.content) {
    sections.push(currentSection);
  }
  
  return sections;
}

exports.handler = async (event, context) => {
  // Log the entire event for debugging
  console.log('Full event object:', JSON.stringify(event, null, 2));

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: ''
    };
  }

  // Only allow POST method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Log the request body for debugging
    console.log('Request body:', event.body);

    // Parse the multipart form data
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'Invalid request body', 
          details: parseError.message,
          rawBody: event.body 
        })
      };
    }

    // Validate file data
    if (!data.file) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'No file provided' })
      };
    }

    const fileData = Buffer.from(data.file, 'base64');
    
    // Save the file to public directory
    const publicDir = path.join(process.cwd(), 'public');
    const handbookPath = path.join(publicDir, 'handbook.pdf');
    
    // Ensure public directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Write the file
    fs.writeFileSync(handbookPath, fileData);

    // Parse the PDF
    const pdfData = await pdfParse(fileData);
    const handbookContent = pdfData.text;

    // Process the handbook into sections
    const handbookSections = splitIntoSections(handbookContent);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({
        message: 'Handbook uploaded successfully',
        sections: handbookSections.length,
        fileSize: fileData.length,
        sectionTitles: handbookSections.map(s => s.title)
      })
    };
  } catch (error) {
    console.error('Error uploading handbook:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ 
        error: 'Failed to upload handbook',
        details: error.message 
      })
    };
  }
};
