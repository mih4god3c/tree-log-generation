import * as THREE from 'three';
import RNG from './rng';
import LogOptions from './options';
import { getBarkTexture } from './textures';

export const BARK_CAP_DEFAULTS = {
  birch:  { heartwoodColor: 0xc8a882, sapwoodColor: 0xede0c8 },
  oak:    { heartwoodColor: 0x8c5a32, sapwoodColor: 0xc8a56e },
  pine:   { heartwoodColor: 0xc49a6c, sapwoodColor: 0xe8d4a8 },
  willow: { heartwoodColor: 0x9e7e56, sapwoodColor: 0xd2b88c },
};

export class Log extends THREE.Group {
  constructor(options = new LogOptions()) {
    super();
    this.name = 'Log';
    this.barkMesh = new THREE.Mesh();
    this.bottomCapMesh = new THREE.Mesh();
    this.topCapMesh = new THREE.Mesh();
    this.add(this.barkMesh);
    this.add(this.bottomCapMesh);
    this.add(this.topCapMesh);
    this.options = options;
  }

  generate() {
    this.rng = new RNG(this.options.seed);

    const gnarlPositions = this._precomputeGnarls();
    const result = this._buildGeometry(gnarlPositions);

    this._createBarkMesh(result);
    this._createCapMesh(this.bottomCapMesh, result.capData.bottom, false);
    this._createCapMesh(this.topCapMesh, result.capData.top, true);
  }

  loadFromJson(json) {
    this.options.copy(json);
    this.generate();
  }

  _createBarkMesh({ verts, normals, indices, uvs }) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
    g.computeBoundingSphere();

    const mat = new THREE.MeshPhongMaterial({
      name: 'bark',
      flatShading: this.options.bark.flatShading,
      color: new THREE.Color(this.options.bark.tint),
    });

    if (this.options.bark.textured) {
      mat.aoMap = getBarkTexture(this.options.bark.type, 'ao', this.options.bark.textureScale);
      mat.map = getBarkTexture(this.options.bark.type, 'color', this.options.bark.textureScale);
      mat.normalMap = getBarkTexture(this.options.bark.type, 'normal', this.options.bark.textureScale);
      mat.roughnessMap = getBarkTexture(this.options.bark.type, 'roughness', this.options.bark.textureScale);
    }

