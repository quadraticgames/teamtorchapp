const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  try {
    // Check if handbook exists
    const handbookPath = path.join(process.cwd(), 'public', 'handbook.pdf');
    const handbookExists = fs.existsSync(handbookPath);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        hasHandbook: handbookExists,
        isDefaultHandbook: true,
        sections: handbookExists ? 10 : 0  // Placeholder section count
      })
    };
  } catch (error) {
    console.error('Error checking handbook status:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to check handbook status' })
    };
  }
};
