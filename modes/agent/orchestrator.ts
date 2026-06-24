import { isCancel, text, select } from "@clack/prompts";
import chalk from "chalk";
import { defaultAgentConfig } from "./types";
import { ActionTracker } from "./action-tracker.ts";
import { ToolExecutor } from "./tool-executor";
import { createAgentTools } from "./agent-tools";
import { stepCountIs, ToolLoopAgent } from "ai";
import { getAgentModel } from "../../ai";
import { renderTerminalMarkdown } from "../../tui/terminal-md";
import { runApprovalFlow } from "./approval";

export async function runAgentMode() {
  console.log(chalk.bold("\n🤖 Agent Mode\n"));

  const mode = await select({
    message: "Select execution mode:",
    options: [
      { value: "standard", label: "Standard Run (review changes at the end)" },
      { value: "interactive", label: "Interactive Chat Mode (back-and-forth session)" },
      { value: "step-by-step", label: "Step-by-Step Approval Mode (approve actions in real-time)" },
    ],
  });

  if (isCancel(mode)) return;

  const config = defaultAgentConfig();
  const tracker = new ActionTracker();
  const executor = new ToolExecutor(tracker, config);
  
  if (mode === "step-by-step") {
    executor.interactiveApproval = true;
  }

  const tools = createAgentTools(executor);
  const agent = new ToolLoopAgent({
    model: getAgentModel(),
    stopWhen: stepCountIs(40),
    instructions: [
      `Workspace root: ${config.codebasePath}`,
      "All mutations are staged until approval.",
    ].join("\n"),
    tools,
  });

  if (mode === "interactive") {
    console.log(chalk.cyan("\nStarted Interactive Chat Mode. Type your instructions."));
    console.log(chalk.dim("Type '/exit' to quit the session.\n"));
    
    let messages: any[] = [];

    while (true) {
      const userInput = await text({
        message: "You:",
        placeholder: "Tell the agent what to do... (or '/exit')",
      });

      if (isCancel(userInput) || userInput.trim() === "/exit") {
        break;
      }

      if (!userInput.trim()) continue;

      messages.push({ role: "user", content: userInput.trim() });

      console.log(chalk.yellow("\n🤖 Thinking & working..."));

      const result = await agent.generate({
        messages,
        onStepFinish: ({ toolCalls }) => {
          for (const tc of toolCalls) {
            const preview = JSON.stringify(tc.input).slice(0, 160);
            console.log(
              chalk.green("  ✓"),
              chalk.bold(String(tc.toolName)),
              chalk.dim(preview + (preview.length >= 160 ? "..." : "")),
            );
          }
        },
      });

      const responseMsgs = (result as any).responseMessages || [];
      messages = [...messages, ...responseMsgs];

      if (result.text?.trim()) {
        console.log("\n" + renderTerminalMarkdown(result.text) + "\n");
      }

      const pending = tracker.getPendingMutations();
      if (pending.length > 0) {
        const ok = await runApprovalFlow(tracker);
        if (ok) {
          const { errors } = executor.applyApprovedFromTracker();
          if (errors.length) {
            console.log(chalk.red("\nSome operations reported errors:\n"));
            for (const e of errors) console.log(chalk.red(`  • ${e}`));
          } else {
            console.log(chalk.green('\n✓ Changes applied.\n'));
          }
        }
        executor.clearStaging();
      }
    }

    console.log(chalk.cyan("\nInteractive session ended.\n"));
  } else {
    const goal = await text({
      message: "What would you like the agent to do?",
      placeholder: "Concrete task for this codebase…",
    });

    if (isCancel(goal) || !goal.trim()) return;

    const result = await agent.generate({
      prompt: goal.trim(),
      onStepFinish: ({ toolCalls }) => {
        for (const tc of toolCalls) {
          const preview = JSON.stringify(tc.input).slice(0, 160);
          console.log(
            chalk.green("  ✓"),
            chalk.bold(String(tc.toolName)),
            chalk.dim(preview + (preview.length >= 160 ? "..." : "")),
          );
        }
      },
    });

    if (result.text?.trim()) console.log(renderTerminalMarkdown(result.text));

    const ok = mode === "step-by-step" 
      ? tracker.getActions().some((a) => a.status === "approved")
      : await runApprovalFlow(tracker);

    if (!ok) return executor.clearStaging();

    const { errors } = executor.applyApprovedFromTracker();

    if (errors.length) {
      console.log(chalk.red("\nSome operations reported errors:\n"));
      for (const e of errors) console.log(chalk.red(`  • ${e}`));
    } else {
      console.log(chalk.green('\n✓ Applied.\n'));
    }

    executor.clearStaging();
  }
}