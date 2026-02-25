import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";

import { $applyNodeReplacement, DecoratorNode } from "lexical";
import { Suspense } from "react";

export interface ImagePayload {
  altText: string;
  height?: number;
  key?: NodeKey;
  maxWidth?: number;
  src: string;
  width?: number;
  caption?: string;
}
import { JSX } from "react";

function convertImageElement(domNode: Node): null | DOMConversionOutput {
  const img = domNode as HTMLImageElement;
  if (img.src.startsWith("file:///")) {
    return null;
  }
  const { alt: altText, src, width, height } = img;
  const node = $createSupabaseImageNode({ altText, height, src, width });
  return { node };
}

export type SerializedSupabaseImageNode = Spread<
  {
    altText: string;
    height?: number;
    maxWidth?: number;
    src: string;
    width?: number;
    caption?: string;
  },
  SerializedLexicalNode
>;

export class SupabaseImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __altText: string;
  __width: "inherit" | number;
  __height: "inherit" | number;
  __maxWidth: number;
  __caption?: string;

  static getType(): string {
    return "supabase-image";
  }

  static clone(node: SupabaseImageNode): SupabaseImageNode {
    return new SupabaseImageNode(
      node.__src,
      node.__altText,
      node.__maxWidth,
      node.__width,
      node.__height,
      node.__caption,
      node.__key,
    );
  }

  static importJSON(
    serializedNode: SerializedSupabaseImageNode,
  ): SupabaseImageNode {
    const { altText, height, width, maxWidth, src, caption } = serializedNode;
    const node = $createSupabaseImageNode({
      altText,
      height,
      maxWidth,
      src,
      width,
      caption,
    });
    return node;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("img");
    element.setAttribute("src", this.__src);
    element.setAttribute("alt", this.__altText);
    element.setAttribute("width", this.__width.toString());
    element.setAttribute("height", this.__height.toString());
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: (node: Node) => ({
        conversion: convertImageElement,
        priority: 0,
      }),
    };
  }

  constructor(
    src: string,
    altText: string,
    maxWidth: number,
    width?: "inherit" | number,
    height?: "inherit" | number,
    caption?: string,
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__maxWidth = maxWidth;
    this.__width = width || "inherit";
    this.__height = height || "inherit";
    this.__caption = caption;
  }

  exportJSON(): SerializedSupabaseImageNode {
    return {
      altText: this.getAltText(),
      height: this.__height === "inherit" ? 0 : this.__height,
      maxWidth: this.__maxWidth,
      src: this.getSrc(),
      type: "supabase-image",
      version: 1,
      width: this.__width === "inherit" ? 0 : this.__width,
      caption: this.__caption,
    };
  }

  setWidthAndHeight(
    width: "inherit" | number,
    height: "inherit" | number,
  ): void {
    const writable = this.getWritable();
    writable.__width = width;
    writable.__height = height;
  }

  setCaption(caption: string): void {
    const writable = this.getWritable();
    writable.__caption = caption;
  }

  // View
  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement("span");
    const theme = config.theme;
    const className = theme.image;
    if (className !== undefined) {
      span.className = className;
    }
    return span;
  }

  updateDOM(): false {
    return false;
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
  }

  decorate(): JSX.Element {
    return (
      <Suspense fallback={null}>
        <ImageComponent
          src={this.__src}
          altText={this.__altText}
          width={this.__width}
          height={this.__height}
          maxWidth={this.__maxWidth}
          nodeKey={this.getKey()}
          caption={this.__caption}
        />
      </Suspense>
    );
  }
}

export function $createSupabaseImageNode({
  altText,
  height,
  maxWidth = 500,
  src,
  width,
  caption,
  key,
}: ImagePayload): SupabaseImageNode {
  return $applyNodeReplacement(
    new SupabaseImageNode(src, altText, maxWidth, width, height, caption, key),
  );
}

export function $isSupabaseImageNode(
  node: LexicalNode | null | undefined,
): node is SupabaseImageNode {
  return node instanceof SupabaseImageNode;
}

// Image Component
interface ImageComponentProps {
  src: string;
  altText: string;
  width: "inherit" | number;
  height: "inherit" | number;
  maxWidth: number;
  nodeKey: NodeKey;
  caption?: string;
}

function ImageComponent({
  src,
  altText,
  width,
  height,
  maxWidth,
  caption,
}: ImageComponentProps) {
  return (
    <div className="relative inline-block max-w-full">
      <img
        src={src}
        alt={altText}
        style={{
          height: height === "inherit" ? "auto" : height,
          maxWidth: maxWidth,
          width: width === "inherit" ? "100%" : width,
        }}
        className="rounded-lg"
        draggable={false}
      />
      {caption && (
        <div className="text-sm text-gray-500 mt-1 text-center italic">
          {caption}
        </div>
      )}
    </div>
  );
}
