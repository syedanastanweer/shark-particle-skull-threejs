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
///// VARIABLES TO TRACK ROTATION
let rotationX = -Math.PI / 2;
let rotationY = 3.2;
let rotationZ = Math.PI;
let modelScale = [0.5, 0.5, 0.5];
/////////////////////////////////////////////////////////////////////////
///// LOADING GLB/GLTF MODEL FROM BLENDER
loader.load('models/gltf/shark.glb', function (gltf) {
    const model = gltf.scene;

    // Apply initial rotation and scale
    model.rotation.set(rotationX, rotationY, rotationZ);
    model.scale.set(modelScale[0], modelScale[1], modelScale[2]);

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

    // Hide or remove the original model
    // Option 1: Hide the model
    // model.visible = false;

    // Option 2: Remove the model from the scene
    scene.remove(model);
});

/////////////////////////////////////////////////////////////////////////
//// CREATE WIREFRAME WITH HOVER EFFECT FROM MODEL GEOMETRY
function createWireframeWithHoverEffect(model, center) {
    let uniforms = { mousePos: { value: new THREE.Vector3() } };
    model.traverse((obj) => {
        if (obj.isMesh) {
            const geometry = obj.geometry;
            const vertices = geometry.attributes.position.array;

            // Create a buffer geometry for the points with more vertices
            const pointsGeometry = new THREE.BufferGeometry();
            pointsGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

            // Increase the density by adding the vertices multiple times
            const moreVertices = [];
            for (let i = 0; i < vertices.length; i += 3) {
                // Adding the same vertex multiple times for higher density
                moreVertices.push(vertices[i], vertices[i + 1], vertices[i + 2]);
                moreVertices.push(vertices[i] + 0.001, vertices[i + 1] + 0.001, vertices[i + 2] + 0.001); // Slight offset for density
            }

            // Set the new, denser set of vertices
            pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(moreVertices, 3));

            // Create a material with circular points
            const pointsMaterial = new THREE.PointsMaterial({
                color: 0x01ADFF, // Blue color for the dots
                size: 0.020, // Adjust the size as needed
                sizeAttenuation: true, // Size attenuates with distance
            });

            // Modify the shader to create circular points
            pointsMaterial.onBeforeCompile = function (shader) {
                shader.uniforms.mousePos = uniforms.mousePos;

                // Adding the custom shader code
                shader.vertexShader = `
                uniform vec3 mousePos;
                varying float vNormal;
                ${shader.vertexShader}`.replace(
                  `#include <begin_vertex>`,
                  `#include <begin_vertex>
                  vec3 transformedPos = (modelMatrix * vec4(position, 1.0)).xyz;
                  vec3 seg = transformedPos - mousePos;
                  float dist = length(seg);
                  vec3 dir = normalize(seg);
                  if (dist < 3.0) {
                    float force = clamp(0.03 / (dist * dist), 0.0, 0.05);
                    transformed += dir * force;
                    vNormal = force * 0.1;
                  }
                `
              );
              

                // Fragment shader code to create circular points
                shader.fragmentShader = `
                  varying float vNormal;
                  ${shader.fragmentShader}`.replace(
                    `#include <clipping_planes_fragment>`,
                    `#include <clipping_planes_fragment>
                    float r = length(gl_PointCoord - vec2(0.5));
                    if (r > 0.5) discard;
                  `
                );
            };

            // Create the Points object
            const points = new THREE.Points(pointsGeometry, pointsMaterial);

            // Apply the same transformation and rotation as the original model
            points.rotation.copy(model.rotation);
            points.scale.copy(model.scale);
            points.position.copy(center);

            scene.add(points);
        }
    });

    // Add mouse move listener to update the shader with mouse position
document.addEventListener('mousemove', (event) => {
    event.preventDefault();

    // Calculate normalized device coordinates (NDC)
    const cursor = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
    );

    // Convert NDC to 3D coordinates in world space
    const vector = new THREE.Vector3(cursor.x, cursor.y, 0.5).unproject(camera);

    // Calculate direction vector from camera to mouse position
    const direction = vector.sub(camera.position).normalize();

    // Calculate distance from camera to the model's center
    const distance = controls.target.distanceTo(camera.position);

    // Calculate the position in world space where the mouse is pointing
    const mousePos = camera.position.clone().add(direction.multiplyScalar(distance));

    uniforms.mousePos.value.set(mousePos.x, mousePos.y, mousePos.z);
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
//// UPDATE ROTATION BASED ON INPUT
function updateRotation(x, y, z) {
    rotationX = x;
    rotationY = y;
    rotationZ = z;
}

/////////////////////////////////////////////////////////////////////////
//// RENDER LOOP FUNCTION
function rendeLoop() {
    TWEEN.update();
    controls.update();

    // Apply rotation to the wireframe (model has been removed or hidden)
    if (scene.children.length > 1) {
        const wireframe = scene.children[scene.children.length - 1]; // Assuming the wireframe is the last added object
        wireframe.rotation.set(rotationX, rotationY, rotationZ);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(rendeLoop);
}
rendeLoop();
/////////////////////////////////////////////////////////////////////////
