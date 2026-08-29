import sceneZafar from "@/assets/scene-oud-zafar.webp";

export function VideoBand() {
  return (
    <section className="bg-foreground px-0 pb-16 pt-4">
      <img
        src={sceneZafar}
        alt="BADR Oud Zafar attar in a cinematic setting"
        loading="lazy"
        decoding="async"
        className="aspect-[16/9] w-full object-cover sm:aspect-[21/9]"
      />
    </section>
  );
}
