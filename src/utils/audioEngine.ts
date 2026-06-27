// Browser-synthesized audio engine for soothing background sounds and interactive voicemails.
// Uses the Web Audio API to procedurally generate soundscapes without needing external audio files.

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;

  // Atmosphere nodes
  private rainNode: { noise: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode } | null = null;
  private wavesNode: { noise: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode; lfo: OscillatorNode } | null = null;
  private trainNode: { osc: OscillatorNode; clickGain: GainNode; interval: number } | null = null;
  private birdsInterval: number | null = null;
  private pianoInterval: number | null = null;

  // Active playing audio element (for custom recorded voicemails)
  private activeAudioElement: HTMLAudioElement | null = null;
  private audioSourceNode: MediaElementAudioSourceNode | null = null;
  private activeBufferSource: AudioBufferSourceNode | null = null;

  // Synthetic Voicemail Drone (for pre-loaded romantic letters)
  private voicemailDrone: {
    padOsc1: OscillatorNode;
    padOsc2: OscillatorNode;
    padGain: GainNode;
    heartbeatInterval: number;
    bellTimer: number;
  } | null = null;

  // Volume states (0 to 1)
  private volumes: Record<string, number> = {
    rain: 0,
    waves: 0,
    train: 0,
    birds: 0,
    piano: 0,
    voicemail: 0.8,
  };

  private isInitialized = false;

  constructor() {
    // We will initialize on first user gesture
  }

  public init() {
    if (this.isInitialized) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);

      this.analyser.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.isInitialized = true;
      console.log('Audio Engine initialized successfully');
    } catch (e) {
      console.error('Failed to initialize AudioContext:', e);
    }
  }

  private resumeContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playTudum() {
    this.resumeContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Netflix "Tudum":
    // "Tu" (First deep beat) at t = 0
    this.triggerTudumBeat(now, 90, 0.5, 0.2);
    
    // "Dum" (Second deeper, heavier beat) at t = 0.22 seconds
    this.triggerTudumBeat(now + 0.22, 75, 0.7, 0.5);
    
    // Bright metallic shimmers at t = 0.22 to 0.35 seconds
    this.triggerTudumShimmer(now + 0.22, 0.2);
  }

  private triggerTudumBeat(time: number, freq: number, maxVol: number, duration: number) {
    if (!this.ctx) return;
    try {
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, time);
      osc1.frequency.exponentialRampToValueAtTime(freq * 0.75, time + duration);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, time);
      osc2.frequency.exponentialRampToValueAtTime(freq * 1.5, time + duration);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(maxVol, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + duration + 0.05);
      osc2.stop(time + duration + 0.05);
    } catch (e) {
      console.error('Failed to trigger Tudum beat:', e);
    }
  }

  private triggerTudumShimmer(time: number, maxVol: number) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1800, time);
      osc.frequency.linearRampToValueAtTime(2400, time + 1.2);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1200, time);
      osc2.frequency.linearRampToValueAtTime(1400, time + 1.0);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, time);
      filter.Q.setValueAtTime(1.5, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(maxVol, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 1.5);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc2.start(time);
      osc.stop(time + 1.6);
      osc2.stop(time + 1.6);
    } catch (e) {
      console.error('Failed to trigger Tudum shimmer:', e);
    }
  }

  // Create a 2-second buffer of white noise
  private createNoiseBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext not initialized');
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // RAIN SYNTHESIS
  private startRain() {
    this.resumeContext();
    if (!this.ctx || !this.analyser) return;
    if (this.rainNode) return;

    try {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer();
      noise.loop = true;

      // Filter to make rain sound softer (gentle rumble + high hiss)
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, this.ctx.currentTime);

      const filter2 = this.ctx.createBiquadFilter();
      filter2.type = 'highpass';
      filter2.frequency.setValueAtTime(150, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      // Set to current volume state
      gain.gain.setValueAtTime(this.volumes.rain * 0.15, this.ctx.currentTime); // Rain needs to be soft

      noise.connect(filter);
      filter.connect(filter2);
      filter2.connect(gain);
      gain.connect(this.ctx.destination); // Connect background direct to output so it doesn't feed the visualizer analyzer (makes the voice clean!)

      noise.start(0);

      this.rainNode = { noise, filter, gain };
    } catch (e) {
      console.error('Error starting rain synth:', e);
    }
  }

  private stopRain() {
    if (this.rainNode) {
      try {
        this.rainNode.noise.stop();
        this.rainNode.noise.disconnect();
        this.rainNode.filter.disconnect();
        this.rainNode.gain.disconnect();
      } catch (e) {}
      this.rainNode = null;
    }
  }

  // OCEAN WAVES SYNTHESIS
  private startWaves() {
    this.resumeContext();
    if (!this.ctx) return;
    if (this.wavesNode) return;

    try {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer();
      noise.loop = true;

      // Filter for deep rolling wave sound
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.volumes.waves * 0.25, this.ctx.currentTime);

      // LFO to sweep lowpass and volume for rhythmic waves (0.08 Hz = ~12 second cycle)
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.08, this.ctx.currentTime);

      const lfoGainVol = this.ctx.createGain();
      lfoGainVol.gain.setValueAtTime(0.12, this.ctx.currentTime);

      const lfoGainFilter = this.ctx.createGain();
      lfoGainFilter.gain.setValueAtTime(250, this.ctx.currentTime);

      lfo.connect(lfoGainVol);
      // Offset wave volume
      const waveOffset = this.ctx.createGain();
      waveOffset.gain.setValueAtTime(this.volumes.waves * 0.12, this.ctx.currentTime);
      
      lfoGainVol.connect(waveOffset.gain);
      lfo.connect(lfoGainFilter);
      lfoGainFilter.connect(filter.frequency);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      lfo.start(0);
      noise.start(0);

      this.wavesNode = { noise, filter, gain, lfo };
    } catch (e) {
      console.error('Error starting waves synth:', e);
    }
  }

  private stopWaves() {
    if (this.wavesNode) {
      try {
        this.wavesNode.noise.stop();
        this.wavesNode.lfo.stop();
        this.wavesNode.noise.disconnect();
        this.wavesNode.filter.disconnect();
        this.wavesNode.gain.disconnect();
        this.wavesNode.lfo.disconnect();
      } catch (e) {}
      this.wavesNode = null;
    }
  }

  // NIGHT TRAIN SYNTHESIS (Gentle rhythmic click + low frequency tracks hum)
  private startTrain() {
    this.resumeContext();
    if (!this.ctx) return;
    if (this.trainNode) return;

    try {
      // Low rumble
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(45, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(80, this.ctx.currentTime);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(this.volumes.train * 0.12, this.ctx.currentTime);

      osc.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(0);

      // Create click triggers for "clack-clack... clack-clack" rhythm
      const clickGain = this.ctx.createGain();
      clickGain.gain.setValueAtTime(0, this.ctx.currentTime);
      clickGain.connect(this.ctx.destination);

      let clickTime = 0;
      const playTrainClick = () => {
        if (!this.ctx || !this.trainNode) return;
        const now = this.ctx.currentTime;
        const vol = this.volumes.train * 0.04;

        // "Clack" 1
        this.triggerClick(now, vol);
        // "Clack" 2 (slightly softer and soon after)
        this.triggerClick(now + 0.15, vol * 0.7);

        // Next pair of clacks in 2 seconds
        this.trainNode.interval = window.setTimeout(playTrainClick, 2200);
      };

      this.trainNode = { osc, clickGain, interval: 0 };
      playTrainClick();
    } catch (e) {
      console.error('Error starting train synth:', e);
    }
  }

  private triggerClick(time: number, maxVolume: number) {
    if (!this.ctx) return;
    try {
      const clickOsc = this.ctx.createOscillator();
      clickOsc.type = 'sine';
      clickOsc.frequency.setValueAtTime(300, time);
      clickOsc.frequency.exponentialRampToValueAtTime(100, time + 0.08);

      const clickGainNode = this.ctx.createGain();
      clickGainNode.gain.setValueAtTime(0, time);
      clickGainNode.gain.linearRampToValueAtTime(maxVolume, time + 0.005);
      clickGainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(250, time);
      filter.Q.setValueAtTime(2, time);

      clickOsc.connect(filter);
      filter.connect(clickGainNode);
      clickGainNode.connect(this.ctx.destination);

      clickOsc.start(time);
      clickOsc.stop(time + 0.1);
    } catch (e) {}
  }

  private stopTrain() {
    if (this.trainNode) {
      try {
        this.trainNode.osc.stop();
        this.trainNode.osc.disconnect();
        window.clearTimeout(this.trainNode.interval);
      } catch (e) {}
      this.trainNode = null;
    }
  }

  // FOREST BIRDS (Random beautiful bird whistling chirps)
  private startBirds() {
    this.resumeContext();
    if (!this.ctx) return;
    if (this.birdsInterval) return;

    const playBirdChirp = () => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const vol = this.volumes.birds * 0.05;

      // Trigger a beautiful compound bird call
      const duration = 0.6;
      const baseFreq = 2000 + Math.random() * 800;

      // Quick series of sweeps
      for (let i = 0; i < 3; i++) {
        const start = now + i * 0.18;
        this.triggerSingleChirp(start, baseFreq + i * 150, vol);
      }

      // Schedule next call in 6 - 12 seconds
      const nextDelay = 6000 + Math.random() * 6000;
      this.birdsInterval = window.setTimeout(playBirdChirp, nextDelay);
    };

    this.birdsInterval = window.setTimeout(playBirdChirp, 1000);
  }

  private triggerSingleChirp(time: number, baseFreq: number, maxVol: number) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, time);
      // Sweep sweep
      osc.frequency.exponentialRampToValueAtTime(baseFreq + 600, time + 0.08);
      osc.frequency.linearRampToValueAtTime(baseFreq - 200, time + 0.14);

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(maxVol, time + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + 0.15);
    } catch (e) {}
  }

  private stopBirds() {
    if (this.birdsInterval) {
      window.clearTimeout(this.birdsInterval);
      this.birdsInterval = null;
    }
  }

  // AMBIENT PIANO CHORD GENERATOR
  // Procedurally creates incredibly rich, emotional piano-like tones playing warm chords
  private startPiano() {
    this.resumeContext();
    if (!this.ctx) return;
    if (this.pianoInterval) return;

    // Sweet romantic progression in F/C Major:
    // 0: Cmaj9 (C, E, G, B, D)
    // 1: Fmaj9 (F, A, C, E, G)
    // 2: Am9 (A, C, E, G, B)
    // 3: G6/9 (G, B, D, E, A)
    const chords = [
      [60, 64, 67, 71, 74], // Cmaj9
      [53, 57, 60, 64, 67], // Fmaj9
      [57, 60, 64, 67, 71], // Am9
      [55, 59, 62, 64, 69], // G6/9
    ];
    let chordIndex = 0;

    const playNextChord = () => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const vol = this.volumes.piano * 0.18; // Keep gentle

      const currentChord = chords[chordIndex];
      chordIndex = (chordIndex + 1) % chords.length;

      // Slightly arpeggiate notes for natural piano feel
      currentChord.forEach((midi, idx) => {
        const freq = Math.pow(2, (midi - 69) / 12) * 440;
        const delay = idx * 0.08; // Arpeggiation delay
        this.triggerPianoNote(now + delay, freq, vol * (1 - idx * 0.08));
      });

      // Schedule next chord in 6 to 9 seconds
      const nextDelay = 6500 + Math.random() * 2500;
      this.pianoInterval = window.setTimeout(playNextChord, nextDelay);
    };

    this.pianoInterval = window.setTimeout(playNextChord, 1000);
  }

  private triggerPianoNote(time: number, freq: number, maxVol: number) {
    if (!this.ctx) return;
    try {
      // FM Synth for warmth (carrier + modulator)
      const carrier = this.ctx.createOscillator();
      carrier.type = 'triangle';
      carrier.frequency.setValueAtTime(freq, time);

      const modulator = this.ctx.createOscillator();
      modulator.type = 'sine';
      modulator.frequency.setValueAtTime(freq * 2, time);

      const modGain = this.ctx.createGain();
      modGain.gain.setValueAtTime(freq * 0.5, time);
      modGain.gain.exponentialRampToValueAtTime(0.1, time + 2.0);

      // Routing FM
      modulator.connect(modGain);
      modGain.connect(carrier.frequency);

      // Lowpass filter to shave off high transients (giving the dull warmth of vertical ambient piano)
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, time);
      filter.frequency.exponentialRampToValueAtTime(300, time + 2.5);

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0, time);
      // Soft attack
      gainNode.gain.linearRampToValueAtTime(maxVol, time + 0.05);
      // Beautiful long decay
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 5.5);

      // Simple echo / space effect via delay node
      const delayNode = this.ctx.createDelay();
      delayNode.delayTime.setValueAtTime(0.45, time);

      const delayFeedback = this.ctx.createGain();
      delayFeedback.gain.setValueAtTime(0.4, time); // Feedback volume

      // Feedback loops
      carrier.connect(filter);
      filter.connect(gainNode);

      gainNode.connect(this.ctx.destination); // Direct dry out
      
      // Send dry output to delay
      gainNode.connect(delayNode);
      delayNode.connect(delayFeedback);
      delayFeedback.connect(delayNode); // feedback loop
      delayFeedback.connect(this.ctx.destination); // wet output

      modulator.start(time);
      carrier.start(time);

      modulator.stop(time + 6.0);
      carrier.stop(time + 6.0);
    } catch (e) {}
  }

  private stopPiano() {
    if (this.pianoInterval) {
      window.clearTimeout(this.pianoInterval);
      this.pianoInterval = null;
    }
  }

  // MASTER CONTROLLER FOR SOUNDSCAPES
  public toggleAtmosphere(soundId: string, isPlaying: boolean, volume = 0.5) {
    this.volumes[soundId] = volume;

    if (!isPlaying) {
      if (soundId === 'rain') this.stopRain();
      if (soundId === 'waves') this.stopWaves();
      if (soundId === 'train') this.stopTrain();
      if (soundId === 'birds') this.stopBirds();
      if (soundId === 'piano') this.stopPiano();
      return;
    }

    if (soundId === 'rain') this.startRain();
    if (soundId === 'waves') this.startWaves();
    if (soundId === 'train') this.startTrain();
    if (soundId === 'birds') this.startBirds();
    if (soundId === 'piano') this.startPiano();
  }

  public setAtmosphereVolume(soundId: string, volume: number) {
    this.volumes[soundId] = volume;
    const now = this.ctx ? this.ctx.currentTime : 0;

    if (soundId === 'rain' && this.rainNode) {
      this.rainNode.gain.gain.setValueAtTime(volume * 0.15, now);
    } else if (soundId === 'waves' && this.wavesNode) {
      this.wavesNode.gain.gain.setValueAtTime(volume * 0.25, now);
    } else if (soundId === 'train' && this.trainNode) {
      // Will apply on next click triggers
    }
  }

  // PLAY ROMANTIC PRE-LOADED VOICEMAIL TEXTURES
  // If no custom voice file is provided, play beautiful warm synthesized heartbeats and chimes
  public playSyntheticVoicemail() {
    this.resumeContext();
    if (!this.ctx || !this.analyser) return;
    this.stopSyntheticVoicemail();

    try {
      const padOsc1 = this.ctx.createOscillator();
      padOsc1.type = 'sine';
      padOsc1.frequency.setValueAtTime(146.83, this.ctx.currentTime); // D3 chordal root

      const padOsc2 = this.ctx.createOscillator();
      padOsc2.type = 'triangle';
      padOsc2.frequency.setValueAtTime(220.00, this.ctx.currentTime); // A3 perfect fifth

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, this.ctx.currentTime);

      const padGain = this.ctx.createGain();
      padGain.gain.setValueAtTime(0, this.ctx.currentTime);
      padGain.gain.linearRampToValueAtTime(this.volumes.voicemail * 0.45, this.ctx.currentTime + 1.5);

      padOsc1.connect(filter);
      padOsc2.connect(filter);
      filter.connect(padGain);
      padGain.connect(this.analyser); // Routing to analyzer so it visualizes nicely!

      padOsc1.start(0);
      padOsc2.start(0);

      // Loop rhythmic heartbeats: lub-dub... lub-dub
      const playHeartbeat = () => {
        if (!this.ctx || !this.analyser) return;
        const now = this.ctx.currentTime;
        const vol = this.volumes.voicemail * 0.7;

        // "Lub"
        this.triggerHeartbeatClick(now, vol);
        // "Dub"
        this.triggerHeartbeatClick(now + 0.15, vol * 0.6);

        this.voicemailDrone!.heartbeatInterval = window.setTimeout(playHeartbeat, 1300);
      };

      // Periodic magical bells
      const playBellChime = () => {
        if (!this.ctx || !this.analyser) return;
        const now = this.ctx.currentTime;
        const scale = [587.33, 659.25, 739.99, 880.00, 987.77]; // beautiful D major pentatonic
        const note = scale[Math.floor(Math.random() * scale.length)];
        
        this.triggerBell(now, note, this.volumes.voicemail * 0.25);
        this.voicemailDrone!.bellTimer = window.setTimeout(playBellChime, 2500 + Math.random() * 2500);
      };

      this.voicemailDrone = {
        padOsc1,
        padOsc2,
        padGain,
        heartbeatInterval: window.setTimeout(playHeartbeat, 100),
        bellTimer: window.setTimeout(playBellChime, 1500),
      };

    } catch (e) {
      console.error('Error starting synthetic voicemail drone:', e);
    }
  }

  private triggerHeartbeatClick(time: number, maxVol: number) {
    if (!this.ctx || !this.analyser) return;
    try {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(65, time);
      osc.frequency.exponentialRampToValueAtTime(30, time + 0.18);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(maxVol, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(90, time);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.analyser);

      osc.start(time);
      osc.stop(time + 0.3);
    } catch (e) {}
  }

  private triggerBell(time: number, freq: number, maxVol: number) {
    if (!this.ctx || !this.analyser) return;
    try {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      const metalOsc = this.ctx.createOscillator();
      metalOsc.type = 'sine';
      metalOsc.frequency.setValueAtTime(freq * 1.5, time);

      const metalGain = this.ctx.createGain();
      metalGain.gain.setValueAtTime(maxVol * 0.2, time);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(400, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(maxVol, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 2.0);

      metalOsc.connect(metalGain);
      metalGain.connect(osc.frequency); // simple FM modulation

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.analyser);

      osc.start(time);
      metalOsc.start(time);

      osc.stop(time + 2.1);
      metalOsc.stop(time + 2.1);
    } catch (e) {}
  }

  public stopSyntheticVoicemail() {
    if (this.voicemailDrone) {
      try {
        const now = this.ctx ? this.ctx.currentTime : 0;
        this.voicemailDrone.padGain.gain.setValueAtTime(this.voicemailDrone.padGain.gain.value, now);
        this.voicemailDrone.padGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        const d = this.voicemailDrone;
        window.setTimeout(() => {
          try {
            d.padOsc1.stop();
            d.padOsc2.stop();
            d.padOsc1.disconnect();
            d.padOsc2.disconnect();
            d.padGain.disconnect();
          } catch (e) {}
        }, 600);

        window.clearTimeout(this.voicemailDrone.heartbeatInterval);
        window.clearTimeout(this.voicemailDrone.bellTimer);
      } catch (e) {}
      this.voicemailDrone = null;
    }
  }

  // PLAY RECORDED AUDIO (Microphone Recording URL)
  public async playRecordedVoicemail(blobUrl: string, onEnded: () => void): Promise<void> {
    this.resumeContext();
    this.stopRecordedVoicemail();
    this.stopSyntheticVoicemail();

    if (!this.ctx || !this.analyser) {
      this.playRecordedVoicemailFallback(blobUrl, onEnded);
      return;
    }

    try {
      // Decode audio data for perfect 100% reliable Web Audio visualizer playback on iOS and Android
      const response = await fetch(blobUrl);
      const arrayBuffer = await response.arrayBuffer();
      
      const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
        if (!this.ctx) return reject(new Error('AudioContext closed'));
        this.ctx.decodeAudioData(arrayBuffer, resolve, reject);
      });

      const source = this.ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.analyser);
      this.activeBufferSource = source;

      source.onended = () => {
        if (this.activeBufferSource === source) {
          onEnded();
          this.stopRecordedVoicemail();
        }
      };

      source.start(0);
    } catch (e) {
      console.warn('Web Audio decoding failed or was blocked, falling back to standard HTML5 Audio:', e);
      this.playRecordedVoicemailFallback(blobUrl, onEnded);
    }
  }

  private async playRecordedVoicemailFallback(blobUrl: string, onEnded: () => void) {
    try {
      const audio = new Audio(blobUrl);
      audio.crossOrigin = 'anonymous';
      this.activeAudioElement = audio;
      audio.addEventListener('ended', () => {
        onEnded();
        this.stopRecordedVoicemail();
      });
      await audio.play();
    } catch (err) {
      console.error('Fallback HTML5 Audio play failed:', err);
      onEnded();
    }
  }

  public stopRecordedVoicemail() {
    if (this.activeBufferSource) {
      try {
        this.activeBufferSource.stop();
        this.activeBufferSource.disconnect();
      } catch (e) {}
      this.activeBufferSource = null;
    }
    if (this.activeAudioElement) {
      try {
        this.activeAudioElement.pause();
      } catch (e) {}
      this.activeAudioElement = null;
    }
    if (this.audioSourceNode) {
      try {
        this.audioSourceNode.disconnect();
      } catch (e) {}
      this.audioSourceNode = null;
    }
  }

  // AUDIO ANALYZER FREQUENCY BIN RETRIEVAL (For drawing the beating waves)
  public getAnalyserData(): number[] {
    if (!this.analyser) return Array(16).fill(0);
    
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    // Downsample to a beautiful 20-band resolution
    const numBands = 20;
    const step = Math.floor(bufferLength / numBands);
    const result: number[] = [];

    for (let i = 0; i < numBands; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += dataArray[i * step + j] || 0;
      }
      result.push(sum / step);
    }
    return result;
  }

  // Clean shutdown
  public destroy() {
    this.stopRain();
    this.stopWaves();
    this.stopTrain();
    this.stopBirds();
    this.stopPiano();
    this.stopSyntheticVoicemail();
    this.stopRecordedVoicemail();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

// Global Singleton for sharing across views
export const globalAudio = new AudioEngine();
