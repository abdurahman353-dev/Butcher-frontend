import React from "react";

interface MeatImageProps {
  category: string;
  name: string;
  className?: string;
}

export function MeatImage({ category, name, className = "w-full h-full" }: MeatImageProps) {
  const lowerName = name.toLowerCase();
  const lowerCat = category.toLowerCase();

  let bg = "bg-rose-50/80 border-rose-100 text-rose-600";
  let icon = "🥩";
  let tag = "BEEF";

  if (lowerCat.includes("goat") || lowerName.includes("mbuzi") || lowerName.includes("goat")) {
    bg = "bg-amber-50/80 border-amber-100 text-amber-600";
    icon = "🐐";
    tag = "GOAT";
  } else if (lowerCat.includes("chicken") || lowerName.includes("chicken") || lowerName.includes("kuku")) {
    bg = "bg-yellow-50/80 border-yellow-100 text-yellow-600";
    icon = "🍗";
    tag = "CHICKEN";
  } else if (lowerCat.includes("mince") || lowerName.includes("mince") || lowerName.includes("burger")) {
    bg = "bg-red-50/80 border-red-100 text-red-600";
    icon = "🍔";
    tag = "MINCE";
  } else if (lowerCat.includes("sausage") || lowerName.includes("boerewors") || lowerName.includes("sausage")) {
    bg = "bg-orange-50/80 border-orange-100 text-orange-600";
    icon = "🌭";
    tag = "SAUSAGE";
  } else if (lowerCat.includes("offal") || lowerName.includes("liver") || lowerName.includes("matumbo")) {
    bg = "bg-purple-50/80 border-purple-100 text-purple-600";
    icon = "🍲";
    tag = "OFFAL";
  } else if (lowerCat.includes("pork") || lowerCat.includes("lamb") || lowerName.includes("lamb") || lowerName.includes("pork")) {
    bg = "bg-pink-50/80 border-pink-100 text-pink-600";
    icon = "🍖";
    tag = "PORK/LAMB";
  }

  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center ${bg} border rounded-xl select-none ${className}`}
    >
      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-white/95 shadow-2xs text-[10px] font-bold tracking-wider text-slate-700 border border-slate-200/80">
        {tag}
      </div>

      <div className="flex flex-col items-center justify-center transform transition-transform group-hover:scale-110 duration-200">
        <span className="text-3xl sm:text-4xl filter drop-shadow-xs">{icon}</span>
      </div>
    </div>
  );
}
