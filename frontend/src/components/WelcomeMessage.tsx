import { useTranslation } from "react-i18next";
import {
  formatRelativeTime,
  getTimeBasedGreeting,
} from "../i18n/utils/culturalFormatting";

interface WelcomeMessageProps {
  userName?: string;
  lastLoginDate?: Date;
}

export const WelcomeMessage: React.FC<WelcomeMessageProps> = ({
  userName = "Guest",
  lastLoginDate,
}) => {
  const { t, i18n } = useTranslation("common");

  const greeting = getTimeBasedGreeting(i18n.language);
  const lastLogin = lastLoginDate
    ? formatRelativeTime(lastLoginDate, i18n.language)
    : null;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        {greeting}, {userName}!
      </h2>
      <p className="text-gray-600">{t("messages.welcomeBack")}</p>
      {lastLogin && (
        <p className="text-sm text-gray-500 mt-2">
          {t("messages.lastLogin")}: {lastLogin}
        </p>
      )}
    </div>
  );
};

export default WelcomeMessage;
