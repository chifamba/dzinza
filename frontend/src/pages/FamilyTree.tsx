import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  User, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  Share,
  Download,
  Calendar,
  MapPin
} from 'lucide-react';

interface FamilyMember {
  id: string;
  name: string;
  birthYear?: number;
  deathYear?: number;
  location?: string;
  relationship: string;
  photo?: string;
  generation: number;
  parentId?: string;
}

const FamilyTree = () => {
  const { t } = useTranslation('familyTree');
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [familyMembers, _setFamilyMembers] = useState<FamilyMember[]>([ // Renamed setFamilyMembers
    {
      id: '1',
      name: 'John Smith',
      birthYear: 1990,
      location: 'New York, NY',
      relationship: 'Self',
      generation: 0,
      photo: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150'
    },
    {
      id: '2',
      name: 'Mary Smith',
      birthYear: 1965,
      location: 'Boston, MA',
      relationship: 'Mother',
      generation: 1,
      parentId: '1',
      photo: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150'
    },
    {
      id: '3',
      name: 'Robert Smith',
      birthYear: 1963,
      deathYear: 2020,
      location: 'Boston, MA',
      relationship: 'Father',
      generation: 1,
      parentId: '1',
      photo: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150'
    },
    {
      id: '4',
      name: 'Elizabeth Johnson',
      birthYear: 1940,
      location: 'Vermont',
      relationship: 'Grandmother',
      generation: 2,
      parentId: '2'
    },
    {
      id: '5',
      name: 'William Johnson',
      birthYear: 1938,
      deathYear: 2015,
      location: 'Vermont',
      relationship: 'Grandfather',
      generation: 2,
      parentId: '2'
    },
    {
      id: '6',
      name: 'Sarah Thompson',
      birthYear: 1942,
      location: 'Maine',
      relationship: 'Grandmother',
      generation: 2,
      parentId: '3'
    }
  ]);

  const getGenerationMembers = (generation: number) => {
    return familyMembers.filter(member => member.generation === generation);
  };

  const handleDragEnd = (result: any) => {
    // Handle drag and drop logic here
    console.log('Drag ended:', result);
  };

  const MemberCard = ({ member, index }: { member: FamilyMember; index: number }) => (
    <Draggable draggableId={member.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white rounded-xl shadow-md p-4 cursor-pointer transition-all duration-300 hover:shadow-lg ${
            snapshot.isDragging ? 'rotate-2 scale-105' : ''
          } ${selectedMember?.id === member.id ? 'ring-2 ring-dzinza-500' : ''}`}
          onClick={() => setSelectedMember(member)}
        >
          <div className="flex items-center space-x-3">
            {member.photo ? (
              <img
                src={member.photo}
                alt={member.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-dzinza-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-dzinza-600" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{member.name}</h3>
              <p className="text-sm text-gray-600">{member.relationship}</p>
              {member.birthYear && (
                <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {member.birthYear}
                    {member.deathYear && ` - ${member.deathYear}`}
                  </span>
                </div>
              )}
              {member.location && (
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <MapPin className="h-3 w-3" />
                  <span>{member.location}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col space-y-1">
              <button className="p-1 text-gray-400 hover:text-dzinza-600 transition-colors">
                <Edit className="h-4 w-4" />
              </button>
              <button className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );

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
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('search.placeholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dzinza-500 focus:border-transparent"
                  />
                </div>
                <button className="p-2 text-gray-600 hover:text-dzinza-600 border border-gray-300 rounded-lg">
                  <Filter className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-dzinza-600 border border-gray-300 rounded-lg">
                  <Share className="h-4 w-4" />
                  <span>{t('actions.share')}</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-dzinza-600 border border-gray-300 rounded-lg">
                  <Download className="h-4 w-4" />
                  <span>{t('actions.export')}</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-dzinza-600 text-white rounded-lg hover:bg-dzinza-700">
                  <Plus className="h-4 w-4" />
                  <span>{t('actions.addPerson')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        {/* Main Tree View */}
        <div className="flex-1">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="space-y-12">
              {/* Current Generation (You) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center"
              >
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">{t('generations.you')}</h2>
                <Droppable droppableId="generation-0" direction="horizontal">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex justify-center"
                    >
                      {getGenerationMembers(0).map((member, index) => (
                        <MemberCard key={member.id} member={member} index={index} />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </motion.div>

              {/* Parents Generation */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-center"
              >
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">{t('generations.parents')}</h2>
                <Droppable droppableId="generation-1" direction="horizontal">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex justify-center space-x-8"
                    >
                      {getGenerationMembers(1).map((member, index) => (
                        <MemberCard key={member.id} member={member} index={index} />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </motion.div>

              {/* Grandparents Generation */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-center"
              >
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">{t('generations.grandparents')}</h2>
                <Droppable droppableId="generation-2" direction="horizontal">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex justify-center space-x-8"
                    >
                      {getGenerationMembers(2).map((member, index) => (
                        <MemberCard key={member.id} member={member} index={index} />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </motion.div>

              {/* Add more generations as needed */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="text-center"
              >
                <button className="flex items-center space-x-2 mx-auto px-6 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-dzinza-400 hover:text-dzinza-600 transition-colors">
                  <Plus className="h-5 w-5" />
                  <span>{t('actions.addGreatGrandparents')}</span>
                </button>
              </motion.div>
            </div>
          </DragDropContext>
        </div>

        {/* Sidebar */}
        {selectedMember && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="w-80 bg-white rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">{t('sidebar.personDetails')}</h3>
              <button
                onClick={() => setSelectedMember(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Photo */}
              <div className="text-center">
                {selectedMember.photo ? (
                  <img
                    src={selectedMember.photo}
                    alt={selectedMember.name}
                    className="w-24 h-24 rounded-full mx-auto object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 bg-dzinza-100 rounded-full mx-auto flex items-center justify-center">
                    <User className="h-12 w-12 text-dzinza-600" />
                  </div>
                )}
                <button className="mt-2 text-sm text-dzinza-600 hover:text-dzinza-700">
                  {t('sidebar.changePhoto')}
                </button>
              </div>

              {/* Basic Info */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">{t('sidebar.basicInformation')}</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('sidebar.fields.fullName')}
                    </label>
                    <input
                      type="text"
                      value={selectedMember.name}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-dzinza-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('sidebar.fields.relationship')}
                    </label>
                    <input
                      type="text"
                      value={selectedMember.relationship}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-dzinza-500 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('sidebar.fields.birthYear')}
                      </label>
                      <input
                        type="number"
                        value={selectedMember.birthYear || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-dzinza-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('sidebar.fields.deathYear')}
                      </label>
                      <input
                        type="number"
                        value={selectedMember.deathYear || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-dzinza-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('sidebar.fields.location')}
                    </label>
                    <input
                      type="text"
                      value={selectedMember.location || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-dzinza-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button className="w-full bg-dzinza-600 text-white py-2 px-4 rounded-md hover:bg-dzinza-700 transition-colors">
                  {t('sidebar.actions.saveChanges')}
                </button>
                <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors">
                  {t('sidebar.actions.viewFullProfile')}
                </button>
                <button className="w-full text-red-600 hover:text-red-700 transition-colors">
                  {t('sidebar.actions.removePerson')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default FamilyTree;