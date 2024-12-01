require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { OpenAI } = require('openai');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();

// Configure multer to handle larger files
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://teamtorchapp.netlify.app'
    : 'http://localhost:3000'
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Store handbook content in memory
let handbookContent = '';
let handbookSections = [];
let isDefaultHandbook = true;

// Store feedback in memory (in production, this would go to a database)
let feedbackData = [];

// Load default handbook on startup
async function loadDefaultHandbook() {
  try {
    const defaultHandbookPath = path.join(__dirname, '../public/handbook.pdf');
    if (fs.existsSync(defaultHandbookPath)) {
      console.log('Loading default handbook...');
      const dataBuffer = fs.readFileSync(defaultHandbookPath);
      const pdfData = await pdfParse(dataBuffer);
      handbookContent = pdfData.text;
      handbookSections = splitIntoSections(handbookContent);
      console.log(`Default handbook loaded with ${handbookSections.length} sections`);
    }
  } catch (error) {
    console.error('Error loading default handbook:', error);
  }
}

// Call loadDefaultHandbook when server starts
loadDefaultHandbook();

function splitIntoSections(text) {
  // Split the text into sections based on common header patterns
  const sections = [];
  let currentSection = { title: 'Introduction', content: '' };
  
  const lines = text.split('\n');
  for (let line of lines) {
    const trimmedLine = line.trim();
    // Skip empty lines at the start of sections
    if (!currentSection.content && !trimmedLine) continue;

    // Check if line looks like a header
    if (
      (trimmedLine.length > 0 && trimmedLine.toUpperCase() === trimmedLine && trimmedLine.length > 10) || // All caps lines
      /^[A-Z][\w\s-]+:/.test(trimmedLine) || // Title followed by colon
      /^(?:SECTION|ARTICLE|CHAPTER|\d+\.)\s+[A-Z]/i.test(trimmedLine) // Common header patterns
    ) {
      // If we have content in the current section, save it
      if (currentSection.content.trim()) {
        sections.push({ ...currentSection });
      }
      currentSection = {
        title: trimmedLine,
        content: ''
      };
    } else {
      // Add line to current section if it's not empty
      if (trimmedLine) {
        currentSection.content += line + '\n';
      }
    }
  }
  
  // Add the last section
  if (currentSection.content.trim()) {
    sections.push(currentSection);
  }
  
  return sections;
}

// Upload handbook endpoint
app.post('/api/upload-handbook', upload.single('handbook'), async (req, res) => {
  try {
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File received:', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    const dataBuffer = fs.readFileSync(req.file.path);
    
    if (req.file.mimetype === 'application/pdf') {
      console.log('Processing PDF file...');
      const pdfData = await pdfParse(dataBuffer);
      handbookContent = pdfData.text;
    } else {
      console.log('Processing text file...');
      handbookContent = dataBuffer.toString();
    }

    // Process the handbook into sections
    handbookSections = splitIntoSections(handbookContent);
    
    console.log('Handbook processed:');
    console.log('Total content length:', handbookContent.length);
    console.log('Number of sections:', handbookSections.length);
    console.log('Sections:', handbookSections.map(s => s.title));

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    isDefaultHandbook = false;

    res.json({ 
      message: 'Handbook uploaded successfully', 
      contentLength: handbookContent.length,
      sections: handbookSections.length,
      sectionTitles: handbookSections.map(s => s.title),
      isDefaultHandbook: false
    });
  } catch (error) {
    console.error('Error processing handbook:', error);
    res.status(500).json({ error: 'Error processing handbook: ' + error.message });
  }
});

