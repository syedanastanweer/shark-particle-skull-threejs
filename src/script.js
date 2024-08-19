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
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 100)
camera.position.set(34, 16, -20)
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
controls.autoRotate = false // Disable auto-rotation
/////////////////////////////////////////////////////////////////////////
///// LOADING GLB/GLTF MODEL FROM BLENDER
loader.load('models/gltf/hammerhead Shark (1).glb', function (gltf) {
    gltf.scene.traverse((obj) => {
        if (obj.isMesh) {
            sampler = new MeshSurfaceSampler(obj).build()
        }
    })
    transformMesh()
})
/////////////////////////////////////////////////////////////////////////
///// TRANSFORM MESH INTO POINTS
let sampler
let uniforms = { mousePos: { value: new THREE.Vector3() } }
let pointsGeometry = new THREE.BufferGeometry()
const vertices = []
const tempPosition = new THREE.Vector3()
function transformMesh() {
    // Reduce the number of particles to make the model less dense
    for (let i = 0; i < 2500; i++) { // Decrease the number of particles to 50,000f
        sampler.sample(tempPosition)
        vertices.push(tempPosition.x, tempPosition.y, tempPosition.z)
    }
    pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))

    const pointsMaterial = new THREE.PointsMaterial({
        color: 0xffff00, // Yellow color
        size: 0.03, // Slightly larger size for visibility with fewer particles
        blending: THREE.NormalBlending, 
        transparent: true,
        opacity: 1, // Full opacity
        depthWrite: true, 
        sizeAttenuation: true,
    })

    pointsMaterial.onBeforeCompile = function(shader) {
        shader.uniforms.mousePos = uniforms.mousePos
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
        )
    }

    const points = new THREE.Points(pointsGeometry, pointsMaterial)
    scene.add(points)
}
/////////////////////////////////////////////////////////////////////////
//// INTRO CAMERA ANIMATION USING TWEEN
function introAnimation() {
    controls.enabled = false // Disable orbit controls to animate the camera
    new TWEEN.Tween(camera.position.set(0, -1, 0)).to({
        x: 2,
        y: -0.4,
        z: 6.1
    }, 6500) // Time to animate
        .easing(TWEEN.Easing.Quadratic.InOut).start()
        .onComplete(function () {
            controls.enabled = true // Enable orbit controls
            document.querySelector('.main--title').classList.add('ended')
            setOrbitControlsLimits() // Enable controls limits
            TWEEN.remove(this) // Remove the animation from memory
        })
}
introAnimation()
/////////////////////////////////////////////////////////////////////////
//// DEFINE ORBIT CONTROLS LIMITS
function setOrbitControlsLimits() {
    controls.enableDamping = true
    controls.dampingFactor = 0.04
    controls.minDistance = 0.5
    controls.maxDistance = 9
    controls.enableRotate = true
    controls.enableZoom = true
    controls.zoomSpeed = 0.5
}
/////////////////////////////////////////////////////////////////////////
//// RENDER LOOP FUNCTION
function rendeLoop() {
    TWEEN.update()
    controls.update()
    renderer.render(scene, camera)
    requestAnimationFrame(rendeLoop)
}
rendeLoop()
/////////////////////////////////////////////////////////////////////////
//// ON MOUSE MOVE TO GET CAMERA POSITION
document.addEventListener('mousemove', (event) => {
    event.preventDefault()
    const cursor = { x: event.clientX / window.innerWidth - 0.5, y: event.clientY / window.innerHeight - 0.5 }
    uniforms.mousePos.value.set(cursor.x * 10, -cursor.y * 10, 0) // Apply a scaling factor to mouse position
}, false)
