import { select, isCancel } from "@clack/prompts";
import chalk from "chalk";
import figlet from "figlet";
import { runCliMode } from "../modes/cli";
import { runTelegramMode } from "../modes/telegram";

const BANNER_FONT = "ANSI Shadow";
const Shadow = chalk.hex("#FF6E48"); // Keep if you need it later
const Face = chalk.hex("#FFB86C").bold;

function printBannerWithShadow(ascii: string) {
  const bannerLines = ascii.replace(/\s+$/, '').split('\n');
  const maxLen = Math.max(...bannerLines.map((l) => l.length), 0);
  const rowWidth = maxLen + 2;

  for (const line of bannerLines) {
    console.log(Shadow(('  ' + line).padEnd(rowWidth)));
  }
  process.stdout.write(`\x1b[${bannerLines.length}A`);
  for (const line of bannerLines) {
    console.log(Face(line.padEnd(rowWidth)));
  }
  console.log();
}


export async function runwakeup() {
  let ascii: string;

  try {
    ascii = figlet.textSync("OpenClaw", { font: BANNER_FONT });
  } catch (e) {
    ascii = figlet.textSync("OpenClaw", { font: "Standard" });
  }

  printBannerWithShadow(ascii);


  const mode = await select({
  message: "Which mode you want to proceed with?",
  options: [
    { value: "cli", label: "CLI Mode" },
    { value: "telegram", label: "Telegram Mode" },
    { value: "exit", label: "Exit" },
  ]
});

if (isCancel(mode) || mode === "exit") {
  console.log(chalk.dim("\nGoodbye.\n"));
  return;
}

if (mode === "cli") {
  await runCliMode();
} else if (mode === "telegram") {
  await runTelegramMode()
}}