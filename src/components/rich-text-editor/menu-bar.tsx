"use client";

import { Editor } from "@tiptap/react";
import {
    AlignCenter,
    AlignLeft,
    AlignRight,
    Bold,
    Italic,
    Heading1,
    Heading2,
    Heading3,
    Highlighter,
    Strikethrough,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    Link as LinkIcon,
    Code as CodeIcon,
    Quote,
    Minus,
    RotateCcw,
    RotateCw,
    Eraser,
    Heading4,
    TableIcon,
} from "lucide-react";
import { Toggle } from "../ui/toggle";

interface MenuBarProps {
    editor: Editor | null;
    showHTML: Boolean;
    setShowHTML: Function;
}

export default function MenuBar({ editor, showHTML, setShowHTML }: MenuBarProps) {
    if (!editor) return null;

    const Options = [
        // Headings
        {
            icon: <Heading1 className="size-4" />,
            onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
            pressed: editor.isActive("heading", { level: 1 }),
        },
        {
            icon: <Heading2 className="size-4" />,
            onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
            pressed: editor.isActive("heading", { level: 2 }),
        },
        {
            icon: <Heading3 className="size-4" />,
            onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
            pressed: editor.isActive("heading", { level: 3 }),
        },
        {
            icon: <Heading4 className="size-4" />,
            onClick: () => editor.chain().focus().toggleHeading({ level: 4 }).run(),
            pressed: editor.isActive("heading", { level: 4 }),
        },

        // Marks
        {
            icon: <Bold className="size-4" />,
            onClick: () => editor.chain().focus().toggleBold().run(),
            pressed: editor.isActive("bold"),
        },
        {
            icon: <Italic className="size-4" />,
            onClick: () => editor.chain().focus().toggleItalic().run(),
            pressed: editor.isActive("italic"),
        },
        {
            icon: <UnderlineIcon className="size-4" />,
            onClick: () => editor.chain().focus().toggleUnderline().run(),
            pressed: editor.isActive("underline"),
        },
        {
            icon: <Strikethrough className="size-4" />,
            onClick: () => editor.chain().focus().toggleStrike().run(),
            pressed: editor.isActive("strike"),
        },
        {
            icon: <CodeIcon className="size-4" />,
            onClick: () => editor.chain().focus().toggleCode().run(),
            pressed: editor.isActive("code"),
        },

        // Lists
        {
            icon: <List className="size-4" />,
            onClick: () => editor.chain().focus().toggleBulletList().run(),
            pressed: editor.isActive("bulletList"),
        },
        {
            icon: <ListOrdered className="size-4" />,
            onClick: () => editor.chain().focus().toggleOrderedList().run(),
            pressed: editor.isActive("orderedList"),
        },

        // Alignment
        {
            icon: <AlignLeft className="size-4" />,
            onClick: () => editor.chain().focus().setTextAlign("left").run(),
            pressed: editor.isActive({ textAlign: "left" }),
        },
        {
            icon: <AlignCenter className="size-4" />,
            onClick: () => editor.chain().focus().setTextAlign("center").run(),
            pressed: editor.isActive({ textAlign: "center" }),
        },
        {
            icon: <AlignRight className="size-4" />,
            onClick: () => editor.chain().focus().setTextAlign("right").run(),
            pressed: editor.isActive({ textAlign: "right" }),
        },

        // Blockquote
        {
            icon: <Quote className="size-4" />,
            onClick: () => editor.chain().focus().toggleBlockquote().run(),
            pressed: editor.isActive("blockquote"),
        },

        // Horizontal rule
        {
            icon: <Minus className="size-4" />,
            onClick: () => editor.chain().focus().setHorizontalRule().run(),
            pressed: false,
        },

        // Highlight
        {
            icon: <Highlighter className="size-4" />,
            onClick: () => editor.chain().focus().toggleHighlight().run(),
            pressed: editor.isActive("highlight"),
        },

        // Link
        {
            icon: <LinkIcon className="size-4" />,
            onClick: () => {
                const url = window.prompt("Enter URL");
                if (url === null) return;
                if (url === "") editor.chain().focus().unsetLink().run();
                else editor.chain().focus().setLink({ href: url }).run();
            },
            pressed: editor.isActive("link"),
        },

        // Clear formatting
        {
            icon: <Eraser className="size-4" />,
            onClick: () => editor.chain().focus().clearNodes().unsetAllMarks().run(),
            pressed: false,
        },

        // Undo / Redo
        {
            icon: <RotateCcw className="size-4" />,
            onClick: () => editor.chain().focus().undo().run(),
            pressed: false,
        },
        {
            icon: <RotateCw className="size-4" />,
            onClick: () => editor.chain().focus().redo().run(),
            pressed: false,
        },
        {
            icon: <TableIcon className="size-4" />,
            onClick: () => {
                if (!editor.can().insertTable({ rows: 2, cols: 2, withHeaderRow: true })) return;
                editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run();
            },
            pressed: false,
        },
        {
            icon: <CodeIcon className="size-4" />, // или друг icon
            onClick: () => setShowHTML((prev: Boolean) => !prev),
            pressed: showHTML,
        },
    ];

    return (
        <div className="bg-background text-muted-foreground z-40 sticky top-0 flex flex-wrap gap-1 border rounded-md p-1">
            {Options.map((option, i) => (
                <Toggle size={"lg"} key={i} pressed={option.pressed as boolean} onPressedChange={option.onClick}>
                    {option.icon}
                </Toggle>
            ))}
            {editor?.isActive('table') && (
                <div className="flex gap-1 border rounded-md p-1 mb-1">
                    <Toggle size={"lg"} pressed={false} onPressedChange={() => editor.chain().focus().addRowAfter().run()}>Add Row</Toggle>
                    <Toggle size={"lg"} pressed={false} onPressedChange={() => editor.chain().focus().deleteRow().run()}>Delete Row</Toggle>
                    <Toggle size={"lg"} pressed={false} onPressedChange={() => editor.chain().focus().addColumnAfter().run()}>Add Col</Toggle>
                    <Toggle size={"lg"} pressed={false} onPressedChange={() => editor.chain().focus().deleteColumn().run()}>Delete Col</Toggle>
                    <Toggle size={"lg"} pressed={false} onPressedChange={() => editor.chain().focus().deleteTable().run()}>Delete Table</Toggle>
                </div>
            )}
        </div>
    );
}