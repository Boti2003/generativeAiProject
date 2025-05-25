import React, { useCallback, useEffect, useRef, useState } from "preact/hooks";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css"; // import styles
import "./QuillComponent.less"; // import styles
import { openAIHandler } from "./backend/openAIHandler";

type UserSelection = {
  start: number;
  length: number;
};

type FormatMemory = {
  index: number;
  text_color: string;
  background_color: string;
};

export type QuillComponentProps = {
  onChange: (value: string) => void;
  onRegisterActions?: (actions: {
    insertText: (text: string, index: number) => void;
    formatText: (
      style: string,
      startIdx: number,
      length: number,
      value: string
    ) => void;
    getTextPositionAndLength: (
      text_to_find: string,
      occurrence_number: number
    ) => string;
    rewriteText: (
      replacement_text: string,
      index: number,
      length: number
    ) => void;
    deleteText: (index: number, length: number) => void;
    getSelection: () => string;
    getSpecificPositionInEditor: (specific_editor_place: string) => string;
    formatBlockText: (
      style: string,
      index: number,
      length: number,
      value: string
    ) => void;
  }) => void;
};



const toolbarOptions = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  ["bold", "italic", "underline", "strike", "blockquote"],
  [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
  [{ script: "sub" }, { script: "super" }],
  [{ size: ["small", false, "large", "huge"] }],
  [{ color: [] }, { background: [] }],
  [{ font: [] }],
  [{ align: [] }, { indent: "-1" }, { indent: "+1" }],
  ["link", "image"],
  ["code"],
  ["code-block"],
  ["clean"],
];

export function QuillComponent({
  onChange,
  onRegisterActions,
}: QuillComponentProps) {
  const [selection, setSelection] = useState<UserSelection>(null);
  const [formatMemory, setFormatMemory] = useState<FormatMemory[]>([]);
  const modules = {
    toolbar: toolbarOptions,
  };
  const quillRef = useRef(null);

  const getSelection = useCallback(() => {
    return selection
      ? "User selected text from " +
          selection.start +
          " index " +
          selection.length +
          " characters."
      : "User has not selected any text.";
  }, [selection]);

  const insertText = useCallback((text: string, index: number) => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      editor.focus();
      text = text.replace(/^\n/, "");
      editor.insertText(index, text);
      editor.setSelection(index, text.length);
      editor.blur();
     
    }
  }, []);

  const rewriteText = useCallback(
    (replacement_text: string, index: number, length: number) => {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        editor.focus();
       
        editor.deleteText(index, length);
        editor.insertText(index, replacement_text);
        editor.setSelection(index, replacement_text.length);
        editor.blur();
      }
    },
    []
  );

  const deleteText = useCallback((index: number, length: number) => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
     
      editor.deleteText(index, length);
    }
  }, []);

  const formatText = useCallback(
    (style: string, index: number, length: number, value: string) => {
      const editor = quillRef.current?.getEditor();
      
      if (editor) {
        editor.focus();
        
        var correctedValue: string | boolean = value;
        if (value === "true") correctedValue = true;
        else if (value === "false") correctedValue = false;
        editor.formatText(index, length, style, correctedValue);
        
        editor.setSelection(index, length);
        editor.blur();
      }
    },
    []
  );

  const formatBlockText = useCallback(
    (style: string, index: number, length: number, value: string) => {
      const editor = quillRef.current?.getEditor();
      
      if (editor) {
        editor.focus();
        
        var correctedValue: string | boolean = value;
        if (value === "true") correctedValue = true;
        else if (value === "false") correctedValue = false;
        editor.formatLine(index, length, style, correctedValue);
        
        editor.setSelection(index, length);
        editor.blur();
      }
    },
    []
  );

  const getTextPositionAndLength = useCallback(
    (text_to_find: string, occurrence_number: number) => {
      const editor = quillRef.current?.getEditor();
      const editorText = editor.getText();
      let index = -1;
      while (occurrence_number-- > 0) {
        
        index = editorText.indexOf(text_to_find, index + 1);
        if (index === -1) return "Text not found";
      }
      return (
        "The text " +
        text_to_find +
        " is found at index " +
        index +
        " and length is " +
        text_to_find.length +
        "."
      );
    },
    []
  );

  const getSpecificPositionInEditor = useCallback(
    (specific_editor_place: string) => {
      var index = -1;
      const editor = quillRef.current?.getEditor();
      const editorText = editor.getText();
      switch (specific_editor_place) {
        case "beginning":
          index = 0;
          break;
        case "middle":
          index = Math.floor(editorText.length / 2);
          break;
        case "end":
          index = editorText.length;
          break;
        default:
          index = -1;
      }
      if (index === -1) return "Not valid specific place in editor";
      return (
        "The " +
        specific_editor_place +
        " of the editor's content is at index " +
        index
      );
    },
    []
  );

  useEffect(() => {
    if (
      onRegisterActions &&
      insertText &&
      formatText &&
      getTextPositionAndLength &&
      rewriteText &&
      deleteText &&
      getSelection &&
      getSpecificPositionInEditor &&
      formatBlockText
    ) {
      onRegisterActions({
        insertText,
        formatText,
        getTextPositionAndLength,
        rewriteText,
        deleteText,
        getSelection,
        getSpecificPositionInEditor,
        formatBlockText,
      });
    }
  }, [
    onRegisterActions,
    insertText,
    formatText,
    getTextPositionAndLength,
    rewriteText,
    deleteText,
    getSelection,
    getSpecificPositionInEditor,
    formatBlockText
  ]);


  async function clearSelection() {
      const editor = quillRef.current.getEditor();
      if (selection) {
        for(let format of formatMemory) {
          editor.formatText(format.index, 1, 'color', format.text_color ? format.text_color : "black");
          editor.formatText(format.index, 1, 'background', format.background_color ? format.background_color : "transparent");
        }
        setFormatMemory([]);
        
      
      setSelection(null);
      }
    }

  async function imitateSelection(start: number, length: number) {
    const editor = quillRef.current.getEditor();
    
    for(let i = start; i < start+length; i++) {
            const format = editor.getFormat(i, 1);
            
            setFormatMemory((prev) => [...prev, { index: i, text_color: format.color, background_color: format.background }]);  
    }
    
    editor.formatText(start, length, "background", "blue");
    editor.formatText(start, length, "color", "white");
    setSelection({ start: start, length: length });
   
  }

  return (
    <div>
      <ReactQuill
        modules={modules}
        className="editor"
        theme="snow"
        ref={quillRef}
        onChange={() => {
          const editor = quillRef.current.getEditor();
          const text = editor.getText();
          onChange(editor.getText());
        }}
        onBlur={(range, source, editor) => {
      
          imitateSelection(range.index, range.length);
        }}
        onFocus={(range, source, editor) => {
          
          clearSelection();
        }}
      />
    </div>
  );
}
