import React, { useState, useEffect, useRef } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import axios from 'axios';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
  sections?: string[];
  feedback?: 'helpful' | 'not_helpful';
}

interface HandbookStatus {
  hasHandbook: boolean;
  sections: number;
  sectionTitles: string[];
  isDefaultHandbook: boolean;
}

interface Props {
  isAdmin: boolean;
  onHandbookUploaded?: () => void;
}

export const ChatInterface: React.FC<Props> = ({ isAdmin, onHandbookUploaded }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handbookStatus, setHandbookStatus] = useState<HandbookStatus | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sampleQuestions = [
    "What is our leave policy?",
    "How do I report workplace issues?",
    "What are our working hours?",
    "What are our benefits?",
  ];

  const handleSampleQuestion = (question: string) => {
    setInputText(question);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    checkHandbookStatus();
  }, []);

  const checkHandbookStatus = async () => {
    try {
      const response = await axios.get('/.netlify/functions/handbook-status');
      setHandbookStatus(response.data);
    } catch (error) {
      console.error('Error checking handbook status:', error);
      setError('Failed to check handbook status');
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/.netlify/functions/query', {
        question: userMessage.text
      });

      const assistantMessage: Message = {
        id: Date.now(),
        text: response.data.answer,
        isUser: false,
        timestamp: new Date(),
        sections: response.data.usedSections
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error querying handbook:', error);
      setError('Failed to get answer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('handbook', file);

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/.netlify/functions/upload-handbook', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Clear chat history and show success message
      setMessages([{
        id: Date.now(),
        text: `Handbook uploaded successfully! Processed ${response.data.sections} sections.`,
        isUser: false,
        timestamp: new Date(),
        sections: response.data.sectionTitles
      }]);

      // Reset file input and update status
      event.target.value = '';
      await checkHandbookStatus();
      onHandbookUploaded?.();

    } catch (error) {
      console.error('Error uploading handbook:', error);
      setError('Failed to upload handbook. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = (index: number, feedback: 'helpful' | 'not_helpful') => {
    setMessages(prevMessages => {
      const newMessages = [...prevMessages];
      newMessages[index] = { ...newMessages[index], feedback };
      return newMessages;
    });
    // TODO: Send feedback to backend for analytics
  };

  const downloadConversation = () => {
    const conversation = messages.map(msg => {
      const speaker = msg.isUser ? 'You ⭐' : 'Sophia 👩‍🦰';
      const time = msg.timestamp.toLocaleTimeString();
      const feedback = msg.feedback ? `[${msg.feedback === 'helpful' ? '👍' : '👎'}]` : '';
      return `${time} - ${speaker}: ${msg.text} ${feedback}`;
    }).join('\n\n');

    const blob = new Blob([conversation], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'conversation.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white p-4">
      <div className="flex-grow overflow-auto mb-4">
        {messages.length === 0 && handbookStatus?.hasHandbook && (
          <div className="text-center text-gray-400 mb-4">
            <p className="text-lg mb-4">👩‍🦰 Hi there! I'm Sophia, your friendly HR assistant.</p>
            <p className="mb-4">I'm here to help you learn about our policies, benefits, and programs. Feel free to ask me anything!</p>
            {handbookStatus.isDefaultHandbook && (
              <p className="text-sm mb-4 text-blue-400">
                Using default employee handbook. {isAdmin && "You can upload a custom handbook below."}
              </p>
            )}
            {isAdmin && (
              <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl mb-6 text-left max-w-xl mx-auto shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">📚</span>
                  <h3 className="text-accent-blue font-semibold">Custom Handbook Guide</h3>
                </div>
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-gray-300 font-medium mb-2">Format Requirements:</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-accent-blue">📄</span>
                        <span className="text-gray-400">PDF format</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-accent-blue">📏</span>
                        <span className="text-gray-400">Under 10MB</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-accent-blue">📑</span>
                        <span className="text-gray-400">Clear headings</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-accent-blue">📋</span>
                        <span className="text-gray-400">Table of contents</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-700 pt-3">
                    <p className="text-gray-400 text-xs italic">
                      💡 Tip: Well-structured content with clear sections helps me provide more accurate responses
                    </p>
                  </div>
                </div>
              </div>
            )}
            <p className="mb-2">Here are some questions you might want to ask:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {sampleQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSampleQuestion(question)}
                  className="px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 rounded-md text-gray-300"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-4 ${message.isUser ? 'text-right' : 'text-left'}`}
          >
            <div
              className={`inline-block max-w-[80%] rounded-lg p-3 ${
                message.isUser
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-white'
              }`}
            >
              {message.isUser && (
                <div className="flex items-center mb-2">
                  <span className="mr-2">⭐</span>
                  <span className="font-medium">You</span>
                </div>
              )}
              {!message.isUser && (
                <div className="flex items-center mb-2">
                  <span className="mr-2">👩‍🦰</span>
                  <span className="font-medium">Sophia</span>
                </div>
              )}
              <div className="whitespace-pre-wrap">{message.text}</div>
              {!message.isUser && (
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    onClick={() => handleFeedback(index, 'helpful')}
                    className={`p-1 rounded ${
                      message.feedback === 'helpful'
                        ? 'text-green-400'
                        : 'text-gray-500 hover:text-gray-400'
                    }`}
                    title="Helpful"
                  >
                    👍
                  </button>
                  <button
                    onClick={() => handleFeedback(index, 'not_helpful')}
                    className={`p-1 rounded ${
                      message.feedback === 'not_helpful'
                        ? 'text-red-400'
                        : 'text-gray-500 hover:text-gray-400'
                    }`}
                    title="Not Helpful"
                  >
                    👎
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-4">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question about our handbook..."
            className="flex-grow p-2 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            className={`p-2 rounded-full ${
              !inputText.trim() || isLoading
                ? 'bg-gray-700 text-gray-500'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            <PaperAirplaneIcon className="h-6 w-6" />
          </button>
          {isAdmin && (
            <div className="flex items-center">
              <label className={`px-4 py-2 rounded-md cursor-pointer ${
                isLoading ? 'bg-gray-700 text-gray-500' : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}>
                Upload Handbook
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="hidden"
                  accept=".pdf,.txt"
                />
              </label>
            </div>
          )}
        </div>
        {error && (
          <div className="mt-2 text-red-500 text-sm">{error}</div>
        )}
        {handbookStatus && (
          <div className="mt-2 text-sm text-gray-400">
            {handbookStatus.hasHandbook 
              ? `Handbook loaded with ${handbookStatus.sections} sections`
              : 'No handbook loaded. Please upload a handbook to begin.'}
          </div>
        )}
        {messages.length > 0 && (
          <div className="flex justify-end mt-2">
            <button
              onClick={downloadConversation}
              className="text-sm text-gray-400 hover:text-accent-blue flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-gray-800/50"
            >
              <span>💾</span> Download Conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
