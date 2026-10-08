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

const FALLBACK_PALETTES = [
  {
    bgGradient: "bg-gradient-to-b from-indigo-300/70 via-indigo-200/60 to-purple-100/50 border-b border-indigo-300",
    stampGradient: "bg-gradient-to-tr from-indigo-600 to-purple-600",
    stampText: "text-white",
    shadowColor: "shadow-indigo-600/35",
    pillBg: "bg-white/95",
    pillText: "text-indigo-950",
    pillBorder: "border-indigo-300",
  },
  {
    bgGradient: "bg-gradient-to-b from-emerald-300/70 via-emerald-200/60 to-teal-100/50 border-b border-emerald-300",
    stampGradient: "bg-gradient-to-tr from-emerald-600 to-teal-700",
    stampText: "text-white",
    shadowColor: "shadow-emerald-600/35",
    pillBg: "bg-white/95",
    pillText: "text-emerald-950",
    pillBorder: "border-emerald-300",
  },
  {
    bgGradient: "bg-gradient-to-b from-rose-300/70 via-rose-200/60 to-pink-100/50 border-b border-rose-300",
    stampGradient: "bg-gradient-to-tr from-rose-600 to-pink-600",
    stampText: "text-white",
    shadowColor: "shadow-rose-600/35",
    pillBg: "bg-white/95",
    pillText: "text-rose-950",
    pillBorder: "border-rose-300",
  },
  {
    bgGradient: "bg-gradient-to-b from-amber-300/70 via-amber-200/60 to-yellow-100/50 border-b border-amber-300",
    stampGradient: "bg-gradient-to-tr from-amber-600 to-orange-600",
    stampText: "text-white",
    shadowColor: "shadow-amber-600/35",
    pillBg: "bg-white/95",
    pillText: "text-amber-950",
    pillBorder: "border-amber-300",
  },
  {
    bgGradient: "bg-gradient-to-b from-cyan-300/70 via-cyan-200/60 to-sky-100/50 border-b border-cyan-300",
    stampGradient: "bg-gradient-to-tr from-cyan-600 to-sky-700",
    stampText: "text-white",
    shadowColor: "shadow-cyan-600/35",
    pillBg: "bg-white/95",
    pillText: "text-cyan-950",
    pillBorder: "border-cyan-300",
  },
];

