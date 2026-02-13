import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, Extension, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import { cn } from '@/utils/cn';
import { SlashCommandMenu, type SlashCommandItem, type SlashCommandMenuRef } from './SlashCommandMenu';
import styles from './NodeDetailPanel.module.css';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface SuggestionCallbackProps {
  editor: any;
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
  clientRect: (() => DOMRect | null) | null;
}

interface SuggestionKeyDownProps extends SuggestionCallbackProps {
  event: KeyboardEvent;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

interface RichTextEditorProps {
  content: string;
  onUpdate: (html: string) => void;
}

const slashCommandItems: SlashCommandItem[] = [
  {
    title: 'Heading 1',
    description: 'Large heading',
    icon: 'H1',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium heading',
    icon: 'H2',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small heading',
    icon: 'H3',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Unordered list',
    icon: '•',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Ordered list',
    icon: '1.',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'Task List',
    description: 'Checklist with tasks',
    icon: '☑',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: 'Code Block',
    description: 'Code snippet',
    icon: '</>',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: 'Quote',
    description: 'Block quotation',
    icon: '"',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: 'Divider',
    description: 'Horizontal line',
    icon: '—',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
];

const SlashCommands = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        pluginKey: new PluginKey('slashCommands'),
        command: ({ editor, range, props }: { editor: unknown; range: unknown; props: SlashCommandItem }) => {
          props.command({ editor, range });
        },
        items: ({ query }: { query: string }) => {
          return slashCommandItems.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase()),
          );
        },
        render: () => {
          let component: ReactRenderer<SlashCommandMenuRef> | null = null;
          let popup: TippyInstance | null = null;

          return {
            onStart: (props: SuggestionCallbackProps) => {
              component = new ReactRenderer(SlashCommandMenu, {
                props: {
                  items: props.items,
                  command: props.command,
                },
                editor: props.editor,
              });

              if (!props.clientRect) return;

              const getRect = props.clientRect;
              popup = tippy(document.body, {
                getReferenceClientRect: () => getRect() ?? new DOMRect(),
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                offset: [0, 4],
              });
            },
            onUpdate: (props: SuggestionCallbackProps) => {
              component?.updateProps({
                items: props.items,
                command: props.command,
              });
              if (props.clientRect && popup) {
                const getRect = props.clientRect;
                popup.setProps({
                  getReferenceClientRect: () => getRect() ?? new DOMRect(),
                });
              }
            },
            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === 'Escape') {
                popup?.hide();
                return true;
              }
              return component?.ref?.onKeyDown(props) ?? false;
            },
            onExit: () => {
              popup?.destroy();
              component?.destroy();
            },
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export function RichTextEditor({ content, onUpdate }: RichTextEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const latestContent = useRef(content);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const tippyRef = useRef<TippyInstance | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: "Type '/' for commands, or just start writing...",
      }),
      SlashCommands,
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      latestContent.current = html;

      setIsSaving(true);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        onUpdate(html);
        setIsSaving(false);
      }, 2000);
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const { from, to } = ed.state.selection;
      setShowToolbar(from !== to);
    },
  });

  // Floating toolbar positioning via tippy
  useEffect(() => {
    if (!editor || !toolbarRef.current) return;

    if (showToolbar) {
      const { from, to } = editor.state.selection;
      if (from === to) return;

      if (tippyRef.current) {
        tippyRef.current.setProps({
          getReferenceClientRect: () => {
            const view = editor.view;
            const start = view.coordsAtPos(from);
            const end = view.coordsAtPos(to);
            return new DOMRect(
              start.left,
              start.top,
              end.right - start.left,
              end.bottom - start.top,
            );
          },
        });
        tippyRef.current.show();
      } else {
        const [instance] = tippy('body', {
          getReferenceClientRect: () => {
            const view = editor.view;
            const start = view.coordsAtPos(from);
            const end = view.coordsAtPos(to);
            return new DOMRect(
              start.left,
              start.top,
              end.right - start.left,
              end.bottom - start.top,
            );
          },
          appendTo: () => document.body,
          content: toolbarRef.current!,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'top',
          offset: [0, 8],
        });
        tippyRef.current = instance;
      }
    } else {
      tippyRef.current?.hide();
    }
  }, [editor, showToolbar]);

  // Cleanup tippy on unmount
  useEffect(() => {
    return () => {
      tippyRef.current?.destroy();
    };
  }, []);

  // Sync external content changes (e.g. navigating to a different node)
  useEffect(() => {
    if (editor && content !== latestContent.current) {
      latestContent.current = content;
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        if (latestContent.current !== content) {
          onUpdate(latestContent.current);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={styles.editorSection}>
      <div className={styles.sectionLabel}>
        Notes
        <span className={cn(styles.saveIndicator, isSaving && styles.visible)}>
          Saving...
        </span>
      </div>
      <div className={styles.editor}>
        {/* Floating toolbar - rendered hidden, positioned by tippy */}
        <div ref={toolbarRef} style={{ display: showToolbar ? undefined : 'none' }}>
          <div className={styles.floatingToolbar}>
            <button
              className={cn(styles.toolbarBtn, editor.isActive('bold') && styles.active)}
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
              title="Bold"
            >
              B
            </button>
            <button
              className={cn(styles.toolbarBtn, editor.isActive('italic') && styles.active)}
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
              title="Italic"
              style={{ fontStyle: 'italic' }}
            >
              I
            </button>
            <button
              className={cn(styles.toolbarBtn, editor.isActive('code') && styles.active)}
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCode().run(); }}
              title="Code"
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            >
              {'<>'}
            </button>
            <button
              className={cn(styles.toolbarBtn, editor.isActive('link') && styles.active)}
              onMouseDown={(e) => { e.preventDefault(); setLink(); }}
              title="Link"
            >
              🔗
            </button>
          </div>
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
