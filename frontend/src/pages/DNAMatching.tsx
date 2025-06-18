import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  MapPin, 
  Calendar,
  Share,
  Mail,
  Filter,
  Search,
  TrendingUp,
  Globe,
  Heart,
  Star
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DNAMatch {
  id: string;
  name: string;
  relationship: string;
  sharedDNA: number;
  confidence: number;
  photo?: string;
  location?: string;
  treeSize: number;
  lastActive: string;
  isNew?: boolean;
}

interface EthnicityData {
  region: string;
  percentage: number;
  color: string;
}

type DnaMatchingTab = 'matches' | 'ethnicity' | 'migration';

const DNAMatching = () => {
  const { t } = useTranslation(['dnaMatching', 'common']);
  const [selectedMatch, setSelectedMatch] = useState<DNAMatch | null>(null);
  const [activeTab, setActiveTab] = useState<DnaMatchingTab>('matches');

  const dnaMatches: DNAMatch[] = [
    {
      id: '1',
      name: 'Sarah Thompson',
      relationship: '3rd Cousin',
      sharedDNA: 127,
      confidence: 95,
      photo: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150',
      location: 'Boston, MA',
      treeSize: 245,
      lastActive: '2 days ago',
      isNew: true
    },
    {
      id: '2',
      name: 'Michael Johnson',
      relationship: '4th Cousin',
      sharedDNA: 89,
      confidence: 88,
      photo: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150',
      location: 'Seattle, WA',
      treeSize: 156,
      lastActive: '1 week ago'
    },
    {
      id: '3',
      name: 'Emma Rodriguez',
      relationship: '5th Cousin',
      sharedDNA: 34,
      confidence: 76,
      location: 'Austin, TX',
      treeSize: 89,
      lastActive: '3 weeks ago'
    },
    {
      id: '4',
      name: 'David Chen',
      relationship: '4th Cousin',
      sharedDNA: 67,
      confidence: 82,
      photo: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150',
      location: 'San Francisco, CA',
      treeSize: 203,
      lastActive: '5 days ago',
      isNew: true
    }
  ];

  const ethnicityData: EthnicityData[] = [
    { region: 'Northwestern Europe', percentage: 45, color: '#1E40AF' },
    { region: 'Eastern Europe', percentage: 25, color: '#059669' },
    { region: 'Scandinavian', percentage: 15, color: '#D97706' },
    { region: 'Irish/Scottish', percentage: 10, color: '#DC2626' },
    { region: 'Southern Europe', percentage: 5, color: '#7C3AED' }
  ];

  const migrationData = [
    { period: '1800-1850', count: 23 },
    { period: '1850-1900', count: 45 },
    { period: '1900-1950', count: 67 },
    { period: '1950-2000', count: 34 },
    { period: '2000-2025', count: 12 }
  ];

  const getRelationshipColor = (relationship: string) => {
    switch (relationship) {
      case '1st Cousin':
      case '2nd Cousin':
        return 'bg-green-100 text-green-800';
      case '3rd Cousin':
      case '4th Cousin':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const MatchCard = ({ match }: { match: DNAMatch }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-xl shadow-md p-6 cursor-pointer hover:shadow-lg transition-all duration-300"
      onClick={() => setSelectedMatch(match)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          {match.photo ? (
            <img
              src={match.photo}
              alt={match.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-dzinza-100 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-dzinza-600" />
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900">{match.name}</h3>
              {match.isNew && (
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                  {t('dnaMatching:matches.newMatch')}
                </span>
              )}
            </div>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRelationshipColor(match.relationship)}`}>
              {match.relationship}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-dzinza-600">{match.sharedDNA} cM</div>
          <div className="text-sm text-gray-600">{match.confidence}% confidence</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
        {match.location && (
          <div className="flex items-center space-x-1">
            <MapPin className="h-4 w-4" />
            <span>{match.location}</span>
          </div>
        )}
        <div className="flex items-center space-x-1">
          <Users className="h-4 w-4" />
          <span>{match.treeSize} people in tree</span>
        </div>
        <div className="flex items-center space-x-1">
          <Calendar className="h-4 w-4" />
          <span>Active {match.lastActive}</span>
        </div>
        <div className="flex items-center space-x-1">
          <TrendingUp className="h-4 w-4" />
          <span>Growing tree</span>
        </div>
      </div>

      <div className="mt-4 flex space-x-2">
        <button className="flex-1 bg-dzinza-600 text-white py-2 px-4 rounded-md hover:bg-dzinza-700 transition-colors text-sm flex items-center justify-center space-x-1">
          <Mail className="h-4 w-4" />
          <span>Contact</span>
        </button>
        <button className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors text-sm flex items-center justify-center space-x-1">
          <Share className="h-4 w-4" />
          <span>Share</span>
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
              <h1 className="text-3xl font-bold text-gray-900 font-display">{t('dnaMatching:title')}</h1>
              <p className="text-gray-600 mt-2">{t('dnaMatching:subtitle')}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('dnaMatching:search.placeholder')}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dzinza-500 focus:border-transparent"
                  />
                </div>
                <button className="p-2 text-gray-600 hover:text-dzinza-600 border border-gray-300 rounded-lg">
                  <Filter className="h-4 w-4" />
                </button>
              </div>
              <button className="bg-dzinza-600 text-white px-4 py-2 rounded-lg hover:bg-dzinza-700 transition-colors">
                {t('dnaMatching:actions.uploadData')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'matches', label: t('dnaMatching:tabs.matches'), icon: Users },
              { id: 'ethnicity', label: t('dnaMatching:tabs.ethnicity'), icon: Globe },
              { id: 'migration', label: t('dnaMatching:tabs.migration'), icon: TrendingUp }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as DnaMatchingTab)}
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

        {/* Content */}
        {activeTab === 'matches' && (
          <div className="flex gap-8">
            <div className="flex-1">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-dzinza-50 rounded-lg">
                      <Users className="h-6 w-6 text-dzinza-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">1,432</p>
                      <p className="text-sm text-gray-600">{t('dnaMatching:stats.totalMatches', { count: 1432 })}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <Star className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">23</p>
                      <p className="text-sm text-gray-600">{t('dnaMatching:stats.closeFamily', { count: 23 })}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-accent-50 rounded-lg">
                      <Heart className="h-6 w-6 text-accent-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">8</p>
                      <p className="text-sm text-gray-600">{t('dnaMatching:stats.newThisWeek', { count: 8 })}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <Globe className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">47</p>
                      <p className="text-sm text-gray-600">{t('dnaMatching:stats.countries', { count: 47 })}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Matches Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {dnaMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </motion.div>
            </div>

            {/* Match Details Sidebar */}
            {selectedMatch && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="w-80 bg-white rounded-xl shadow-lg p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">{t('dnaMatching:sidebar.title')}</h3>
                  <button
                    onClick={() => setSelectedMatch(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Photo and Basic Info */}
                  <div className="text-center">
                    {selectedMatch.photo ? (
                      <img
                        src={selectedMatch.photo}
                        alt={selectedMatch.name}
                        className="w-20 h-20 rounded-full mx-auto object-cover mb-3"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-dzinza-100 rounded-full mx-auto flex items-center justify-center mb-3">
                        <Users className="h-10 w-10 text-dzinza-600" />
                      </div>
                    )}
                    <h4 className="text-lg font-semibold text-gray-900">{selectedMatch.name}</h4>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${getRelationshipColor(selectedMatch.relationship)}`}>
                      {selectedMatch.relationship}
                    </span>
                  </div>

                  {/* DNA Details */}
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-3">{t('dnaMatching:sidebar.dnaDetails')}</h5>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('dnaMatching:matches.sharedDNA')}:</span>
                        <span className="font-medium">{selectedMatch.sharedDNA} cM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('dnaMatching:matches.confidence')}:</span>
                        <span className="font-medium">{selectedMatch.confidence}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('dnaMatching:matches.treeSize')}:</span>
                        <span className="font-medium">{selectedMatch.treeSize} {t('dnaMatching:sidebar.people')}</span>
                      </div>
                      {selectedMatch.location && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t('dnaMatching:sidebar.location')}:</span>
                          <span className="font-medium">{selectedMatch.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <button className="w-full bg-dzinza-600 text-white py-2 px-4 rounded-md hover:bg-dzinza-700 transition-colors flex items-center justify-center space-x-2">
                      <Mail className="h-4 w-4" />
                      <span>{t('dnaMatching:sidebar.sendMessage')}</span>
                    </button>
                    <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors">
                      {t('dnaMatching:sidebar.viewTree')}
                    </button>
                    <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors">
                      {t('dnaMatching:sidebar.compareDNA')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {activeTab === 'ethnicity' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Pie Chart */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">{t('dnaMatching:ethnicity.breakdown')}</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ethnicityData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="percentage"
                      label={({ region, percentage }) => `${region}: ${percentage}%`}
                    >
                      {ethnicityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ethnicity List */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">{t('dnaMatching:ethnicity.regionalBreakdown')}</h3>
              <div className="space-y-4">
                {ethnicityData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="font-medium text-gray-900">{item.region}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: item.color
                          }}
                        ></div>
                      </div>
                      <span className="font-semibold text-gray-900 w-10 text-right">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'migration' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-6">{t('dnaMatching:migration.patterns')}</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={migrationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1E40AF" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DNAMatching;