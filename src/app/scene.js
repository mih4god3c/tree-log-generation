import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Log } from 'log-generator';

export function createScene(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0c18);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(10, 20, 10);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  scene.add(dir);

  const fill = new THREE.DirectionalLight(0x8899bb, 0.4);
  fill.position.set(-10, 5, -10);
  scene.add(fill);

  const grid = new THREE.GridHelper(40, 40, 0x1a1e34, 0x131627);
  grid.position.y = -0.01;
  scene.add(grid);

  const log = new Log();
  log.generate();
  log.castShadow = true;
  log.receiveShadow = true;

  log.rotation.z = -Math.PI / 2;
  scene.add(log);

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    500,
  );
  camera.position.set(0, 6, 12);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 2, 0);
  controls.update();

  return { scene, log, camera, controls };
}
