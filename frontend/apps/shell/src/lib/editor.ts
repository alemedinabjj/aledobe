export const loadEditor = () => import("editor/Editor")
export type EditorModule = Awaited<ReturnType<typeof loadEditor>>
