import React, { useState, useRef, useEffect } from 'react'; // Added useEffect
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { User, Settings, Camera, Loader2, Bell, Lock, SunMoon } from 'lucide-react'; // Added more icons
import { useAuth } from '../hooks/useAuth';
import { useAppDispatch } from '../store/store';
import { updateUserProfile, uploadUserAvatar } from '../store/actions/authActions';
import { UpdateProfileData, User as UserType } from '../services/api/auth'; // Renamed User to UserType to avoid conflict
import { Modal } from '../components/ui/Modal';
import EditProfileForm from '../components/profile/EditProfileForm';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label'; // Assuming Label component exists

const Profile: React.FC = () => {
  const { user, status: authStatus } = useAuth();
  const dispatch = useAppDispatch();
  const { t } = useTranslation(['profile', 'common']);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [avatarUploadLoading, setAvatarUploadLoading] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for preferences
  const [prefs, setPrefs] = useState<UserType['preferences'] | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.preferences) {
      setPrefs(JSON.parse(JSON.stringify(user.preferences))); // Deep copy
    }
  }, [user]);

  const handleOpenEditModal = () => {
    setIsEditModalOpen(true);
    setUpdateError(null);
  };

  const handleCloseEditModal = () => {
    if (!updateLoading) {
        setIsEditModalOpen(false);
    }
  };

  const handleUpdateProfile = async (data: UpdateProfileData) => {
    setUpdateLoading(true);
    setUpdateError(null);
    try {
      await dispatch(updateUserProfile(data)).unwrap();
      setIsEditModalOpen(false);
      // toast.success(t('profileUpdateSuccess', 'Profile updated successfully!'));
    } catch (err: unknown) {
      setUpdateError((err as Error).message || t('errors.genericUpdateFailed', 'Failed to update profile.'));
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCameraIconClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setAvatarUploadError(t('avatarUpload.errorSize', 'File is too large. Max 5MB allowed.'));
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setAvatarUploadError(t('avatarUpload.errorType', 'Invalid file type. Please select an image (JPEG, PNG, GIF, WebP).'));
      return;
    }

    setAvatarUploadLoading(true);
    setAvatarUploadError(null);
    try {
      await dispatch(uploadUserAvatar(file)).unwrap();
      // toast.success(t('avatarUpload.success', 'Avatar uploaded successfully!'));
    } catch (err: unknown) {
      setAvatarUploadError((err as Error).message || t('avatarUpload.errorGeneric', 'Failed to upload avatar.'));
    } finally {
      setAvatarUploadLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handlePreferenceChange = (category: keyof UserType['preferences'], key: string, value: string | boolean) => {
    setPrefs(prev => {
      if (!prev) return null;
      const categoryCopy = { ...prev[category] };
      (categoryCopy as any)[key] = value;
      return {
        ...prev,
        [category]: categoryCopy,
      };
    });
  };

  const handleSavePreferences = async () => {
    if (!prefs) return;
    setPrefsLoading(true);
    setPrefsError(null);
    try {
      const updateData: UpdateProfileData = { preferences: prefs };
      await dispatch(updateUserProfile(updateData)).unwrap();
      // toast.success(t('preferences.saveSuccess', 'Preferences saved successfully!'));
    } catch (err: unknown) {
      setPrefsError((err as Error).message || t('preferences.saveError', 'Failed to save preferences.'));
    } finally {
      setPrefsLoading(false);
    }
  };


  if (!user && authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-dzinza-600 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">{t('common:loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  if (!user || !prefs) {
    return (
         <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-600">{t('common:error', 'Error')}: {t('profile.loadError', 'Could not load profile. Please try logging in again.')}</p>
            </div>
        </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white shadow rounded-lg mb-6"
        >
          <div className="px-6 py-8 border-b border-gray-200">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-dzinza-100 flex items-center justify-center text-dzinza-600">
                  {user.profilePhoto ? (
                    <img
                      src={user.profilePhoto}
                      alt={t('profilePhotoAlt', { name: `${user.firstName} ${user.lastName}` })}
                      className="h-24 w-24 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12" />
                  )}
                  {avatarUploadLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleAvatarFileChange}
                  disabled={avatarUploadLoading}
                />
                <button
                  onClick={handleCameraIconClick}
                  disabled={avatarUploadLoading}
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-dzinza-600 text-white flex items-center justify-center hover:bg-dzinza-700 transition-colors disabled:opacity-50"
                  aria-label={t('avatarUpload.changeButtonLabel', "Change profile photo")}
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex-1">
                {avatarUploadError && <p className="text-sm text-red-500 mb-1">{avatarUploadError}</p>}
                <h1 className="text-2xl font-bold text-gray-900">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-gray-600">{user.email}</p>
                <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                  <span>
                    {t('memberSince', 'Member since')} {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                  {user.emailVerified && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {t('verified', 'Verified')}
                    </span>
                  )}
                </div>
              </div>
              
              <Button
                onClick={handleOpenEditModal}
                variant="outline"
                className="inline-flex items-center"
              >
                <Settings className="h-4 w-4 mr-2" />
                {t('editProfileButton', 'Edit Profile')}
              </Button>
            </div>
          </div>

          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('basicInformationTitle', 'Basic Information')}</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>{t('firstNameLabel', 'First Name')}:</strong> {user.firstName}</p>
                  <p><strong>{t('lastNameLabel', 'Last Name')}:</strong> {user.lastName}</p>
                  <p><strong>{t('emailLabel', 'Email')}:</strong> {user.email}</p>
                  <p><strong>{t('dateOfBirthLabel', 'Date of Birth')}:</strong> {user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : t('common:notSet', 'Not set')}</p>
                  <p><strong>{t('preferredLanguageLabel', 'Language')}:</strong> {
                       user.preferredLanguage === 'en' ? t('languages.en', 'English') :
                       user.preferredLanguage === 'sn' ? t('languages.sn', 'Shona') :
                       user.preferredLanguage === 'nd' ? t('languages.nd', 'Ndebele') : user.preferredLanguage
                  }</p>
                </div>
              </div>
              <div>
                 <h3 className="text-lg font-medium text-gray-900 mb-2">{t('accountDetailsTitle', 'Account Details')}</h3>
                 <div className="space-y-1 text-sm">
                    <p><strong>{t('accountStatusLabel', 'Status')}:</strong> <span className={`font-medium ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>{user.isActive ? t('status.active', 'Active') : t('status.inactive', 'Inactive')}</span></p>
                    <p><strong>{t('mfaLabel', '2FA')}:</strong> <span className={`font-medium ${user.mfaEnabled ? 'text-green-600' : 'text-gray-600'}`}>{user.mfaEnabled ? t('status.enabled', 'Enabled') : t('status.disabled', 'Disabled')}</span></p>
                 </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Preferences Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white shadow rounded-lg mt-6"
        >
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">{t('preferences.title', 'Preferences')}</h2>
          </div>
          <div className="px-6 py-6 space-y-8">
            {/* Notification Preferences */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1 flex items-center"><Bell className="w-5 h-5 mr-2 text-dzinza-500" />{t('preferences.notifications.title', 'Notifications')}</h3>
              <p className="text-sm text-gray-500 mb-4">{t('preferences.notifications.description', 'Choose how you receive notifications.')}</p>
              <div className="space-y-3">
                {(Object.keys(prefs.notifications) as Array<keyof UserType['preferences']['notifications']>).map((key) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={`prefs-notif-${key}`} className="text-sm font-medium text-gray-700 capitalize">
                      {t(`preferences.notifications.${key}`, key.replace(/([A-Z])/g, ' $1'))}
                    </Label>
                    <input
                      type="checkbox"
                      id={`prefs-notif-${key}`}
                      checked={prefs.notifications[key]}
                      onChange={(e) => handlePreferenceChange('notifications', key, e.target.checked)}
                      className="h-4 w-4 text-dzinza-600 border-gray-300 rounded focus:ring-dzinza-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Privacy Preferences */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1 flex items-center"><Lock className="w-5 h-5 mr-2 text-dzinza-500" />{t('preferences.privacy.title', 'Privacy')}</h3>
              <p className="text-sm text-gray-500 mb-4">{t('preferences.privacy.description', 'Control your privacy settings.')}</p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="prefs-privacy-visibility" className="block text-sm font-medium text-gray-700">{t('preferences.privacy.profileVisibility.label', 'Profile Visibility')}</Label>
                  <select
                    id="prefs-privacy-visibility"
                    value={prefs.privacy.profileVisibility}
                    onChange={(e) => handlePreferenceChange('privacy', 'profileVisibility', e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-dzinza-500 focus:border-dzinza-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="public">{t('preferences.privacy.profileVisibility.options.public', 'Public')}</option>
                    <option value="family">{t('preferences.privacy.profileVisibility.options.family', 'Family Only')}</option>
                    <option value="private">{t('preferences.privacy.profileVisibility.options.private', 'Private')}</option>
                  </select>
                </div>
                {(Object.keys(prefs.privacy) as Array<keyof UserType['preferences']['privacy']>)
                  .filter(key => key !== 'profileVisibility')
                  .map((key) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={`prefs-privacy-${key}`} className="text-sm font-medium text-gray-700 capitalize">
                      {t(`preferences.privacy.${key}`, key.replace(/([A-Z])/g, ' $1'))}
                    </Label>
                    <input
                      type="checkbox"
                      id={`prefs-privacy-${key}`}
                      checked={prefs.privacy[key as keyof Omit<UserType['preferences']['privacy'], 'profileVisibility'>]}
                      onChange={(e) => handlePreferenceChange('privacy', key, e.target.checked)}
                      className="h-4 w-4 text-dzinza-600 border-gray-300 rounded focus:ring-dzinza-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Theme Preference */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1 flex items-center"><SunMoon className="w-5 h-5 mr-2 text-dzinza-500" />{t('preferences.theme.title', 'Appearance')}</h3>
               <p className="text-sm text-gray-500 mb-4">{t('preferences.theme.description', 'Customize the look and feel of the application.')}</p>
              <div>
                <Label htmlFor="prefs-theme" className="block text-sm font-medium text-gray-700">{t('preferences.theme.label', 'Interface Theme')}</Label>
                <select
                  id="prefs-theme"
                  value={prefs.theme}
                  onChange={(e) => handlePreferenceChange('theme', '', e.target.value)} // Key is empty as theme is direct value
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-dzinza-500 focus:border-dzinza-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="light">{t('preferences.theme.options.light', 'Light')}</option>
                  <option value="dark">{t('preferences.theme.options.dark', 'Dark')}</option>
                  <option value="auto">{t('preferences.theme.options.auto', 'System Default')}</option>
                </select>
              </div>
            </div>

            {prefsError && <p className="text-red-500 text-sm mt-4">{prefsError}</p>}
            <div className="pt-4 flex justify-end">
              <Button onClick={handleSavePreferences} isLoading={prefsLoading} variant="primary">
                {t('preferences.saveButton', 'Save Preferences')}
              </Button>
            </div>
          </div>
        </motion.div>

        {isEditModalOpen && user && (
          <Modal
            isOpen={isEditModalOpen}
            onClose={handleCloseEditModal}
            title={t('editProfileModalTitle', 'Edit Your Profile')}
          >
            <EditProfileForm
              currentUser={user}
              onUpdateProfile={handleUpdateProfile}
              onCancel={handleCloseEditModal}
              isLoading={updateLoading}
              error={updateError}
            />
          </Modal>
        )}
      </div>
    </div>
  );
};

export default Profile;
