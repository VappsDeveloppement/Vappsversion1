
const mainVideo = {
    id: "dQw4w9WgXcQ",
    title: "Découvrez l'approche Vapps en Vidéo"
};

const secondaryVideos = [
    {
        id: "dQw4w9WgXcQ",
        title: "Notre approche holistique"
    },
    {
        id: "dQw4w9WgXcQ",
        title: "Définir vos objectifs de carrière"
    },
    {
        id: "dQw4w9WgXcQ",
        title: "Témoignage : La reconversion de Sarah"
    }
];

export function VideoSection() {
    return (
        <section className="bg-background text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">Découvrez l'approche Vapps en Vidéo</h2>
                    <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
                        Plongez dans notre univers et découvrez comment notre accompagnement peut transformer votre parcours professionnel.
                    </p>
                </div>

                <div className="mb-12">
                    <div className="aspect-video w-full max-w-4xl mx-auto">
                        <iframe 
                            className="w-full h-full rounded-lg shadow-xl"
                            src={`https://www.youtube.com/embed/${mainVideo.id}`}
                            title="YouTube video player" 
                            frameBorder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                            allowFullScreen>
                        </iframe>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {secondaryVideos.map((video, index) => (
                        <div key={index} className="flex flex-col items-center">
                            <div className="aspect-video w-full mb-4">
                                <iframe 
                                    className="w-full h-full rounded-lg shadow-lg"
                                    src={`https://www.youtube.com/embed/${video.id}`}
                                    title="YouTube video player" 
                                    frameBorder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                    allowFullScreen>
                                </iframe>
                            </div>
                            <h3 className="font-semibold text-center">{video.title}</h3>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
