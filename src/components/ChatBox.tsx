import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, Minimize2, Send, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { useSession } from '../lib/session';
import { chatbotApi } from '../lib/api';
import { cn } from '../lib/utils';
import { Avatar, Button, Input } from './ui';

type ChatMessage = {
  id: number;
  sender: 'user' | 'assistant';
  text: string;
};

const starterMessages: ChatMessage[] = [
  {
    id: 1,
    sender: 'assistant',
    text: 'Hi, I can help you review jobs, contracts, proposals, disputes, and account workflows.',
  },
];

export function ChatBox() {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);

  const sendMessage = async () => {
  const trimmed = message.trim();
  if (!trimmed) return;

  setMessages((current) => [
    ...current,
    { id: Date.now(), sender: 'user', text: trimmed },
  ]);
  setMessage('');

  try {
    const result = await chatbotApi.ask(trimmed);

    setMessages((current) => [
      ...current,
      {
        id: Date.now() + 1,
        sender: 'assistant',
        text: result.answer,
      },
    ]);
  } catch {
    setMessages((current) => [
      ...current,
      {
        id: Date.now() + 1,
        sender: 'assistant',
        text: 'Không thể kết nối chatbot lúc này.',
      },
    ]);
  }
};
  if (!open) {
    return (
      <button
        type="button"
        aria-label="Open chat"
        onClick={() => {
          setOpen(true);
          setMinimized(false);
        }}
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm">
      <AnimatePresence>
        {!minimized && (
          <motion.section
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-soft"
          >
            <header className="flex items-center gap-3 border-b border-slate-100 bg-brand-600 px-4 py-3 text-white">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold">AI Tasker Assistant</p>
                <p className="text-xs text-blue-50">Online support</p>
              </div>
              <button
                type="button"
                aria-label="Minimize chat"
                onClick={() => setMinimized(true)}
                className="grid h-9 w-9 place-items-center rounded-xl text-blue-50 transition hover:bg-white/10 hover:text-white"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Close chat"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl text-blue-50 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="max-h-80 space-y-3 overflow-y-auto bg-slate-50/70 p-4">
              {messages.map((item) => {
                const isUser = item.sender === 'user';

                return (
                  <div
                    key={item.id}
                    className={cn('flex items-end gap-2', isUser && 'justify-end')}
                  >
                    {!isUser && <Avatar name="AI" size="sm" />}
                    <div
                      className={cn(
                        'max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm',
                        isUser
                          ? 'bg-brand-600 text-white'
                          : 'border border-slate-100 bg-white text-slate-700',
                      )}
                    >
                      {item.text}
                    </div>
                    {isUser && <Avatar name={session?.fullName} size="sm" />}
                  </div>
                );
              })}
            </div>

            <form
              className="flex items-center gap-2 border-t border-slate-100 bg-white p-3"
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage();
              }}
            >
              <Input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Type a message..."
                className="h-10 rounded-xl"
              />
              <Button type="submit" size="icon" aria-label="Send message">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      {minimized && (
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="ml-auto flex h-12 items-center gap-2 rounded-2xl bg-brand-600 px-4 text-sm font-bold text-white shadow-soft transition hover:bg-brand-700"
        >
          <MessageCircle className="h-4 w-4" />
          Chat
        </button>
      )}
    </div>
  );
}