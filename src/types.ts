export interface PageInfo {
  name: string;
  filename: string;
}

export interface SectionInfo {
  name: string;
  pages: PageInfo[];
}

export interface NotebookInfo {
  name: string;
  color: string;
  sections: SectionInfo[];
}

export interface Workspace {
  path: string;
  notebooks: NotebookInfo[];
}

export interface ActiveLocation {
  notebook: string | null;
  section: string | null;
  page: PageInfo | null;
}

export const NOTEBOOK_COLORS = [
  "#7B68EE", // medium slate blue
  "#E3478B", // rose
  "#D83B01", // burnt orange
  "#CA5010", // pumpkin
  "#8E562E", // brown
  "#107C10", // green
  "#038387", // teal
  "#0078D4", // blue
  "#5C2D91", // purple
  "#8764B8", // lavender
  "#4A5459", // steel
  "#69797E", // slate
];
