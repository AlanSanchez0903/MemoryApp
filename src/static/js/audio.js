class SoundManager {
    constructor() {
        this.sounds = {
            button: this.createAudio('/static/audio/button.wav'),
            flip: this.createAudio('/static/audio/flip.wav'),
            match: this.createAudio('/static/audio/match.wav'),
        };

        this.musicTracks = [
            this.createAudio('/static/audio/music1.wav', true),
            this.createAudio('/static/audio/music2.wav', true),
            this.createAudio('/static/audio/music3.wav', true),
        ];

        this.enabled = JSON.parse(localStorage.getItem('audioEnabled') ?? 'true');
        this.sfxVolume = parseFloat(localStorage.getItem('audioSfxVolume') ?? '0.6');
        this.musicVolume = parseFloat(localStorage.getItem('audioMusicVolume') ?? '0.6');
        this.currentMusicIndex = parseInt(localStorage.getItem('musicTrackIndex') ?? '0', 10);
        this.music = this.musicTracks[this.currentMusicIndex] ?? this.musicTracks[0];

        this.applySfxVolume();
        this.applyMusicVolume();
        this.ensureMusicPlaying();
    }

    createAudio(src, loop = false) {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.loop = loop;
        return audio;
    }

    play(key) {
        if (!this.enabled || !this.sounds[key]) return;
        const sound = this.sounds[key];
        sound.currentTime = 0;
        sound.volume = this.sfxVolume;
        sound.play().catch(() => {});
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        localStorage.setItem('audioEnabled', JSON.stringify(enabled));

        if (enabled) {
            this.ensureMusicPlaying();
        } else {
            this.pauseMusic();
        }
    }

    setSfxVolume(volume) {
        this.sfxVolume = volume;
        this.applySfxVolume();
        localStorage.setItem('audioSfxVolume', String(volume));
    }

    setMusicVolume(volume) {
        this.musicVolume = volume;
        this.applyMusicVolume();
        localStorage.setItem('audioMusicVolume', String(volume));
        if (this.music) {
            this.music.volume = this.musicVolume;
        }
    }

    selectMusic(index) {
        const newIndex = Math.max(0, Math.min(index, this.musicTracks.length - 1));
        localStorage.setItem('musicTrackIndex', String(newIndex));

        if (this.music === this.musicTracks[newIndex]) {
            this.ensureMusicPlaying();
            return;
        }

        this.pauseMusic();
        this.music = this.musicTracks[newIndex];
        this.applyMusicVolume();
        this.music.currentTime = 0;
        this.ensureMusicPlaying();
    }

    applySfxVolume() {
        Object.values(this.sounds).forEach((sound) => {
            sound.volume = this.sfxVolume;
        });
    }

    applyMusicVolume() {
        this.musicTracks.forEach((track) => {
            track.volume = this.musicVolume;
        });
    }

    ensureMusicPlaying() {
        if (!this.enabled || !this.music) return;
        this.music.currentTime = this.music.currentTime || 0;
        this.music.volume = this.musicVolume;
        this.music.play().catch(() => {});
    }

    pauseMusic() {
        if (this.music) {
            this.music.pause();
        }
    }
}

window.soundManager = new SoundManager();
