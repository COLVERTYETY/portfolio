import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
// import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';


const outlineMaterial = new THREE.ShaderMaterial({
  uniforms: {
      offset: { value: 1.15 },
      originalTexture: { type: 't', value: null } // Uniform for the original texture
  },
  vertexShader: `
      uniform float offset;
      varying vec2 vUv;
      void main() {
          vUv = uv;
          vec4 pos = modelViewMatrix * vec4(position * offset, 1.0);
          gl_Position = projectionMatrix * pos;
      }
  `,
  fragmentShader: `
      uniform sampler2D originalTexture;
      varying vec2 vUv;
      void main() {
          vec4 textureColor = texture2D(originalTexture, vUv);
          float border = 0.02; // Width of the border
          float edge = smoothstep(0.0, border, vUv.x) * smoothstep(0.0, border, vUv.y)
                     * smoothstep(0.0, border, 1.0 - vUv.x) * smoothstep(0.0, border, 1.0 - vUv.y);
          gl_FragColor = mix(vec4(0.0, 1.0, 1.0, 1.0),textureColor, edge); // Mix texture color and yellow outline
      }
  `,
  // side: THREE.BackSide,
  side: THREE.FrontSide,
  transparent: true // Enable transparency to avoid black background
});


function mylabel(title, content) {
  let element = document.createElement('div');
  element.className = 'htmlmsg';
  element.innerHTML = `<h1>${title}</h1><h2>${content}</h2>`;
  element.style.visibility = 'hidden';
  return new CSS2DObject(element);
}


class BOX {
  constructor(world, scene, x, y, z, name,image = undefined) {
    this.geometry = new THREE.BoxGeometry(4, 4, 4);
    if (image === undefined) {
      this.material = new THREE.MeshNormalMaterial();
      this.originalMaterial = this.material;
    } else if (image instanceof THREE.VideoTexture) {
      this.material = new THREE.MeshBasicMaterial({ map: image });
      this.originalMaterial = this.material;
    } else if (image instanceof THREE.Texture) {
      this.material = new THREE.MeshBasicMaterial({ map: image });
      this.originalMaterial = this.material;
    } else {
      console.error(
        "Invalid image provided. Using MeshBasicMaterial instead.",
        image
      );
      this.material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      this.originalMaterial = this.material;
    }
    this.createMeshAndBody(world, scene, x, y, z);
    this.name = name;
    this.x = x;
    this.y = y;
    this.z = z;
  }

  reset() {
    this.body.position.set(this.x, this.y, this.z);
    this.body.quaternion.set(0, 0, 0, 1);
    // this.body.angularVelocity.set(Math.random., 0.8, 0);
    // random rotation
    this.body.angularVelocity.set(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    );
    this.body.velocity.set(0, 0, 0);
  }

  createMeshAndBody(world, scene, x, y, z) {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.set(x, y, z);
    scene.add(this.mesh);

    this.collider = new CANNON.Box(new CANNON.Vec3(2, 2, 2));
    this.body = new CANNON.Body({ mass: 1 });
    this.body.addShape(this.collider);
    this.body.position.set(
      this.mesh.position.x,
      this.mesh.position.y,
      this.mesh.position.z
    );
    this.body.quaternion.set(
      this.mesh.quaternion.x,
      this.mesh.quaternion.y,
      this.mesh.quaternion.z,
      this.mesh.quaternion.w
    );
    world.addBody(this.body);
  }

  update() {
    if (this.material && this.material.map) {
      this.material.map.needsUpdate = true;
    }
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);
  }

  onHover(){
    // console.log("Hovered : " + this.name);
    outlineMaterial.uniforms.originalTexture.value = this.mesh.material.map; // Set the original texture
    this.mesh.material = outlineMaterial; // Apply outline material
    if (this.toplabel){
      this.toplabel.position.set(this.mesh.position.x, this.mesh.position.y + 4, this.mesh.position.z);
      this.toplabel.element.style.visibility = 'visible';
    }
    if (this.bottomlabel){
      this.bottomlabel.position.set(this.mesh.position.x, this.mesh.position.y - 5, this.mesh.position.z);
      this.bottomlabel.element.style.visibility = 'visible';
    }
  }
  defaultState(){
    // console.log("Default : " + this.name);
    if (this.originalMaterial) {
      this.mesh.material = this.originalMaterial;
    }
    if (this.toplabel){
      this.toplabel.element.style.visibility = 'hidden';
    }
    if (this.bottomlabel){
      this.bottomlabel.element.style.visibility = 'hidden';
    }
  }
}

