import { QuillComponent } from "./QuillComponent";
import { ChatComponent } from "./ChatComponent";
import { useCallback, useState } from "preact/hooks";
import { openAIHandler } from "./backend/openAIHandler";
import { MessageList } from "react-chat-elements";
import "react-chat-elements/dist/main.css";
import "./AITextEditorComponent.less";

export function AITextEditorComponent() {
  const [editorText, setEditorText] = useState("");

  

  const handleRegisterActions = useCallback(
    (actions: {
      insertText: (text: string, index: number) => void,
      formatText: (style: string, startIdx: number, length: number, value:string) => void,
      getTextPositionAndLength: (text_to_find: string, occurrence_number: number) => string,
      rewriteText: (replacement_text: string, index: number, length: number) => void,
      deleteText: (index: number, length: number) => void,
      getSelection: () => string,
      getSpecificPositionInEditor: (specific_editor_place: string) => string,
      formatBlockText: (style: string, startIdx: number, length: number, value: string) => void,
    }) => {
      openAIHandler.registerListeners(actions.insertText, actions.formatText, actions.getTextPositionAndLength, actions.rewriteText, actions.deleteText, actions.getSelection, actions.getSpecificPositionInEditor, actions.formatBlockText);
    },
    []
  );

  async function handleSend(prompt: string): Promise<string> {
    if (prompt.trim() === "") return;
    
    return await openAIHandler.getResponse(prompt, editorText);

  }


  return (
    <div>
      <QuillComponent
        onChange={setEditorText}
        onRegisterActions={handleRegisterActions}
      />
      <ChatComponent onSend={handleSend} />
    </div>
  );
}
