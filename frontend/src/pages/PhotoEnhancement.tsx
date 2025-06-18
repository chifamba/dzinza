import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Upload, 
  Download, 
  Wand2, 
  RotateCcw, 
  Palette, 
  Eye,
  Settings,
  Share,
  History,
  Zap,
  Image as ImageIcon,
  Maximize,
  ZoomIn
} from 'lucide-react';

interface Enhancement {
  id: string;
  name: string;
  description: string;
  before: string;
  after: string;
  type: 'colorization' | 'restoration' | 'enhancement';
  status: 'completed' | 'processing' | 'queued';
  dateProcessed: string;
}

interface ProcessingStep {
  id: string;
  name: string;
  status: 'completed' | 'processing' | 'pending';
  progress: number;
}

const PhotoEnhancement = () => {
  const { t } = useTranslation(['photoEnhancement', 'common']);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    { id: '1', name: t('processing.imageAnalysis'), status: 'completed', progress: 100 },
    { id: '2', name: t('processing.noiseReduction'), status: 'processing', progress: 75 },
    { id: '3', name: t('processing.detailEnhancement'), status: 'pending', progress: 0 },
    { id: '4', name: t('processing.colorRestoration'), status: 'pending', progress: 0 },
    { id: '5', name: t('processing.finalProcessing'), status: 'pending', progress: 0 }
  ]);
  const [activeTab, setActiveTab] = useState<'enhance' | 'history' | 'gallery'>('enhance');
  const [selectedTool, setSelectedTool] = useState<'auto' | 'colorize' | 'restore' | 'enhance'>('auto');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const enhancements: Enhancement[] = [
    {
      id: '1',
      name: 'Family Portrait 1920s',
      description: 'Restored and colorized vintage family portrait',
      before: 'https://images.pexels.com/photos/8728380/pexels-photo-8728380.jpeg?auto=compress&cs=tinysrgb&w=400&h=300',
      after: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400&h=300',
      type: 'colorization',
      status: 'completed',
      dateProcessed: '2024-01-15'
    },
    {
      id: '2',
      name: 'Wedding Photo 1950',
      description: 'Enhanced clarity and restored damaged areas',
      before: 'https://images.pexels.com/photos/159832/justice-law-case-hearing-159832.jpeg?auto=compress&cs=tinysrgb&w=400&h=300',
      after: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400&h=300',
      type: 'restoration',
      status: 'completed',
      dateProcessed: '2024-01-14'
    },
    {
      id: '3',
      name: 'Grandparents Portrait',
      description: 'AI-enhanced detail and contrast adjustment',
      before: 'https://images.pexels.com/photos/8129903/pexels-photo-8129903.jpeg?auto=compress&cs=tinysrgb&w=400&h=300',
      after: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400&h=300',
      type: 'enhancement',
      status: 'processing',
      dateProcessed: '2024-01-16'
    }
  ];

  const enhancementTools = [
    {
      id: 'auto',
      name: t('tools.autoEnhance.name'),
      description: t('tools.autoEnhance.description'),
      icon: Zap,
      color: 'text-dzinza-600',
      bgColor: 'bg-dzinza-50'
    },
    {
      id: 'colorize',
      name: t('tools.colorization.name'),
      description: t('tools.colorization.description'),
      icon: Palette,
      color: 'text-accent-600',
      bgColor: 'bg-accent-50'
    },
    {
      id: 'restore',
      name: t('tools.restoration.name'),
      description: t('tools.restoration.description'),
      icon: Wand2,
      color: 'text-genealogy-600',
      bgColor: 'bg-genealogy-50'
    },
    {
      id: 'enhance',
      name: t('tools.detailEnhancement.name'),
      description: t('tools.detailEnhancement.description'),
      icon: Eye,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedImage(url);
    }
  };

  const startProcessing = () => {
    // Simulate processing steps
    setProcessingSteps(prev => 
      prev.map((step, index) => 
        index === 0 ? { ...step, status: 'processing', progress: 0 } : step
      )
    );
    
    // Simulate progress
    setTimeout(() => {
      setProcessingSteps(prev => 
        prev.map((step, index) => 
          index === 0 ? { ...step, status: 'completed', progress: 100 } :
          index === 1 ? { ...step, status: 'processing', progress: 30 } : step
        )
      );
    }, 1000);
  };

  const getStatusColor = (status: Enhancement['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'queued':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: Enhancement['type']) => {
    switch (type) {
      case 'colorization':
        return 'bg-accent-100 text-accent-800';
      case 'restoration':
        return 'bg-genealogy-100 text-genealogy-800';
      case 'enhancement':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 font-display">{t('title')}</h1>
              <p className="text-gray-600 mt-2">{t('subtitle')}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-dzinza-600 border border-gray-300 rounded-lg">
                <History className="h-4 w-4" />
                <span>{t('header.processingQueue')}</span>
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-dzinza-600 text-white px-4 py-2 rounded-lg hover:bg-dzinza-700 transition-colors flex items-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span>{t('header.uploadPhoto')}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'enhance', label: t('tabs.enhancementStudio'), icon: Wand2 },
              { id: 'history', label: t('tabs.enhancementHistory'), icon: History },
              { id: 'gallery', label: t('tabs.gallery'), icon: ImageIcon }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-dzinza-500 text-dzinza-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Enhancement Studio */}
        {activeTab === 'enhance' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Tools Sidebar */}
            <div className="space-y-6">
              {/* Enhancement Tools */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">{t('tools.title')}</h3>
                <div className="space-y-3">
                  {enhancementTools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => setSelectedTool(tool.id as any)}
                        className={`w-full p-4 rounded-lg text-left transition-all ${
                          selectedTool === tool.id
                            ? `${tool.bgColor} border border-${tool.color.split('-')[1]}-200`
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${tool.bgColor}`}>
                            <Icon className={`h-5 w-5 ${tool.color}`} />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{tool.name}</div>
                            <div className="text-xs text-gray-600">{tool.description}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Settings */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">{t('settings.title')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settings.enhancementLevel')}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      defaultValue="7"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{t('settings.subtle')}</span>
                      <span>{t('settings.dramatic')}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settings.outputQuality')}
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-dzinza-500 focus:border-transparent">
                      <option>{t('settings.hdQuality')}</option>
                      <option>{t('settings.fourKQuality')}</option>
                      <option>{t('settings.originalResolution')}</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="preserve-original" className="rounded" />
                    <label htmlFor="preserve-original" className="text-sm text-gray-700">
                      {t('settings.preserveOriginal')}
                    </label>
                  </div>
                </div>
              </div>

              {/* Processing Status */}
              {selectedImage && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('processing.title')}</h3>
                  <div className="space-y-3">
                    {processingSteps.map((step) => (
                      <div key={step.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            step.status === 'completed' ? 'bg-green-500' :
                            step.status === 'processing' ? 'bg-yellow-500' : 'bg-gray-300'
                          }`}></div>
                          <span className="text-sm text-gray-700">{step.name}</span>
                        </div>
                        <span className="text-xs text-gray-500">{step.progress}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Main Workspace */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-sm p-6">
                {selectedImage ? (
                  <div className="space-y-6">
                    {/* Image Viewer */}
                    <div className="relative">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3">{t('workspace.original')}</h4>
                          <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-[4/3]">
                            <img
                              src={selectedImage}
                              alt={t('workspace.original')}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 right-2 flex space-x-1">
                              <button className="p-1 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow">
                                <ZoomIn className="h-4 w-4 text-gray-600" />
                              </button>
                              <button className="p-1 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow">
                                <Maximize className="h-4 w-4 text-gray-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3">{t('workspace.enhancedPreview')}</h4>
                          <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-[4/3] border-2 border-dashed border-gray-300 flex items-center justify-center">
                            <div className="text-center">
                              <Wand2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                              <p className="text-gray-500 text-sm">{t('workspace.startPrompt')}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between border-t pt-6">
                      <div className="flex items-center space-x-4">
                        <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-dzinza-600 border border-gray-300 rounded-lg">
                          <RotateCcw className="h-4 w-4" />
                          <span>{t('controls.reset')}</span>
                        </button>
                        <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-dzinza-600 border border-gray-300 rounded-lg">
                          <Settings className="h-4 w-4" />
                          <span>{t('controls.adjust')}</span>
                        </button>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button 
                          onClick={startProcessing}
                          className="bg-dzinza-600 text-white px-6 py-2 rounded-lg hover:bg-dzinza-700 transition-colors flex items-center space-x-2"
                        >
                          <Wand2 className="h-4 w-4" />
                          <span>{t('controls.startEnhancement')}</span>
                        </button>
                        <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-dzinza-600 border border-gray-300 rounded-lg">
                          <Download className="h-4 w-4" />
                          <span>{t('controls.download')}</span>
                        </button>
                        <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-dzinza-600 border border-gray-300 rounded-lg">
                          <Share className="h-4 w-4" />
                          <span>{t('controls.share')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <ImageIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('workspace.uploadPrompt.title')}</h3>
                    <p className="text-gray-600 mb-6">
                      {t('workspace.uploadPrompt.description')}
                    </p>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-dzinza-600 text-white px-6 py-3 rounded-lg hover:bg-dzinza-700 transition-colors flex items-center space-x-2 mx-auto"
                    >
                      <Upload className="h-5 w-5" />
                      <span>{t('workspace.uploadPrompt.choosePhoto')}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enhancement History */}
        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enhancements.map((enhancement) => (
                <div key={enhancement.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="grid grid-cols-2">
                    <div>
                      <img
                        src={enhancement.before}
                        alt={t('history.before')}
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-2 bg-gray-50">
                        <p className="text-xs text-gray-600 text-center">{t('history.before')}</p>
                      </div>
                    </div>
                    <div>
                      <img
                        src={enhancement.after}
                        alt={t('history.after')}
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-2 bg-dzinza-50">
                        <p className="text-xs text-dzinza-600 text-center">{t('history.after')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm">{enhancement.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(enhancement.status)}`}>
                        {t(`status.${enhancement.status}`)}
                      </span>
                    </div>
                    <p className="text-gray-600 text-xs mb-3">{enhancement.description}</p>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(enhancement.type)}`}>
                        {t(`type.${enhancement.type}`)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(enhancement.dateProcessed).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex space-x-2 mt-3">
                      <button className="flex-1 bg-dzinza-600 text-white py-2 px-3 rounded-md hover:bg-dzinza-700 transition-colors text-xs">
                        {t('controls.download')}
                      </button>
                      <button className="flex-1 border border-gray-300 text-gray-700 py-2 px-3 rounded-md hover:bg-gray-50 transition-colors text-xs">
                        {t('controls.share')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Gallery */}
        {activeTab === 'gallery' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
          >
            {enhancements.map((enhancement) => (
              <div key={enhancement.id} className="group relative">
                <img
                  src={enhancement.after}
                  alt={enhancement.name}
                  className="w-full aspect-square object-cover rounded-lg cursor-pointer group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 rounded-lg flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="bg-white text-gray-900 p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PhotoEnhancement;