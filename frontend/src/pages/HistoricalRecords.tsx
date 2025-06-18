import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  Filter, 
  Calendar,
  MapPin,
  Users,
  FileText,
  Download,
  Share,
  Star,
  Eye,
  BookOpen,
  Archive,
  Globe
} from 'lucide-react';

interface HistoricalRecord {
  id: string;
  title: string;
  type: string;
  date: string;
  location: string;
  description: string;
  relevance: number;
  source: string;
  imageUrl?: string;
  isStarred?: boolean;
}

const HistoricalRecords = () => {
  const { t } = useTranslation(['historicalRecords', 'common']);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<HistoricalRecord | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'birth' | 'marriage' | 'death' | 'immigration' | 'census'>('all');

  const records: HistoricalRecord[] = [
    {
      id: '1',
      title: 'Birth Certificate - John Smith',
      type: 'Birth Record',
      date: '1892-03-15',
      location: 'Boston, Massachusetts, USA',
      description: 'Birth certificate for John Smith, son of Robert Smith and Mary Johnson',
      relevance: 95,
      source: 'Massachusetts Vital Records',
      imageUrl: 'https://images.pexels.com/photos/159832/justice-law-case-hearing-159832.jpeg?auto=compress&cs=tinysrgb&w=400&h=300',
      isStarred: true
    },
    {
      id: '2',
      title: '1920 US Federal Census - Smith Family',
      type: 'Census Record',
      date: '1920-01-01',
      location: 'Boston, Massachusetts, USA',
      description: 'Federal census record showing John Smith (28), Mary Smith (26), and children',
      relevance: 88,
      source: 'US Federal Census',
      imageUrl: 'https://images.pexels.com/photos/8728380/pexels-photo-8728380.jpeg?auto=compress&cs=tinysrgb&w=400&h=300'
    },
    {
      id: '3',
      title: 'Immigration Record - Robert Smith',
      type: 'Immigration',
      date: '1885-07-22',
      location: 'Ellis Island, New York, USA',
      description: 'Ship manifest showing Robert Smith arriving from Ireland aboard SS Celtic',
      relevance: 92,
      source: 'Ellis Island Records',
      imageUrl: 'https://images.pexels.com/photos/8129903/pexels-photo-8129903.jpeg?auto=compress&cs=tinysrgb&w=400&h=300',
      isStarred: true
    },
    {
      id: '4',
      title: 'Marriage Certificate - John & Mary Smith',
      type: 'Marriage Record',
      date: '1918-06-10',
      location: 'Boston, Massachusetts, USA',
      description: 'Marriage certificate for John Smith and Mary Johnson',
      relevance: 90,
      source: 'Massachusetts Marriage Records'
    },
    {
      id: '5',
      title: 'Death Certificate - Robert Smith',
      type: 'Death Record',
      date: '1925-11-03',
      location: 'Boston, Massachusetts, USA',
      description: 'Death certificate for Robert Smith, age 62, cause: pneumonia',
      relevance: 85,
      source: 'Massachusetts Death Index'
    },
    {
      id: '6',
      title: 'Military Service Record - John Smith Jr.',
      type: 'Military Record',
      date: '1943-02-15',
      location: 'US Army, European Theater',
      description: 'Service record for John Smith Jr., 101st Airborne Division',
      relevance: 78,
      source: 'National Archives'
    }
  ];

  const recordTypes = [
    { id: 'all', label: t('historicalRecords:filters.all'), icon: FileText, count: records.length },
    { id: 'birth', label: t('historicalRecords:filters.birth'), icon: Users, count: records.filter(r => r.type === 'Birth Record').length },
    { id: 'marriage', label: t('historicalRecords:filters.marriage'), icon: Users, count: records.filter(r => r.type === 'Marriage Record').length },
    { id: 'death', label: t('historicalRecords:filters.death'), icon: Users, count: records.filter(r => r.type === 'Death Record').length },
    { id: 'immigration', label: t('historicalRecords:filters.immigration'), icon: Globe, count: records.filter(r => r.type === 'Immigration').length },
    { id: 'census', label: t('historicalRecords:filters.census'), icon: BookOpen, count: records.filter(r => r.type === 'Census Record').length }
  ];

  const filteredRecords = activeFilter === 'all' 
    ? records.filter(record => 
        record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : records.filter(record => {
        const typeMatch = activeFilter === 'birth' && record.type === 'Birth Record' ||
                         activeFilter === 'marriage' && record.type === 'Marriage Record' ||
                         activeFilter === 'death' && record.type === 'Death Record' ||
                         activeFilter === 'immigration' && record.type === 'Immigration' ||
                         activeFilter === 'census' && record.type === 'Census Record';
        const searchMatch = record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           record.description.toLowerCase().includes(searchTerm.toLowerCase());
        return typeMatch && searchMatch;
      });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Birth Record':
        return 'bg-green-100 text-green-800';
      case 'Marriage Record':
        return 'bg-pink-100 text-pink-800';
      case 'Death Record':
        return 'bg-gray-100 text-gray-800';
      case 'Immigration':
        return 'bg-blue-100 text-blue-800';
      case 'Census Record':
        return 'bg-purple-100 text-purple-800';
      case 'Military Record':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const RecordCard = ({ record }: { record: HistoricalRecord }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-xl shadow-md p-6 cursor-pointer hover:shadow-lg transition-all duration-300"
      onClick={() => setSelectedRecord(record)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-semibold text-gray-900 line-clamp-2">{record.title}</h3>
            {record.isStarred && (
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
            )}
          </div>
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(record.type)}`}>
            {record.type}
          </span>
        </div>
        <div className="text-right ml-4">
          <div className="text-lg font-bold text-dzinza-600">{record.relevance}%</div>
          <div className="text-xs text-gray-600">Relevance</div>
        </div>
      </div>

      {record.imageUrl && (
        <div className="mb-4">
          <img
            src={record.imageUrl}
            alt={record.title}
            className="w-full h-32 object-cover rounded-lg"
          />
        </div>
      )}

      <p className="text-gray-700 text-sm mb-4 line-clamp-2">{record.description}</p>

      <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 mb-4">
        <div className="flex items-center space-x-1">
          <Calendar className="h-4 w-4" />
          <span>{new Date(record.date).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center space-x-1">
          <MapPin className="h-4 w-4" />
          <span>{record.location}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Archive className="h-4 w-4" />
          <span>{record.source}</span>
        </div>
      </div>

      <div className="flex space-x-2">
        <button className="flex-1 bg-dzinza-600 text-white py-2 px-4 rounded-md hover:bg-dzinza-700 transition-colors text-sm flex items-center justify-center space-x-1">
          <Eye className="h-4 w-4" />
          <span>{t('historicalRecords:actions.view')}</span>
        </button>
        <button className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors text-sm flex items-center justify-center space-x-1">
          <Download className="h-4 w-4" />
          <span>{t('historicalRecords:actions.save')}</span>
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 font-display">{t('historicalRecords:title')}</h1>
              <p className="text-gray-600 mt-2">{t('historicalRecords:subtitle')}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-dzinza-600 border border-gray-300 rounded-lg">
                <Share className="h-4 w-4" />
                <span>{t('historicalRecords:actions.shareSearch')}</span>
              </button>
              <button className="bg-dzinza-600 text-white px-4 py-2 rounded-lg hover:bg-dzinza-700 transition-colors">
                {t('historicalRecords:actions.advancedSearch')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 space-y-6">
            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">{t('historicalRecords:search.title')}</h3>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('historicalRecords:search.placeholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dzinza-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder={t('historicalRecords:search.firstName')}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-dzinza-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder={t('historicalRecords:search.lastName')}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-dzinza-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder={t('historicalRecords:search.birthYear')}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-dzinza-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder={t('historicalRecords:search.location')}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-dzinza-500 focus:border-transparent"
                  />
                </div>
                <button className="w-full bg-dzinza-600 text-white py-2 px-4 rounded-md hover:bg-dzinza-700 transition-colors text-sm">
                  {t('historicalRecords:search.searchButton')}
                </button>
              </div>
            </div>

            {/* Record Types Filter */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">{t('historicalRecords:filters.title')}</h3>
              <div className="space-y-2">
                {recordTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setActiveFilter(type.id as any)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                        activeFilter === type.id
                          ? 'bg-dzinza-50 text-dzinza-700 border border-dzinza-200'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{type.label}</span>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {type.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">{t('historicalRecords:stats.title')}</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('historicalRecords:stats.totalFound')}:</span>
                  <span className="font-medium">{filteredRecords.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('historicalRecords:stats.highRelevance')}:</span>
                  <span className="font-medium">{filteredRecords.filter(r => r.relevance > 90).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('historicalRecords:stats.starred')}:</span>
                  <span className="font-medium">{filteredRecords.filter(r => r.isStarred).length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {t('historicalRecords:results.title', { count: filteredRecords.length })}
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  {t('historicalRecords:results.subtitle')}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <select className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-dzinza-500 focus:border-transparent">
                  <option>{t('historicalRecords:sorting.relevance')}</option>
                  <option>{t('historicalRecords:sorting.date')}</option>
                  <option>{t('historicalRecords:sorting.location')}</option>
                </select>
                <button className="p-2 text-gray-600 hover:text-dzinza-600 border border-gray-300 rounded-lg">
                  <Filter className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Records Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {filteredRecords.map((record) => (
                <RecordCard key={record.id} record={record} />
              ))}
            </motion.div>

            {filteredRecords.length === 0 && (
              <div className="text-center py-12">
                <Archive className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('historicalRecords:results.noRecords')}</h3>
                <p className="text-gray-600">
                  {t('historicalRecords:results.noRecordsSubtitle')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
          onClick={() => setSelectedRecord(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">{selectedRecord.title}</h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {selectedRecord.imageUrl && (
              <div className="mb-6">
                <img
                  src={selectedRecord.imageUrl}
                  alt={selectedRecord.title}
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">{t('historicalRecords:modal.recordDetails')}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{t('historicalRecords:modal.type')}:</span>
                    <span className="font-medium">{selectedRecord.type}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{t('historicalRecords:modal.date')}:</span>
                    <span className="font-medium">{new Date(selectedRecord.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{t('historicalRecords:modal.location')}:</span>
                    <span className="font-medium">{selectedRecord.location}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Archive className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{t('historicalRecords:modal.source')}:</span>
                    <span className="font-medium">{selectedRecord.source}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">{t('historicalRecords:modal.matchInfo')}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">{t('historicalRecords:modal.relevanceScore')}:</span>
                    <span className="font-bold text-dzinza-600">{selectedRecord.relevance}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-dzinza-600 h-2 rounded-full"
                      style={{ width: `${selectedRecord.relevance}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">{t('historicalRecords:modal.description')}</h4>
              <p className="text-gray-700 leading-relaxed">{selectedRecord.description}</p>
            </div>

            <div className="flex space-x-4">
              <button className="flex-1 bg-dzinza-600 text-white py-3 px-6 rounded-lg hover:bg-dzinza-700 transition-colors flex items-center justify-center space-x-2">
                <Download className="h-5 w-5" />
                <span>{t('historicalRecords:modal.download')}</span>
              </button>
              <button className="flex-1 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2">
                <Share className="h-5 w-5" />
                <span>{t('historicalRecords:modal.share')}</span>
              </button>
              <button className="px-6 py-3 text-dzinza-600 hover:text-dzinza-700 transition-colors flex items-center space-x-2">
                <Star className={`h-5 w-5 ${selectedRecord.isStarred ? 'fill-current' : ''}`} />
                <span>{selectedRecord.isStarred ? t('historicalRecords:modal.starred') : t('historicalRecords:modal.star')}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default HistoricalRecords;