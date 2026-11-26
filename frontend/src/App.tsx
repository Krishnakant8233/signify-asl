import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { LiveRecognition } from './pages/LiveRecognition';
import { SentenceBuilderPage } from './pages/SentenceBuilderPage';
import { DatasetExplorer } from './pages/DatasetExplorer';
import { ModelTraining } from './pages/ModelTraining';
import { ModelEvaluation } from './pages/ModelEvaluation';
import { RecognitionHistory } from './pages/RecognitionHistory';
import { SpeechSettingsPage } from './pages/SpeechSettingsPage';
import { api } from './services/api';
import { ModelStatus } from './types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const m = await api.getModelStatus();
        setModelStatus(m);
      } catch (e) {
        // silently ignore transient offline errors
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentTab} />;
      case 'live':
        return <LiveRecognition />;
      case 'sentence':
        return <SentenceBuilderPage />;
      case 'dataset':
        return <DatasetExplorer />;
      case 'training':
        return <ModelTraining />;
      case 'evaluation':
        return <ModelEvaluation />;
      case 'history':
        return <RecognitionHistory />;
      case 'speech':
        return <SpeechSettingsPage />;
      default:
        return <Dashboard onNavigate={setCurrentTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col font-sans selection:bg-blue-500/30 selection:text-white">
      {/* Top Navbar */}
      <Navbar activeTab={currentTab} />

      {/* Main App Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          classesCount={modelStatus?.classes?.length || 26}
          modelReady={modelStatus?.has_trained_model || false}
        />

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
