import './App.css';
import React, { useState, useEffect, useRef } from 'react';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import './github-dark.css';

const md = new MarkdownIt({
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`;
      } catch (__) {
        console.error('Error highlighting code:', __);
      }
    }
    return '';
  },
});

const App = () => {
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [stayScrolledToBottom, setStayScrolledToBottom] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth <= 768);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    // Load threads and last active thread from local storage on component mount
    const savedThreads = JSON.parse(localStorage.getItem('threads') || '[]');
    const savedActiveThread = localStorage.getItem('activeThread');
    if (savedThreads.length > 0) {
      setThreads(savedThreads);
      if (savedActiveThread) {
        setActiveThread(Number(savedActiveThread));
      } else {
        setActiveThread(savedThreads[0].id);
      }
    }
  }, []);

  useEffect(() => {
    // Save threads to local storage whenever they change
    localStorage.setItem('threads', JSON.stringify(threads));
  }, [threads]);

  useEffect(() => {
    // Save the active thread to local storage whenever it changes
    localStorage.setItem('activeThread', activeThread);
  }, [activeThread]);

  useEffect(() => {
    // Conditionally scroll to bottom when threads or activeThread change
    if (stayScrolledToBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [threads, activeThread, stayScrolledToBottom]);

  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleScroll = () => {
    const isAtBottom =
      messagesContainerRef.current.scrollHeight - messagesContainerRef.current.scrollTop ===
      messagesContainerRef.current.clientHeight;
    setStayScrolledToBottom(isAtBottom);
  };

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const createNewThread = () => {
    const newThread = { id: Date.now(), messages: [] };
    setThreads((prevThreads) => [...prevThreads, newThread]);
    setActiveThread(newThread.id);
    toggleSidebar();
  };

  const switchThread = (threadId) => {
    setActiveThread(threadId);
    toggleSidebar();
  };

  const deleteThread = (threadId) => {
    setThreads((prevThreads) => prevThreads.filter((thread) => thread.id !== threadId));
    if (activeThread === threadId) {
      if (threads.length > 1) {
        setActiveThread(threads[0].id === threadId ? threads[1].id : threads[0].id);
      } else {
        createNewThread();
      }
    }
  };

  const sendMessage = async () => {
    if (input.trim() === '') return;

    const updatedThreads = threads.map((thread) =>
      thread.id === activeThread
        ? { ...thread, messages: [...thread.messages, { role: 'user', content: input }] }
        : thread
    );
    setThreads(updatedThreads);
    setInput('');
    setStreaming(true);

    const newController = new AbortController();

    let assistantResponse = '';

    try {
      const response = await fetch(
        `${process.env.REACT_APP_AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=2023-05-15`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': process.env.REACT_APP_AZURE_OPENAI_API_KEY,
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: updatedThreads.find((t) => t.id === activeThread).messages,
            stream: true,
          }),
          signal: newController.signal,
        }
      );

      if (response.status === 429) {
        // Handle rate limit here
        const retryAfter = response.headers.get('Retry-After');
        console.error(`Rate limit exceeded. Retry after: ${retryAfter} seconds`);
        setTimeout(sendMessage, retryAfter * 1000);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      setThreads((prevThreads) =>
        prevThreads.map((thread) =>
          thread.id === activeThread
            ? { ...thread, messages: [...thread.messages, { role: 'assistant', content: '' }] }
            : thread
        )
      );

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.trim() !== '');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const json = line.replace(/^data: /, '');
            if (json === '[DONE]') {
              setStreaming(false);
              return;
            }
            try {
              const parsed = JSON.parse(json);
              const delta = parsed.choices[0].delta.content;
              if (delta) {
                assistantResponse += delta;

                // eslint-disable-next-line no-loop-func
                setThreads((prevThreads) =>
                  prevThreads.map((thread) =>
                    thread.id === activeThread
                      ? {
                          ...thread,
                          messages: thread.messages.map((msg, index) =>
                            index === thread.messages.length - 1
                              ? { ...msg, content: assistantResponse }
                              : msg
                          ),
                        }
                      : thread
                  )
                );
              }
            } catch (err) {
              console.error('Error parsing stream data:', err);
              throw new Error('Stream parsing error');
            }
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Stream fetch aborted');
      } else {
        console.error('Error in API call:', error);
        setThreads((prevThreads) =>
          prevThreads.map((thread) =>
            thread.id === activeThread
              ? {
                  ...thread,
                  messages: [
                    ...thread.messages,
                    {
                      role: 'assistant',
                      content: 'I apologize, but I encountered an error while processing your request. Please try again.',
                    },
                  ],
                }
              : thread
          )
        );
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderMarkdown = (markdown) => {
    const html = md.render(markdown);
    return { __html: html };
  };

  return (
    <div className="app-container">
      <button className="hamburger-menu" onClick={toggleSidebar}>
        ☰
      </button>
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {threads.map((thread) => (
          <div key={thread.id} className="thread-container">
            <div
              className={`thread ${activeThread === thread.id ? 'active' : ''}`}
              onClick={() => switchThread(thread.id)}
            >
              Thread
              <button
                className="delete-thread"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteThread(thread.id);
                }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
        <button className="new-thread-btn" onClick={createNewThread}>
          New Thread
        </button>
      </aside>
      <main className="chat-container">
        <div className="messages" ref={messagesContainerRef} onScroll={handleScroll}>
          {activeThread &&
            threads
              .find((t) => t.id === activeThread)
              ?.messages.map((message, index) => (
                <div className="message-container" key={index}>
                  <div className={`message ${message.role}`}>
                    <div className="markdown-content" dangerouslySetInnerHTML={renderMarkdown(message.content)} />
                  </div>
                </div>
              ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="input-container">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={streaming}
            placeholder="Type your message..."
            rows={1}
          />
          <button className="send-btn" onClick={sendMessage} disabled={streaming}>
            Send
          </button>
        </div>
      </main>
    </div>
  );
};

export default App;
