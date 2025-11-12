import { GoogleGenAI, GenerateContentResponse, Modality, VeoOperation } from "@google/genai";
import { ImageAspectRatio, VideoAspectRatio } from '../types';

const getAiClient = () => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateText = async (prompt: string, useThinkingMode: boolean): Promise<GenerateContentResponse> => {
    const ai = getAiClient();
    const model = useThinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    const config = useThinkingMode ? { thinkingConfig: { thinkingBudget: 32768 } } : {};
    
    return await ai.models.generateContent({
        model,
        contents: prompt,
        config,
    });
};

export const generateTextWithMaps = async (prompt: string, latitude: number, longitude: number): Promise<GenerateContentResponse> => {
    const ai = getAiClient();
    return await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleMaps: {} }],
            toolConfig: {
                retrievalConfig: {
                    latLng: {
                        latitude,
                        longitude,
                    },
                },
            },
        },
    });
};

export const analyzeImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<GenerateContentResponse> => {
    const ai = getAiClient();
    const imagePart = {
        inlineData: {
            mimeType,
            data: imageBase64,
        },
    };
    const textPart = { text: prompt };

    return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
    });
};

export const generateImage = async (prompt: string, aspectRatio: ImageAspectRatio): Promise<string> => {
    const ai = getAiClient();
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: aspectRatio,
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        return response.generatedImages[0].image.imageBytes;
    }
    throw new Error("Image generation failed.");
};

export const editImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<string> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: imageBase64, mimeType } },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }
    throw new Error("Image editing failed.");
};

export const generateVideoFromPrompt = async (prompt: string, aspectRatio: VideoAspectRatio): Promise<VeoOperation> => {
    const ai = getAiClient();
    return await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio
        }
    });
};

export const generateVideoFromImage = async (prompt: string, imageBase64: string, mimeType: string, aspectRatio: VideoAspectRatio): Promise<VeoOperation> => {
    const ai = getAiClient();
    return await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        image: {
            imageBytes: imageBase64,
            mimeType: mimeType,
        },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio,
        }
    });
};

export const pollVideoOperation = async (operation: VeoOperation): Promise<VeoOperation> => {
    const ai = getAiClient();
    return await ai.operations.getVideosOperation({ operation: operation });
};

export const fetchVideo = async (uri: string): Promise<Blob> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }
    const response = await fetch(`${uri}&key=${process.env.API_KEY}`);
    if (!response.ok) {
        throw new Error("Failed to fetch video data.");
    }
    return response.blob();
};


export const generateSpeech = async (text: string): Promise<string> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        // Fix: Pass the text directly to the model without the "Say:" prefix.
        contents: [{ parts: [{ text: text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("TTS generation failed.");
    }
    return base64Audio;
};
