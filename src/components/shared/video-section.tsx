

'use client';

import { useAgency } from "@/context/agency-provider";

export function VideoSection() {
    const { personalization } = useAgency();
    const videoSettings = personalization?.videoSection;

    if (!videoSettings) {
        return (
            <section className="bg-background text-foreground py-16 sm:py-24">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-muted-foreground">La section vidéo n'a pas encore été configurée.</p>
                </div>
            </section>
        );
    }
    
    const { sectionTitle, sectionSubtitle, mainVideoUrl, secondaryVideos } = videoSettings;

    return (
        <section className="bg-background text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">{sectionTitle}</h2>
                    <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
                        {sectionSubtitle}
                    </p>
                </div>

                {mainVideoUrl && (
                    <div className="mb-12">
                        <div className="aspect-video w-full max-w-4xl mx-auto">
                            <iframe 
                                className="w-full h-full rounded-lg shadow-xl"
                                src={mainVideoUrl}
                                title="Vidéo principale" 
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                allowFullScreen>
                            </iframe>
                        </div>
                    </div>
                )}

                {secondaryVideos && secondaryVideos.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {secondaryVideos.map((video) => (
                            <div key={video.id} className="flex flex-col items-center">
                                <div className="aspect-video w-full mb-4">
                                    <iframe 
                                        className="w-full h-full rounded-lg shadow-lg"
                                        src={video.url}
                                        title={video.title} 
                                        frameBorder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                        allowFullScreen>
                                    </iframe>
                                </div>
                                <h3 className="font-semibold text-center">{video.title}</h3>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