var world = new CANNON.World();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector("#canvas"),
  antialias: true,
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.setX(7);
camera.position.setY(6);
camera.position.setZ(8);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
renderer.render(scene, camera);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

// intersect from middle of screen
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);
raycaster.setFromCamera(center, camera);


function onWindowResize() {
  // Update the camera's aspect ratio
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  // Update the renderer size
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
}
// Add the event listener
window.addEventListener('resize', onWindowResize);

const glass_material = new THREE.MeshPhysicalMaterial({
  roughness: 0,
  transmission: 1, // Add transparency
});

// add a physics cube
const video_robotarm = document.getElementById("robotarm");
video_robotarm.play();
const robotarm = new THREE.VideoTexture(video_robotarm);
const video_paradim = document.getElementById("paradim");
video_paradim.play();
const paradim = new THREE.VideoTexture(video_paradim);
const video_glove = document.getElementById("glove");
video_glove.play();
const glove = new THREE.VideoTexture(video_glove);
const video_nerf = document.getElementById("nerf");
video_nerf.play();
const nerf = new THREE.VideoTexture(video_nerf);
const video_sdxl = document.getElementById("sdxl");
video_sdxl.play();
const sdxl = new THREE.VideoTexture(video_sdxl);
const Video_plant = document.getElementById("plant");
Video_plant.play();
const plant = new THREE.VideoTexture(Video_plant);
// console.log(video_nerf, nerf);
const image_me = new THREE.TextureLoader().load('assets/me.jpeg');

const Box_paradim = new BOX(world, scene, 0, 5, 4, "paradigm",paradim);
Box_paradim.body.angularVelocity.set(0.0, 0, 0);
const paradigm_toplabel = mylabel("Perception Paradigms", "The Mathematical Abstractions used to reprsent the world are critical in robotics.");
const paradigm_bottomlabel = mylabel("M1: Creative Technology", "I studied the different paradigms used in robotics, ranging from point clouds to neural networks.");
Box_paradim.toplabel = paradigm_toplabel;
Box_paradim.bottomlabel = paradigm_bottomlabel;
scene.add(paradigm_toplabel);
scene.add(paradigm_bottomlabel);
const Box_nerf = new BOX(world, scene, 4, 8, 0, "nerf",nerf);
const nerf_toplabel = mylabel("NeRF: Neural Radiance Fields", "NeRf is a technique used to render 3D objects from 2D images.");
const nerf_bottomlabel = mylabel("M1: Creative Technology", "I studied how to represent 3D objects using neural networks.");
Box_nerf.toplabel = nerf_toplabel;
Box_nerf.bottomlabel = nerf_bottomlabel;
scene.add(nerf_toplabel);
scene.add(nerf_bottomlabel);
Box_nerf.body.angularVelocity.set(0, 1, 0);
const Box_robotarm = new BOX(world, scene, 0, 5, -4, "robot arm",robotarm); //0, 5, -4
const robotarm_toplabel = mylabel("Isaac Sim", "Isaac Sim is a robotics simulator built by Nvidia, enabling a new generation of Deep Learning for Robotics.");
const robotarm_bottomlabel = mylabel("M1: Creative Technology", "I used Isaac Sim to build a simple robot arm and explore the basics of RL.");
Box_robotarm.toplabel = robotarm_toplabel;
Box_robotarm.bottomlabel = robotarm_bottomlabel;
scene.add(robotarm_toplabel);
scene.add(robotarm_bottomlabel);
Box_robotarm.body.angularVelocity.set(0, 1, 0);
const Box_glove = new BOX(world, scene, -4, 10, 0, "Arctic Glove",glove);
const glove_toplabel = mylabel("Arctic Glove", "Extrem conditions such as the arctic require special equipment for Human Machine Interaction (HMI).");
const glove_bottomlabel = mylabel("M1: Creative Technology", "I designed a glove and embedded machine learning Algorithm for HMI in the arctic.");
Box_glove.toplabel = glove_toplabel;
Box_glove.bottomlabel = glove_bottomlabel;
scene.add(glove_toplabel);
scene.add(glove_bottomlabel);
Box_glove.body.angularVelocity.set(0, 1, 0);
const Box_sdxl = new BOX(world, scene, -0, 10, -5, "SDXL",sdxl);
const sdxl_toplabel = mylabel("Artists and Machines", "SDXL Turbo is a new generation of diffusion models that allow real-time applications.");
const sdxl_bottomlabel = mylabel("M2: Creative Technology", "I developed an application that allows artists to interact with SDXL Turbo.");
Box_sdxl.toplabel = sdxl_toplabel;
Box_sdxl.bottomlabel = sdxl_bottomlabel;
scene.add(sdxl_toplabel);
scene.add(sdxl_bottomlabel);
Box_sdxl.body.angularVelocity.set(0, 1, 0);
const Box_me = new BOX(world, scene, 0, 20, 0, "me",image_me);
const me_toplabel = mylabel("Me", "I like to build cool stuff and work on hard problems.");
// const me_bottomlabel = mylabel("Creative Technology year 1", "This work was done as part of my first year project at CT");
Box_me.toplabel = me_toplabel;
// Box_me.bottomlabel = me_bottomlabel;
scene.add(me_toplabel);
// scene.add(me_bottomlabel);
Box_me.body.angularVelocity.set(1, 5, 0);
const Box_plant = new BOX(world, scene, -2, 15, 2, "plant",plant);
const plant_toplabel = mylabel("Internet-of-Plants", "What can the cloud enable for plants?");
const plant_bottomlabel = mylabel("M2: Creative Technology", "I studied, with Matthieu Segui, how plants can be used to create a new generation of IoT devices.");
Box_plant.toplabel = plant_toplabel;
Box_plant.bottomlabel = plant_bottomlabel;
scene.add(plant_toplabel);
scene.add(plant_bottomlabel);
Box_plant.body.angularVelocity.set(1, 0, 2);

