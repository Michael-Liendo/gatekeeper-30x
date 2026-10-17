/**
 * Runs `work` over `items` with at most `limit` calls in flight. Workers pick the next
 * index as they finish, so a slow item never blocks the others.
 */
export async function runPool<T>(
	items: readonly T[],
	limit: number,
	work: (item: T, index: number) => Promise<void>,
): Promise<void> {
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			const index = next++;
			await work(items[index] as T, index);
		}
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
