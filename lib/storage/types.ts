export type FileItem = {
  name: string;
  type: "file" | "directory";
  size?: number;
  updatedAt?: string;
};
