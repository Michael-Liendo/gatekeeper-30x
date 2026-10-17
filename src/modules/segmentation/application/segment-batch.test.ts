import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { describe, it } from "node:test";
import type { DecisionRequest, DecisionResult } from "../../content-review/domain/decision";

registerHooks({
	resolve(specifier, context, nextResolve) {
		try {
			return nextResolve(specifier, context);
		} catch (error) {
			if (specifier.startsWith(".") && !specifier.endsWith(".ts")) {
				return nextResolve(`${specifier}.ts`, context);
			}
			throw error;
		}
	},
});

const { segmentBatch, pickProfiles } = (await import(
	new URL("./segment-batch.ts", import.meta.url).href
)) as typeof import("./segment-batch");
const { resegment } = (await import(
	new URL("./segment-profile.ts", import.meta.url).href
)) as typeof import("./segment-profile");
const { parseCsvRecords } = (await import(
	new URL("../infrastructure/csv.ts", import.meta.url).href
)) as typeof import("../infrastructure/csv");
const { toDatasetProfile } = (await import(
	new URL("../infrastructure/profile-records.ts", import.meta.url).href
)) as typeof import("../infrastructure/profile-records");

const csv = readFileSync(new URL("../../../../data/perfiles-30x.csv", import.meta.url), "utf8");
const profiles = parseCsvRecords(csv)
	.map(toDatasetProfile)
	.filter((row) => row !== null);

const ALLOWED_KEYS = [
	"dolor_principal",
	"nivel_de_informacion",
	"objetivo_principal",
	"pais",
	"relacion_con_30x",
	"rol",
	"temas_de_interes",
];

function fakeEngine() {
	const requests: DecisionRequest[] = [];
	const decide = async (request: DecisionRequest): Promise<DecisionResult> => {
		requests.push(request);
		const text = JSON.stringify(request.input);
		const program = text.includes("liderazgo") ? "inmersion_ejecutiva" : "ai_sales";
		return {
			answers: {
				program: { type: "choice", choice: program, confidence: 0.8, probabilities: {} },
				seniority: {
					type: "score",
					score: text.includes("Fundador") ? 2 : 0,
					confidence: 0.9,
					probabilities: [0.5, 0.25, 0.25],
				},
				ai_maturity: { type: "score", score: 1, confidence: 0.9, probabilities: [0, 1, 0] },
				sales_ready: { type: "yes_no", probability: 0.7 },
				has_context: { type: "yes_no", probability: 0.8 },
			},
			provider: "jev",
			model: "fake",
			latencyMs: 100,
			inputTokens: 200,
			costUsd: 0.00001,
			usedFallback: false,
		};
	};
	return { requests, decide };
}

describe("profile dataset", () => {
	it("parses all 697 rows of 30X's sheet", () => {
		assert.equal(profiles.length, 697);
	});
});

describe("segmentBatch", () => {
	it("never sends 30X's labels or CRM outcomes to the engine", async () => {
		const engine = fakeEngine();
		await segmentBatch({ size: 200 }, { profiles, decide: engine.decide });
		assert.equal(engine.requests.length, 200);
		for (const request of engine.requests) {
			const input = request.input as Record<string, string>;
			assert.deepEqual(Object.keys(input).sort(), ALLOWED_KEYS);
			const text = JSON.stringify(input);
			for (const forbidden of [
				"Programa sugerido",
				"Afinidad",
				"(muy alta)",
				"(baja)",
				"Cliente (pagó)",
				"Oportunidad perdida",
				"Lead sin oportunidad abierta",
				"Ganado",
				"Cierre perdido",
				"30X Executive Program",
			]) {
				assert.ok(!text.includes(forbidden), `input leaks "${forbidden}": ${text}`);
			}
		}
	});

	it("draws a reproducible stratified sample that includes every program", () => {
		const first = pickProfiles(profiles, { size: 100 }).map((row) => row.id);
		const second = pickProfiles(profiles, { size: 100 }).map((row) => row.id);
		assert.equal(first.length, 100);
		assert.deepEqual(first, second);
		const programs = new Set(
			pickProfiles(profiles, { size: 50 }).map((row) => row.labels.programaSugerido),
		);
		assert.equal(programs.size, 6);
	});

	it("measures accuracy against the label, overall and without 'Sin programa sugerido'", async () => {
		const engine = fakeEngine();
		const { rows, metrics } = await segmentBatch(
			{ size: 100 },
			{ profiles, decide: engine.decide },
		);
		const hits = rows.filter((row) => row.expected.program === row.result.decision.program).length;
		assert.equal(metrics.accuracy, hits / rows.length);
		const labeled = rows.filter((row) => row.expected.program !== "none");
		const labeledHits = labeled.filter((row) => row.matches).length;
		assert.equal(metrics.accuracyWithProgram, labeledHits / labeled.length);
		assert.equal(metrics.providers.jev, 100);
		assert.equal(metrics.failed, 0);
	});

	it("routes a failed engine call to human review without throwing", async () => {
		const { rows, metrics } = await segmentBatch(
			{ ids: [profiles[0].id] },
			{
				profiles,
				decide: async () => {
					throw new Error("down");
				},
			},
		);
		assert.equal(rows[0].result.decision.action, "HUMAN_REVIEW");
		assert.equal(metrics.failed, 1);
	});
});

describe("resegment", () => {
	it("recalculates when the situation changes and reports what changed", async () => {
		const engine = fakeEngine();
		const base = { ...profiles[0].profile, rol: "Gerente o jefe de área", temas: ["sales", "ai"] };
		const outcome = await resegment(
			base,
			{ rol: "Fundador, socio o CEO", temas: ["leadership"] },
			{ decide: engine.decide },
		);
		assert.deepEqual(outcome.changed.sort(), ["rol", "temas"]);
		assert.equal(outcome.previous.decision.program, "ai_sales");
		assert.equal(outcome.result.decision.program, "inmersion_ejecutiva");
		assert.equal(outcome.result.decision.seniority, "Dueño o C-level");
	});
});
