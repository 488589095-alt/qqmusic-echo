declare module '*.svg?inline' {
  const dataUri: string;
  export default dataUri;
}

declare module '*.webp?inline' {
  const dataUri: string;
  export default dataUri;
}

declare module '*.m4a?url' {
  const assetUrl: string;
  export default assetUrl;
}
