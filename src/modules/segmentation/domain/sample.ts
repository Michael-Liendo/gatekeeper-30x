/** Deterministic PRNG (mulberry32): same seed → same sample on every run. */
function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

export const DEFAULT_SAMPLE_SEED = 30;

/**
 * Stratified sample of `size` items: each stratum gets its proportional share
 * (largest remainder), and at least `minPerStratum` when it has that many, so small
 * programs show up. Reproducible for a given seed.
 */
export function stratifiedSample<T>(
	items: readonly T[],
	size: number,
	stratumOf: (item: T) => string,
	seed = DEFAULT_SAMPLE_SEED,
	minPerStratum = 2,
): T[] {
	if (size >= items.length) return [...items];
	const random = mulberry32(seed);

	const strata = new Map<string, T[]>();
	for (const item of items) {
		const key = stratumOf(item);
		strata.set(key, [...(strata.get(key) ?? []), item]);
	}
	const keys = [...strata.keys()].sort();

	const quota = new Map<string, number>();
	const remainders: { key: string; rest: number }[] = [];
	for (const key of keys) {
		const exact = (strata.get(key)!.length / items.length) * size;
		const floor = Math.min(strata.get(key)!.length, Math.max(Math.floor(exact), minPerStratum));
		quota.set(key, floor);
		remainders.push({ key, rest: exact - Math.floor(exact) });
	}
	let assigned = [...quota.values()].reduce((a, b) => a + b, 0);
	remainders.sort((a, b) => b.rest - a.rest || a.key.localeCompare(b.key));
	for (const { key } of remainders) {
		if (assigned >= size) break;
		if (quota.get(key)! < strata.get(key)!.length) {
			quota.set(key, quota.get(key)! + 1);
			assigned += 1;
		}
	}
	// Minimums may overshoot: trim from the largest strata.
	while (assigned > size) {
		const largest = [...keys]
			.filter((key) => quota.get(key)! > minPerStratum)
			.sort((a, b) => quota.get(b)! - quota.get(a)!)[0];
		if (largest === undefined) break;
		quota.set(largest, quota.get(largest)! - 1);
		assigned -= 1;
	}

	const picked = keys.flatMap((key) => shuffle(strata.get(key)!, random).slice(0, quota.get(key)));
	return shuffle(picked, random);
}
