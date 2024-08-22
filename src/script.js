/////////////////////////////////////////////////////////////////////////
///// IMPORT
import './main.css'
import * as THREE from 'three'
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
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
loader.load('models/gltf/hammerhead Shark (1).glb', function (gltf) {
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

    // Create a wireframe from the model's geometry
    createWireframe(model, center);

    // Optionally, hide or remove the original model to display only the wireframe
    scene.remove(model); // Remove the original model from the scene
});
/////////////////////////////////////////////////////////////////////////
///// CREATE WIREFRAME FROM MODEL GEOMETRY
function createWireframe(model, center) {
    // Traverse the model to get its geometry and create a wireframe
    model.traverse((obj) => {
        if (obj.isMesh) {
            const wireframeGeometry = new THREE.WireframeGeometry(obj.geometry);
            const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 }); // Yellow color for the wireframe
            const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);

            // Apply the same transformation and rotation as the original model
            wireframe.rotation.copy(obj.rotation);
            wireframe.position.copy(center);

            scene.add(wireframe);
        }
    });
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
//// ON MOUSE MOVE TO GET CAMERA POSITION
document.addEventListener('mousemove', (event) => {
    event.preventDefault();
    const cursor = { x: event.clientX / window.innerWidth - 0.5, y: event.clientY / window.innerHeight - 0.5 };
    uniforms.mousePos.value.set(cursor.x * 10, -cursor.y * 10, 0); // Apply a scaling factor to mouse position
}, false);
