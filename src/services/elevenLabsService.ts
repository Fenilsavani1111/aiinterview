class ElevenLabsService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private voiceId: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_ELEVEN_LABS_API_KEY || '';
    this.voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID; // Default voice ID
    if (!this.apiKey) {
      console.warn('ElevenLabs API key not found. Please set VITE_ELEVENLABS_API_KEY in your environment variables.');
    }
    if (!this.voiceId) {
      console.warn('ElevenLabs API key not found. Please set VITE_ELEVENLABS_VOICE_ID in your environment variables.');
    }
  }

  async textToSpeech(text: string): Promise<Blob> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key is not configured');
    }

    if (!text.trim()) {
      throw new Error('Text cannot be empty');
    }

    console.log('ElevenLabs API Request:', {
      voiceId: this.voiceId,
      textLength: text.length,
      hasApiKey: !!this.apiKey
    });

    try {
      const response = await fetch(`${this.baseUrl}/text-to-speech/${this.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Eleven Labs API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const audioBlob = await response.blob();
      console.log('Audio generated successfully:', {
        size: audioBlob.size,
        type: audioBlob.type
      });

      return audioBlob;
    } catch (error) {
      console.error('ElevenLabs service error:', error);
      throw error;
    }
  }

  setVoiceId(voiceId: string) {
    this.voiceId = voiceId;
  }

  getVoiceId(): string {
    return this.voiceId;
  }
}

export const elevenLabsService = new ElevenLabsService();