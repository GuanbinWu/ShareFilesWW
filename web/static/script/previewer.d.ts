import * as API from "./api.js";
export declare const Previewer: {
    previewFile(blob: Blob, file: API.FileEntry, full_name: string, uploadfn: (arrayBuffer: ArrayBuffer) => Promise<void>): void;
    previewPDF(blob: Blob, fileName: string): void;
    previewText(blob: Blob, file: API.FileEntry, full_name: string, uploadfn: (arrayBuffer: ArrayBuffer) => Promise<void>): Promise<void>;
    previewImage(blob: Blob): void;
};
//# sourceMappingURL=previewer.d.ts.map