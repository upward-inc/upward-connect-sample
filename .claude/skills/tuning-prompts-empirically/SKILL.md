---
name: tuning-prompts-empirically
description: Use when written agent instructions such as prompts, skills, CLAUDE.md sections, or rules produce unexpected agent behavior, or immediately after creating or significantly revising instructions, to identify ambiguities through empirical testing with unbiased subagents.
disable-model-invocation: true
effort: high
---

# Tuning Prompts Empirically

The quality of a prompt is invisible to the person who wrote it. The more the writer thinks it is clear, the more a different agent will struggle with it. The core of this skill is to have an unbiased executor actually run the prompt, evaluate it from both sides, and iterate. Do not stop until the improvement plateaus.

## When to Use

- Immediately after creating or significantly revising a skill, slash command, or task prompt.
- When an agent does not work as expected and you want to attribute the cause to ambiguity in the instructions.
- When you want to harden high-priority instructions, such as frequently used skills or core automation prompts.

When not to use:

- One-off disposable prompts (the evaluation cost is not worth it).
- When the goal is not to improve the success rate but merely to reflect the writer's subjective preference.

## Workflow

0. Iteration 0 — Consistency check between description and body (Static, no subagent required)
   - Read the trigger/usage stated in the frontmatter description.
   - Read the scope covered by the body.
   - If there is a discrepancy, align the description or body before proceeding to Iteration 1.
   - Example: Detecting a gap where the description says "navigation / form filling / data extraction" but the body only contains the CLI reference for `npx playwright test`.
   - Skipping this step will cause the subagent to re-interpret the body to match the description, potentially resulting in high accuracy even if the skill does not actually meet the requirements (false positive).

1. Baseline Preparation: Finalize the target prompt and prepare the following two items:
   - Evaluation Scenarios: 2 to 3 types (1 median + 1 to 2 edge cases). Imagine real-world tasks where the target prompt would actually be applied.
   - Requirement Checklist: (For calculating accuracy). List 3 to 7 items for each scenario that the output must satisfy. Accuracy % = Number of satisfied items / Total items. Fix these in advance (do not move them later).

2. Bias-Free Reading: Have a blank-slate executor read the instructions. Start a new subagent using the Task tool. Do not settle for self-rereading (it is structurally impossible to objectively view text you just wrote). If running multiple scenarios in parallel, list multiple Agent calls within a single message. See the Environmental Constraints section for handling environments where agents cannot be started.

3. Execution: Pass a prompt following the subagent execution protocol described later to the subagent and have it run the scenario. The executor generates the implementation or output and finally returns a self-report.

4. Dual-Sided Evaluation: Record the following from the returned results:
   - Executor's Self-Report (Extracted from the subagent's report body): Points of ambiguity, discretionary supplements, and parts where they got stuck applying templates.
   - Instruction-Side Measurement (Judgment rules are defined in this section; refer here from other parts):
     - Success/Failure: Success (○) only if ALL items tagged with [critical] are ○. Failure (×) if even one is × or partial. Labels are binary: ○ / ×.
     - Accuracy: % of achievement in the requirement checklist. ○ = Full points, × = 0, Partial = 0.5. Total points divided by the total number of items.
     - Step Count: Use the `tool_uses` from the usage metadata attached to the Task tool return value. Include Read/Grep; do not exclude them.
     - Duration: Use `duration_ms` from the Task tool usage metadata.
     - Retry Count: Number of times the subagent redid the same judgment. Extracted from the subagent's self-report; cannot be measured by the instruction side.
     - In case of failure, add one line to the "Ambiguity" section of the presentation format indicating which [critical] item failed (for cause tracking).
   - Include at least one item tagged [critical] in the requirement checklist (0 items makes the success judgment meaningless). Do not add or remove [critical] tags after the fact.

5. Delta Application: Apply minimal fixes to the prompt to eliminate ambiguities. One theme per iteration (multiple related fixes are okay; move unrelated fixes to the next iteration).
   - Before fixing, clearly state which item in the requirement checklist or judgment criteria this fix is intended to satisfy. (Fixes guessed from axis names often fail to hit the mark; see the Ripple Patterns of Fixes section).

6. Re-evaluation: Run steps 2 through 5 again with a new subagent (do not reuse the same agent, as it has learned from previous improvements). Increase parallelism if improvement plateaus as iterations proceed.

