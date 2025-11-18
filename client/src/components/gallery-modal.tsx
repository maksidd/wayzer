import * as React from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";

interface GalleryModalProps {
  photos: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export const GalleryModal: React.FC<GalleryModalProps> = ({ photos, initialIndex = 0, isOpen, onClose, title, description }) => {
  const [current, setCurrent] = React.useState(0);
  const [emblaApi, setEmblaApi] = React.useState<any>(null);

  // Subscribe to slide change for correct indicator dots
  React.useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrent(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    onSelect();
    return () => emblaApi.off('select', onSelect);
  }, [emblaApi]);

  // On modal open or initialIndex change — scroll to needed photo
  React.useEffect(() => {
    if (isOpen && emblaApi) {
      emblaApi.scrollTo(initialIndex);
    }
  }, [isOpen, initialIndex, emblaApi]);

  if (!photos || photos.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 bg-black flex flex-col items-center justify-center">
        <DialogTitle className="sr-only">{title || "Route photo gallery"}</DialogTitle>
        {description && <DialogDescription className="sr-only">{description}</DialogDescription>}
        <div className="relative w-full h-[60vh] flex items-center justify-center bg-black rounded-lg">
          <Carousel
            opts={{ loop: true, skipSnaps: true }}
            setApi={setEmblaApi}
            className="w-full h-full"
          >
            <CarouselContent className="h-full">
              {photos.map((photo, idx) => (
                <CarouselItem key={idx} className="flex items-center justify-center h-[60vh]">
                  <img
                    src={photo}
                    alt={`Photo ${idx + 1}`}
                    className="max-h-[60vh] max-w-full object-contain select-none"
                    draggable={false}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/70 hover:bg-white" />
            <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/70 hover:bg-white" />
          </Carousel>
        </div>
        <div className="flex gap-2 mt-4 mb-2 justify-center">
          {photos.map((_, idx) => (
            <button
              key={idx}
              className={`w-2 h-2 rounded-full ${idx === current ? 'bg-white' : 'bg-gray-500'} transition-all`}
              onClick={() => emblaApi?.scrollTo(idx)}
              aria-label={`Show photo ${idx + 1}`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 