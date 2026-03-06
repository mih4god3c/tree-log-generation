import { BarkType } from './enums';

export default class LogOptions {
  constructor() {
    this.seed = 0;

    this.length = 10;
    this.diameter = 3;
    this.taper = 0.3;
    this.sections = 20;
    this.segments = 16;

    this.eccentricity = 0;
    this.eccentricityAngle = 0;

    this.curvature = 0;
    this.curvatureX = 1;
    this.curvatureY = 0;
    this.curvatureZ = 0;

    this.roughness = 0;
    this.roughnessScale = 5;

    this.gnarls = {
      count: 0,
      size: 0.8,
      strength: 0.5,
      distribution: 0.5,
    };

    this.bark = {
      type: BarkType.Oak,
      tint: 0xffffff,
      flatShading: false,
      textured: true,
      textureScale: { x: 1, y: 1 },
    };

    this.cap = {
      ringCount: 25,
      heartwoodRatio: 0.45,
      heartwoodColor: 0x8c5a32,
      sapwoodColor: 0xc8a56e,
      pithOffsetX: 0,
      pithOffsetY: 0,
      ringWobble: 0.3,
      crackCount: 0,
      crackWidth: 0.5,
    };
  }

  copy(source, target = this) {
    for (let key in source) {
      if (source.hasOwnProperty(key) && target.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null) {
          this.copy(source[key], target[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
  }
}