7. Convergence Judgment: Stop when you meet the guideline: No new ambiguities for 2 consecutive iterations AND metrics improvement is below the threshold (described later). For high-priority prompts, make it 3 consecutive iterations.

## Evaluation Axes

| Axis                                   | Collection Method                                          | Meaning                              |
| -------------------------------------- | ---------------------------------------------------------- | ------------------------------------ |
| Success/Failure                        | Did the executor produce the intended result (binary)?     | Minimum baseline                     |
| Accuracy                               | What % of requirements did the result meet?                | Degree of partial success            |
| Step Count                             | Number of tool calls / judgment steps used by the executor | Metric for wasted instructions       |
| Duration                               | duration_ms of the executor                                | Proxy metric for cognitive load      |
| Retry Count                            | How many times the same judgment was redone                | Signal for instruction ambiguity     |
| Ambiguity (Self-Report)                | Listed by the executor in bullet points                    | Qualitative material for improvement |
| Discretionary Supplement (Self-Report) | Judgments not determined by instructions                   | Exposing implicit specifications     |

Weighting: Prioritize qualitative data (Ambiguity/Discretionary Supplement) over quantitative data (Duration/Steps). Chasing only time reduction will make the prompt too thin.

### Qualitative Interpretation of `tool_uses`

Looking only at accuracy can hide problems with a skill. Using `tool_uses` as a relative value between scenarios reveals structural flaws:

- If a scenario uses 3-5x more tools than others, it is a sign that the skill is skewed toward a decision-tree index and lacks self-containment. The executor is being forced into a references descent.
- Typical example: All scenarios have `tool_uses` of 1-3, but one scenario is 15+. This means there is no recipe for that scenario within the skill, and it is searching across references/.
- Action: In Iteration 2, adding a "minimal completed example inline" or "guidelines on when to read references" to the beginning of SKILL.md will significantly decrease `tool_uses`.

Even with 100% accuracy, an imbalance in `tool_uses` is grounds for triggering Iteration 2. Stopping based on accuracy alone often misses structural flaws.

### Ripple Patterns of Fixes (Conservative / Upswing / Zero-swing)

The relationship between a fix and its effect is not linear. Three patterns can occur:

- Conservative Swing (Estimate > Actual): Aimed at multiple axes with one fix, but only one axis moved. "Aiming for multiple axes often misses."
- Upswing (Estimate < Actual): One piece of structural information (e.g., combination of command + settings + expected output) satisfied judgment criteria across multiple axes simultaneously. "Information combinations work structurally across axes."
- Zero-swing (Estimate > 0, Actual = 0): A fix guessed based on the axis name failed to reach any of the judgment criteria. "Axis names and judgment criteria are different things."

To stabilize this, have the subagent verbalize which judgment criterion this fix satisfies before applying the delta. Accuracy in estimation won't be achieved unless linked at the threshold wording level. When creating a new evaluation axis, specify the judgment criteria down to the threshold wording level (e.g., "Full disclosure," "Full text of minimal working configuration" so the subagent can judge if it earns 2 points).

## Subagent Execution Protocol

The prompt passed to the executor takes the following structure. This is the execution protocol for "dual-sided evaluation."

```
You are an executor reading <Target Prompt Name> with a blank slate.

## Target Prompt
<Paste full text of target prompt or specify path to read>

## Scenario
<One paragraph setting the scenario's situation>

## Requirement Checklist (Items the result must satisfy)
1. [critical] <Item included in minimum baseline>
2. <Normal item>
3. <Normal item>
...
(Judgment rules are centrally defined in the "Workflow 4. Dual-Sided Evaluation" section. At least one [critical] item is mandatory.)

## Task
1. Execute the scenario according to the target prompt and generate the result.
2. Respond with the following report structure upon completion.

## Report Structure
- Result: <Generated output or execution summary>
- Requirement Achievement: ○ / × / Partial (with reason) for each item
- Ambiguity: Parts where you got stuck or wording that was difficult to interpret in the target prompt (bullet points)
- Discretionary Supplement: Parts not determined by instructions that you filled in with your own judgment (bullet points)
- Retry: Number of times you redid the same judgment and the reason why
```

The caller extracts the self-reported parts from the report and fills in the evaluation axis table by obtaining `tool_uses` / `duration_ms` from the Agent tool usage metadata.

