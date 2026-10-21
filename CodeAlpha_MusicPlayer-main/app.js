const playlist = [
  {
    title: "Acoustic Sunset",
    artist: "Acoustic Trio",
    duration: 180,
    formattedDuration: "3:00",
    color: "#ff7700",
    notes: [261.63, 329.63, 392.00, 523.25],
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },
  {
    title: "Midnight Chill",
    artist: "Synth Waves",
    duration: 210,
    formattedDuration: "3:30",
    color: "#38bdf8",
    notes: [293.66, 349.23, 440.00, 587.33],
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
  },
  {
    title: "Forest Echoes",
    artist: "Nature Ambiance",
    duration: 195,
    formattedDuration: "3:15",
    color: "#22c55e",
    notes: [329.63, 392.00, 493.88, 659.25],
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
  },
  {
    title: "Urban Horizon",
    artist: "Lo-Fi Beats",
    duration: 240,
    formattedDuration: "4:00",
    color: "#888888",
    notes: [220.00, 277.18, 329.63, 440.00],
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"
  }
];

let currentTrackIndex = 0;
let isPlaying = false;
let isAutoplayEnabled = true;
let isMuted = false;
let previousVolume = 0.8;

let audioCtx = null;
let synthOscillator = null;
let synthGainNode = null;
let synthTimer = null;
let currentSynthNoteIndex = 0;

let currentProgressSeconds = 0;
let progressTimer = null;
let useWebAudioSynth = false;

const audio = new Audio();
audio.crossOrigin = "anonymous";

const trackTitle = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');
const coverArt = document.getElementById('coverArt');
const svgArt = document.getElementById('svgArt');
const progressBar = document.getElementById('progressBar');
const currentTimeDisplay = document.getElementById('currentTime');
const totalDurationDisplay = document.getElementById('totalDuration');
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const autoplayBtn = document.getElementById('autoplayBtn');
const playlistToggleBtn = document.getElementById('playlistToggleBtn');
const playlistCard = document.getElementById('playlistCard');
const playlistTracks = document.getElementById('playlistTracks');
const playlistCount = document.getElementById('playlistCount');
const volumeSlider = document.getElementById('volumeSlider');
const muteBtn = document.getElementById('muteBtn');
const volumeHighIcon = document.getElementById('volumeHighIcon');
const volumeMuteIcon = document.getElementById('volumeMuteIcon');

function initPlayer() {
  renderPlaylist();
  loadTrack(currentTrackIndex);
  updateVolumeState();
}

function renderPlaylist() {
  playlistTracks.innerHTML = '';
  playlistCount.textContent = `${playlist.length} tracks`;

  playlist.forEach((track, index) => {
    const li = document.createElement('li');
    li.className = `track-item ${index === currentTrackIndex ? 'active' : ''}`;
    
    li.innerHTML = `
      <div class="item-left">
        <span class="item-index">${index + 1}</span>
        <div class="item-details">
          <span class="item-title">${track.title}</span>
          <span class="item-artist">${track.artist}</span>
        </div>
      </div>
      <span class="item-duration">${track.formattedDuration}</span>
    `;

    li.addEventListener('click', () => {
      currentTrackIndex = index;
      loadTrack(currentTrackIndex);
      playAudio();
    });

    playlistTracks.appendChild(li);
  });
}

