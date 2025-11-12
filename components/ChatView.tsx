
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage, GroundingSource } from '../types';
import { generateText, generateTextWithMaps } from '../services/geminiService';
import { LoadingSpinner } from './icons/LoadingSpinner';
import { SparklesIcon } from './icons/SparklesIcon';
import { MapPinIcon } from './icons/MapPinIcon';

const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useThinkingMode, setUseThinkingMode] = useState(false);
  const [useMaps, setUseMaps] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
        let response;
        if (useMaps) {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            response = await generateTextWithMaps(input, position.coords.latitude, position.coords.longitude);
        } else {
            response = await generateText(input, useThinkingMode);
        }

        const modelText = response.text;
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
            ?.map((chunk: any) => chunk.maps ? { uri: chunk.maps.uri, title: chunk.maps.title } : null)
            .filter((source: GroundingSource | null): source is GroundingSource => source !== null) ?? [];

        const modelMessage: ChatMessage = { role: 'model', text: modelText, sources };
        setMessages((prev) => [...prev, modelMessage]);

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to get response: ${errorMessage}`);
      setMessages((prev) => [...prev, { role: 'model', text: `Sorry, I ran into an error: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, useThinkingMode, useMaps]);

  return (
    <div className="flex flex-col h-full bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700">
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0"><SparklesIcon className="w-5 h-5 text-white" /></div>}
            <div className={`max-w-xl p-4 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-4 border-t border-gray-600 pt-3">
                  <h4 className="text-xs font-semibold text-gray-400 mb-2">Sources:</h4>
                  <ul className="space-y-1">
                    {msg.sources.map((source, i) => (
                      <li key={i}>
                        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm break-all">
                          {source.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex justify-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0"><SparklesIcon className="w-5 h-5 text-white" /></div>
                <div className="max-w-xl p-4 rounded-2xl bg-gray-700 text-gray-200 rounded-bl-none flex items-center">
                    <LoadingSpinner />
                    <span className="ml-2">Thinking...</span>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {error && <div className="p-4 text-red-400 bg-red-900/50 text-sm">{error}</div>}
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-300">
                    <input type="checkbox" checked={useThinkingMode} onChange={(e) => setUseThinkingMode(e.target.checked)} className="form-checkbox h-4 w-4 rounded bg-gray-600 border-gray-500 text-purple-500 focus:ring-purple-500"/>
                    <SparklesIcon className="w-5 h-5 text-purple-400" />
                    <span>Thinking Mode (Pro)</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-300">
                    <input type="checkbox" checked={useMaps} onChange={(e) => setUseMaps(e.target.checked)} className="form-checkbox h-4 w-4 rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-500"/>
                    <MapPinIcon className="w-5 h-5 text-blue-400" />
                    <span>Use Google Maps</span>
                </label>
            </div>
            <div className="flex items-center gap-4">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask anything..."
                    className="flex-1 w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading || !input.trim()} className="px-6 py-2 bg-purple-600 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors">
                    Send
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default ChatView;
