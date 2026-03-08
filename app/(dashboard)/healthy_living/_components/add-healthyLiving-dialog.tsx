"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ChevronDown, ChevronRight, TreePine } from "lucide-react";
import { nanoid } from "nanoid";
import slugify from "slugify";
import { cn } from "@/lib/utils";
import { useAddHealthyLivingDialog } from "@/stores/dialog-store";
import { RichTextEditor } from "@/components/RichTextInput";
import { EMPTY_LEXICAL_STATE } from "@/constants/rich-text-editor";
import ImageDropZone from "@/components/ImageDropZone";
import {
  useCreateHealthyLiving,
  useUpdateHealthyLiving,
} from "@/hooks/supabase-calls/useHealthyLiving";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ContentSection = {
  sub_name: string;
  sub_content: any;
};

type NodeData = {
  _localId: string;        // React key only — never sent to DB
  name: string;
  description: string;     // Short card preview text
  content_sections: ContentSection[];
  image_url: string;
  attribution: any;
  children: NodeData[];
  _expanded: boolean;      // UI state: whether children panel is open
};

function createEmptyNode(): NodeData {
  return {
    _localId: nanoid(8),
    name: "",
    description: "",
    content_sections: [],
    image_url: "",
    attribution: EMPTY_LEXICAL_STATE,
    children: [],
    _expanded: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tree helpers (immutable updates)
// ─────────────────────────────────────────────────────────────────────────────

function updateNode(
  tree: NodeData,
  localId: string,
  updater: (node: NodeData) => NodeData
): NodeData {
  if (tree._localId === localId) return updater(tree);
  return {
    ...tree,
    children: tree.children.map((c) => updateNode(c, localId, updater)),
  };
}

function addChildTo(tree: NodeData, parentLocalId: string): NodeData {
  return updateNode(tree, parentLocalId, (n) => ({
    ...n,
    _expanded: true,
    children: [...n.children, createEmptyNode()],
  }));
}

function removeNode(tree: NodeData, localId: string): NodeData | null {
  if (tree._localId === localId) return null;
  const filteredChildren = tree.children
    .map((c) => removeNode(c, localId))
    .filter(Boolean) as NodeData[];
  return { ...tree, children: filteredChildren };
}

// Converts our tree into the shape the DB RPC expects
function serializeTree(node: NodeData): object {
  return {
    name: node.name.trim(),
    slug: slugify(node.name.trim(), { lower: true, strict: true }),
    description: node.description.trim() || null,
    content_sections: node.content_sections.filter((s) => s.sub_name.trim()),
    image_url: node.image_url || null,
    attribution: node.attribution,
    children: node.children.map(serializeTree),
  };
}

function validateTree(node: NodeData, depth = 0): string[] {
  const errors: string[] = [];
  const label = depth === 0 ? "Root" : `"${node.name || "unnamed"}"`;
  if (!node.name.trim()) errors.push(`${label}: name is required`);
  node.children.forEach((c) => errors.push(...validateTree(c, depth + 1)));
  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Recursive Node Editor
// ─────────────────────────────────────────────────────────────────────────────

type NodeEditorProps = {
  node: NodeData;
  depth: number;
  isRoot: boolean;
  onUpdate: (localId: string, updater: (n: NodeData) => NodeData) => void;
  onAddChild: (parentLocalId: string) => void;
  onRemove: (localId: string) => void;
};

const DEPTH_COLORS = [
  "border-l-emerald-500",
  "border-l-blue-400",
  "border-l-violet-400",
  "border-l-orange-400",
];

const NodeEditor: React.FC<NodeEditorProps> = ({
  node,
  depth,
  isRoot,
  onUpdate,
  onAddChild,
  onRemove,
}) => {
  const borderColor = DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];
  const depthLabel = depth === 0 ? "Topic" : depth === 1 ? "Sub-topic" : "Sub-sub-topic";

  const set = (field: keyof NodeData) => (value: any) =>
    onUpdate(node._localId, (n) => ({ ...n, [field]: value }));

  const addSection = () =>
    onUpdate(node._localId, (n) => ({
      ...n,
      content_sections: [
        ...n.content_sections,
        { sub_name: "", sub_content: EMPTY_LEXICAL_STATE },
      ],
    }));

  const updateSection = (i: number, field: keyof ContentSection, value: any) =>
    onUpdate(node._localId, (n) => {
      const sections = [...n.content_sections];
      sections[i] = { ...sections[i], [field]: value };
      return { ...n, content_sections: sections };
    });

  const removeSection = (i: number) =>
    onUpdate(node._localId, (n) => ({
      ...n,
      content_sections: n.content_sections.filter((_, idx) => idx !== i),
    }));

  const filename = `${node.name.replaceAll(/\s+/g, "").toLowerCase() || "hl"}-${node._localId}`;
  const filePath = `healthy_living/${filename}`;

  return (
    <div
      className={cn(
        "relative border-l-4 pl-4 pr-3 py-4 rounded-r-lg bg-white shadow-sm mb-3",
        borderColor
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onUpdate(node._localId, (n) => ({ ...n, _expanded: !n._expanded }))
            }
            className="text-muted-foreground hover:text-foreground"
          >
            {node._expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {depthLabel}
          </span>
          {node.name && (
            <span className="text-sm font-medium text-foreground truncate max-w-48">
              — {node.name}
            </span>
          )}
        </div>
        {!isRoot && (
          <button
            type="button"
            onClick={() => onRemove(node._localId)}
            className="text-red-400 hover:text-red-600 p-1 rounded"
            title="Remove this node"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {node._expanded && (
        <div className="space-y-4">
          {/* Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder={`e.g. ${depth === 0 ? "Alcohol" : "Low-Risk Drinking Guidelines"}`}
                value={node.name}
                onChange={(e) => set("name")(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Card Preview Text</Label>
              <Textarea
                placeholder="Short text shown on the card"
                value={node.description}
                onChange={(e) => set("description")(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          {/* Content Sections */}
          <div className="space-y-2 p-3 border rounded-lg bg-slate-50/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold">Content Sections</p>
                <p className="text-xs text-muted-foreground">
                  Rich-text sections shown on the detail page of this item
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addSection}>
                <Plus size={12} className="mr-1" /> Add Section
              </Button>
            </div>

            {node.content_sections.map((section, i) => (
              <div key={i} className="relative p-3 bg-white border rounded-lg space-y-2 grid grid-cols-1 gap-4">
                <Input
                  placeholder="Section title"
                  value={section.sub_name}
                  onChange={(e) => updateSection(i, "sub_name", e.target.value)}
                  className="text-sm"
                />
                <RichTextEditor
                  // RichTextEditor needs to be uncontrolled-friendly — pass key to remount on new section
                  key={`section-${node._localId}-${i}`}
                  name={`section-content-${node._localId}-${i}`}
                  // Since we're not using react-hook-form here, use onChange prop if your RichTextEditor supports it
                  // Adapt this to your actual RichTextEditor API:
                  defaultValue={section.sub_content}
                  onChange={(value: any) => updateSection(i, "sub_content", value)}
                  label=""
                />
                <button
                  type="button"
                  onClick={() => removeSection(i)}
                  className="absolute top-2 right-2 text-red-400 hover:text-red-600"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}

            {node.content_sections.length === 0 && (
              <p className="text-center py-3 text-xs text-muted-foreground border-dashed border rounded">
                No sections yet. Add one if this item has detail content.
              </p>
            )}
          </div>

          {/* Image */}
          <div className="space-y-1">
            <Label className="text-xs">Image (optional)</Label>
            <ImageDropZone
              filePath={filePath}
              text="Drop an image"
              onFilesChange={(urls: string[]) => set("image_url")(urls[0] ?? "")}
              initialFiles={node.image_url ? [node.image_url] : []}
            />
          </div>

          {/* Attribution */}
          <div className="grid grid-cols-1 gap-4 space-y-1">
            <Label className="text-xs">Attribution (optional)</Label>
            <RichTextEditor
              key={`attr-${node._localId}`}
              name={`attribution-${node._localId}`}
              defaultValue={node.attribution}
              onChange={set("attribution")}
              label=""
            />
          </div>

          {/* Children */}
          {node.children.length > 0 && (
            <div className="ml-2 space-y-1">
              {node.children.map((child) => (
                <NodeEditor
                  key={child._localId}
                  node={child}
                  depth={depth + 1}
                  isRoot={false}
                  onUpdate={onUpdate}
                  onAddChild={onAddChild}
                  onRemove={onRemove}
                />
              ))}
            </div>
          )}

          {/* Add child button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full border border-dashed text-muted-foreground hover:text-foreground hover:border-solid"
            onClick={() => onAddChild(node._localId)}
          >
            <Plus size={13} className="mr-1" />
            Add child to "{node.name || depthLabel}"
          </Button>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Dialog
// ─────────────────────────────────────────────────────────────────────────────

const AddHealthyLivingDialog = () => {
  const { isOpen, data, isEditMode, close } = useAddHealthyLivingDialog();

  const { mutateAsync: createTree, isPending: creating } = useCreateHealthyLiving();
  const { mutateAsync: updateNodeMutation, isPending: updating } = useUpdateHealthyLiving();

  const isSubmitting = creating || updating;

  const [tree, setTree] = useState<NodeData>(createEmptyNode);

  // Reset tree whenever dialog opens
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && data) {
        // Edit mode: single-node edit (tree editing of existing data is a separate concern)
        setTree({
          _localId: nanoid(8),
          name: data.name ?? "",
          description: data.description ?? "",
          content_sections: data.content_sections ?? [],
          image_url: data.image_url ?? "",
          attribution: data.attribution ?? EMPTY_LEXICAL_STATE,
          children: [],
          _expanded: true,
        });
      } else {
        const fresh = createEmptyNode();
        // If opening to add a child of a specific parent, we note parent_id separately
        setTree(fresh);
      }
    }
  }, [isOpen, isEditMode, data]);

  const handleUpdate = useCallback(
    (localId: string, updater: (n: NodeData) => NodeData) => {
      setTree((prev) => updateNode(prev, localId, updater));
    },
    []
  );

  const handleAddChild = useCallback((parentLocalId: string) => {
    setTree((prev) => addChildTo(prev, parentLocalId));
  }, []);

  const handleRemoveNode = useCallback((localId: string) => {
    setTree((prev) => removeNode(prev, localId) ?? createEmptyNode());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateTree(tree);
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    try {
      if (isEditMode && data?.id) {
        // 1. Update the root node itself
        await updateNodeMutation({
          id: data.id,
          data: {
            name: tree.name.trim(),
            slug: slugify(tree.name.trim(), { lower: true, strict: true }),
            description: tree.description.trim() || null,
            content_sections: tree.content_sections,
            image_url: tree.image_url || null,
            attribution: tree.attribution,
            parent_id: data.parent_id ?? null,
          } as any,
        });

        // 2. If the user added children to the existing node, insert them as new rows
        if (tree.children.length > 0) {
          // serializeTree will include nested grandchildren too — we want each direct
          // child subtree inserted with parent_id = the existing node's id.
          // The insert_healthy_living_info_tree RPC handles the full subtree recursively.
          await Promise.all(
            tree.children.map((child) =>
              createTree({
                tree: serializeTree(child),
                parent_id: data.id,
              } as any)
            )
          );
        }

        toast.success("Updated successfully");
      } else {
        // Tree insert — parent_id comes from dialog data if we're adding a child
        const serialized = serializeTree(tree);
        await createTree({
          tree: serialized,
          parent_id: data?.parent_id ?? null,
        } as any);
        toast.success("Saved successfully");
      }
      close();
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    }
  };

  const nodeCount = (node: NodeData): number =>
    1 + node.children.reduce((sum, c) => sum + nodeCount(c), 0);
  const totalNodes = nodeCount(tree);

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto py-5 px-4 md:px-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            
            {isEditMode
              ? `Edit — ${data?.name || "Healthy Living"}`
              : "Add Healthy Living"}
          </DialogTitle>
          {!isEditMode && (
            <p className="text-xs text-muted-foreground mt-1">
              Build the full topic tree here. Add children and grandchildren before saving —
              everything is inserted in one go.{" "}
              <span className="font-medium text-foreground">
                {totalNodes} node{totalNodes !== 1 ? "s" : ""} ready to save.
              </span>
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <NodeEditor
            node={tree}
            depth={0}
            isRoot
            onUpdate={handleUpdate}
            onAddChild={handleAddChild}
            onRemove={handleRemoveNode}
          />

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? (
                <Loader2 size={15} className="animate-spin mr-2" />
              ) : null}
              {isSubmitting
                ? "Saving…"
                : isEditMode
                ? "Update"
                : `Save ${totalNodes} node${totalNodes !== 1 ? "s" : ""}`}
            </Button>
            <Button type="button" variant="ghost" onClick={close} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddHealthyLivingDialog;