let Boxes = [Box_paradim, Box_nerf, Box_robotarm, Box_glove, Box_me, Box_sdxl, Box_plant];

// reset the boxes when enter is pressed
document.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    Boxes.forEach(box => box.reset());
  }
});

//  add a floor
const floorGeometry = new THREE.BoxGeometry(20, 1, 20);
// const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x888888});
const floorMaterial = glass_material;
const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
// shadow
floorMesh.receiveShadow = true;
floorMesh.position.set(0, -2, 0);
// scene.add(floorMesh);
const floorShape = new CANNON.Box(new CANNON.Vec3(20, 0.5, 20));
const floorBody = new CANNON.Body({ mass: 0 });
floorBody.addShape(floorShape);
floorBody.position.set(
  floorMesh.position.x,
  floorMesh.position.y,
  floorMesh.position.z
);
floorBody.quaternion.set(
  floorMesh.quaternion.x,
  floorMesh.quaternion.y,
  floorMesh.quaternion.z,
  floorMesh.quaternion.w
);
world.addBody(floorBody);

// Lights
const pointLight = new THREE.PointLight(0xffffff);
pointLight.position.set(5, 5, 5);

const ambientLight = new THREE.AmbientLight(0xffffff);
scene.add(pointLight, ambientLight);

// background stuff
let bgTexture = new THREE.TextureLoader().load('assets/cartoonparis.jpg');
bgTexture.mapping = THREE.EquirectangularReflectionMapping;
scene.background = bgTexture;

// physics world
world.gravity.set(0, -9.82, 0);
// world.broadphase = new CANNON.NaiveBroadphase();
// world.solver.iterations = 10;

const clock = new THREE.Clock();
let delta;
// Animation Loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  Boxes.forEach(box => box.material.map.needsUpdate = true);

  // Update raycaster
  raycaster.setFromCamera(center, camera);
  // reset intersect for all
  Boxes.forEach(box => box.defaultState());
  // Check for intersections
  var intersects = raycaster.intersectObjects(Boxes.map(box => box.mesh), true);
  //  only intersect first
  if (intersects.length > 0) {
    //  find the intersected object
    let intersected = Object.values(Boxes).find(box => box.mesh === intersects[0].object);
    if (intersected) intersected.onHover();
  }
  //  delta time for cannon
  delta = clock.getDelta();
  world.step(Math.min(delta, 0.01));

  //update the position of the box
  Boxes.forEach(box => box.update());
  // update the position of the floor
  floorMesh.position.copy(floorBody.position);
  floorMesh.quaternion.copy(floorBody.quaternion);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

animate();
