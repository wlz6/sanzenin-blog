/**
 * 纯程序化 Web Audio API 夏夜湖畔声景引擎，默认静音并在用户主动开启时渐入。
 */
export class AmbientAudioEngine {
	private ctx: AudioContext | null = null;
	private masterGain: GainNode | null = null;
	private enabled = false;
	private initialized = false;
	private timers: number[] = [];

	private initContext(): boolean {
		if (this.initialized && this.ctx) return true;
		const AudioCtx =
			window.AudioContext ||
			(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
		if (!AudioCtx) return false;

		const ctx = new AudioCtx();
		this.ctx = ctx;

		const master = ctx.createGain();
		master.gain.value = 0.0001;
		master.connect(ctx.destination);
		this.masterGain = master;

		const bufferLen = ctx.sampleRate * 3;
		const noiseBuf = ctx.createBuffer(1, bufferLen, ctx.sampleRate);
		const output = noiseBuf.getChannelData(0);
		let b0 = 0;
		let b1 = 0;
		let b2 = 0;
		for (let i = 0; i < bufferLen; i++) {
			const white = Math.random() * 2 - 1;
			b0 = 0.997 * b0 + white * 0.029;
			b1 = 0.985 * b1 + white * 0.032;
			b2 = 0.95 * b2 + white * 0.048;
			output[i] = (b0 + b1 + b2 + white * 0.015) * 0.25;
		}

		// 1. 轻柔林风声
		const windSrc = ctx.createBufferSource();
		windSrc.buffer = noiseBuf;
		windSrc.loop = true;
		const windFilter = ctx.createBiquadFilter();
		windFilter.type = "bandpass";
		windFilter.frequency.value = 460;
		windFilter.Q.value = 1.6;
		const windGain = ctx.createGain();
		windGain.gain.value = 0.11;

		const windLfo = ctx.createOscillator();
		windLfo.frequency.value = 0.11;
		const windLfoGain = ctx.createGain();
		windLfoGain.gain.value = 180;
		windLfo.connect(windLfoGain);
		windLfoGain.connect(windFilter.frequency);

		windSrc.connect(windFilter);
		windFilter.connect(windGain);
		windGain.connect(master);
		windSrc.start();
		windLfo.start();

		// 2. 湖畔拍岸水声
		const waterSrc = ctx.createBufferSource();
		waterSrc.buffer = noiseBuf;
		waterSrc.loop = true;
		const waterFilter = ctx.createBiquadFilter();
		waterFilter.type = "lowpass";
		waterFilter.frequency.value = 280;
		const waterGain = ctx.createGain();
		waterGain.gain.value = 0.09;

		const waterLfo = ctx.createOscillator();
		waterLfo.frequency.value = 0.19;
		const waterLfoGain = ctx.createGain();
		waterLfoGain.gain.value = 0.045;
		waterLfo.connect(waterLfoGain);
		waterLfoGain.connect(waterGain.gain);

		waterSrc.connect(waterFilter);
		waterFilter.connect(waterGain);
		waterGain.connect(master);
		waterSrc.start();
		waterLfo.start();

		// 3. 远处夏夜虫鸣
		const cricketTimer = window.setInterval(() => {
			if (!this.enabled || !this.ctx || this.ctx.state !== "running") return;
			this.scheduleCricketPhrase();
		}, 2400);
		this.timers.push(cricketTimer);

		// 4. 偶发夜鸟轻啼
		const birdTimer = window.setInterval(() => {
			if (!this.enabled || !this.ctx || this.ctx.state !== "running") return;
			if (Math.random() < 0.45) {
				this.scheduleNightBird();
			}
		}, 11500);
		this.timers.push(birdTimer);

		this.initialized = true;
		return true;
	}

	private scheduleCricketPhrase(): void {
		if (!this.ctx || !this.masterGain) return;
		const now = this.ctx.currentTime;
		const baseFreq = 3950 + Math.random() * 480;
		const pulses = 3 + Math.floor(Math.random() * 3);

		for (let i = 0; i < pulses; i++) {
			const start = now + i * 0.095;
			const osc = this.ctx.createOscillator();
			const gain = this.ctx.createGain();
			osc.type = "sine";
			osc.frequency.setValueAtTime(baseFreq, start);
			osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.02, start + 0.04);

			gain.gain.setValueAtTime(0.0001, start);
			gain.gain.linearRampToValueAtTime(0.011, start + 0.015);
			gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.075);

			osc.connect(gain);
			gain.connect(this.masterGain);
			osc.start(start);
			osc.stop(start + 0.085);
		}
	}

	private scheduleNightBird(): void {
		if (!this.ctx || !this.masterGain) return;
		const now = this.ctx.currentTime + 0.2;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = "sine";

		const startFreq = 740 + Math.random() * 140;
		osc.frequency.setValueAtTime(startFreq, now);
		osc.frequency.exponentialRampToValueAtTime(startFreq * 0.84, now + 0.55);

		gain.gain.setValueAtTime(0.0001, now);
		gain.gain.linearRampToValueAtTime(0.018, now + 0.14);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);

		osc.connect(gain);
		gain.connect(this.masterGain);
		osc.start(now);
		osc.stop(now + 0.76);
	}

	isEnabled(): boolean {
		return this.enabled;
	}

	async setEnabled(next: boolean): Promise<boolean> {
		if (next) {
			const ok = this.initContext();
			if (!ok || !this.ctx || !this.masterGain) return false;
			if (this.ctx.state === "suspended") {
				await this.ctx.resume();
			}
			this.enabled = true;
			const now = this.ctx.currentTime;
			this.masterGain.gain.cancelScheduledValues(now);
			this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
			this.masterGain.gain.linearRampToValueAtTime(0.75, now + 0.85);
			return true;
		}

		this.enabled = false;
		if (this.ctx && this.masterGain) {
			const now = this.ctx.currentTime;
			this.masterGain.gain.cancelScheduledValues(now);
			this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
			this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.55);
		}
		return false;
	}

	playWaterRipple(): void {
		if (!this.enabled || !this.ctx || !this.masterGain) return;
		const now = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = "sine";
		const base = 360 + Math.random() * 110;
		osc.frequency.setValueAtTime(base, now);
		osc.frequency.exponentialRampToValueAtTime(base * 1.52, now + 0.14);

		gain.gain.setValueAtTime(0.0001, now);
		gain.gain.linearRampToValueAtTime(0.045, now + 0.015);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

		osc.connect(gain);
		gain.connect(this.masterGain);
		osc.start(now);
		osc.stop(now + 0.3);
	}

	playGirlFireflyChime(): void {
		if (!this.enabled || !this.ctx || !this.masterGain) return;
		const notes = [587.33, 739.99, 880.0, 987.77, 1174.66];
		const now = this.ctx.currentTime;

		notes.forEach((freq, idx) => {
			if (!this.ctx || !this.masterGain) return;
			const start = now + idx * 0.22;
			const osc = this.ctx.createOscillator();
			const gain = this.ctx.createGain();
			osc.type = "triangle";
			osc.frequency.setValueAtTime(freq, start);

			gain.gain.setValueAtTime(0.0001, start);
			gain.gain.linearRampToValueAtTime(0.032, start + 0.04);
			gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.65);

			osc.connect(gain);
			gain.connect(this.masterGain);
			osc.start(start);
			osc.stop(start + 1.75);
		});
	}

	playLanternTap(clickCount: number): void {
		if (!this.enabled || !this.ctx || !this.masterGain) return;
		const now = this.ctx.currentTime;
		const baseFreq = 520 + clickCount * 110;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(baseFreq, now);
		osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.98, now + 0.45);

		gain.gain.setValueAtTime(0.0001, now);
		gain.gain.linearRampToValueAtTime(0.036, now + 0.012);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);

		osc.connect(gain);
		gain.connect(this.masterGain);
		osc.start(now);
		osc.stop(now + 0.52);
	}

	playEasterEggBloom(): void {
		if (!this.enabled || !this.ctx || !this.masterGain) return;
		const chord = [440.0, 554.37, 659.25, 880.0, 1108.73, 1318.51, 1760.0];
		const now = this.ctx.currentTime;

		chord.forEach((freq, idx) => {
			if (!this.ctx || !this.masterGain) return;
			const start = now + idx * 0.16;
			const osc = this.ctx.createOscillator();
			const gain = this.ctx.createGain();
			osc.type = "sine";
			osc.frequency.setValueAtTime(freq, start);

			gain.gain.setValueAtTime(0.0001, start);
			gain.gain.linearRampToValueAtTime(0.036, start + 0.06);
			gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.8);

			osc.connect(gain);
			gain.connect(this.masterGain);
			osc.start(start);
			osc.stop(start + 2.9);
		});
	}

	dispose(): void {
		for (const id of this.timers) {
			window.clearInterval(id);
		}
		this.timers = [];
		if (this.ctx) {
			void this.ctx.close();
			this.ctx = null;
		}
		this.masterGain = null;
		this.initialized = false;
		this.enabled = false;
	}
}
