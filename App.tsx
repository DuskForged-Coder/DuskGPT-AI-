
import React, { useState } from 'react';
import ChatView from './components/ChatView';
import ImageStudioView from './components/ImageStudioView';
import VideoStudioView from './components/VideoStudioView';
import AudioStudioView from './components/AudioStudioView';
import GamesView from './components/GamesView';
import { ChatIcon } from './components/icons/ChatIcon';
import { ImageIcon } from './components/icons/ImageIcon';
import { VideoIcon } from './components/icons/VideoIcon';
import { AudioIcon } from './components/icons/AudioIcon';
import { GameIcon } from './components/icons/GameIcon';
import { SparklesIcon } from './components/icons/SparklesIcon';

type Tab = 'chat' | 'image' | 'video' | 'audio' | 'games';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatView />;
      case 'image':
        return <ImageStudioView />;
      case 'video':
        return <VideoStudioView />;
      case 'audio':
        return <AudioStudioView />;
      case 'games':
        return <GamesView />;
      default:
        return <ChatView />;
    }
  };

  const NavButton: React.FC<{ tabName: Tab; label: string; icon: React.ReactNode }> = ({ tabName, label, icon }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
        activeTab === tabName
          ? 'bg-purple-600 text-white shadow-lg'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans">
      <header className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <SparklesIcon className="w-8 h-8 text-purple-400" />
          <h1 className="text-2xl font-bold tracking-tighter">DuskGPT AI</h1>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <nav className="flex flex-col gap-2 p-4 bg-gray-800/50 border-r border-gray-700">
          <NavButton tabName="chat" label="Chat" icon={<ChatIcon className="w-5 h-5" />} />
          <NavButton tabName="image" label="Image Studio" icon={<ImageIcon className="w-5 h-5" />} />
          <NavButton tabName="video" label="Video Studio" icon={<VideoIcon className="w-5 h-5" />} />
          <NavButton tabName="audio" label="Audio Studio" icon={<AudioIcon className="w-5 h-5" />} />
          <NavButton tabName="games" label="Games" icon={<GameIcon className="w-5 h-5" />} />
        </nav>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
