/**
 * Optimizes image URLs by adding resize/format parameters.
 * Supports Supabase Storage and Unsplash URLs.
 */
export function getOptimizedImageUrl(
  url: string,
  width: number,
  height?: number
): string {
  if (!url) return url;

  // Supabase Storage: use render/image transformation endpoint
  if (url.includes('supabase.co/storage/v1/object/public/')) {
    const transformedUrl = url.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    );
    const params = new URLSearchParams();
    params.set('width', String(width));
    if (height) params.set('height', String(height));
    params.set('resize', 'cover');
    params.set('quality', '75');
    return `${transformedUrl}?${params.toString()}`;
  }

  // Unsplash: update w & h params
  if (url.includes('images.unsplash.com')) {
    try {
      const u = new URL(url);
      u.searchParams.set('w', String(width));
      if (height) u.searchParams.set('h', String(height));
      u.searchParams.set('q', '75');
      u.searchParams.set('fm', 'webp');
      return u.toString();
    } catch {
      return url;
    }
  }

  return url;
}
