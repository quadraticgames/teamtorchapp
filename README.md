# TeamTorch Employee Handbook Application

A modern, user-friendly application for managing and accessing company employee handbooks. This application makes it easy for organizations to maintain, update, and share their employee handbooks while providing employees with quick access to important company policies and information.

## Features

- 📚 **PDF Document Management**: Upload and manage employee handbook PDFs
- 🔍 **Smart Search**: Quickly find specific policies or information using natural language search
- 💡 **AI-Powered Q&A**: Get instant answers to questions about company policies
- 📱 **Responsive Design**: Access the handbook from any device
- 🔐 **Secure Access**: Role-based authentication and authorization
- 📝 **Version Control**: Track and manage handbook updates

## Tech Stack

### Backend
- Node.js
- Express.js
- OpenAI API for natural language processing
- PDF-parse for document handling

### Frontend
- React
- TypeScript
- Modern UI components
- Responsive design principles

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/quadraticgames/teamtorch.git
cd teamtorch
```

2. Install backend dependencies:
```bash
cd employee-handbook-app/backend
npm install
```

3. Set up environment variables:
   - Create a `.env` file in the backend directory
   - Add your OpenAI API key:
```
PORT=3001
OPENAI_API_KEY=your_api_key_here
```

4. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

5. Start the development servers:
   - Backend: `npm run dev` (from backend directory)
   - Frontend: `npm start` (from frontend directory)

## Usage

1. Upload your employee handbook PDF through the web interface
2. Use the search bar to find specific information
3. Ask questions in natural language to get instant answers
4. Navigate through different sections of the handbook
5. Access version history and track changes

## Contributing

We welcome contributions! Please feel free to submit a Pull Request.

## Security

This application implements several security measures:
- Environment variables for sensitive data
- Secure authentication
- Input validation
- Rate limiting
- CORS protection

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team.

## Roadmap

- [ ] Advanced search filters
- [ ] Document annotation features
- [ ] Multi-language support
- [ ] Mobile application
- [ ] Integration with HR systems
- [ ] Advanced analytics and usage tracking
