import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateVideoFromPrompt, generateVideoFromImage, pollVideoOperation, fetchVideo } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import { VideoAspectRatio } from '../types';
import { VeoOperation } from '@google/genai';
import { LoadingSpinner } from './icons/LoadingSpinner';
import { useApiKey } from '../hooks/useApiKey';
import { VideoIcon } from './icons/VideoIcon';

type VideoTab = 'prompt-to-video' | 'image-to-video';

const LOADING_MESSAGES = [
    "Summoning digital actors...",
    "Choreographing pixel movements...",
    "Rendering cinematic brilliance...",
    "AI is directing the scene...",
    "This can take a few minutes, please wait...",
];

const VideoStudioView: React.FC = () => {
    const { hasApiKey, isChecking, selectApiKey, resetApiKey } = useApiKey();
    const [activeTab, setActiveTab] = useState<VideoTab>('prompt-to-video');
    const [prompt, setPrompt] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
    const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);

    const poller = useRef<number | null>(null);

    useEffect(() => {
        if (isLoading) {
            const intervalId = setInterval(() => {
                setLoadingMessage(prev => {
                    const currentIndex = LOADING_MESSAGES.indexOf(prev);
                    return LOADING_MESSAGES[(currentIndex + 1) % LOADING_MESSAGES.length];
                });
            }, 3000);
            return () => clearInterval(intervalId);
        }
    }, [isLoading]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const startPolling = useCallback((operation: VeoOperation) => {
        poller.current = window.setInterval(async () => {
            try {
                const updatedOp = await pollVideoOperation(operation);
                if (updatedOp.done) {
                    if (poller.current) clearInterval(poller.current);
                    setIsLoading(false);
                    const videoUri = updatedOp.response?.generatedVideos?.[0]?.video?.uri;
                    if (videoUri) {
                        const videoBlob = await fetchVideo(videoUri);
                        setVideoUrl(URL.createObjectURL(videoBlob));
                    } else {
                        setError("Video generation finished, but no video was returned.");
                    }
                }
            } catch (err) {
                if (poller.current) clearInterval(poller.current);
                setIsLoading(false);
                setError(err instanceof Error ? err.message : "Polling failed");
            }
        }, 10000);
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!prompt.trim() || isLoading) return;
        if (activeTab === 'image-to-video' && !imageFile) {
            setError('Please upload an image to animate.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setVideoUrl(null);
        
        try {
            let initialOperation: VeoOperation;
            if (activeTab === 'prompt-to-video') {
                initialOperation = await generateVideoFromPrompt(prompt, aspectRatio);
            } else if (imageFile) {
                const imageBase64 = await fileToBase64(imageFile);
                initialOperation = await generateVideoFromImage(prompt, imageBase64, imageFile.type, aspectRatio);
            } else {
                throw new Error("Missing image for image-to-video generation.");
            }
            startPolling(initialOperation);
        } catch (err) {
            setIsLoading(false);
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(`Failed to start video generation: ${errorMessage}`);
            if (errorMessage.includes("Requested entity was not found")) {
              resetApiKey();
            }
        }
    }, [prompt, imageFile, activeTab, isLoading, aspectRatio, startPolling, resetApiKey]);

    if (isChecking) {
        return <div className="flex items-center justify-center h-full"><LoadingSpinner /> <span className="ml-2">Checking API Key...</span></div>;
    }

    if (!hasApiKey) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-gray-800/50 rounded-lg border border-gray-700">
                <h2 className="text-2xl font-bold mb-4">API Key Required for Veo</h2>
                <p className="mb-6 text-gray-400">Video generation requires a user-selected API key. Please enable billing for your project.</p>
                <button onClick={selectApiKey} className="px-6 py-3 bg-purple-600 font-semibold rounded-lg hover:bg-purple-700 transition-colors">Select API Key</button>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="mt-4 text-sm text-blue-400 hover:underline">
                    Learn more about billing
                </a>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            <div className="flex flex-col gap-6 p-6 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="flex gap-2">
                    <button onClick={() => setActiveTab('prompt-to-video')} className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'prompt-to-video' ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Prompt to Video</button>
                    <button onClick={() => setActiveTab('image-to-video')} className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'image-to-video' ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Image to Video</button>
                </div>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A cinematic shot of a raccoon riding a skateboard at sunset..."
                    className="w-full h-32 p-3 bg-gray-700 border border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    disabled={isLoading}
                />
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
                    <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as VideoAspectRatio)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none" disabled={isLoading}>
                        <option value="16:9">16:9 (Landscape)</option>
                        <option value="9:16">9:16 (Portrait)</option>
                    </select>
                </div>
                {activeTab === 'image-to-video' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Upload Starting Image</label>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" disabled={isLoading}/>
                    </div>
                )}
                <button onClick={handleSubmit} disabled={isLoading || !prompt.trim()} className="w-full py-3 bg-purple-600 font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors">
                    {isLoading ? 'Generating...' : 'Generate Video'}
                </button>
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>
            <div className="flex flex-col items-center justify-center p-6 bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
                {isLoading ? (
                    <div className="text-center">
                        <LoadingSpinner size="lg" />
                        <p className="mt-4 text-lg font-medium">{loadingMessage}</p>
                    </div>
                ) : videoUrl ? (
                    <video src={videoUrl} controls autoPlay loop className="max-w-full max-h-full rounded-lg" />
                ) : imagePreview && activeTab === 'image-to-video' ? (
                    <img src={imagePreview} alt="Preview" className="max-w-full max-h-full rounded-lg object-contain" />
                ) : (
                    <div className="text-center text-gray-500">
                        <VideoIcon className="w-16 h-16 mx-auto mb-4" />
                        <p>Your video will appear here</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoStudioView;
