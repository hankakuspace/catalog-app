// src/types/react-quill.d.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

declare module "react-quill" {
  import { ComponentType } from "react";

  interface ReactQuillProps {
    value?: string;
    onChange?: (content: string) => void;
    theme?: string;
    modules?: Record<string, any>;
    formats?: string[];
  }

  const ReactQuill: ComponentType<ReactQuillProps>;
  export default ReactQuill;
}