## Environmental Constraints

In environments where a new subagent cannot be started (e.g., already running as a subagent, Task tool is disabled), do not apply this skill.

- Alternative 1: Ask the user in the parent session to start a separate Claude Code session.
- Alternative 2: Give up on evaluation and explicitly report to the user: "empirical evaluation skipped: dispatch unavailable."
- NG: Substituting with self-rereading (bias will enter, so the evaluation results cannot be trusted).

Structural Audit Mode: If you want to check only the consistency and clarity of the skill/prompt description rather than an empirical evaluation, explicitly separate this as "Structural Audit Mode." State clearly in the subagent request: "This is Structural Audit Mode: Check text consistency, not execution." This allows the subagent to return a static review without triggering the skip behavior for environmental constraints. Structural audit is a supplement to, not a replacement for, empirical evaluation (it cannot be used for consecutive clear judgments).

## Termination Criteria for Iteration

- Convergence (Stop): Meet ALL of the following for 2 consecutive times:
  - New Ambiguities: 0
  - Accuracy improvement over previous: +3 points or less (Saturation, e.g., 5% → 8%)
  - Step count variation over previous: Within ±10%
  - Duration variation over previous: Within ±15%
  - Overfitting Check: Upon convergence judgment, add one previously unused hold-out scenario for evaluation. If accuracy drops more than 15 points from the recent average, it is overfitted. Return to baseline scenario design and add edge cases.
- Divergence (Doubt the design): If new ambiguities do not decrease after 3+ iterations, the prompt design strategy itself may be wrong. Stop trying to fix it with patches and rewrite the structure.
- Resource Termination: Stop when the priority and the cost of improvement are no longer balanced (making the 80-point judgment).

## Presentation Format

Record and present to the user in the following format for each iteration:

```
## Iteration N

### Changes (Delta from previous)
- <One line describing the fix>

### Execution Results (By Scenario)
| Scenario | Success/Failure | Accuracy | steps | duration | retries |
|---|---|---|---|---|---|
| A | ○ | 90% | 4 | 20s | 0 |
| B | × | 60% | 9 | 41s | 2 |

### Ambiguity (New in this iteration)
- <Scenario B>: [critical] Item N is × — <One line reason for failure> # Always include for failures
- <Scenario B>: <One line for other points>
- <Scenario A>: (None new)

### Discretionary Supplement (New in this iteration)
- <Scenario B>: <Content of supplement>

### Next Proposed Fix
- <One line for minimal fix>

(Convergence Judgment: X consecutive clears / Y more until stop condition)
```

## Red Flags (Beware of Rationalization)

| Rationalization                                                    | Reality                                                                                                                                                                       |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Rereading it myself has the same effect."                         | You cannot "objectively" view text you just wrote. Always start a new subagent.                                                                                               |
| "One scenario is enough."                                          | One scenario will overfit. Use at least 2, preferably 3.                                                                                                                      |
| "It's over because zero ambiguity appeared once."                  | It could be a fluke. Confirm with 2 consecutive times.                                                                                                                        |
| "Let's fix multiple ambiguities at once."                          | You won't know what worked. One theme per iteration.                                                                                                                          |
| "Let's separate every minor related fix into separate iterations." | This is the opposite trap. "One theme" is a unit of meaning. You can group 2-3 related minor fixes into one iteration. Over-separating will explode the number of iterations. |
| "Metrics are good, so ignore qualitative feedback."                | Time reduction can be a sign of the prompt becoming too thin. Prioritize qualitative data.                                                                                    |
| "It's faster to rewrite it."                                       | If ambiguities don't decrease after 3+ times, this is correct. Before that stage, it's an escape.                                                                             |
| "Let's reuse the same subagent."                                   | It has learned from previous improvements. Start fresh every time.                                                                                                            |

## Common Failures

- Scenarios are too easy or too difficult: Neither provides a signal. Use one median real-world case and one edge case.
- Looking only at metrics: If you only chase time reduction, important explanations are cut, making the prompt brittle.
- Too many changes per iteration: You won't be able to track which fix worked. One fix per iteration.
- Tuning scenarios to match fixes: Making the scenario easier to make it look like ambiguities were resolved is self-defeating.

## Related

- `writing-skills` — A TDD approach to skill creation. Essentially the same as this skill's "subagent baseline → fix → rerun" cycle.
