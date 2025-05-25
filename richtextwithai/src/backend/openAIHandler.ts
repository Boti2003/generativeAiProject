import { AzureOpenAI } from "openai";
import { ChatCompletion, ChatCompletionTool } from "openai/resources.mjs";
import { ChatCompletionMessageParam } from "openai/src/resources.js";

class OpenAIHandler {
  endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
  apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY;

  apiVersion = "2024-08-01-preview";
  deploymentName = "gpt-4o-mini";


  messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are a helpful assistant, who contributes to a text editing task. Please format, insert, rewrite the content of the editor based on request with the given tools.  The content of the editor can be modified by the user at any time."+
        "Always plan and think before you act. Complicated requests should be broken into smaller steps."+
        "These are the steps to follow upon a completing a request that asks for multiple modifications, like 'insert a bold, red, block-quoted sentence about something': "+
         "1. First check the content of the editor, it will be provided along side with the user's request"+
         "2. Always start with deciding where to insert, for this, use get_text_position_and_length, get_specific_position_in_editor or get_selection.  If the user asks to insert text to an EMPTY editor, insert it in the beginning of the editor. Otherwise, if he asks in without clarification, and the editor has some text in it, insert at the end of the editor."+
         "3. Insert the text using insert_text. Repeat until every insert action is done."+
         "4. After inserting, ALWAYS GET the index and length of the text you just inserted using get_text_position_and_length tool. "+
         "5. Use format_text to format the text you just inserted. If the user asks for a block level formatting, use block_formatting instead."+
         "6. Repeat the steps 4-5 for every formatting request."+
         "7. If the user asks to rewrite text, use get_text_position_and_length or get_selection to get the index and length of the text to be rewritten. Then use rewrite_text to rewrite it."+
         "8. Repeat step 7 for every part of request about rewriting."+
          "9. If the user asks to delete text, use get_text_position_and_length or get_selection to get the index and length of the text to be deleted. Then use delete_text to delete it."+
        "10. Repeat step 9 for every part of request about deleting."
          + "For actions like 'insert a sentence somewhere' or 'insert 2 words here and there', you should only follow the first 3 steps."
        + "For actions like 'format a sentence red' or 'format a sentence red and underline here and there', you should only follow the steps 4-6."
        + "For actions like 'expand a sentence here' or 'summarize a paragraph there and expand one here', you should only follow the steps 7-8."
        + "For actions like 'delete a sentence here' or 'delete sentence here and a paragraph there', you should only follow the steps 9-10."
        + "Finally, if the user does not specify the actions, you should take, only asks for a nice outcome, like 'make this text better' or 'write a recipe nicely formatted', you should use all the tools available to you, in a smart combination, with the guidelines above, to achieve the best result possible. Plan smartly, break into smaller steps, and always make sure to stay consistent. You got this."
    },
  ];

  insertTextListener: (text: string, startidx: number) => void;
  formatTextListener: (text: string, startIdx: number, length: number, value: string) => void;
  getTextPositionAndLengthListener: (text_to_find: string, occurrence_number: number) => string;
  deleteTextListener: (startIdx: number, length: number) => void;
  rewriteTextListener: (replacement_text: string, startIdx: number, length: number) => void;
  getSelectionListener: () => string;
  getSpecificPositionInEditorListener: (specific_editor_place: string) => string;
  formatBlockTextListener: (style: string, startIdx: number, length: number, value: string) => void;

  getClient(
    endpoint: string,
    apiKey: string,
    apiVersion: string,
    deployment: string
  ): AzureOpenAI {
    return new AzureOpenAI({
      endpoint,
      apiKey,
      apiVersion,
      deployment,
      dangerouslyAllowBrowser: true,
    });
  }
  client: AzureOpenAI;

  constructor() {
    this.client = this.getClient(
      this.endpoint,
      this.apiKey,
      this.apiVersion,
      this.deploymentName
    );
    
  }

  editor_tools: ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "insert_text",
        description: "Insert a short text in the editor at a given index.",
        parameters: {
          type: "object",
          properties: {
            inserting_text: { type: "string", description: "The text to be inserted in the editor." },
            start_index: { type: "number", description: "The index at which the text will be inserted." },
          },
          required: ["inserting_text", "start_index"],
          additionalProperties: false,
        },
        strict: true,
      },
    },
    {
      type: "function",
      function: {
        name: "format_text",
        description: "Format the given text by index in the given style with the given value.",
        parameters: {
          type: "object",
          properties: {
            format_style: {
              type: "string",
              enum: ["bold", "italic", "underline", "strike", "color", "background", "size", "script", "code", "link"],
            },
            start_index: { type: "number" },
            length: { type: "number" },
            value: {type: "string",
              description: "The value to be used for the format style. For example, for text and background color, it can be named a color or in an rgb format, like rgb(255, 120, 250)."
                + "For bold, italic, underline, and strike, it can be true or false. For size, it can be small, normal, large, huge. For script, it can be sup, super. "
            + "If you asked for inline code style, use the code keyword, with true or false value. For link, it can be an url. ",
              }
          },
          required: ["format_style", "start_index", "length", "value"],
          additionalProperties: false,
        },
        strict: true,
      },
    },
     {
      type: "function",
      function: {
        name: "block_formatting",
        description: "Format the given text by index at a block level. Think of block level formats, like alignment, code-block, blockquote, header etc.",
        parameters: {
          type: "object",
          properties: {
            format_style: {
              type: "string",
              enum: ["align", "code-block", "blockquote", "header", "list"],
            },
            start_index: { type: "number" },
            length: { type: "number" },
            value: {type: "string",
              description: "The value to be used for the format style. For example, for align, it can be left, right, center, justify. For code-block, it can be true or false. For blockquote, it can be true or false. For header, it can be h1, h2, h3, h4, h5, h6. For list, it can be ordered, bullet, checked or unchecked.",}
          },
          required: ["format_style", "start_index", "length", "value"],
          additionalProperties: false,
        },
        strict: true,
      },
    },
    {
      type: "function",
      function: {
        name: "rewrite_text",
        description: "Rewrite the given text by index in the editor, based on the user's request. It can be a summarizing, changing the tone, expanding or any other request.",
        parameters: {
          type: "object",
          properties: {
            replacement_text: { type: "string",
              description: "The text that will replace the original text."
             },
            start_index: { type: "number" ,
              description: "The start index of the text to be replaced."
            },
            length: { type: "number" ,
              description: "The length of the text to be replaced."
            },
          },
          required: ["replacement_text", "start_index", "length"],
          additionalProperties: false,
        },
        strict: true,
      },
    },
    {
      type: "function",
      function: {
        name: "delete_text",
        description: "Delete a text in the editor at a given index.",
        parameters: {
          type: "object",
          properties: {
            start_index: { type: "number" , description: "The start index of the text to be deleted."},
            length: { type: "number" , description: "The length of the text to be deleted."},
          },
          required: ["start_index", "length"],
          additionalProperties: false,
        },
        strict: true,
      },
    },
    {
      type: "function",
      function: {
        name: "get_text_position_and_length",
        description: "With this function you can get the exact start index and length of a text present in the editor. You can give the the text and which occurrence of that text that you are looking for. Please use this function every time you have to format, rewrite or delete text in the editor.",
        parameters: {
          type: "object",
          properties: {
            text_to_be_found: {
              type: "string",
              description: "The text you are looking for in the editor.",
            },
             occurrence_number: {type: "number",
              description: "The number of the occurrence of the text you are looking for. For example, if you are looking for the second occurrence of the text 'hello' in a text like 'hello world, hello', you would set this to 2.",
            }
          },
          required: ["text_to_be_found", "occurrence_number"],
          additionalProperties: false,
        },
        strict: true,
      },
    },
    {
      type: "function",
      function: {
        name: "get_selection",
        description: "Get the index and length of text selected by the user in the editor. You have to use the information to fulfill requests about formatting or rewriting the selected text.",
        parameters: {
          type: "object",
          properties: {
           
          },
          required: [],
          additionalProperties: false,
        },
        strict: true,
      },
    },
    {
      type: "function",
      function: {
        name: "get_specific_position_in_editor",
        description: "This function is used to get the beginning, end or middle index of the editor's content. If the current content of the editor is an empty string, insert the new text at the beginning. If it has content in it, users usually would like the new text to be inserted at the end of current the text.", //You should use it, if you have to insert text at the beginning, end or middle of the editor. Usually, if the user asks to insert text, without clarification, they want the text to be in inserted at the end, except if the editor is empty, than in the beginning of course
        parameters: {
          type: "object",
          properties: {
            specific_editor_place: {type: "string",
              enum: ["beginning", "middle", "end"],
            }
          },
          required: ["specific_editor_place"],
          additionalProperties: false,
        },
        strict: true,
      },
    },
  ];

  registerListeners(
    insertText: (text: string, startIdx: number) => void,
    formatText: (style: string, startIdx: number, length: number, value: string) => void,
    getTextPositionAndLength: (text_to_find: string, occurrence_number: number) => string,
    rewriteText: (replacement_text: string, startIdx: number, length: number) => void,
    deleteText: (startIdx: number, length: number) => void,
    getSelection: () => string,
    getSpecificPositionInEditor: (specific_editor_place: string) => string,
    formatBlockText: (style: string, startIdx: number, length: number, value: string) => void,
  ) {
    this.insertTextListener = insertText;
    this.formatTextListener = formatText;
    this.getTextPositionAndLengthListener = getTextPositionAndLength;
    this.rewriteTextListener = rewriteText;
    this.deleteTextListener = deleteText;
    this.getSelectionListener = getSelection;
    this.getSpecificPositionInEditorListener = getSpecificPositionInEditor;
    this.formatBlockTextListener = formatBlockText;
  }

  async handleCalls(tool_calls: any) {
    if (tool_calls) {
      for (const call of tool_calls) {
        var function_name = call.function.name;
        var function_args = JSON.parse(call.function.arguments);
        
        var result = "";
        if (function_name === "insert_text") {
          
           result = await this.insertText(
            function_args.inserting_text,
            function_args.start_index
          );
        }
        else if (function_name === "format_text") {
          
          result = await this.formatText(
            function_args.format_style,
            function_args.start_index,
            function_args.length, 
            function_args.value
          );
        }
        else if (function_name === "get_text_position_and_length") {
          result = await this.getTextPositionAndLength(
            function_args.text_to_be_found,
            function_args.occurrence_number
          );
          
        }
        else if (function_name === "rewrite_text") {
          result = await this.rewriteText(
            function_args.replacement_text,
            function_args.start_index,
            function_args.length
          );
        }
        else if (function_name === "delete_text") {
          result = await this.deleteText(
            function_args.start_index,
            function_args.length
          );
        }
        else if (function_name === "get_selection") {
          result = await this.getSelectionListener();
        }
        else if (function_name === "get_specific_position_in_editor") {
          result = await this.getSpecificPositionInEditorListener(function_args.specific_editor_place);
        }
        else if (function_name === "block_formatting") {
          result = await this.formatBlockText(
            function_args.format_style,
            function_args.start_index,
            function_args.length,
            function_args.value
          );
        }
        this.messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result,
        });
      }
    }
  }
  async deleteText(startIdx: number, length: number): Promise<string> {
    
   
    if(!startIdx || !length) return "Delete text failed. Please provide a valid start index and length.";
    
    this.deleteTextListener(startIdx, length);
    return `Deleted text at index ${startIdx} with length ${length}`;
  }
  async rewriteText(replacement_text: string, startIdx: number, length: number): Promise<string> {
    
    
    if(replacement_text === undefined || length === undefined || startIdx === undefined) return "Rewrite text failed. Please provide a valid replacement text, start index and length.";
    
    this.rewriteTextListener(replacement_text, startIdx, length);
    return `Rewrote text at index ${startIdx} with length ${length}`;
  }
  async getTextPositionAndLength(text_to_find: string, occurrence_number: number): Promise<string> {
    
    
    if(text_to_find === undefined || occurrence_number === undefined) return "Getting text position and length failed. Please provide a valid text to find and occurrence number.";
   
    const result = this.getTextPositionAndLengthListener(text_to_find, occurrence_number);
    return result;
 
  }
  async insertText(text: string, index: number): Promise<string> {
    
    
    if(text === undefined || index === undefined ) return "Insert text failed. Please provide a valid text_to_insert and starting_index.";
    this.insertTextListener(text, index);
    return `Inserted "${text}" at index ${index} and with length ${text.length}`;
  }

  async formatText(style: string, index: number, length: number, value: string): Promise<string> {
    
    
    if(style === undefined|| index === undefined  || length === undefined || value === undefined) return "Format text failed. Please provide a valid style, start index, length and value.";
    this.formatTextListener(style, index, length, value);
    return `Formatted in "${style}" at index ${index} and with length ${length}`;
  }

  async formatBlockText(style: string, index: number, length: number, value: string): Promise<string> {
    

    if(style === undefined || index === undefined  || length === undefined || value === undefined) return "Block format text failed. Please provide a valid style, start index, length and value.";

    this.formatBlockTextListener(style, index, length, value);
    return `Formatted in "${style}" at index ${index}  and with length ${length}`;
  }

  async getResponse(prompt: string, currentContent: string): Promise<string> {
    var still_running = true;
    var completion;
    var currentContentEditted = currentContent ? currentContent : "";
    this.messages.push({
      role: "user",
      content:
        "Here is the prompt with the request from the user: " + prompt + ". Here is the content of the editor, it can be an empty string, if the editor is empty so far: " + currentContentEditted,
    });
    while (still_running) {
      completion = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: this.messages,
        tools: this.editor_tools,
        store: true,
        temperature: 0.2,
      });

      this.messages.push(completion.choices[0].message);
      var tool_calls = completion.choices[0].message.tool_calls
        ? completion.choices[0].message.tool_calls
        : null;
      await this.handleCalls(tool_calls);
      still_running = tool_calls ? true : false;
    }

    
    return completion?.choices[0].message.content;
  }
}
export const openAIHandler = new OpenAIHandler();
