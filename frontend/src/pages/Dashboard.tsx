import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  TreePine, 
  Users, 
  Search, 
  Camera, 
  Dna,
  TrendingUp,
  Calendar,
  MapPin,
  Bell,
  Plus,
  ArrowRight
} from 'lucide-react';

const Dashboard = () => {
  const { t } = useTranslation('dashboard');

  const quickStats = [
    { label: t('stats.familyMembers'), value: '247', icon: Users, color: 'text-genealogy-600', bg: 'bg-genealogy-50' },
    { label: t('stats.dnaMatches'), value: '1,432', icon: Dna, color: 'text-dzinza-600', bg: 'bg-dzinza-50' },
    { label: t('stats.recordsFound'), value: '89', icon: Search, color: 'text-accent-600', bg: 'bg-accent-50' },
    { label: t('stats.photosEnhanced'), value: '23', icon: Camera, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const recentActivity = [
    {
      type: 'match',
      title: t('activities.dnaMatch', { name: 'Sarah Thompson' }),
      description: 'Sarah Thompson - 3rd cousin match (127 cM shared)',
      time: '2 hours ago',
      icon: Dna,
      color: 'text-dzinza-600'
    },
    {
      type: 'record',
      title: 'Historical Record Discovery',
      description: t('activities.foundRecord', { name: 'John Smith' }),
      time: '1 day ago',
      icon: Search,
      color: 'text-accent-600'
    },
    {
      type: 'collaboration',
      title: 'Family Tree Update',
      description: t('activities.addedPerson', { name: 'Mary Johnson' }),
      time: '2 days ago',
      icon: TreePine,
      color: 'text-genealogy-600'
    },
    {
      type: 'photo',
      title: 'Photo Enhancement Complete',
      description: t('activities.enhancedPhoto', { name: '1950s family portrait' }),
      time: '3 days ago',
      icon: Camera,
      color: 'text-purple-600'
    }
  ];

  const suggestions = [
    {
      title: t('suggestions.birthRecord', { name: 'John Smith' }),
      description: 'Add more details to improve matching accuracy',
      progress: 65,
      action: t('suggestions.action'),
      icon: Users
    },
    {
      title: t('suggestions.censusRecord', { year: '1920', name: 'Mary Smith' }),
      description: 'Upload results from other testing companies',
      progress: 0,
      action: t('suggestions.action'),
      icon: Dna
    },
    {
      title: t('suggestions.marriageRecord'),
      description: 'Collaborate with relatives on your research',
      progress: 30,
      action: t('suggestions.action'),
      icon: Users
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 font-display">
                {t('welcome', { name: 'John' })}
              </h1>
              <p className="text-gray-600 mt-2">
                {t('overview')}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-600 hover:text-dzinza-600 transition-colors">
                <Bell className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </button>
              <button className="bg-dzinza-600 text-white px-4 py-2 rounded-lg hover:bg-dzinza-700 transition-colors flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>{t('quickActions.addFamilyMembers')}</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bg}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">{t('sections.recentActivity')}</h2>
                <button className="text-dzinza-600 hover:text-dzinza-700 text-sm font-medium">
                  View All
                </button>
              </div>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div key={index} className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className={`p-2 rounded-lg ${activity.color === 'text-dzinza-600' ? 'bg-dzinza-50' : activity.color === 'text-accent-600' ? 'bg-accent-50' : activity.color === 'text-genealogy-600' ? 'bg-genealogy-50' : 'bg-purple-50'}`}>
                        <Icon className={`h-5 w-5 ${activity.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{activity.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-2">{activity.time}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('sections.quickActions')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  to="/family-tree"
                  className="group p-4 border border-gray-200 rounded-lg hover:border-dzinza-300 hover:bg-dzinza-50 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <TreePine className="h-8 w-8 text-genealogy-600 group-hover:scale-110 transition-transform" />
                    <div>
                      <h3 className="font-medium text-gray-900">{t('quickActions.buildFamilyTree')}</h3>
                      <p className="text-sm text-gray-600">{t('quickActions.addFamilyMembers')}</p>
                    </div>
                  </div>
                </Link>
                <Link
                  to="/dna-matching"
                  className="group p-4 border border-gray-200 rounded-lg hover:border-dzinza-300 hover:bg-dzinza-50 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <Dna className="h-8 w-8 text-dzinza-600 group-hover:scale-110 transition-transform" />
                    <div>
                      <h3 className="font-medium text-gray-900">{t('quickActions.viewDnaMatches')}</h3>
                      <p className="text-sm text-gray-600">{t('quickActions.discoverRelatives')}</p>
                    </div>
                  </div>
                </Link>
                <Link
                  to="/records"
                  className="group p-4 border border-gray-200 rounded-lg hover:border-dzinza-300 hover:bg-dzinza-50 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <Search className="h-8 w-8 text-accent-600 group-hover:scale-110 transition-transform" />
                    <div>
                      <h3 className="font-medium text-gray-900">{t('quickActions.searchRecords')}</h3>
                      <p className="text-sm text-gray-600">{t('quickActions.findDocuments')}</p>
                    </div>
                  </div>
                </Link>
                <Link
                  to="/photos"
                  className="group p-4 border border-gray-200 rounded-lg hover:border-dzinza-300 hover:bg-dzinza-50 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <Camera className="h-8 w-8 text-purple-600 group-hover:scale-110 transition-transform" />
                    <div>
                      <h3 className="font-medium text-gray-900">{t('quickActions.enhancePhotos')}</h3>
                      <p className="text-sm text-gray-600">{t('quickActions.restorePhotos')}</p>
                    </div>
                  </div>
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Research Suggestions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-white rounded-xl shadow-sm p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('sections.researchSuggestions')}</h2>
              <div className="space-y-4">
                {suggestions.map((suggestion, index) => {
                  const Icon = suggestion.icon;
                  return (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3 mb-3">
                        <Icon className="h-5 w-5 text-dzinza-600 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 text-sm">{suggestion.title}</h3>
                          <p className="text-xs text-gray-600 mt-1">{suggestion.description}</p>
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{suggestion.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-dzinza-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${suggestion.progress}%` }}
                          ></div>
                        </div>
                      </div>
                      <button className="w-full bg-dzinza-600 text-white py-2 px-4 rounded-md text-sm hover:bg-dzinza-700 transition-colors">
                        {suggestion.action}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Family Tree Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-white rounded-xl shadow-sm p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">{t('sections.familyTreePreview')}</h2>
                <Link
                  to="/family-tree"
                  className="text-dzinza-600 hover:text-dzinza-700 text-sm font-medium"
                >
                  View Full Tree
                </Link>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-dzinza-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">JS</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">John Smith</p>
                    <p className="text-xs text-gray-600">You</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-genealogy-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">MS</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Mary Smith</p>
                    <p className="text-xs text-gray-600">Mother</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-accent-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">RS</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Robert Smith</p>
                    <p className="text-xs text-gray-600">Father</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;