/////////////////////////////////////////////////////////////////////////
///// IMPORT
import './main.css'
import * as THREE from 'three'
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'
/////////////////////////////////////////////////////////////////////////
//// DRACO LOADER TO LOAD DRACO COMPRESSED MODELS FROM BLENDER
const dracoLoader = new DRACOLoader()
const loader = new GLTFLoader()
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
dracoLoader.setDecoderConfig({ type: 'js' })
loader.setDRACOLoader(dracoLoader)
/////////////////////////////////////////////////////////////////////////
///// DIV CONTAINER CREATION TO HOLD THREEJS EXPERIENCE
const container = document.createElement('div')
document.body.appendChild(container)
/////////////////////////////////////////////////////////////////////////
///// SCENE CREATION
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000000) // Ensure background is black
/////////////////////////////////////////////////////////////////////////
///// RENDERER CONFIG
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" }) 
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) 
renderer.setSize(window.innerWidth, window.innerHeight) 
renderer.outputEncoding = THREE.sRGBEncoding 
container.appendChild(renderer.domElement) 
/////////////////////////////////////////////////////////////////////////
///// LIGHTING (ADJUST TO AVOID BLOWN OUT MODEL)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3) // Soft ambient light
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)
/////////////////////////////////////////////////////////////////////////
///// CAMERAS CONFIG
const camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 1, 100)
scene.add(camera)
/////////////////////////////////////////////////////////////////////////
///// MAKE EXPERIENCE FULL SCREEN
window.addEventListener('resize', () => {
    const width = window.innerWidth
    const height = window.innerHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
})
/////////////////////////////////////////////////////////////////////////
///// CREATE ORBIT CONTROLS
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.04
controls.minDistance = 0.5
controls.maxDistance = 9
controls.enableRotate = true
controls.enableZoom = true
controls.zoomSpeed = 0.5
controls.autoRotate = true // Enable auto-rotation
controls.autoRotateSpeed = 1.0 // Adjust the speed of auto-rotation
/////////////////////////////////////////////////////////////////////////
///// LOADING GLB/GLTF MODEL FROM BLENDER
loader.load('models/gltf/shark.glb', function (gltf) {
    const model = gltf.scene;

    // Compute the bounding box of the model
    const boundingBox = new THREE.Box3().setFromObject(model);

    // Get the center of the bounding box
    const center = boundingBox.getCenter(new THREE.Vector3());

    // Reposition the camera
    const size = boundingBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 * Math.tan(fov * 2));

    camera.position.set(center.x + cameraZ, center.y, center.z); // Align camera on X-axis
    camera.lookAt(center);

    // Set controls target to the center of the model
    controls.target.copy(center);
    controls.update();

    // Create a wireframe from the model's geometry with hover effect
    createWireframeWithHoverEffect(model, center);
});


///// CREATE WIREFRAME WITH HOVER EFFECT FROM MODEL GEOMETRY
function createWireframeWithHoverEffect(model, center) {
    // Traverse the model to get its geometry and create a wireframe
    let uniforms = { mousePos: { value: new THREE.Vector3() } };
    model.traverse((obj) => {
        if (obj.isMesh) {
            const geometry = obj.geometry;
            const vertices = geometry.attributes.position.array;

            // Create a buffer geometry for the points
            const pointsGeometry = new THREE.BufferGeometry();
            pointsGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

            // Create a material with small dots
            const pointsMaterial = new THREE.PointsMaterial({
                color: 0xFFFF00, // Yellow color for the dots
                size: 0.02, // Size of each dot
            });

            pointsMaterial.onBeforeCompile = function(shader) {
                shader.uniforms.mousePos = uniforms.mousePos;
                shader.vertexShader = `
                  uniform vec3 mousePos;
                  varying float vNormal;
                  ${shader.vertexShader}`.replace(
                  `#include <begin_vertex>`,
                  `#include <begin_vertex>
                    vec3 seg = position - mousePos;
                    float dist = length(seg);
                    vec3 dir = normalize(seg);
                    if (dist < 3.0) {
                      float force = clamp(0.03 / (dist * dist), 0.0, 0.05);
                      transformed += dir * force;
                      vNormal = force * 0.1;
                    }
                  `
                );
            };

            // Create the Points object
            const points = new THREE.Points(pointsGeometry, pointsMaterial);

            // Apply the same transformation and rotation as the original model
            points.rotation.copy(obj.rotation);
            points.position.copy(center);

            scene.add(points);
        }
    });

    // Add mouse move listener to update the shader with mouse position
    document.addEventListener('mousemove', (event) => {
        event.preventDefault();
        const cursor = { x: event.clientX / window.innerWidth - 0.5, y: event.clientY / window.innerHeight - 0.5 };
        uniforms.mousePos.value.set(cursor.x * 10, -cursor.y * 10, 0); // Apply a scaling factor to mouse position
    }, false);
}

/////////////////////////////////////////////////////////////////////////
//// INTRO CAMERA ANIMATION USING TWEEN
function introAnimation() {
    controls.enabled = false; // Disable orbit controls to animate the camera
    new TWEEN.Tween(camera.position).to({
        x: camera.position.x - 10, // Moving camera along X-axis
        y: camera.position.y,
        z: camera.position.z
    }, 6500) // Time to animate
        .easing(TWEEN.Easing.Quadratic.InOut).start()
        .onComplete(function () {
            controls.enabled = true; // Enable orbit controls
            document.querySelector('.main--title').classList.add('ended');
            setOrbitControlsLimits(); // Enable controls limits
            TWEEN.remove(this); // Remove the animation from memory
        });
}
introAnimation();
/////////////////////////////////////////////////////////////////////////
//// DEFINE ORBIT CONTROLS LIMITS
function setOrbitControlsLimits() {
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    controls.minDistance = 0.5;
    controls.maxDistance = 9;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.5;
}
/////////////////////////////////////////////////////////////////////////
//// RENDER LOOP FUNCTION
function rendeLoop() {
    TWEEN.update();
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(rendeLoop);
}
rendeLoop();
/////////////////////////////////////////////////////////////////////////
