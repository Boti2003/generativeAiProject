import { AzureOpenAI } from "openai";
import { auto } from "openai/_shims/registry.mjs";
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionTool,
} from "openai/resources/index";
import { ChatCompletionMessageParam } from "openai/src/resources/index.js";


const endpoint =
  process.env["AZURE_OPENAI_ENDPOINT"] ;
const apiKey =
  process.env["AZURE_OPENAI_API_KEY"] ;


const apiVersion = "2024-08-01-preview";
const deploymentName = "gpt-4o-mini"; 

function getClient(): AzureOpenAI {
  return new AzureOpenAI({
    endpoint,
    apiKey,
    apiVersion,
    deployment: deploymentName,
  });
}

const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current temperature for a given location.",
      parameters: {
        type: "object",
        properties: {
          latitude: { type: "number" },
          longitude: { type: "number" },
        },
        required: ["latitude", "longitude"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "get_clothing",
      description:
        "Get the appropriate clothing for a given weather condition.",
      parameters: {
        type: "object",
        properties: {
          weather_condition: {
            type: "string",
            enum: ["warm", "chilly", "cold", "freezing", "hot"],
            description: "The weather condition to get clothing for.",
          },
        },
        required: ["weather_condition"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
];

async function getWeather(latitude: number, longitude: number) {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m`
  );
  const data = await response.json();
  return data.current.temperature_2m;
}

async function getClothing(weather_condition: string) {
  switch (weather_condition) {
    case "warm":
      return "T-shirt and shorts";
    case "chilly":
      return "Sweater and jeans";
    case "cold":
      return "Heavy coat and gloves";
    case "freezing":
      return "Thermal underwear and a parka";
    case "hot":
      return "Tank top and shorts";
    default:
      return "Unknown";
  }
}

const messages: ChatCompletionMessageParam[] = [
  {
    role: "user",
    content: "What should i wear today in Budapest?",
  },
];


async function handleCalls(tool_calls: any) {
  if (tool_calls) {
    for (const call of tool_calls) {
      var function_name = call.function.name;
      var args = JSON.parse(call.function.arguments);
      console.log(function_name, args);
      if (function_name === "get_weather") {
        const result = await getWeather(args.latitude, args.longitude);
        messages.push({
          
          role: "tool",
          tool_call_id: call.id,
          content: result.toString(),
        });
      
      } else if (function_name === "get_clothing") {
        const result = await getClothing(args.weather_condition);
        messages.push({
          
          role: "tool",
          tool_call_id: call.id,
          content: result.toString(),
        });

      }
    }
  }
}
export async function main() {
  const client = getClient();


  
  var i = 0;
  var still_running = true;
  var completion;
  while (still_running) {
    
    
    completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools,
      store: true,
    });
    
    messages.push(completion.choices[0].message);
    var tool_calls = completion.choices[0].message.tool_calls
      ? completion.choices[0].message.tool_calls
      : null;
    
    await handleCalls(tool_calls);
    still_running = tool_calls ? true : false;
   
  }
  
  console.log("final response: " + completion?.choices[0].message.content);
}

main().catch((err) => {
  console.error("The sample encountered an error:", err);
});
