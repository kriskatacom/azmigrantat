"use client";

import { Node } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import StarterKit from "@tiptap/starter-kit";
import MenuBar from "@/components/rich-text-editor/menu-bar";
import { Toggle } from "@/components/ui/toggle";

import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { useState } from "react";

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
}

const EmojiParagraph = Node.create({
    name: "paragraph",
    group: "block",
    content: "inline*",
    parseHTML() {
        return [{ tag: "p" }];
    },
    renderHTML({ HTMLAttributes }) {
        return ["p", HTMLAttributes, 0];
    },
});

export default function RichTextEditor({
    content,
    onChange,
}: RichTextEditorProps) {
    const [showHTML, setShowHTML] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: {
                    HTMLAttributes: {
                        class: "list-disc ml-3",
                    },
                },
                orderedList: {
                    HTMLAttributes: {
                        class: "list-decimal ml-3",
                    },
                },
            }),
            TextAlign.configure({
                types: ["heading", "paragraph"],
            }),
            Highlight,
            EmojiParagraph,
            Table.configure({ resizable: true }),
            TableRow,
            TableCell,
            TableHeader,
        ],
        content: content,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: "min-h-60 outline-none border text-muted-foreground text-lg rounded-md py-3 px-5 overflow-auto",
            },
        },
        onUpdate: ({ editor }) => {
            // console.log(editor.getHTML());
            onChange(editor.getHTML());
        },
    });

    return (
        <div>
            <MenuBar
                editor={editor}
                showHTML={showHTML}
                setShowHTML={setShowHTML}
            />
            {editor?.isActive("table") && (
                <div className="flex gap-1 border rounded-md p-1 mb-1">
                    <Toggle
                        pressed={false}
                        onPressedChange={() =>
                            editor.chain().focus().addRowAfter().run()
                        }
                    >
                        Add Row
                    </Toggle>
                    <Toggle
                        pressed={false}
                        onPressedChange={() =>
                            editor.chain().focus().deleteRow().run()
                        }
                    >
                        Delete Row
                    </Toggle>
                    <Toggle
                        pressed={false}
                        onPressedChange={() =>
                            editor.chain().focus().addColumnAfter().run()
                        }
                    >
                        Add Col
                    </Toggle>
                    <Toggle
                        pressed={false}
                        onPressedChange={() =>
                            editor.chain().focus().deleteColumn().run()
                        }
                    >
                        Delete Col
                    </Toggle>
                    <Toggle
                        pressed={false}
                        onPressedChange={() =>
                            editor.chain().focus().deleteTable().run()
                        }
                    >
                        Delete Table
                    </Toggle>
                </div>
            )}
            {showHTML ? (
                <textarea
                    className="w-full min-h-60 border rounded-md p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={editor?.getHTML()}
                    onChange={(e) =>
                        editor?.commands.setContent(e.target.value)
                    }
                />
            ) : (
                <EditorContent editor={editor} />
            )}
        </div>
    );
}
