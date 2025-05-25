import React, { useRef, useState } from "preact/compat";
import "./ChatComponent.less"; 
import { openAIHandler } from "./backend/openAIHandler";
import { Button, Input, MessageList, MessageType } from "react-chat-elements";


export type ChatComponentProps = {

    onSend: (prompt: string) => Promise<string>;
}
export function ChatComponent({onSend}: ChatComponentProps) {  
    const [prompt, setPrompt] = useState("");
    const [messages, setMessages] = useState<MessageType[]>([]);
    
    
    function addMessage(messageText: string, messagePlace: string) {
        const newMessage: MessageType = {
            position: messagePlace,
            type: "text",
            text: messageText,
            title: messagePlace === "left" ? "Assistant" : "You",
        };
        
        setMessages((prevMessages) => [...prevMessages, newMessage]);
    }
    function handleAIMessages(prompt: string) {
        if (prompt.trim() === "") return;
        addMessage(prompt, "right");
        
        onSend(prompt).then((response) => {
            addMessage(response, "left");
            
        });
    }

    return <div>
        <div className="chat-container">
            <h1 className="chat-header">Chat</h1>
            <div className="chat-messages">
                <MessageList
                    className='message-list'
                    lockable={true}                                       
                    dataSource={messages}/>
            </div>
            <div className=" send-container">
                <input

                    className="rce-input"
                    placeholder="Type here..."
                    
                    value={prompt}
                    onChange={(e) => {setPrompt(e.currentTarget.value);
                       
                    }}
                />
                <Button className="rce-input-buttons" text={"Send"} onClick={() => {handleAIMessages(prompt); setPrompt(""); }} title="Send" />
            </div>
        </div>
    </div>
}