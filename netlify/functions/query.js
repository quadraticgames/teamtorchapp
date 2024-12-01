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
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': 'https://teamtorchapp.netlify.app',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ error: 'Error processing query: ' + error.message })
    };
  }
};
