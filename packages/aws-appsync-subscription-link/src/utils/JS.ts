export const browserOrNode = () => {
  const isBrowser =
    typeof window !== "undefined" && typeof window.document !== "undefined";
  const isNode =
    typeof process !== "undefined" &&
    process.versions != null &&
    process.versions.node != null;

  return {
    isBrowser,
    isNode,
  };
};

export const isWebWorker = () => {
  if (typeof self === "undefined") {
    return false;
  }
  const selfContext = self as { WorkerGlobalScope? };
  return (
    typeof selfContext.WorkerGlobalScope !== "undefined" &&
    self instanceof selfContext.WorkerGlobalScope
  );
};
