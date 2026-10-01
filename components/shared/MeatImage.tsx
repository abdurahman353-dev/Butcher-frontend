import React from "react";

interface MeatImageProps {
  category: string;
  name: string;
  image?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

interface DepartmentTheme {
  tag: string;
  code: string;
  bgGradient: string;
  stampGradient: string;
  stampText: string;
  shadowColor: string;
  pillBg: string;
  pillText: string;
  pillBorder: string;
}

function getDepartmentTheme(category: string, name: string): DepartmentTheme {
  const lowerName = (name || "").toLowerCase();
  const lowerCat = (category || "").toLowerCase();

  if (lowerCat.includes("goat") || lowerName.includes("mbuzi") || lowerName.includes("goat")) {
    return {
      tag: "GOAT / MBUZI",
      code: "GT",
      bgGradient: "bg-gradient-to-b from-amber-300/70 via-amber-200/60 to-amber-100/50 border-b border-amber-300",
      stampGradient: "bg-gradient-to-tr from-amber-600 to-yellow-600",
      stampText: "text-white",
      shadowColor: "shadow-amber-600/35",
      pillBg: "bg-white/95",
      pillText: "text-amber-950",
      pillBorder: "border-amber-300",
    };
  }

  if (
    lowerCat.includes("chicken") ||
    lowerName.includes("chicken") ||
    lowerName.includes("kuku") ||
    lowerName.includes("poultry") ||
    lowerName.includes("duck")
  ) {
    return {
      tag: "POULTRY",
      code: "CK",
      bgGradient: "bg-gradient-to-b from-yellow-300/70 via-yellow-200/60 to-amber-100/50 border-b border-yellow-300",
      stampGradient: "bg-gradient-to-tr from-amber-400 to-yellow-500",
      stampText: "text-amber-950",
      shadowColor: "shadow-yellow-500/35",
      pillBg: "bg-white/95",
      pillText: "text-amber-950",
      pillBorder: "border-yellow-300",
    };
  }

  if (
    lowerCat.includes("mince") ||
    lowerName.includes("mince") ||
    lowerName.includes("burger") ||
    lowerName.includes("patty")
  ) {
    return {
      tag: "MINCE / PATTIES",
      code: "MC",
      bgGradient: "bg-gradient-to-b from-red-300/60 via-red-200/60 to-rose-100/50 border-b border-red-300",
      stampGradient: "bg-gradient-to-tr from-red-600 to-rose-600",
      stampText: "text-white",
      shadowColor: "shadow-red-600/35",
      pillBg: "bg-white/95",
      pillText: "text-red-950",
      pillBorder: "border-red-300",
    };
  }

  if (
    lowerCat.includes("sausage") ||
    lowerName.includes("boerewors") ||
    lowerName.includes("sausage") ||
    lowerCat.includes("deli")
  ) {
    return {
      tag: "SAUSAGE & DELI",
      code: "SG",
      bgGradient: "bg-gradient-to-b from-orange-300/70 via-orange-200/65 to-amber-100/50 border-b border-orange-300",
      stampGradient: "bg-gradient-to-tr from-orange-500 to-amber-500",
      stampText: "text-white",
      shadowColor: "shadow-orange-500/35",
      pillBg: "bg-white/95",
      pillText: "text-orange-950",
      pillBorder: "border-orange-300",
    };
  }

  if (
    lowerCat.includes("offal") ||
    lowerName.includes("liver") ||
    lowerName.includes("matumbo") ||
    lowerCat.includes("special")
  ) {
    return {
      tag: "OFFAL & SPECIAL",
      code: "OF",
      bgGradient: "bg-gradient-to-b from-purple-300/65 via-purple-200/60 to-indigo-100/50 border-b border-purple-300",
      stampGradient: "bg-gradient-to-tr from-purple-600 to-indigo-600",
      stampText: "text-white",
      shadowColor: "shadow-purple-600/35",
      pillBg: "bg-white/95",
      pillText: "text-purple-950",
      pillBorder: "border-purple-300",
    };
  }

  if (lowerCat.includes("pork") || lowerCat.includes("pig")) {
    return {
      tag: "PORK",
      code: "PK",
      bgGradient: "bg-gradient-to-b from-pink-300/65 via-pink-200/60 to-rose-100/50 border-b border-pink-300",
      stampGradient: "bg-gradient-to-tr from-pink-500 to-rose-600",
      stampText: "text-white",
      shadowColor: "shadow-pink-500/35",
      pillBg: "bg-white/95",
      pillText: "text-pink-950",
      pillBorder: "border-pink-300",
    };
  }

  if (lowerCat.includes("lamb") || lowerName.includes("lamb") || lowerCat.includes("mutton")) {
    return {
      tag: "LAMB / MUTTON",
      code: "LB",
      bgGradient: "bg-gradient-to-b from-pink-300/65 via-pink-200/60 to-rose-100/50 border-b border-pink-300",
      stampGradient: "bg-gradient-to-tr from-pink-500 to-rose-600",
      stampText: "text-white",
      shadowColor: "shadow-pink-500/35",
      pillBg: "bg-white/95",
      pillText: "text-pink-950",
      pillBorder: "border-pink-300",
    };
  }

  if (
    lowerCat.includes("fish") ||
    lowerCat.includes("seafood") ||
    lowerName.includes("fish") ||
    lowerName.includes("tilapia") ||
    lowerName.includes("salmon")
  ) {
    return {
      tag: "SEAFOOD",
      code: "SF",
      bgGradient: "bg-gradient-to-b from-sky-300/65 via-sky-200/60 to-blue-100/50 border-b border-sky-300",
      stampGradient: "bg-gradient-to-tr from-sky-500 to-blue-600",
      stampText: "text-white",
      shadowColor: "shadow-sky-500/35",
      pillBg: "bg-white/95",
      pillText: "text-sky-950",
      pillBorder: "border-sky-300",
    };
  }

  if (
    lowerCat.includes("egg") ||
    lowerCat.includes("dairy") ||
    lowerName.includes("egg") ||
    lowerName.includes("butter") ||
    lowerName.includes("ghee")
  ) {
    return {
      tag: "DAIRY & EGGS",
      code: "DY",
      bgGradient: "bg-gradient-to-b from-amber-300/70 via-amber-200/60 to-yellow-100/50 border-b border-amber-300",
      stampGradient: "bg-gradient-to-tr from-amber-500 to-yellow-600",
      stampText: "text-white",
      shadowColor: "shadow-amber-500/35",
      pillBg: "bg-white/95",
      pillText: "text-amber-950",
      pillBorder: "border-amber-300",
    };
  }

  // Default: Beef
  return {
    tag: "BEEF CUT",
    code: "BF",
    bgGradient: "bg-gradient-to-b from-rose-300/65 via-rose-200/60 to-red-100/50 border-b border-rose-300",
    stampGradient: "bg-gradient-to-tr from-rose-600 to-red-600",
    stampText: "text-white",
    shadowColor: "shadow-rose-600/35",
    pillBg: "bg-white/95",
    pillText: "text-rose-950",
    pillBorder: "border-rose-300",
  };
}

export function MeatImage({
  category,
  name,
  image,
  className = "w-full h-full",
  size,
}: MeatImageProps) {
  if (image && image.trim()) {
    return (
      <div className={`relative overflow-hidden bg-zinc-100 rounded-xl select-none ${className}`}>
        <img src={image} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  const theme = getDepartmentTheme(category, name);

  // Compact Thumbnail (sm) — code fills the entire cell, no inner box
  if (size === "sm") {
    return (
      <div
        className={`w-full h-full flex items-center justify-center select-none ${theme.stampGradient}`}
      >
        <span className={`font-black text-[11px] font-mono tracking-widest ${theme.stampText}`}>
          {theme.code}
        </span>
      </div>
    );
  }

  // POS Card View — code fills the whole card, no inner box background
  return (
    <div
      className={`relative overflow-hidden flex flex-col items-center justify-center ${theme.stampGradient} select-none ${className}`}
    >
      <div className="flex flex-col items-center justify-center transition-transform group-hover:scale-105 duration-200">
        {/* Code fills the card — no inner box */}
        <span
          className={`font-black text-4xl font-mono tracking-widest drop-shadow-md ${theme.stampText}`}
        >
          {theme.code}
        </span>
        {/* Subtle tag label — no heavy pill, just a soft text label */}
        <span
          className={`text-[9px] font-extrabold tracking-widest uppercase mt-1 opacity-80 font-mono ${theme.stampText}`}
        >
          {theme.tag}
        </span>
      </div>
    </div>
  );
}
