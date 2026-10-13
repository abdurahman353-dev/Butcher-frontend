"use client";

import { useEffect, useRef } from "react";
import { useShopSettings } from "@/contexts/ShopSettingsContext";

const BLANK_FAVICON = "data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function makeCircularFavicon(srcUrl: string, callback: (circularDataUrl: string) => void) {
  if (!srcUrl || srcUrl === BLANK_FAVICON) {
    callback(BLANK_FAVICON);
    return;
  }
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      callback(srcUrl);
      return;
    }

    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const minDim = Math.min(img.width, img.height);
    const sx = (img.width - minDim) / 2;
    const sy = (img.height - minDim) / 2;
    ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

    callback(canvas.toDataURL("image/png"));
  };
  img.onerror = () => callback(srcUrl);
  img.src = srcUrl;
}

function setFaviconHref(href: string) {
  if (typeof document === "undefined") return;

  const links = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
  if (links.length > 0) {
    let alreadySet = false;
    links.forEach((l) => {
      if (l.getAttribute("href") === href || l.href === href) {
        alreadySet = true;
      }
    });
    if (alreadySet) return; // Prevent browser tab favicon redraw flicker

    links.forEach((l) => {
      l.href = href;
    });
  } else {
    const link = document.createElement("link");
    link.rel = "shortcut icon";
    link.href = href;
    document.head.appendChild(link);
  }
}

export function DynamicTitle() {
  const { settings, isLoading } = useShopSettings();
  const currentFaviconRef = useRef<string | null>(null);

  // 1. Initial mount: use cached title and logo
  useEffect(() => {
    try {
      const cached = localStorage.getItem("butcher_shop_name");
      if (cached && cached.trim()) {
        document.title = `${cached.trim()} — POS`;
      }
      const cachedLogo = localStorage.getItem("butcher_shop_logo");
      const initialHref = cachedLogo && cachedLogo.trim() ? cachedLogo.trim() : BLANK_FAVICON;
      
      makeCircularFavicon(initialHref, (circularHref) => {
        currentFaviconRef.current = initialHref;
        setFaviconHref(circularHref);
      });
    } catch {}
  }, []);

  // 2. Settings update: only touch DOM if value actually changed
  useEffect(() => {
    if (settings.shop_name) {
      const newTitle = `${settings.shop_name} — POS`;
      if (document.title !== newTitle) {
        document.title = newTitle;
      }
    }

    // Don't overwrite cached logo while initial API request is in flight
    if (isLoading && !settings.logo_url) {
      return;
    }

    const targetHref = settings.logo_url && settings.logo_url.trim() ? settings.logo_url.trim() : BLANK_FAVICON;
    if (currentFaviconRef.current !== targetHref) {
      currentFaviconRef.current = targetHref;
      makeCircularFavicon(targetHref, (circularHref) => {
        setFaviconHref(circularHref);
      });
    }
  }, [settings.shop_name, settings.logo_url, isLoading]);

  return null;
}
