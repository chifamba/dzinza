import React, { useState } from "react";
import { getDefaultAvatar } from "../utils/getDefaultAvatar";

interface ProfileAvatarProps {
  imageUrl?: string;
  name: string;
  age?: number;
  sex?: string;
  race?: string;
  skinTone?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-24 h-24",
};

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  imageUrl,
  name,
  age,
  sex,
  race,
  skinTone,
  size = "md",
  className = "",
  onClick,
}) => {
  const [imgError, setImgError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const avatarUrl = getDefaultAvatar({
    age,
    sex,
    race,
    skinTone,
    imageUrl: imgError ? undefined : imageUrl, // If user image fails, use generated one
  });

  console.log("ProfileAvatar generated URL:", avatarUrl, {
    name,
    age,
    sex,
    imageUrl,
  });

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    console.log("Avatar image failed to load:", avatarUrl);
    setImgError(true);
    setIsLoading(false);
  };

  // Fallback to initials if all else fails
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate a local fallback avatar path if needed
  const getLocalFallback = () => {
    const ageGroup =
      age && age < 13
        ? "child"
        : age && age >= 60
        ? "senior"
        : age && age < 20
        ? "teen"
        : "adult";
    const gender =
      sex === "male" ? "male" : sex === "female" ? "female" : "neutral";
    const skinTone = "medium"; // Default skin tone
    return `/avatars/${ageGroup}_${gender}_${skinTone}.svg`;
  };

  return (
    <div
      className={`relative inline-block ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      {isLoading && (
        <div
          className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-gray-200 animate-pulse flex items-center justify-center`}
        >
          <div className="text-gray-400 text-xs">...</div>
        </div>
      )}

      {!imgError ? (
        <img
          src={avatarUrl}
          alt={`${name}'s profile`}
          className={`${
            sizeClasses[size]
          } rounded-full object-cover border border-gray-200 shadow-sm transition-opacity duration-200 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
      ) : (
        // Fallback to colored background with initials
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold border border-gray-200 shadow-sm`}
        >
          <span
            className={`${
              size === "sm"
                ? "text-xs"
                : size === "md"
                ? "text-sm"
                : size === "lg"
                ? "text-lg"
                : "text-xl"
            }`}
          >
            {getInitials(name)}
          </span>
        </div>
      )}
    </div>
  );
};

export default ProfileAvatar;
