/**
 * Drone Scene Controller
 * Manages A-Frame scene and drone entities based on month data
 */

class DroneScene {
  constructor() {
    this.scene = null;
    this.assetsEl = null;
    this.currentDrones = [];
    this.fadeDelay = 200; // ms between each drone fade-in
  }

  /**
   * Initialize scene
   */
  init() {
    this.scene = document.querySelector('a-scene');
    this.assetsEl = document.querySelector('a-assets');

    if (!this.scene || !this.assetsEl) {
      console.error('Scene or assets element not found');
      return false;
    }

    return true;
  }

  /**
   * Load drones for selected month
   * @param {Object} monthData - Month object from months.json
   */
  async loadMonth(monthData) {
    console.log('Loading month:', monthData.name);

    // Clear existing drones
    this.clearDrones();

    // Check if month has drones
    if (!monthData.drones || monthData.drones.length === 0) {
      console.log('No drones for this month');
      // Could show a message to user here
      return;
    }

    // Create audio assets
    monthData.drones.forEach((drone, index) => {
      this.createAudioAsset(drone, index);
    });

    // Wait for assets to load
    await this.waitForAssetsLoad();

    // Create drone entities with staggered fade-in
    monthData.drones.forEach((drone, index) => {
      setTimeout(() => {
        this.createDroneEntity(drone, index, monthData.drones.length);
      }, index * this.fadeDelay);
    });
  }

  /**
   * Create audio asset element
   */
  createAudioAsset(drone, index) {
    const audio = document.createElement('audio');
    audio.id = `drone-${index}`;
    audio.setAttribute('src', drone.url);
    audio.setAttribute('loop', '');
    audio.setAttribute('crossorigin', 'anonymous');
    audio.setAttribute('preload', 'auto');

    // Store artist name as data attribute for later use
    audio.dataset.artist = drone.artist;
    audio.dataset.originalFilename = drone.originalFilename;

    this.assetsEl.appendChild(audio);
  }

  /**
   * Wait for A-Frame assets to load
   */
  waitForAssetsLoad() {
    return new Promise((resolve) => {
      if (this.assetsEl.hasLoaded) {
        resolve();
      } else {
        this.assetsEl.addEventListener('loaded', () => {
          resolve();
        }, { once: true });
      }
    });
  }

  /**
   * Create drone entity in scene
   */
  createDroneEntity(drone, index, totalDrones) {
    const entity = document.createElement('a-entity');
    entity.setAttribute('class', 'drone-entity');

    // Create the visual object (box)
    const polyhedronEl = document.createElement('a-entity');
    polyhedronEl.setAttribute('geometry', 'primitive: box; width: 0.5; height: 0.5; depth: 0.5');
    polyhedronEl.setAttribute('material', 'shader: standard; color: #2a0800; emissive: #3a1000; emissiveIntensity: 0.25; metalness: 0.2; roughness: 0.8; side: double; transparent: true; opacity: 0');
    polyhedronEl.setAttribute('visible', 'true');
    polyhedronEl.setAttribute('class', 'drone-object');

    // Random rotation
    const initialRotation = {
      x: Math.random() * 360,
      y: Math.random() * 360,
      z: Math.random() * 360
    };
    polyhedronEl.setAttribute('rotation', `${initialRotation.x} ${initialRotation.y} ${initialRotation.z}`);

    // Fade in animation
    polyhedronEl.setAttribute('animation__opacity', {
      property: 'material.opacity',
      from: 0,
      to: 1,
      dur: 10000,
      easing: 'easeInOutQuad'
    });

    // Audio component
    entity.setAttribute('sound', {
      src: `#drone-${index}`,
      autoplay: true,
      positional: true,
      refDistance: 1,
      rolloffFactor: 1.5,
      loop: true
    });

    // Orbital motion parameters - glacial movement like immense objects
    const radius = (index === 0) ? 6 : 6 + Math.random() * 10;
    const speed = 0.003 + Math.random() * 0.005; // Very slow, glacial drift
    const inclination = Math.PI * (Math.random() * 0.3 - 0.15);
    const azimuthalOffset = (index === 0) ? 0 : Math.PI * 2 * Math.random(); // First one directly in front (angle 0 = -z)
    const direction = Math.random() > 0.5 ? 1 : -1;
    const tilt = Math.PI * (Math.random() * 0.2 - 0.1);
    const eccentricity = Math.random() * 0.15;

    entity.setAttribute('orbital-motion', {
      radius: radius,
      speed: speed,
      inclination: inclination,
      azimuthalOffset: azimuthalOffset,
      direction: direction,
      tilt: tilt,
      eccentricity: eccentricity
    });

    // Store metadata for hover/interaction
    entity.dataset.artist = drone.artist;
    entity.dataset.droneIndex = index;
    entity.dataset.originalFilename = drone.originalFilename;

    // Add visual object to entity
    entity.appendChild(polyhedronEl);

    // Add to scene
    this.scene.appendChild(entity);
    this.currentDrones.push(entity);

    // Update brightness control entity to refresh cache for new entity
    const brightnessControlEntity = document.getElementById('brightness-control-entity');
    if (brightnessControlEntity && brightnessControlEntity.components['brightness-control']) {
      brightnessControlEntity.components['brightness-control'].refreshCache();
      brightnessControlEntity.components['brightness-control'].update();
    }
  }

  /**
   * Clear all drone entities and audio assets
   */
  clearDrones() {
    // Remove entities from scene
    this.currentDrones.forEach(entity => {
      if (entity.parentNode) {
        entity.parentNode.removeChild(entity);
      }
    });
    this.currentDrones = [];

    // Clear audio assets
    const audioAssets = this.assetsEl.querySelectorAll('audio');
    audioAssets.forEach(audio => {
      // Stop audio before removing
      audio.pause();
      audio.currentTime = 0;
      if (audio.parentNode) {
        audio.parentNode.removeChild(audio);
      }
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DroneScene;
}
