
import Phaser from 'phaser';

export interface SpriteBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface SpriteBoundsRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class SpriteBoundsAnalyzer {
  private readonly scene: Phaser.Scene;

  private readonly cache = new Map<string, SpriteBounds | null>();

  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.canvas = document.createElement('canvas');

    const context = this.canvas.getContext('2d', {
      willReadFrequently: true
    });

    if (!context) {
      throw new Error(
        'No se pudo crear el contexto Canvas del analizador.'
      );
    }

    this.context = context;
  }

  analyze(
    textureKey: string,
    frameName: string | number = 0,
    region?: SpriteBoundsRegion
  ): SpriteBounds | null {
    const texture = this.scene.textures.get(textureKey);

    const frames = texture.frames as Record<
      string,
      Phaser.Textures.Frame
    >;

    const frameKey = String(frameName);

    const frame =
      frames[frameKey] ??
      (frameName === 0 ? frames['__BASE'] : undefined);

    if (!frame) {
      throw new Error(
        `No existe el frame "${frameKey}" en "${textureKey}".`
      );
    }

    const width = frame.cutWidth;
    const height = frame.cutHeight;

    const cacheKey = region
      ? `${textureKey}:${frame.name}:${region.x}:${region.y}:${region.width}:${region.height}`
      : `${textureKey}:${frame.name}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) ?? null;
    }

    const fullBounds: SpriteBounds = {
      x: 0,
      y: 0,
      width,
      height,
      centerX: width / 2,
      centerY: height / 2
    };

    if (width <= 0 || height <= 0) {
      this.cache.set(cacheKey, fullBounds);
      return fullBounds;
    }

    const startX = region
      ? Math.max(0, Math.floor(region.x * width))
      : 0;

    const startY = region
      ? Math.max(0, Math.floor(region.y * height))
      : 0;

    const endX = region
      ? Math.min(width, Math.ceil((region.x + region.width) * width))
      : width;

    const endY = region
      ? Math.min(height, Math.ceil((region.y + region.height) * height))
      : height;

    if (endX <= startX || endY <= startY) {
      this.cache.set(cacheKey, null);
      return null;
    }

    const regionBounds: SpriteBounds = {
      x: startX,
      y: startY,
      width: endX - startX,
      height: endY - startY,
      centerX: startX + (endX - startX) / 2,
      centerY: startY + (endY - startY) / 2
    };

    const source = texture.source[frame.sourceIndex];
    const image = source?.image as CanvasImageSource | null;

    if (!image) {
      const fallback = region ? regionBounds : fullBounds;
      this.cache.set(cacheKey, fallback);
      return fallback;
    }

    try {
      this.canvas.width = width;
      this.canvas.height = height;

      this.context.clearRect(0, 0, width, height);

      this.context.drawImage(
        image,
        frame.cutX,
        frame.cutY,
        width,
        height,
        0,
        0,
        width,
        height
      );

      const regionWidth = endX - startX;
      const regionHeight = endY - startY;

      const pixels = this.context.getImageData(
        startX,
        startY,
        regionWidth,
        regionHeight
      ).data;

      let minX = regionWidth;
      let minY = regionHeight;
      let maxX = -1;
      let maxY = -1;

      for (let y = 0; y < regionHeight; y++) {
        for (let x = 0; x < regionWidth; x++) {
          const alphaIndex = (y * regionWidth + x) * 4 + 3;

          if (pixels[alphaIndex] <= 10) {
            continue;
          }

          minX = Math.min(minX, x);
          minY = Math.min(minY, y);

          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }

      if (maxX === -1 || maxY === -1) {
        this.cache.set(cacheKey, null);
        return null;
      }

      const boundsWidth = maxX - minX + 1;
      const boundsHeight = maxY - minY + 1;

      const bounds: SpriteBounds = {
        x: startX + minX,
        y: startY + minY,
        width: boundsWidth,
        height: boundsHeight,
        centerX: startX + minX + boundsWidth / 2,
        centerY: startY + minY + boundsHeight / 2
      };

      this.cache.set(cacheKey, bounds);

      return bounds;
    } catch {
      const fallback = region ? regionBounds : fullBounds;

      this.cache.set(cacheKey, fallback);

      return fallback;
    }
  }

  analyzeAllFrames(
    textureKey: string
  ): Map<string, SpriteBounds | null> {
    const texture = this.scene.textures.get(textureKey);

    const frames = texture.frames as Record<
      string,
      Phaser.Textures.Frame
    >;

    const frameNames = Object.keys(frames).filter(
      (name) => name !== '__BASE'
    );

    if (frameNames.length === 0) {
      frameNames.push('__BASE');
    }

    const results = new Map<string, SpriteBounds | null>();

    for (const frameName of frameNames) {
      results.set(
        frameName,
        this.analyze(textureKey, frameName)
      );
    }

    return results;
  }

  clearCache(): void {
    this.cache.clear();
  }

  destroy(): void {
    this.clearCache();

    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}