    this.barkMesh.geometry.dispose();
    this.barkMesh.geometry = g;
    this.barkMesh.material.dispose();
    this.barkMesh.material = mat;
    this.barkMesh.castShadow = true;
    this.barkMesh.receiveShadow = true;
  }

  _createCapMesh(mesh, capData, isTop) {
    const { center, ringVerts, normal } = capData;
    const segments = this.options.segments;

    const verts = [];
    const norms = [];
    const uvs = [];
    const indices = [];

    verts.push(center.x, center.y, center.z);
    norms.push(normal.x, normal.y, normal.z);
    uvs.push(0.5, 0.5);

    for (let j = 0; j < segments; j++) {
      const v = ringVerts[j];
      verts.push(v.x, v.y, v.z);
      norms.push(normal.x, normal.y, normal.z);

      const dx = v.x - center.x;
      const dy = v.y - center.y;
      const dz = v.z - center.z;
      const localRight = new THREE.Vector3().crossVectors(
        new THREE.Vector3(0, 0, 1), normal
      );
      if (localRight.length() < 0.001) {
        localRight.crossVectors(new THREE.Vector3(1, 0, 0), normal);
      }
      localRight.normalize();
      const localUp = new THREE.Vector3().crossVectors(normal, localRight).normalize();
      const offset = new THREE.Vector3(dx, dy, dz);
      const radius = this.options.diameter / 2;
      const u = 0.5 + offset.dot(localRight) / (radius * 2.2);
      const vCoord = 0.5 + offset.dot(localUp) / (radius * 2.2);
      uvs.push(u, vCoord);
    }

    for (let j = 0; j < segments; j++) {
      const a = 1 + j;
      const b = 1 + ((j + 1) % segments);
      if (isTop) {
        indices.push(0, a, b);
      } else {
        indices.push(0, b, a);
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(norms), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
    g.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
    g.computeBoundingSphere();

    const texture = this._generateGrowthRingTexture();
    const mat = new THREE.MeshPhongMaterial({
      name: isTop ? 'cap_top' : 'cap_bottom',
      map: texture,
      color: new THREE.Color(this.options.bark.tint),
      side: THREE.DoubleSide,
    });

    mesh.geometry.dispose();
    mesh.geometry = g;
    mesh.material.dispose();
    mesh.material = mat;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }

  _coherentNoise(x, y, seed) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);

    const h = (a, b) => {
      const n = (a * 12.9898 + b * 78.233 + seed * 43.17) * 43758.5453;
      return (n - Math.floor(n)) * 2 - 1;
    };

    const v00 = h(ix, iy);
    const v10 = h(ix + 1, iy);
    const v01 = h(ix, iy + 1);
    const v11 = h(ix + 1, iy + 1);

    return v00 * (1 - sx) * (1 - sy) + v10 * sx * (1 - sy)
      + v01 * (1 - sx) * sy + v11 * sx * sy;
  }

  _fbmNoise(x, y, seed, octaves = 4) {
    let val = 0, amp = 0.5, freq = 1;
    for (let i = 0; i < octaves; i++) {
      val += amp * this._coherentNoise(x * freq, y * freq, seed + i * 31.7);
      amp *= 0.5;
      freq *= 2;
    }
    return val;
  }

  _generateGrowthRingTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const cap = this.options.cap;
    const rng = new RNG(this.options.seed + 7);
    const noiseSeed = this.options.seed * 0.37;

    const pithX = size / 2 + cap.pithOffsetX * size * 0.4;
    const pithY = size / 2 + cap.pithOffsetY * size * 0.4;
    const maxR = size / 2;

    const hwHex = cap.heartwoodColor;
    const hw = { r: (hwHex >> 16) & 0xff, g: (hwHex >> 8) & 0xff, b: hwHex & 0xff };
    const swHex = cap.sapwoodColor;
    const sw = { r: (swHex >> 16) & 0xff, g: (swHex >> 8) & 0xff, b: swHex & 0xff };
    const pithCol = { r: hw.r * 0.55, g: hw.g * 0.55, b: hw.b * 0.5 };

    const ringCount = cap.ringCount;
    const wobbleAmt = cap.ringWobble;

    const ringRadii = [];
    let cumR = 0;
    const rawWidths = [];
    for (let i = 0; i < ringCount; i++) {
      const baseWidth = maxR / ringCount;
      const variation = 0.4 + rng.random(1.2);
      rawWidths.push(baseWidth * variation);
    }
    const totalRaw = rawWidths.reduce((a, b) => a + b, 0);
    for (let i = 0; i < ringCount; i++) {
      cumR += (rawWidths[i] / totalRaw) * maxR;
      ringRadii.push(cumR);
    }

    const wobblePhases = [];
    const wobbleFreqs = [];
    for (let i = 0; i < ringCount; i++) {
      wobblePhases.push(rng.random(Math.PI * 2));
      wobbleFreqs.push(2 + Math.floor(rng.random(4)));
    }

    const rayCount = 12 + Math.floor(rng.random(20));
    const rays = [];
    for (let i = 0; i < rayCount; i++) {
      rays.push({
        angle: rng.random(Math.PI * 2),
        width: 0.008 + rng.random(0.015),
        brightness: 0.06 + rng.random(0.08),
      });
    }

    const cracks = [];
    for (let i = 0; i < cap.crackCount; i++) {
      cracks.push({
        angle: rng.random(Math.PI * 2),
        width: cap.crackWidth * (0.6 + rng.random(0.8)),
        length: 0.3 + rng.random(0.6),
        wobbleFreq: 0.03 + rng.random(0.04),
        wobbleAmp: rng.random(0.2, -0.2),
      });
    }

    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - pithX;
        const dy = y - pithY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        const dxCenter = x - size / 2;
        const dyCenter = y - size / 2;
        const normalizedDist = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter) / maxR;

        let r, g, b;

        if (dist < maxR * 0.015) {
          const pithNoise = this._fbmNoise(x * 0.08, y * 0.08, noiseSeed, 3) * 15;
          r = pithCol.r + pithNoise;
          g = pithCol.g + pithNoise;
          b = pithCol.b + pithNoise;
        } else {
          let ringIdx = 0;
          for (let i = 0; i < ringCount; i++) {
            const wobble = wobbleAmt * ringRadii[i] * 0.04
              * Math.sin(angle * wobbleFreqs[i] + wobblePhases[i])
              + wobbleAmt * ringRadii[i] * 0.02
                * Math.sin(angle * (wobbleFreqs[i] * 2.7) + wobblePhases[i] * 1.3);
            if (dist < ringRadii[i] + wobble) { ringIdx = i; break; }
            ringIdx = i;
          }

          const innerR = ringIdx === 0 ? 0 : ringRadii[ringIdx - 1];
          const outerR = ringRadii[ringIdx];
          const ringWidth = outerR - innerR;
          const posInRing = Math.max(0, Math.min(1, (dist - innerR) / ringWidth));

          const heartT = dist / maxR;
          const htRatio = cap.heartwoodRatio;
          const transitionWidth = 0.08;
          const heartBlend = Math.max(0, Math.min(1,
            (htRatio + transitionWidth / 2 - heartT) / transitionWidth));
          const baseR = hw.r * heartBlend + sw.r * (1 - heartBlend);
          const baseG = hw.g * heartBlend + sw.g * (1 - heartBlend);
          const baseB = hw.b * heartBlend + sw.b * (1 - heartBlend);

          const latewoodStart = 0.7;
          let earlyLateFactor;
          if (posInRing < latewoodStart) {
            earlyLateFactor = 1.0;
          } else {
            const latePos = (posInRing - latewoodStart) / (1 - latewoodStart);
            earlyLateFactor = 1.0 - 0.35 * Math.pow(latePos, 0.6);
          }

          const ringBoundary = posInRing > 0.92
            ? Math.pow((posInRing - 0.92) / 0.08, 2) * 0.3
            : 0;

          r = baseR * earlyLateFactor * (1 - ringBoundary);
          g = baseG * earlyLateFactor * (1 - ringBoundary);
          b = baseB * earlyLateFactor * (1 - ringBoundary);

          const grain = this._fbmNoise(x * 0.05, y * 0.05, noiseSeed + 100, 4) * 12
            + this._fbmNoise(x * 0.15, y * 0.15, noiseSeed + 200, 3) * 6;
          r += grain;
          g += grain * 0.9;
          b += grain * 0.7;

          for (const ray of rays) {
            let ad = angle - ray.angle;
            while (ad > Math.PI) ad -= 2 * Math.PI;
            while (ad < -Math.PI) ad += 2 * Math.PI;
            if (Math.abs(ad) < ray.width) {
              const rayFade = 1 - Math.pow(Math.abs(ad) / ray.width, 2);
              const distFade = Math.min(1, dist / (maxR * 0.15));
              const brightness = ray.brightness * rayFade * distFade * 255;
              r += brightness;
              g += brightness * 0.9;
              b += brightness * 0.7;
            }
          }
        }

        for (const crack of cracks) {
          const ca = crack.angle + crack.wobbleAmp * Math.sin(dist * crack.wobbleFreq);
          let angleDiff = angle - ca;
          while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
          while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

          const angularWidth = (crack.width * 0.008) / Math.max(0.1, dist / maxR);
          const withinAngle = Math.abs(angleDiff) < angularWidth;
          const withinLength = dist / maxR < crack.length;

          if (withinAngle && withinLength && dist > maxR * 0.02) {
            const edgeFade = 1 - Math.pow(Math.abs(angleDiff) / angularWidth, 2);
            const tipFade = Math.min(1, (crack.length - dist / maxR) / 0.1);
            const darkening = 0.45 * edgeFade * tipFade;
            const crackNoise = this._fbmNoise(dist * 0.1, angleDiff * 50, noiseSeed + 300, 2) * 0.15;
            r = r * (1 - darkening - crackNoise) + 25 * (darkening + crackNoise);
            g = g * (1 - darkening - crackNoise) + 18 * (darkening + crackNoise);
            b = b * (1 - darkening - crackNoise) + 12 * (darkening + crackNoise);
          }
        }

        if (normalizedDist > 1.0) {
          r *= 0.4;
          g *= 0.4;
          b *= 0.4;
        }

        const idx = (y * size + x) * 4;
        data[idx] = Math.max(0, Math.min(255, r));
        data[idx + 1] = Math.max(0, Math.min(255, g));
        data[idx + 2] = Math.max(0, Math.min(255, b));
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  _precomputeGnarls() {
    const count = this.options.gnarls.count;
    if (count === 0) return [];

    const gnarls = [];
    for (let i = 0; i < count; i++) {
      const dist = this.options.gnarls.distribution;
      const t = dist < 0.5
        ? Math.pow(this.rng.random(), 1 + (0.5 - dist) * 4)
        : this.rng.random(1, dist * 0.2);

      gnarls.push({
        t: Math.max(0.05, Math.min(0.95, t)),
        angle: this.rng.random(Math.PI * 2),
        size: this.options.gnarls.size * (0.7 + this.rng.random(0.6)),
        strength: this.options.gnarls.strength * (0.6 + this.rng.random(0.8)),
      });
    }
    return gnarls;
  }

  _buildGeometry(gnarlPositions) {
    const opts = this.options;
    const sections = opts.sections;
    const segments = opts.segments;
    const length = opts.length;
    const baseRadius = opts.diameter / 2;

    const eccA = 1 + opts.eccentricity * 0.5;
    const eccB = 1 - opts.eccentricity * 0.5;
    const eccAngle = opts.eccentricityAngle * Math.PI / 180;

    const curvDir = new THREE.Vector3(
      opts.curvatureX, opts.curvatureY, opts.curvatureZ
    ).normalize();

    const verts = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    const sectionLength = length / sections;

    let origin = new THREE.Vector3(0, 0, 0);
    let orientation = new THREE.Quaternion();

    const capData = {
      bottom: { center: null, ringVerts: [], normal: null },
      top: { center: null, ringVerts: [], normal: null },
    };

    for (let i = 0; i <= sections; i++) {
      const t = i / sections;
      const sectionRadius = baseRadius * (1 - opts.taper * t);

      if (i > 0 && opts.curvature > 0) {
        const curvAmount = opts.curvature * (sectionLength / length);
        const curvAxis = new THREE.Vector3(0, 1, 0).cross(curvDir).normalize();
        if (curvAxis.length() < 0.001) {
          curvAxis.set(1, 0, 0);
        }
        const curvQuat = new THREE.Quaternion().setFromAxisAngle(curvAxis, curvAmount);
        orientation.premultiply(curvQuat);
      }

      if (i > 0) {
        const step = new THREE.Vector3(0, sectionLength, 0).applyQuaternion(orientation);
        origin = origin.clone().add(step);
      }

      const sectionEuler = new THREE.Euler().setFromQuaternion(orientation);

      const isCapSection = (i === 0 || i === sections);
      const capRingVerts = [];

      for (let j = 0; j <= segments; j++) {
        const angle = (2.0 * Math.PI * j) / segments;

        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const cosE = Math.cos(eccAngle);
        const sinE = Math.sin(eccAngle);
        const localX = (cosA * cosE - sinA * sinE) * eccA;
        const localZ = (cosA * sinE + sinA * cosE) * eccB;

        let radialScale = sectionRadius;

        let gnarlDisplacement = 0;
        for (const gnarl of gnarlPositions) {
          const dt = (t - gnarl.t) / (gnarl.size / length);
          const da = this._angleDiff(angle, gnarl.angle) / (gnarl.size * 0.8);
          const dist2 = dt * dt + da * da;
          if (dist2 < 4) {
            gnarlDisplacement += gnarl.strength * baseRadius * Math.exp(-dist2);
          }
        }

        let roughDisp = 0;
        if (opts.roughness > 0) {
          const nx = t * opts.roughnessScale * 10 + this.options.seed * 0.1;
          const ny = angle * opts.roughnessScale;
          roughDisp = opts.roughness * baseRadius * 0.1 * this._noise2d(nx, ny);
        }

        radialScale += gnarlDisplacement + roughDisp;

        const vertex = new THREE.Vector3(localX, 0, localZ)
          .multiplyScalar(radialScale)
          .applyEuler(sectionEuler)
          .add(origin);

        const normal = new THREE.Vector3(localX, 0, localZ)
          .applyEuler(sectionEuler)
          .normalize();

        verts.push(vertex.x, vertex.y, vertex.z);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(j / segments, t);

        if (isCapSection && j < segments) {
          capRingVerts.push(vertex.clone());
        }
      }

      if (i === 0) {
        const capNormal = new THREE.Vector3(0, -1, 0).applyEuler(sectionEuler);
        capData.bottom = { center: origin.clone(), ringVerts: capRingVerts, normal: capNormal };
      }
      if (i === sections) {
        const capNormal = new THREE.Vector3(0, 1, 0).applyEuler(sectionEuler);
        capData.top = { center: origin.clone(), ringVerts: capRingVerts, normal: capNormal };
      }
    }

    const N = segments + 1;
    for (let i = 0; i < sections; i++) {
      for (let j = 0; j < segments; j++) {
        const v1 = i * N + j;
        const v2 = i * N + (j + 1);
        const v3 = v1 + N;
        const v4 = v2 + N;
        indices.push(v1, v3, v2, v2, v3, v4);
      }
    }

    return { verts, normals, indices, uvs, capData };
  }

  _angleDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return d;
  }

  _noise2d(x, y) {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    const n2 = Math.sin(x * 269.5 + y * 183.3) * 28731.1739;
    const n3 = Math.sin(x * 419.2 + y * 371.9) * 63851.3217;
    return (n - Math.floor(n)) * 0.5
      + (n2 - Math.floor(n2)) * 0.3
      + (n3 - Math.floor(n3)) * 0.2
      - 0.5;
  }

  get vertexCount() {
    const barkVerts = (this.options.sections + 1) * (this.options.segments + 1);
    const capVerts = (1 + this.options.segments) * 2;
    return barkVerts + capVerts;
  }

  get triangleCount() {
    const barkTris = this.options.sections * this.options.segments * 2;
    const capTris = this.options.segments * 2;
    return barkTris + capTris;
  }
}
