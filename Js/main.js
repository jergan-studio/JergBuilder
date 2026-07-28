import * as THREE from 'three';
import { Player } from './player.js';
import { MapGenerator } from '../Map/mapGenerator.js';

// --- 1. UI NAVIGATION MANAGER ---
const panels = {
    title: document.getElementById('menu-title'),
    worlds: document.getElementById('menu-worlds'),
    skin: document.getElementById('menu-skin'),
    settings: document.getElementById('menu-settings')
};

function showScreen(screenKey) {
    Object.keys(panels).forEach(key => {
        if (panels[key]) panels[key].classList.add('hidden');
    });

    if (panels[screenKey]) {
        panels[screenKey].classList.remove('hidden');
    }
}

function bindClick(selector, callback) {
    const el = document.querySelector(selector);
    if (el) {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            callback(e);
        });
    }
}

bindClick('#btn-worlds', () => showScreen('worlds'));
bindClick('#btn-skin', () => showScreen('skin'));
bindClick('#btn-settings', () => showScreen('settings'));

document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        showScreen('title');
    });
});

// --- 2. BACKGROUND MUSIC SYSTEM ---
const bgMusic = new Audio('https://github.com/jergan-studio/JergBuilder/raw/refs/heads/main/Assets/monume-roblox-minecraft-fortnite-video-game-music-498036.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.3;

function playMusic() {
    bgMusic.play().catch(err => {
        console.log("Audio waiting for user click interaction:", err);
    });
}

// Start playing music on the first user click
window.addEventListener('click', () => playMusic(), { once: true });

// --- 3. INVENTORY & HOTBAR SYSTEM ---
const blockInventory = [
    { name: 'Grass', key: 'grass', color: '#557a2b' },
    { name: 'Gray', key: 'gray', color: '#808080' },
    { name: 'Blue', key: 'blue', color: '#1e90ff' },
    { name: 'Red', key: 'red', color: '#ff3333' },
    { name: 'Pink', key: 'pink', color: '#ff69b4' },
    { name: 'Green', key: 'green', color: '#2e8b57' },
    { name: 'Lime', key: 'lime', color: '#32cd32' },
    { name: 'Yellow', key: 'yellow', color: '#ffd700' }
];

let selectedSlotIndex = 0;

function createHotbarUI() {
    const hotbarEl = document.getElementById('hotbar');
    if (!hotbarEl) return;
    hotbarEl.innerHTML = '';

    blockInventory.forEach((item, index) => {
        const slot = document.createElement('div');
        slot.className = `hotbar-slot ${index === selectedSlotIndex ? 'active' : ''}`;
        
        const num = document.createElement('span');
        num.className = 'hotbar-number';
        num.innerText = index + 1;

        const colorBox = document.createElement('div');
        colorBox.className = 'hotbar-color-preview';
        colorBox.style.backgroundColor = item.color;

        slot.appendChild(num);
        slot.appendChild(colorBox);
        hotbarEl.appendChild(slot);
    });
}

function selectSlot(index) {
    if (index >= 0 && index < blockInventory.length) {
        selectedSlotIndex = index;
        createHotbarUI();
    }
}

// Keyboard (1-8) and Mouse Wheel slot selection
window.addEventListener('keydown', (e) => {
    const num = parseInt(e.key);
    if (!isNaN(num) && num >= 1 && num <= blockInventory.length) {
        selectSlot(num - 1);
    }
});

window.addEventListener('wheel', (e) => {
    if (document.pointerLockElement === renderer.domElement) {
        if (e.deltaY > 0) {
            selectSlot((selectedSlotIndex + 1) % blockInventory.length);
        } else {
            selectSlot((selectedSlotIndex - 1 + blockInventory.length) % blockInventory.length);
        }
    }
});

// --- 4. THREE.JS ENGINE & SCENE SETUP ---
let gameStarted = false;
let player = null;
let mapGenerator = null;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(30, 50, 30);
dirLight.castShadow = true;
scene.add(dirLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

createHotbarUI();

// --- 5. LAUNCH GAME & POINTER LOCK ---
function launchGame() {
    playMusic();

    if (!gameStarted) {
        const seed = `seed_${Math.floor(Math.random() * 100000)}`;
        mapGenerator = new MapGenerator(scene, seed);
        mapGenerator.generate();
