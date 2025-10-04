class TtsService {
    private synth: SpeechSynthesis;
    private voices: SpeechSynthesisVoice[] = [];

    constructor() {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            this.synth = window.speechSynthesis;
            this.loadVoices();
            if (this.synth.onvoiceschanged !== undefined) {
                this.synth.onvoiceschanged = this.loadVoices;
            }
        } else {
            // Provide a mock for environments where speechSynthesis is not available.
            this.synth = {
                speak: () => {},
                cancel: () => {},
                getVoices: () => [],
            } as any;
        }
    }

    private loadVoices = () => {
        this.voices = this.synth.getVoices();
    }

    public speak(text: string, lang: 'en-US' | 'id-ID') {
        if (!this.synth || !text) return;

        if (this.synth.speaking) {
            this.synth.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);

        // Find a "dignified male" voice. This is a heuristic.
        // Priority 1: A voice for the specific locale (e.g., 'en-US') that includes 'male'.
        let selectedVoice = this.voices.find(voice => voice.lang === lang && voice.name.toLowerCase().includes('male'));
        
        // Priority 2: Any male voice for the base language (e.g., 'en').
        if (!selectedVoice) {
            selectedVoice = this.voices.find(voice => voice.lang.startsWith(lang.slice(0, 2)) && voice.name.toLowerCase().includes('male'));
        }
        
        // Priority 3: Any voice for the specific locale.
        if (!selectedVoice) {
            selectedVoice = this.voices.find(voice => voice.lang === lang);
        }

        // Priority 4: Any voice for the base language.
        if (!selectedVoice) {
            selectedVoice = this.voices.find(voice => voice.lang.startsWith(lang.slice(0, 2)));
        }
        
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        
        utterance.lang = lang;
        utterance.pitch = 0.9; // Slightly lower for a more dignified tone
        utterance.rate = 0.95; // Slightly slower speech

        this.synth.speak(utterance);
    }

    public stop() {
        if (this.synth) {
            this.synth.cancel();
        }
    }
}

export const ttsService = new TtsService();
