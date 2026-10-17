import { Meter } from "@/shared/ui/meter";
import type { ChoiceAnswer, DecisionAnswer, ScoreAnswer } from "../domain/decision";
import type { EditorialPolicy } from "../domain/editorial-policy";
import { formatPercent } from "./format";
import {
	CHOICE_KEYS,
	CHOICE_OPTION_LABEL,
	FLAG_KEYS,
	flagMarkers,
	QUESTION_LABEL,
	SCORE_KEYS,
	scoreLevelLabels,
} from "./labels";

interface AnswerListProps {
	answers: Record<string, DecisionAnswer>;
	policy: EditorialPolicy;
}

function ChoiceGroup({
	name,
	answer,
	options,
}: {
	name: string;
	answer: ChoiceAnswer;
	options: Record<string, string>;
}) {
	const ranked = Object.entries(answer.probabilities)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 3);
	return (
		<div className="grid gap-1.5">
			<p className="text-xs text-ink-muted">
				{name}:{" "}
				<span className="font-semibold text-ink">{options[answer.choice] ?? answer.choice}</span>
			</p>
			{ranked.map(([option, probability]) => (
				<Meter
					key={option}
					label={options[option] ?? option}
					value={probability}
					valueText={formatPercent(probability)}
					fillClassName={option === answer.choice ? "bg-ink" : "bg-line-strong"}
					emphasized={option === answer.choice}
				/>
			))}
		</div>
	);
}

function ScoreRow({
	name,
	answer,
	levels,
}: {
	name: string;
	answer: ScoreAnswer;
	levels: string[];
}) {
	const maxLevel = Math.max(1, answer.probabilities.length - 1);
	const value = answer.score / maxLevel;
	const nearest = levels[Math.round(answer.score)];
	return (
		<Meter
			label={nearest ? `${name}: ${nearest.toLowerCase()}` : name}
			value={value}
			valueText={formatPercent(value)}
			fillClassName="bg-ink"
			emphasized
		/>
	);
}

/** Every typed answer the model gave, as label | bar | value rows. */
export function AnswerList({ answers, policy }: AnswerListProps) {
	return (
		<div className="grid gap-5">
			{CHOICE_KEYS.map((key) => {
				const answer = answers[key];
				if (answer?.type !== "choice") return null;
				return (
					<ChoiceGroup
						key={key}
						name={QUESTION_LABEL[key]}
						answer={answer}
						options={CHOICE_OPTION_LABEL[key]}
					/>
				);
			})}
			<div className="grid gap-1.5">
				<p className="text-xs text-ink-muted">Calidad editorial</p>
				{SCORE_KEYS.map((key) => {
					const answer = answers[key];
					if (answer?.type !== "score") return null;
					return (
						<ScoreRow
							key={key}
							name={QUESTION_LABEL[key]}
							answer={answer}
							levels={scoreLevelLabels(key)}
						/>
					);
				})}
			</div>
			<div className="grid gap-1.5">
				<p className="text-xs text-ink-muted">
					Señales de riesgo. Las marcas verticales son los umbrales de tu política.
				</p>
				{FLAG_KEYS.map((key) => {
					const answer = answers[key];
					if (answer?.type !== "yes_no") return null;
					const red = answer.probability >= policy.flagThreshold;
					return (
						<Meter
							key={key}
							label={QUESTION_LABEL[key]}
							value={answer.probability}
							valueText={formatPercent(answer.probability)}
							fillClassName={red ? "bg-human" : "bg-approve"}
							markers={flagMarkers(key, policy)}
							emphasized={red}
						/>
					);
				})}
			</div>
		</div>
	);
}
