const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  try {
    // Construct the path to the handbook PDF
    const handbookPath = path.join(process.cwd(), 'public', 'handbook.pdf');
    
    // Read the file
    const handbook = fs.readFileSync(handbookPath);
    
    // Return the PDF as a base64 encoded response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename=handbook.pdf'
      },
      body: handbook.toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Error serving handbook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to serve handbook' })
    };
  }
};
