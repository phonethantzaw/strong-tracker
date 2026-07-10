import { ProgramVideos } from "@/components/program/program-videos";

export default function VideosPage() {
  return (
    <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-6">
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-anton)] text-3xl uppercase tracking-wide md:text-4xl">
          Warm-up & Cool-down
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Watch before and after your workout session.
        </p>
      </div>
      <ProgramVideos />
    </div>
  );
}
