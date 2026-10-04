// Originals stay on the device; only the resized PNG reaches the photo API.
export async function preparePhoto(file: File): Promise<Blob> {
  if (file.size > 50_000_000) throw new Error('Escolha uma foto de até 50 MB.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Use uma foto JPG, PNG ou WebP.');
  }
  let image: ImageBitmap;
  try {
    image = await createImageBitmap(file);
  } catch {
    throw new Error('Não foi possível abrir essa foto. Tente outra imagem.');
  }
  try {
    let scale = Math.min(1, 1200 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a foto neste dispositivo.');
    context.imageSmoothingQuality = 'high';
    for (let attempt = 0; attempt < 8; attempt++) {
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(value => value ? resolve(value) : reject(new Error('Não foi possível preparar a foto.')), 'image/png');
      });
      if (blob.size <= 2_000_000) return blob;
      scale *= 0.8;
    }
    throw new Error('Não foi possível ajustar essa foto. Tente outra imagem.');
  } finally {
    image.close();
  }
}
