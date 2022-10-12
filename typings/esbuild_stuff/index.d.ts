declare module '*.svg' {
    const content: string;
    export default content;
}
declare module '*.png' {
    const content: string;
    export default content;
}
declare module '*.jpg' {
    const content: string;
    export default content;
}
declare module '*.jpeg' {
    const content: string;
    export default content;
}
declare module '*.css' {
    export const css: (selectors: Record<string, string>) => string;
}
declare module '*.scss' {
    export const css: (selectors: Record<string, string>) => string;
}