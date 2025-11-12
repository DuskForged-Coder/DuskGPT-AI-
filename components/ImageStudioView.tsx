import React, { useState, useCallback } from 'react';
import { generateImage, editImage, analyzeImage } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import { ImageAspectRatio } from '../types';
import { LoadingSpinner } from './icons/LoadingSpinner';
import { ImageIcon } from './icons/ImageIcon';

type ImageTab = 'generate' | 'edit' | 'analyze';

const ImageStudioView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ImageTab>('generate');
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>('1:1');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setGeneratedContent(null); // Clear previous results
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isLoading) return;
    if ((activeTab === 'edit' || activeTab === 'analyze') && !imageFile) {
      setError('Please upload an image for this action.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setGeneratedContent(null);

    try {
      let result: string;
      if (activeTab === 'generate') {
        const base64Bytes = await generateImage(prompt, aspectRatio);
        result = `data:image/png;base64,${base64Bytes}`;
      } else if (imageFile) {
        const imageBase64 = await fileToBase64(imageFile);
        if (activeTab === 'edit') {
            const base64Bytes = await editImage(prompt, imageBase64, imageFile.type);
            result = `data:image/png;base64,${base64Bytes}`;
        } else { // analyze
            const response = await analyzeImage(prompt, imageBase64, imageFile.type);
            result = response.text;
        }
      } else {
          throw new Error("Missing image for edit/analyze operation.");
      }
      setGeneratedContent(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to process request: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, imageFile, activeTab, isLoading, aspectRatio]);

  const TabButton: React.FC<{ tab: ImageTab, label: string }> = ({ tab, label }) => (
    <button
      onClick={() => {
        setActiveTab(tab);
        setGeneratedContent(null);
        setError(null);
      }}
      className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === tab ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      {/* Controls Panel */}
      <div className="flex flex-col gap-6 p-6 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="flex gap-2">
          <TabButton tab="generate" label="Generate" />
          <TabButton tab="edit" label="Edit" />
          <TabButton tab="analyze" label="Analyze" />
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            activeTab === 'generate' ? "A hyper-realistic photo of a cat wearing a tiny wizard hat..." :
            activeTab === 'edit' ? "Add a retro filter to the image..." :
            "What kind of dog is this? How old do you think it is?"
          }
          className="w-full h-32 p-3 bg-gray-700 border border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:outline-none"
          disabled={isLoading}
        />

        {activeTab === 'generate' && (
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
                <select 
                    value={aspectRatio} 
                    onChange={(e) => setAspectRatio(e.target.value as ImageAspectRatio)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    disabled={isLoading}
                >
                    <option value="1:1">1:1 (Square)</option>
                    <option value="16:9">16:9 (Widescreen)</option>
                    <option value="9:16">9:16 (Portrait)</option>
                    <option value="4:3">4:3 (Standard)</option>
                    <option value="3:4">3:4 (Tall)</option>
                </select>
            </div>
        )}

        {(activeTab === 'edit' || activeTab === 'analyze') && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Upload Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              disabled={isLoading}
            />
          </div>
        )}
        
        <button
          onClick={handleSubmit}
          disabled={isLoading || !prompt.trim() || ((activeTab === 'edit' || activeTab === 'analyze') && !imageFile)}
          className="w-full py-3 bg-purple-600 font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? <LoadingSpinner /> : 'Process'}
        </button>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      {/* Output Panel */}
      <div className="flex flex-col items-center justify-center p-6 bg-gray-800/50 rounded-lg border border-gray-700 overflow-auto">
        {isLoading && <LoadingSpinner size="lg" />}
        {!isLoading && !generatedContent && (activeTab === 'edit' || activeTab === 'analyze') && imagePreview && (
          <img src={imagePreview} alt="Preview" className="max-w-full max-h-full rounded-lg object-contain" />
        )}
        {!isLoading && generatedContent && (activeTab === 'generate' || activeTab === 'edit') && (
            <img src={generatedContent} alt="Generated" className="max-w-full max-h-full rounded-lg object-contain" />
        )}
        {!isLoading && generatedContent && activeTab === 'analyze' && (
            <div className="text-left whitespace-pre-wrap p-4 bg-gray-700 rounded-lg w-full h-full overflow-y-auto">
                {generatedContent}
            </div>
        )}
        {!isLoading && !generatedContent && !imagePreview && (
          <div className="text-center text-gray-500">
            <ImageIcon className="w-16 h-16 mx-auto mb-4" />
            <p>Your masterpiece awaits</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageStudioView;
