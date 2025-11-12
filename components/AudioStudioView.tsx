import React, { useState, useCallback, useRef } from 'react';
import { generateSpeech } from '../services/geminiService';
import { LoadingSpinner } from './icons/LoadingSpinner';
import { AudioIcon } from './icons/AudioIcon';

// Decode base64 string to Uint8Array
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Fix: Helper to create a WAV blob from raw PCM data to make it playable.
const createWavBlob = (pcmData: Uint8Array, sampleRate: number, numChannels: number): Blob => {
    const pcmLength = pcmData.byteLength;
    const headerLength = 44;
    const buffer = new ArrayBuffer(headerLength + pcmLength);
    const view = new DataView(buffer);
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;

    // RIFF identifier
    view.setUint32(0, 0x52494646, false); // "RIFF"
    // file length
    view.setUint32(4, 36 + pcmLength, true);
    // WAVE identifier
    view.setUint32(8, 0x57415645, false); // "WAVE"
    // fmt chunk identifier
    view.setUint32(12, 0x666d7420, false); // "fmt "
    // chunk length
    view.setUint32(16, 16, true);
    // audio format (1 for PCM)
    view.setUint16(20, 1, true);
    // number of channels
    view.setUint16(22, numChannels, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate
    view.setUint32(28, byteRate, true);
    // block align
    view.setUint16(32, blockAlign, true);
    // bits per sample
    view.setUint16(34, bitsPerSample, true);
    // data chunk identifier
    view.setUint32(36, 0x64617461, false); // "data"
    // data chunk length
    view.setUint32(40, pcmLength, true);

    // Write PCM data
    new Uint8Array(buffer, headerLength).set(pcmData);

    return new Blob([buffer], { type: 'audio/wav' });
};

const AudioStudioView: React.FC = () => {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleSubmit = useCallback(async () => {
    if (!text.trim() || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    setAudioUrl(null);

    try {
      const base64Audio = await generateSpeech(text);
      const audioBytes = decode(base64Audio);
      // Fix: The audio bytes are raw PCM data. Wrap them in a WAV header.
      // The sample rate for TTS is 24000 Hz, and it's mono (1 channel).
      const blob = createWavBlob(audioBytes, 24000, 1);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to generate speech: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [text, isLoading]);

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 p-6 bg-gray-800/50 rounded-lg border border-gray-700 h-full">
      <h2 className="text-2xl font-bold text-center">Audio Studio</h2>
      <p className="text-center text-gray-400">Convert text into natural-sounding speech with Gemini.</p>
      
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text to generate speech..."
        className="w-full h-40 p-3 bg-gray-700 border border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:outline-none"
        disabled={isLoading}
      />
      
      <button
        onClick={handleSubmit}
        disabled={isLoading || !text.trim()}
        className="w-full py-3 bg-purple-600 font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? <LoadingSpinner /> : 'Generate Speech'}
      </button>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex-grow flex items-center justify-center">
        {audioUrl ? (
          <audio ref={audioRef} src={audioUrl} controls autoPlay className="w-full" />
        ) : !isLoading && (
          <div className="text-center text-gray-500">
            <AudioIcon className="w-16 h-16 mx-auto mb-4" />
            <p>Generated audio will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioStudioView;
