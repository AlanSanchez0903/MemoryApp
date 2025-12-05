class SoundManager {
    constructor() {
        this.sounds = {
            button: this.createAudio('/static/audio/button.wav'),
            flip: this.createAudio('/static/audio/flip.wav'),
            match: this.createAudio('/static/audio/match.wav'),
        };

        this.enabled = JSON.parse(localStorage.getItem('audioEnabled') ?? 'true');
        this.volume = parseFloat(localStorage.getItem('audioVolume') ?? '0.6');
        this.applyVolume();
    }

    createAudio(src) {
        const audio = new Audio(src);
        audio.preload = 'auto';
        return audio;
    }

    play(key) {
        if (!this.enabled || !this.sounds[key]) return;
        const sound = this.sounds[key];
        sound.currentTime = 0;
        sound.volume = this.volume;
        sound.play().catch(() => {});
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        localStorage.setItem('audioEnabled', JSON.stringify(enabled));
    }

    setVolume(volume) {
        this.volume = volume;
        this.applyVolume();
        localStorage.setItem('audioVolume', String(volume));
    }

    applyVolume() {
        Object.values(this.sounds).forEach((sound) => {
            sound.volume = this.volume;
        });
    }
}

window.soundManager = new SoundManager();