function updateActivePlaylistTrack() {
  const items = playlistTracks.querySelectorAll('.track-item');
  items.forEach((item, index) => {
    if (index === currentTrackIndex) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

function updateCoverArtSvg(color) {
  svgArt.innerHTML = `
    <rect width="100" height="100" fill="#121212"/>
    <circle cx="50" cy="50" r="32" stroke="#333333" stroke-width="4"/>
    <circle cx="50" cy="50" r="14" fill="${color || '#38bdf8'}"/>
  `;
}

function loadTrack(index) {
  stopSynthAudio();
  audio.pause();
  
  const track = playlist[index];
  trackTitle.textContent = track.title;
  trackArtist.textContent = track.artist;
  totalDurationDisplay.textContent = track.formattedDuration;
  
  currentProgressSeconds = 0;
  progressBar.value = 0;
  currentTimeDisplay.textContent = "0:00";
  
  updateCoverArtSvg(track.color);
  updateActivePlaylistTrack();
  
  audio.src = track.src;
}

function initAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function startSynthAudio() {
  initAudioContext();
  if (!audioCtx) return;

  stopSynthAudio();

  const track = playlist[currentTrackIndex];
  synthGainNode = audioCtx.createGain();
  const targetVol = isMuted ? 0 : parseFloat(volumeSlider.value) * 0.15;
  synthGainNode.gain.setValueAtTime(targetVol, audioCtx.currentTime);
  synthGainNode.connect(audioCtx.destination);

  synthOscillator = audioCtx.createOscillator();
  synthOscillator.type = 'sine';
  synthOscillator.frequency.setValueAtTime(track.notes[0], audioCtx.currentTime);
  synthOscillator.connect(synthGainNode);
  synthOscillator.start();

  currentSynthNoteIndex = 0;
  synthTimer = setInterval(() => {
    if (!isPlaying) return;
    currentSynthNoteIndex = (currentSynthNoteIndex + 1) % track.notes.length;
    if (synthOscillator && audioCtx) {
      synthOscillator.frequency.setValueAtTime(track.notes[currentSynthNoteIndex], audioCtx.currentTime);
    }
  }, 600);
}

function stopSynthAudio() {
  if (synthTimer) {
    clearInterval(synthTimer);
    synthTimer = null;
  }
  if (synthOscillator) {
    try {
      synthOscillator.stop();
      synthOscillator.disconnect();
    } catch (e) {}
    synthOscillator = null;
  }
  if (synthGainNode) {
    try {
      synthGainNode.disconnect();
    } catch (e) {}
    synthGainNode = null;
  }
}

function startProgressTimer() {
  stopProgressTimer();
  progressTimer = setInterval(() => {
    if (!isPlaying) return;

    const track = playlist[currentTrackIndex];
    if (useWebAudioSynth) {
      currentProgressSeconds += 1;
      if (currentProgressSeconds >= track.duration) {
        handleTrackEnded();
        return;
      }
      const pct = (currentProgressSeconds / track.duration) * 100;
      progressBar.value = pct;
      currentTimeDisplay.textContent = formatTime(currentProgressSeconds);
    } else {
      if (audio.duration) {
        currentProgressSeconds = audio.currentTime;
        const pct = (audio.currentTime / audio.duration) * 100;
        progressBar.value = pct;
        currentTimeDisplay.textContent = formatTime(audio.currentTime);
        totalDurationDisplay.textContent = formatTime(audio.duration);
      }
    }
  }, 500);
}

function stopProgressTimer() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

function playAudio() {
  initAudioContext();
  useWebAudioSynth = false;

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.then(() => {
      isPlaying = true;
      updatePlayPauseUI();
      startProgressTimer();
    }).catch(() => {
      useWebAudioSynth = true;
      isPlaying = true;
      updatePlayPauseUI();
      startSynthAudio();
      startProgressTimer();
    });
  } else {
    isPlaying = true;
    updatePlayPauseUI();
    startProgressTimer();
  }
}

function pauseAudio() {
  audio.pause();
  stopSynthAudio();
  isPlaying = false;
  updatePlayPauseUI();
  stopProgressTimer();
}

function togglePlayPause() {
  if (isPlaying) {
    pauseAudio();
  } else {
    playAudio();
  }
}

function updatePlayPauseUI() {
  if (isPlaying) {
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
  } else {
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
  }
}

function prevTrack() {
  currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
  loadTrack(currentTrackIndex);
  playAudio();
}

function nextTrack() {
  currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
  loadTrack(currentTrackIndex);
  playAudio();
}

function handleTrackEnded() {
  if (isAutoplayEnabled) {
    nextTrack();
  } else {
    pauseAudio();
    currentProgressSeconds = 0;
    progressBar.value = 0;
    currentTimeDisplay.textContent = "0:00";
  }
}

function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function setProgress(e) {
  const track = playlist[currentTrackIndex];
  const targetPct = parseFloat(e.target.value);
  
  if (useWebAudioSynth) {
    currentProgressSeconds = (targetPct / 100) * track.duration;
    currentTimeDisplay.textContent = formatTime(currentProgressSeconds);
  } else if (audio.duration) {
    audio.currentTime = (targetPct / 100) * audio.duration;
    currentProgressSeconds = audio.currentTime;
    currentTimeDisplay.textContent = formatTime(audio.currentTime);
  }
}

function updateVolumeState() {
  const vol = parseFloat(volumeSlider.value);
  audio.volume = vol;
  
  if (synthGainNode && audioCtx) {
    const targetVol = isMuted ? 0 : vol * 0.15;
    synthGainNode.gain.setValueAtTime(targetVol, audioCtx.currentTime);
  }

  if (vol === 0 || isMuted) {
    volumeHighIcon.classList.add('hidden');
    volumeMuteIcon.classList.remove('hidden');
  } else {
    volumeHighIcon.classList.remove('hidden');
    volumeMuteIcon.classList.add('hidden');
  }
}

function handleVolumeInput(e) {
  const val = parseFloat(e.target.value);
  isMuted = val === 0;
  updateVolumeState();
}

function toggleMute() {
  if (isMuted) {
    audio.volume = previousVolume > 0 ? previousVolume : 0.8;
    volumeSlider.value = audio.volume;
    isMuted = false;
  } else {
    previousVolume = parseFloat(volumeSlider.value);
    audio.volume = 0;
    volumeSlider.value = 0;
    isMuted = true;
  }
  updateVolumeState();
}

function toggleAutoplay() {
  isAutoplayEnabled = !isAutoplayEnabled;
  if (isAutoplayEnabled) {
    autoplayBtn.classList.add('active');
  } else {
    autoplayBtn.classList.remove('active');
  }
}

function togglePlaylistView() {
  playlistCard.classList.toggle('hidden');
}

playPauseBtn.addEventListener('click', togglePlayPause);
prevBtn.addEventListener('click', prevTrack);
nextBtn.addEventListener('click', nextTrack);
progressBar.addEventListener('input', setProgress);

audio.addEventListener('timeupdate', () => {
  if (!useWebAudioSynth && isPlaying && audio.duration) {
    const pct = (audio.currentTime / audio.duration) * 100;
    progressBar.value = pct;
    currentTimeDisplay.textContent = formatTime(audio.currentTime);
    totalDurationDisplay.textContent = formatTime(audio.duration);
  }
});

audio.addEventListener('ended', handleTrackEnded);

volumeSlider.addEventListener('input', handleVolumeInput);
muteBtn.addEventListener('click', toggleMute);
autoplayBtn.addEventListener('click', toggleAutoplay);
playlistToggleBtn.addEventListener('click', togglePlaylistView);

document.addEventListener('DOMContentLoaded', initPlayer);
