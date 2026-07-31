"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1` : null;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1`;
      const parts = u.pathname.split("/");
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && parts[embedIdx + 1]) {
        return `https://www.youtube.com/embed/${parts[embedIdx + 1]}?autoplay=1&playsinline=1`;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url) || url.includes("r2.dev") || url.includes("cloudflarestorage.com");
}

type VideoPlayerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  url: string;
};

export function VideoPlayerDialog({ open, onOpenChange, title, url }: VideoPlayerDialogProps) {
  const yt = youtubeEmbedUrl(url);
  const direct = !yt && (isDirectVideo(url) || url.startsWith("http"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-3 p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="pr-8">{title}</DialogTitle>
          <DialogDescription className="sr-only">Exercise demonstration video</DialogDescription>
        </DialogHeader>
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          {open && yt ? (
            <iframe
              src={yt}
              title={title}
              className="size-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : open && direct ? (
            <video src={url} controls playsInline autoPlay preload="metadata" className="size-full object-contain" />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
