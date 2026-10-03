import WebSocket from "ws";
const port = process.env.METRO_PORT || "8091";
const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = pages.find(
  (p) =>
    p.appId === "com.seoleeapps.menieresupport" &&
    (!process.env.DEVICE_MATCH || p.title?.includes(process.env.DEVICE_MATCH)),
);
if (!page)
  throw new Error("Open the development app before running native QA.");
const socket = new WebSocket(page.webSocketDebuggerUrl, {
  origin: `http://127.0.0.1:${port}`,
});
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});
let nextId = 1;
const evaluate = (expression) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      socket.off("message", listener);
      reject(new Error("Inspector timed out"));
    }, 10000);
    const listener = (data) => {
      const message = JSON.parse(String(data));
      if (message.id !== id) return;
      clearTimeout(timer);
      socket.off("message", listener);
      message.result?.exceptionDetails
        ? reject(new Error("Inspector evaluation failed"))
        : resolve(message.result?.result?.value);
    };
    socket.on("message", listener);
    socket.send(
      JSON.stringify({
        id,
        method: "Runtime.evaluate",
        params: { expression, returnByValue: true },
      }),
    );
  });
try {
  await evaluate(
    "globalThis.__journalQaResult={state:'running'}; globalThis.runJournalNativeQa().then(result=>{globalThis.__journalQaResult={state:'passed',result}},error=>{globalThis.__journalQaResult={state:'failed',error:String(error)}}); 'started'",
  );
  const deadline = Date.now() + 90000;
  let result;
  do {
    await new Promise((resolve) => setTimeout(resolve, 500));
    result = await evaluate("globalThis.__journalQaResult");
    if (result?.state === "failed") throw new Error(result.error);
  } while (result?.state !== "passed" && Date.now() < deadline);
  if (result?.state !== "passed") throw new Error("Native QA timed out");
  console.log(
    JSON.stringify({ device: page.title, ...result.result }, null, 2),
  );
} finally {
  socket.close();
}
