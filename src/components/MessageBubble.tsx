import React from 'react';
import { User, Bot, Info, Maximize2 } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  type: 'user' | 'assistant' | 'system';
  timestamp: Date;
  images?: string[];
}

interface MessageBubbleProps {
  message: Message;
  onImageClick: (imageUrl: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onImageClick }) => {
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center mb-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-amber-700 text-sm">
          <Info className="w-4 h-4" />
          <span>{message.text}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-3 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`
          flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
          ${isUser 
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
            : 'bg-gradient-to-br from-purple-500 to-purple-600 text-white'
          }
        `}>
          {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </div>

        {/* Message Content */}
        <div className={`
          px-6 py-4 rounded-2xl shadow-sm
          ${isUser 
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md' 
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
          }
        `}>
          <p className="text-sm leading-relaxed mb-2">{message.text}</p>
          
          {message.images && message.images.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {message.images.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <img
                    src={imageUrl}
                    alt={`Image ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg cursor-pointer transition-transform duration-200 hover:scale-105"
                    onClick={() => onImageClick(imageUrl)}
                    loading="lazy"
                  />
                  <button
                    onClick={() => onImageClick(imageUrl)}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className={`text-xs mt-2 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};