import OpenAI from 'openai';
import { exec } from 'child_process';

const openai = new OpenAI();

/**
 * 🚩 VULNERABILITY: DIRECT PROMPT INJECTION
 * The user input is concatenated directly into the prompt.
 */
async function getAIResponse(userInput) {
    const prompt = "Summarize this user request: " + userInput;
    const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }]
    });
    return response.choices[0].message.content;
}

/**
 * 🚩 VULNERABILITY: EXCESSIVE AGENCY & UNSAFE TOOL EXECUTION
 * The AI is given a 'shell' tool that executes raw output directly.
 */
const tools = [
    {
        name: "execute_command",
        description: "Executes a shell command on the server",
        parameters: { type: "object", properties: { command: { type: "string" } } }
    }
];

async function handleAgentAction(aiOutput) {
    if (aiOutput.tool_calls) {
        for (const call of aiOutput.tool_calls) {
            if (call.function.name === "execute_command") {
                // EXTREMELY UNSAFE: Executing LLM-generated shell commands!
                exec(call.function.arguments.command, (err, stdout) => {
                    console.log(stdout);
                });
            }
        }
    }
}

/**
 * 🚩 VULNERABILITY: INSECURE OUTPUT HANDLING
 * Executing AI output as code or HTML.
 */
async function renderAIContent() {
    const aiContent = await getAIResponse("some input");
    // POTENTIAL XSS: Rendering LLM output as HTML without sanitization
    document.getElementById('display').innerHTML = aiContent;
}

/**
 * 🚩 VULNERABILITY: LLM JAILBREAK EXPOSURE
 * System instructions are exposed or easily manipulated.
 */
const systemInstructions = "You are a helpful assistant. INTERNAL_SECRET_KEY: 'super-secret-123'";
async function chat(userInput) {
    return await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            { role: "system", content: systemInstructions },
            { role: "user", content: userInput }
        ]
    });
}