function getDepartmentTheme(category: string, name: string): DepartmentTheme {
  const lowerName = (name || "").toLowerCase();
  const lowerCat = (category || "").toLowerCase();

  // 1. Goat / Mbuzi
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

  // 2. Poultry & Chicken
  if (
    lowerCat.includes("chicken") ||
    lowerName.includes("chicken") ||
    lowerName.includes("kuku") ||
    lowerCat.includes("poultry") ||
    lowerName.includes("duck") ||
    lowerName.includes("wings")
  ) {
    return {
      tag: "POULTRY",
      code: "CK",
      bgGradient: "bg-gradient-to-b from-yellow-300/70 via-yellow-200/60 to-amber-100/50 border-b border-yellow-300",
      stampGradient: "bg-gradient-to-tr from-amber-500 to-yellow-500",
      stampText: "text-amber-950",
      shadowColor: "shadow-yellow-500/35",
      pillBg: "bg-white/95",
      pillText: "text-amber-950",
      pillBorder: "border-yellow-300",
    };
  }

  // 3. Cocktails & Liquor / Wine
  if (
    lowerCat.includes("cocktail") ||
    lowerName.includes("cocktail") ||
    lowerName.includes("margarita") ||
    lowerName.includes("mojito") ||
    lowerName.includes("gin") ||
    lowerName.includes("vodka") ||
    lowerName.includes("rum") ||
    lowerName.includes("whisky") ||
    lowerName.includes("brandy")
  ) {
    return {
      tag: "JUICES & BEVERAGES",
      code: "DRINK",
      bgGradient: "bg-gradient-to-b from-violet-300/70 via-fuchsia-200/60 to-pink-100/50 border-b border-violet-300",
      stampGradient: "bg-gradient-to-tr from-violet-600 to-fuchsia-600",
      stampText: "text-white",
      shadowColor: "shadow-violet-600/35",
      pillBg: "bg-white/95",
      pillText: "text-violet-950",
      pillBorder: "border-violet-300",
    };
  }

  // 4. Wine
  if (lowerCat.includes("wine") || lowerName.includes("wine") || lowerName.includes("chardonnay") || lowerName.includes("merlot") || lowerName.includes("sauvignon")) {
    return {
      tag: "WINE & CELLAR",
      code: "WN",
      bgGradient: "bg-gradient-to-b from-rose-300/70 via-purple-200/60 to-red-100/50 border-b border-rose-300",
      stampGradient: "bg-gradient-to-tr from-rose-800 to-purple-800",
      stampText: "text-white",
      shadowColor: "shadow-rose-800/35",
      pillBg: "bg-white/95",
      pillText: "text-rose-950",
      pillBorder: "border-rose-300",
    };
  }

  // 5. Beer
  if (
    lowerCat.includes("beer") ||
    lowerName.includes("beer") ||
    lowerName.includes("tusker") ||
    lowerName.includes("guinness") ||
    lowerName.includes("heineken") ||
    lowerName.includes("cider")
  ) {
    return {
      tag: "BEER & CIDERS",
      code: "BR",
      bgGradient: "bg-gradient-to-b from-amber-400/70 via-amber-300/60 to-yellow-100/50 border-b border-amber-400",
      stampGradient: "bg-gradient-to-tr from-amber-600 to-yellow-600",
      stampText: "text-white",
      shadowColor: "shadow-amber-600/35",
      pillBg: "bg-white/95",
      pillText: "text-amber-950",
      pillBorder: "border-amber-300",
    };
  }

  // 6. Non-Alcoholic Beverages & Juices
  if (
    lowerCat.includes("drink") ||
    lowerCat.includes("beverage") ||
    lowerCat.includes("juice") ||
    lowerName.includes("soda") ||
    lowerName.includes("water") ||
    lowerName.includes("juice") ||
    lowerName.includes("fanta") ||
    lowerName.includes("coke") ||
    lowerName.includes("sprite") ||
    lowerName.includes("smoothie")
  ) {
    return {
      tag: "BEVERAGE",
      code: "DK",
      bgGradient: "bg-gradient-to-b from-cyan-300/70 via-cyan-200/60 to-blue-100/50 border-b border-cyan-300",
      stampGradient: "bg-gradient-to-tr from-cyan-500 to-blue-600",
      stampText: "text-white",
      shadowColor: "shadow-cyan-500/35",
      pillBg: "bg-white/95",
      pillText: "text-cyan-950",
      pillBorder: "border-cyan-300",
    };
  }

  // 7. Coffee & Tea
  if (
    lowerCat.includes("tea") ||
    lowerCat.includes("coffee") ||
    lowerCat.includes("hot drink") ||
    lowerName.includes("tea") ||
    lowerName.includes("coffee") ||
    lowerName.includes("chai") ||
    lowerName.includes("espresso") ||
    lowerName.includes("cappuccino") ||
    lowerName.includes("latte")
  ) {
    return {
      tag: "COFFEE & TEA",
      code: "CF",
      bgGradient: "bg-gradient-to-b from-stone-400/70 via-amber-200/60 to-orange-100/50 border-b border-stone-400",
      stampGradient: "bg-gradient-to-tr from-stone-700 to-amber-800",
      stampText: "text-white",
      shadowColor: "shadow-stone-600/35",
      pillBg: "bg-white/95",
      pillText: "text-stone-950",
      pillBorder: "border-stone-300",
    };
  }

  // 8. Pizza & Italian
  if (lowerCat.includes("pizza") || lowerName.includes("pizza")) {
    return {
      tag: "PIZZA & OVEN",
      code: "PZ",
      bgGradient: "bg-gradient-to-b from-orange-400/70 via-amber-300/60 to-yellow-100/50 border-b border-orange-400",
      stampGradient: "bg-gradient-to-tr from-orange-600 to-amber-600",
      stampText: "text-white",
      shadowColor: "shadow-orange-600/35",
      pillBg: "bg-white/95",
      pillText: "text-orange-950",
      pillBorder: "border-orange-300",
    };
  }

  // 9. Pasta & Noodles
  if (lowerCat.includes("pasta") || lowerName.includes("pasta") || lowerName.includes("spaghetti") || lowerName.includes("penne") || lowerName.includes("noodles")) {
    return {
      tag: "PASTA & GRAINS",
      code: "PA",
      bgGradient: "bg-gradient-to-b from-amber-300/70 via-yellow-200/60 to-orange-100/50 border-b border-amber-300",
      stampGradient: "bg-gradient-to-tr from-amber-500 to-yellow-600",
      stampText: "text-amber-950",
      shadowColor: "shadow-amber-500/35",
      pillBg: "bg-white/95",
      pillText: "text-amber-950",
      pillBorder: "border-amber-300",
    };
  }

  // 10. Burgers, Patties & Sandwiches
  if (
    lowerCat.includes("burger") ||
    lowerName.includes("burger") ||
    lowerName.includes("patty") ||
    lowerName.includes("sandwich") ||
    lowerName.includes("wrap") ||
    lowerName.includes("taco")
  ) {
    return {
      tag: "BURGERS & WRAPS",
      code: "BG",
      bgGradient: "bg-gradient-to-b from-red-300/60 via-red-200/60 to-rose-100/50 border-b border-red-300",
      stampGradient: "bg-gradient-to-tr from-red-600 to-rose-600",
      stampText: "text-white",
      shadowColor: "shadow-red-600/35",
      pillBg: "bg-white/95",
      pillText: "text-red-950",
      pillBorder: "border-red-300",
    };
  }

  // 11. Salads, Soups & Appetizers
  if (
    lowerCat.includes("salad") ||
    lowerCat.includes("starter") ||
    lowerCat.includes("soup") ||
    lowerCat.includes("appetizer") ||
    lowerName.includes("salad") ||
    lowerName.includes("soup") ||
    lowerName.includes("starter")
  ) {
    return {
      tag: "SALAD & STARTER",
      code: "ST",
      bgGradient: "bg-gradient-to-b from-emerald-300/70 via-emerald-200/60 to-green-100/50 border-b border-emerald-300",
      stampGradient: "bg-gradient-to-tr from-emerald-600 to-teal-600",
      stampText: "text-white",
      shadowColor: "shadow-emerald-600/35",
      pillBg: "bg-white/95",
      pillText: "text-emerald-950",
      pillBorder: "border-emerald-300",
    };
  }

  // 12. Desserts & Bakery
  if (
    lowerCat.includes("dessert") ||
    lowerCat.includes("bakery") ||
    lowerCat.includes("cake") ||
    lowerName.includes("cake") ||
    lowerName.includes("ice cream") ||
    lowerName.includes("pastry") ||
    lowerName.includes("pie")
  ) {
    return {
      tag: "DESSERT & SWEETS",
      code: "DS",
      bgGradient: "bg-gradient-to-b from-pink-300/70 via-rose-200/60 to-amber-100/50 border-b border-pink-300",
      stampGradient: "bg-gradient-to-tr from-pink-600 to-rose-600",
      stampText: "text-white",
      shadowColor: "shadow-pink-600/35",
      pillBg: "bg-white/95",
      pillText: "text-pink-950",
      pillBorder: "border-pink-300",
    };
  }

  // 13. Sausages & Deli
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

  // 14. Offal & Special Cuts
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

  // 15. Pork
  if (lowerCat.includes("pork") || lowerCat.includes("pig") || lowerName.includes("pork") || lowerName.includes("bacon")) {
    return {
      tag: "PORK CUT",
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

  // 16. Lamb & Mutton
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

  // 17. Seafood & Fish
  if (
    lowerCat.includes("fish") ||
    lowerCat.includes("seafood") ||
    lowerName.includes("fish") ||
    lowerName.includes("tilapia") ||
    lowerName.includes("salmon") ||
    lowerName.includes("prawns") ||
    lowerName.includes("calamari")
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

  // 18. Sides & Accompaniments
  if (
    lowerCat.includes("side") ||
    lowerCat.includes("accompaniment") ||
    lowerName.includes("ugali") ||
    lowerName.includes("rice") ||
    lowerName.includes("chapati") ||
    lowerName.includes("mukimo") ||
    lowerName.includes("kachumbari") ||
    lowerName.includes("greens") ||
    lowerName.includes("sukuma")
  ) {
    return {
      tag: "SIDE DISH",
      code: "SD",
      bgGradient: "bg-gradient-to-b from-emerald-300/70 via-emerald-200/60 to-teal-100/50 border-b border-emerald-300",
      stampGradient: "bg-gradient-to-tr from-emerald-600 to-teal-600",
      stampText: "text-white",
      shadowColor: "shadow-emerald-600/35",
      pillBg: "bg-white/95",
      pillText: "text-emerald-950",
      pillBorder: "border-emerald-300",
    };
  }

  // 19. Fast Food & Fries
  if (
    lowerCat.includes("fast food") ||
    lowerCat.includes("chips") ||
    lowerName.includes("chips") ||
    lowerName.includes("fries") ||
    lowerName.includes("samosa")
  ) {
    return {
      tag: "SNACKS & FRIES",
      code: "FF",
      bgGradient: "bg-gradient-to-b from-orange-300/70 via-yellow-200/60 to-amber-100/50 border-b border-orange-300",
      stampGradient: "bg-gradient-to-tr from-orange-500 to-yellow-500",
      stampText: "text-white",
      shadowColor: "shadow-orange-500/35",
      pillBg: "bg-white/95",
      pillText: "text-orange-950",
      pillBorder: "border-orange-300",
    };
  }

  // 20. Main Meals & Entrees
  if (
    lowerCat.includes("main") ||
    lowerCat.includes("meal") ||
    lowerCat.includes("entree") ||
    lowerName.includes("stew") ||
    lowerName.includes("fry") ||
    lowerName.includes("plate")
  ) {
    return {
      tag: "MAIN DISH",
      code: "MEAL",
      bgGradient: "bg-gradient-to-b from-red-400/70 via-orange-300/60 to-amber-100/50 border-b border-red-400",
      stampGradient: "bg-gradient-to-tr from-red-600 to-orange-600",
      stampText: "text-white",
      shadowColor: "shadow-red-600/35",
      pillBg: "bg-white/95",
      pillText: "text-red-950",
      pillBorder: "border-red-300",
    };
  }

  // 21. Beef & Steaks (explicit check)
  if (
    lowerCat.includes("beef") ||
    lowerCat.includes("steak") ||
    lowerName.includes("beef") ||
    lowerName.includes("steak") ||
    lowerName.includes("ribeye") ||
    lowerName.includes("sirloin") ||
    lowerName.includes("t-bone") ||
    lowerName.includes("fillet")
  ) {
    return {
      tag: "BEEF / STEAK",
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

  // 22. Universal Dynamic Fallback (Extract initials and use category tag)
  const words = (name || "Item").trim().split(/\s+/).filter(Boolean);
  let code = "IT";
  if (words.length >= 2) {
    code = (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1 && words[0].length >= 2) {
    code = words[0].substring(0, 2).toUpperCase();
  } else if (words.length === 1) {
    code = words[0].toUpperCase();
  }

  // Hash code to pick a deterministic vibrant theme
  const combined = `${category}-${name}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash * 31 + combined.charCodeAt(i)) & 0xffffffff;
  }
  const palette = FALLBACK_PALETTES[Math.abs(hash) % FALLBACK_PALETTES.length];

  const tag = (category && category.trim()) ? category.trim().toUpperCase() : "MENU ITEM";

  return {
    tag,
    code,
    ...palette,
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

  // Compact Thumbnail (sm)
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

  // Full Card View
  return (
    <div
      className={`relative overflow-hidden flex flex-col items-center justify-center ${theme.stampGradient} select-none ${className}`}
    >
      <div className="flex flex-col items-center justify-center transition-transform group-hover:scale-105 duration-200">
        <span
          className={`font-black text-4xl font-mono tracking-widest drop-shadow-md ${theme.stampText}`}
        >
          {theme.code}
        </span>
        <span
          className={`text-[9px] font-extrabold tracking-widest uppercase mt-1 opacity-80 font-mono ${theme.stampText}`}
        >
          {theme.tag}
        </span>
      </div>
    </div>
  );
}

// Universal alias
export const ItemImage = MeatImage;
