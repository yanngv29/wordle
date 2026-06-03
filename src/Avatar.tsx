import React from "react";

interface AvatarProps {
  playerId?: string;
  username?: string;
  size?: "sm" | "md" | "lg"; // sm=40px, md=80px, lg=120px
  showBorder?: boolean;
  className?: string;
  onClick?: () => void;
}

// Map sizes to pixel values and Tailwind classes
const SIZES = {
  sm: { px: 40, class: "w-10 h-10" },
  md: { px: 80, class: "w-20 h-20" },
  lg: { px: 120, class: "w-30 h-30" },
};

/**
 * Generate a color based on playerId or username for fallback initials
 */
function getColorFromId(id?: string): string {
  if (!id) return "bg-gray-400";

  const colors = [
    "bg-red-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-yellow-500",
    "bg-cyan-500",
  ];

  // Generate a consistent color based on playerId hash
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Extract initials from username
 */
function getInitials(username?: string): string {
  if (!username) return "?";
  return username
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Avatar({
  playerId,
  username,
  size = "md",
  showBorder = false,
  className = "",
  onClick,
}: AvatarProps) {
  const sizeConfig = SIZES[size];
  const borderClass = showBorder ? "border-4 border-white shadow-lg" : "";
  const cursorClass = onClick ? "cursor-pointer hover:opacity-80" : "";
  const colorClass = getColorFromId(playerId);
  const initials = getInitials(username);
  const avatarUrl = playerId ? `/api/avatar/${playerId}` : null;

  return (
    <div
      onClick={onClick}
      className={`
        relative inline-flex items-center justify-center
        rounded-full overflow-hidden
        ${sizeConfig.class}
        ${borderClass}
        ${cursorClass}
        transition-opacity
        ${className}
      `}
      title={username || "Avatar"}
    >
      {/* Avatar image */}
      {avatarUrl && (
        <img
          src={avatarUrl}
          alt={username || "Avatar"}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Hide image on error, show fallback instead
            e.currentTarget.style.display = "none";
          }}
        />
      )}

      {/* Fallback: initials on colored background */}
      <div
        className={`
          w-full h-full
          flex items-center justify-center
          ${colorClass}
          text-white font-bold
          text-lg
        `}
        style={{
          fontSize: `${sizeConfig.px * 0.4}px`,
        }}
      >
        {initials}
      </div>
    </div>
  );
}
