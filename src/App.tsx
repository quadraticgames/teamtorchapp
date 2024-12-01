import React, { useState } from 'react';
import { ChatInterface } from './components/ChatInterface';

function App() {
  // Developer Note: Set isAdmin to 'true' to enable Admin mode and upload custom handbooks
  const [isAdmin, setIsAdmin] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleHandbookUploaded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-accent-blue">Employee Handbook Assistant</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm">Admin Mode</span>
          <button
            onClick={() => setIsAdmin(!isAdmin)}
            className={`px-3 py-1 rounded-md transition-colors ${
              isAdmin 
                ? 'bg-accent-blue text-white' 
                : 'bg-gray-700 text-gray-300'
            }`}
            title="Enable Admin mode to upload custom handbooks"
          >
            {isAdmin ? 'On' : 'Off'}
          </button>
        </div>
      </header>
      <main className="container mx-auto p-4">
        <ChatInterface 
          key={refreshKey} 
          isAdmin={isAdmin} 
          onHandbookUploaded={handleHandbookUploaded} 
        />
      </main>
    </div>
  );
}

export default App;
