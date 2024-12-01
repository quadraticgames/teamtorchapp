import React, { useState } from 'react';

export const HandbookUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file first');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('handbook', file);

    try {
      const response = await fetch('http://localhost:3001/api/upload-handbook', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setMessage(data.message || 'Upload successful');
    } catch (error) {
      setMessage('Error uploading file');
      console.error('Upload error:', error);
    }

    setUploading(false);
    setFile(null);
  };

  return (
    <div className="mb-8 p-4 bg-gray-800 rounded-lg max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4 text-center">Upload Employee Handbook</h2>
      <div className="flex flex-col items-center gap-4">
        <input
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.txt"
          className="block w-full text-sm text-gray-400
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-accent-blue file:text-white
            hover:file:bg-accent-blue/90"
        />
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="primary-button w-full"
        >
          {uploading ? 'Uploading...' : 'Upload Handbook'}
        </button>
        {message && (
          <p className={`text-sm ${
            message.includes('Error') ? 'text-accent-red' : 'text-green-500'
          }`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};
