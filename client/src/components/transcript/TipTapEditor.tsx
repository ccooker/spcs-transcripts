import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

interface TipTapEditorProps {
  initialHtml: string;
  onSave: (html: string) => void;
  ariaLabel: string;
  toolbarLabel: string;
  placeholder?: string;
  minHeightClass?: string;
  disabled?: boolean;
}

export function TipTapEditor({
  initialHtml,
  onSave,
  ariaLabel,
  toolbarLabel,
  placeholder,
  minHeightClass = 'min-h-[160px]',
  disabled = false,
}: TipTapEditorProps) {
  const debouncedSave = useDebouncedCallback((html: string) => {
    onSave(html);
  }, 1500);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialHtml || '',
    immediatelyRender: true,
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      debouncedSave(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose text-base leading-relaxed ${minHeightClass} p-4 focus:outline-none`,
        'aria-label': ariaLabel,
        role: 'textbox',
        'aria-multiline': 'true',
        ...(placeholder ? { 'data-placeholder': placeholder } : {}),
      },
    },
  });

  const editorState = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      isBold: ed?.isActive('bold') ?? false,
      isItalic: ed?.isActive('italic') ?? false,
      isBulletList: ed?.isActive('bulletList') ?? false,
      isOrderedList: ed?.isActive('orderedList') ?? false,
    }),
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <div
        role="toolbar"
        aria-label={toolbarLabel}
        className="bg-muted/40 border-b px-2 py-1 flex gap-1"
      >
        <Button
          type="button"
          variant={editorState.isBold ? 'secondary' : 'ghost'}
          size="icon"
          className="h-9 w-9"
          aria-label="Bold"
          aria-pressed={editorState.isBold}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editorState.isItalic ? 'secondary' : 'ghost'}
          size="icon"
          className="h-9 w-9"
          aria-label="Italic"
          aria-pressed={editorState.isItalic}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editorState.isBulletList ? 'secondary' : 'ghost'}
          size="icon"
          className="h-9 w-9"
          aria-label="Bullet list"
          aria-pressed={editorState.isBulletList}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editorState.isOrderedList ? 'secondary' : 'ghost'}
          size="icon"
          className="h-9 w-9"
          aria-label="Ordered list"
          aria-pressed={editorState.isOrderedList}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
