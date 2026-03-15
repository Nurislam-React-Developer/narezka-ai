import { Suspense } from "react";
import WatchContent from "@/components/features/WatchContent";

export const metadata = {
  title: "Narezka AI — Просмотр клипа",
  description: "Проигрывание нарезанного клипа",
};

function Loading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={<Loading />}>
      <WatchContent />
    </Suspense>
  );
}
