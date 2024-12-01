const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { question } = JSON.parse(event.body);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are Sophia 👩‍🦰 from the HR team.
                   Be friendly and professional in your responses.
                   If you don't know something, say so politely.`
        },
        {
          role: "user",
          content: question
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://teamtorchapp.netlify.app',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({
        answer: response.choices[0].message.content,
        usedSections: []
      })
    };
  } catch (error) {
    console.error('Error processing query:', error);
    
    // Handle rate limit errors specifically
    if (error.error?.type === 'rate_limit_exceeded' || error.message?.includes('rate limit')) {
      return {
        statusCode: 429,
        headers: {
          'Access-Control-Allow-Origin': 'https://teamtorchapp.netlify.app',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Retry-After': '3600' // Suggest retry after 1 hour
        },
        body: JSON.stringify({
          error: 'Rate limit exceeded. Please try again in about an hour.',
          details: 'Our AI assistant is currently experiencing high demand. Please wait a while before asking another question.'
        })
      };
    }

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': 'https://teamtorchapp.netlify.app',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({
        error: 'An error occurred while processing your request.',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later.'
      })
    };
  }
};
