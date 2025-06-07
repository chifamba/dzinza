import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TreePine, 
  Users, 
  Search, 
  Camera, 
  Dna, 
  Globe,
  Shield,
  Star,
  ArrowRight,
  Play,
  ChevronDown
} from 'lucide-react';

const LandingPage = () => {
  const features = [
    {
      icon: TreePine,
      title: 'Interactive Family Trees',
      description: 'Build and explore your family history with our intuitive drag-and-drop family tree builder.',
      color: 'text-genealogy-600',
      bgColor: 'bg-genealogy-50'
    },
    {
      icon: Dna,
      title: 'DNA Matching',
      description: 'Discover relatives and ethnic origins through advanced DNA analysis and matching algorithms.',
      color: 'text-dzinza-600',
      bgColor: 'bg-dzinza-50'
    },
    {
      icon: Search,
      title: 'Historical Records',
      description: 'Search through billions of historical records, documents, and archives worldwide.',
      color: 'text-accent-600',
      bgColor: 'bg-accent-50'
    },
    {
      icon: Camera,
      title: 'Photo Enhancement',
      description: 'Restore, colorize, and enhance old family photos using AI-powered technology.',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: Users,
      title: 'Collaborative Research',
      description: 'Work together with family members and other researchers to uncover your shared history.',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50'
    },
    {
      icon: Globe,
      title: 'Global Database',
      description: 'Access records from around the world with our comprehensive genealogical database.',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Family Historian',
      content: 'Dzinza helped me trace my family back 12 generations. The DNA matching feature connected me with cousins I never knew existed!',
      avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150'
    },
    {
      name: 'Michael Chen',
      role: 'Genealogy Researcher',
      content: 'The historical records search is incredibly powerful. I found immigration documents for my great-grandparents within minutes.',
      avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150'
    },
    {
      name: 'Emma Rodriguez',
      role: 'Family Tree Builder',
      content: 'The photo restoration feature brought our old family photos back to life. My grandmother was amazed to see her parents in color!',
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6
      }
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-dzinza-600 via-dzinza-700 to-genealogy-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display mb-6 leading-tight">
              Discover Your
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-accent-300 to-genealogy-300">
                Family Story
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed text-dzinza-100">
              Uncover your ancestry, connect with relatives, and preserve your family's legacy with the world's most advanced genealogy platform.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link
                to="/dashboard"
                className="bg-accent-500 hover:bg-accent-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center space-x-2"
              >
                <span>Start Your Journey</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <button className="border-2 border-white hover:bg-white hover:text-dzinza-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 flex items-center space-x-2">
                <Play className="h-5 w-5" />
                <span>Watch Demo</span>
              </button>
            </div>

            <div className="flex justify-center items-center space-x-8 text-dzinza-200">
              <div className="text-center">
                <div className="text-2xl font-bold">10M+</div>
                <div className="text-sm">Family Trees</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">50B+</div>
                <div className="text-sm">Records</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">200+</div>
                <div className="text-sm">Countries</div>
              </div>
            </div>
          </motion.div>
        </div>
        
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <ChevronDown className="h-8 w-8 text-dzinza-200" />
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 font-display">
              Powerful Tools for Family Discovery
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to uncover, preserve, and share your family history
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="group p-8 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${feature.bgColor} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-8 w-8 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 font-display">
              Trusted by Millions
            </h2>
            <p className="text-xl text-gray-600">
              See what our community is saying about Dzinza
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-accent-500 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed italic">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">
                      {testimonial.name}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-dzinza-600 to-genealogy-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6 font-display">
              Ready to Discover Your Family History?
            </h2>
            <p className="text-xl mb-8 text-dzinza-100">
              Join millions of people who have already started their family history journey
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/dashboard"
                className="bg-accent-500 hover:bg-accent-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105"
              >
                Get Started Free
              </Link>
              <button className="border-2 border-white hover:bg-white hover:text-dzinza-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300">
                Learn More
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;