// Query endpoint
app.post('/api/query', async (req, res) => {
  try {
    const { question } = req.body;
    console.log('Received question:', question);

    if (!handbookContent || handbookSections.length === 0) {
      console.log('No handbook content available');
      return res.status(400).json({ error: 'No handbook content available. Please upload a handbook first.' });
    }

    // First, let's find the most relevant sections for this query
    const relevantSections = await findRelevantSections(question);
    
    if (relevantSections.length === 0) {
      console.log('No relevant sections found for query');
      return res.json({ 
        answer: "I couldn't find any relevant information in the handbook for your question. Please try rephrasing your question or ask about a different topic.",
        usedSections: []
      });
    }

    // Combine relevant sections into context
    const context = relevantSections.map(section => 
      `### ${section.title} ###\n${section.content}`
    ).join('\n\n');

    console.log('Using sections:', relevantSections.map(s => s.title));

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are Sophia 👩‍🦰 from the HR team.
                   Key guidelines:
                   1. First message only: "Hello, it's Sophia 👩‍🦰 from the HR team!"
                   2. All other messages: Direct answers with friendly tone
                   3. Share information confidently
                   4. End each response with one of these phrases (vary them naturally):
                      - "What would you like to talk about next?"
                      - "What other topics can I help you explore?"
                      - "Curious about anything else?"
                      - "What other questions do you have?"
                      - "Would you like to learn about something else?"
                      - "What other aspects of our policies interest you?"
                      - "Feel free to ask about any other topics!"

                   Current handbook context:
                   ${context}`
        },
        {
          role: "user",
          content: question
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    console.log('OpenAI response received');
    res.json({ 
      answer: response.choices[0].message.content,
      usedSections: relevantSections.map(s => s.title)
    });
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ error: 'Error processing query: ' + error.message });
  }
});

// Topic mapping for better section matching
const topicKeywords = {
  'reporting issues': ['grievance', 'complaint', 'report', 'issue', 'concern', 'problem', 'misconduct', 'violation', 'harassment', 'discrimination', 'safety', 'ethics'],
  'leave': ['vacation', 'sick', 'pto', 'time off', 'holiday', 'leave', 'absence'],
  'benefits': ['health', 'insurance', 'retirement', 'medical', 'dental', 'vision', '401k', 'pension', 'perks', 'wellness', 'gym', 'fitness', 'mental health', 'wellbeing', 'programs', 'benefits'],
  'conduct': ['behavior', 'conduct', 'discipline', 'policy', 'standard', 'rule', 'guideline', 'expectation'],
  'safety': ['safety', 'security', 'emergency', 'hazard', 'incident', 'accident', 'injury', 'health'],
  'wellness': ['wellness', 'mental health', 'gym', 'fitness', 'health', 'wellbeing', 'work-life', 'balance', 'programs', 'resources', 'memberships']
};

async function findRelevantSections(question) {
  try {
    // Use GPT to identify key terms and topics from the question
    const keyTermsResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Extract key terms, topics, and synonyms from this question. Focus on policy-related words and topics. Return them as a comma-separated list. Include both specific terms and related concepts."
        },
        {
          role: "user",
          content: question
        }
      ],
      temperature: 0.3,
      max_tokens: 100
    });

    const keyTerms = keyTermsResponse.choices[0].message.content.toLowerCase().split(',').map(term => term.trim());
    console.log('Extracted key terms:', keyTerms);

    // Find relevant topic keywords
    const relevantTopics = Object.entries(topicKeywords)
      .filter(([topic, keywords]) => 
        keyTerms.some(term => keywords.some(keyword => 
          term.includes(keyword) || keyword.includes(term)
        ))
      )
      .flatMap(([_, keywords]) => keywords);

    const allSearchTerms = [...new Set([...keyTerms, ...relevantTopics])];
    console.log('Search terms including topic keywords:', allSearchTerms);

    // Score each section based on multiple factors
    const scoredSections = handbookSections.map(section => {
      const sectionText = (section.title + ' ' + section.content).toLowerCase();
      const score = allSearchTerms.reduce((acc, term) => {
        // Title match is worth more
        const titleScore = section.title.toLowerCase().includes(term) ? 3 : 0;
        
        // Exact content match
        const exactMatch = sectionText.includes(term) ? 2 : 0;
        
        // Partial content match with word boundaries
        const partialMatch = allSearchTerms.some(t => 
          new RegExp(`\\b${t}\\b`).test(sectionText) ||
          new RegExp(`\\b${term}\\b`).test(t)
        ) ? 1 : 0;
        
        return acc + titleScore + exactMatch + partialMatch;
      }, 0);

      // Boost score for sections that are likely to contain policy information
      const isPolicySection = /policy|procedure|guideline|standard|requirement/i.test(sectionText);
      const finalScore = isPolicySection ? score * 1.5 : score;

      return { ...section, score: finalScore };
    });

    console.log('Section scores:', scoredSections.map(s => ({
      title: s.title,
      score: s.score
    })));

    // Sort by score and take the top 3 most relevant sections with non-zero scores
    const relevantSections = scoredSections
      .sort((a, b) => b.score - a.score)
      .filter(section => section.score > 0)
      .slice(0, 3);

    // If we found relevant sections, also include their adjacent sections
    if (relevantSections.length > 0) {
      const mainSectionIndex = handbookSections.findIndex(s => s.title === relevantSections[0].title);
      if (mainSectionIndex > 0) {
        const prevSection = handbookSections[mainSectionIndex - 1];
        if (!relevantSections.find(s => s.title === prevSection.title)) {
          relevantSections.push(prevSection);
        }
      }
      if (mainSectionIndex < handbookSections.length - 1) {
        const nextSection = handbookSections[mainSectionIndex + 1];
        if (!relevantSections.find(s => s.title === nextSection.title)) {
          relevantSections.push(nextSection);
        }
      }
    }

    return relevantSections;
  } catch (error) {
    console.error('Error finding relevant sections:', error);
    // If there's an error, return first few sections as fallback
    return handbookSections.slice(0, 3);
  }
}

// Feedback endpoint
app.post('/api/feedback', (req, res) => {
  const { messageId, feedback, question, answer } = req.body;
  
  feedbackData.push({
    messageId,
    feedback,
    question,
    answer,
    timestamp: new Date(),
    sections: req.body.sections || []
  });

  // Log feedback for analysis
  console.log(`Feedback received - ${feedback} for message ${messageId}`);
  console.log(`Question: ${question}`);
  console.log(`Sections referenced: ${req.body.sections?.join(', ') || 'none'}`);

  res.json({ success: true });
});

// Get feedback statistics
app.get('/api/feedback/stats', (req, res) => {
  const stats = {
    total: feedbackData.length,
    helpful: feedbackData.filter(f => f.feedback === 'helpful').length,
    notHelpful: feedbackData.filter(f => f.feedback === 'not_helpful').length,
    mostHelpfulSections: getMostHelpfulSections(feedbackData)
  };
  
  res.json(stats);
});

function getMostHelpfulSections(feedback) {
  const sectionStats = {};
  
  feedback.forEach(f => {
    if (f.feedback === 'helpful' && f.sections) {
      f.sections.forEach(section => {
        sectionStats[section] = (sectionStats[section] || 0) + 1;
      });
    }
  });
  
  return Object.entries(sectionStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([section, count]) => ({ section, count }));
}

// Get handbook status endpoint
app.get('/api/handbook-status', (req, res) => {
  res.json({
    hasHandbook: !!handbookContent && handbookSections.length > 0,
    sections: handbookSections.length,
    sectionTitles: handbookSections.map(s => s.title),
    isDefaultHandbook: isDefaultHandbook
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Create uploads directory if it doesn't exist
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
  }
});
