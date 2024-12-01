const { OpenAI } = require('openai');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
        'Access-Control-Allow-Origin': 'https://teamtorchapp.netlify.app',
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
        'Access-Control-Allow-Origin': 'https://teamtorchapp.netlify.app',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ 
        error: 'Failed to upload handbook',
        details: error.message 
      })
    };
  }
};
