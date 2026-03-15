import { Sparkles } from "lucide-react";

export default function HeroBadge({ text = "AI-Powered Video Clipping" }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full glass border-violet-500/20 text-xs font-semibold tracking-wide text-violet-300 glow-accent">
      <Sparkles size={14} className="text-violet-400" />
      <span>{text}</span>
    </div>
  );
}
