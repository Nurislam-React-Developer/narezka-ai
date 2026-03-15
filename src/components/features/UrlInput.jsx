"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import Input from "@/components/ui/Input";

export default function UrlInput({ url, setUrl, error, setError, onSubmit }) {
  return (
    <div className="flex flex-col gap-2">
      <Input
        id="video-url-input"
        placeholder="Вставьте ссылку на видео..."
        icon={Link2}
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          if (error) setError("");
        }}
        error={error}
        hint={!error ? "YouTube, TikTok, Instagram, VK, Twitter/X, Vimeo, Twitch и 1800+ сайтов" : undefined}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
      />
    </div>
  );
}
