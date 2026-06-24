
import chalk from "chalk";
import {select,isCancel} from "@clack/prompts";




export async function runCliMode(){
    while(true){
        const mode = await select({
            message: "Choose Cli -sub mode",
            options: [
                {value:"agent",label:"Agent mode"},
                {value:"plan",label:"plan mode"},
                {value:"ask",label:"Ask mode"},
                {value:"back",label:"Back to main menu"},
            ],
        });
        if(isCancel(mode)||mode === "back")return;

        if(mode === "agent"){
           await import("./agent/orchestrator").then(({runAgentMode})=>runAgentMode());
        } else if(mode === "plan"){
            console.log(chalk.dim("You chose Plan mode..."))
        } else if(mode === "ask"){
            console.log(chalk.dim("You chose Ask mode..."))
        }
        if(mode!=="agent"&&mode!=="plan"&&mode!=="ask"){
            console.log(chalk.red("Invalid mode selected. Please choose again."));
        }
    }
}