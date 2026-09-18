export async function prepareReviewPhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type))
    throw new Error("Choose a JPG, PNG, WebP or AVIF photo. Export HEIC photos as JPG first.");
  if (file.size > 12 * 1024 * 1024) throw new Error("Choose a photo smaller than 12 MB.");
  const image = await createImageBitmap(file).catch(() => {
    throw new Error("This photo could not be read. Try exporting it as JPG.");
  });
  try {
    if (image.width * image.height > 40_000_000)
      throw new Error("Choose a photo smaller than 40 megapixels.");
    const ratio = Math.min(1, 1200 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo preparation is unavailable in this browser.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.8, 0.65, 0.45]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality),
      );
      if (blob?.type === "image/webp" && blob.size <= 500_000) {
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1]);
          reader.onerror = () =>
            reject(new Error("Could not prepare the photo. Please try again."));
          reader.readAsDataURL(blob);
        });
      }
    }
    throw new Error("Please choose a smaller photo or try an updated browser.");
  } finally {
    image.close();
  }
}
