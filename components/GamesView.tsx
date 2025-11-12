
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateText } from '../services/geminiService';
import { LoadingSpinner } from './icons/LoadingSpinner';

const GamesView: React.FC = () => {
  const [gameState, setGameState] = useState<'setup' | 'playing'>('setup');
  const [story, setStory] = useState<string[]>([]);
  const [playerInput, setPlayerInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const storyEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    storyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [story]);

  const handleStartGame = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerInput.trim()) return;

    setIsLoading(true);
    setError(null);
    setStory([]);

    const premise = playerInput;
    setPlayerInput('');
    
    const initialPrompt = `You are an expert dungeon master for a text-based RPG. Create the opening scene for an adventure with the following premise: "${premise}". Describe the setting and present the player with their first choice or challenge. Keep your responses to a few paragraphs.`;

    try {
      const response = await generateText(initialPrompt, true); // Use thinking mode for creativity
      setStory([response.text]);
      setGameState('playing');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to start game: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [playerInput]);
  
  const handlePlayerAction = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerInput.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    
    const action = playerInput;
    const storyHistory = story.join('\n\n---\n\n');
    setPlayerInput('');
    setStory(prev => [...prev, `> ${action}`]);
    
    const prompt = `You are an expert dungeon master continuing a text-based RPG. Here is the story so far:\n\n${storyHistory}\n\nThe player's next action is: "${action}".\n\nDescribe what happens next. Be creative, advance the story, and present a new situation or choice. Keep your responses to a few paragraphs.`;

    try {
      const response = await generateText(prompt, true);
      setStory(prev => [...prev, response.text]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to continue game: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [playerInput, isLoading, story]);

  return (
    <div className="flex flex-col h-full bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-2xl font-bold">AI Dungeon Master</h2>
        <p className="text-sm text-gray-400">Create and play a unique text adventure powered by Gemini.</p>
      </div>
      
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {gameState === 'setup' && !isLoading && (
          <div className="text-center text-gray-400">
            <p>Tell the AI what kind of adventure you want to have.</p>
            <p className="text-sm mt-1">e.g., "A space detective on Mars" or "A fantasy quest to find a lost dragon"</p>
          </div>
        )}
        {story.map((part, index) => (
          <div key={index} className={part.startsWith('>') ? 'text-blue-300 italic pl-4 border-l-2 border-blue-500' : 'text-gray-200 whitespace-pre-wrap'}>
            {part.startsWith('>') ? part.substring(1).trim() : part}
          </div>
        ))}
        {isLoading && <div className="flex justify-center"><LoadingSpinner /></div>}
        <div ref={storyEndRef} />
      </div>

      {error && <div className="p-4 text-red-400 bg-red-900/50 text-sm">{error}</div>}

      <div className="p-4 border-t border-gray-700 bg-gray-800">
        <form onSubmit={gameState === 'setup' ? handleStartGame : handlePlayerAction}>
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={playerInput}
              onChange={(e) => setPlayerInput(e.target.value)}
              placeholder={gameState === 'setup' ? "Enter your adventure premise..." : "What do you do next?"}
              className="flex-1 w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !playerInput.trim()} className="px-6 py-2 bg-purple-600 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors">
              {gameState === 'setup' ? 'Start' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GamesView;
