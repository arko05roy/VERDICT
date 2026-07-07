/** Browser shim — isomorphic-ws named export mismatch in Turbopack */
const WS =
  typeof globalThis.WebSocket !== "undefined"
    ? globalThis.WebSocket
    : (class {} as typeof WebSocket);

export { WS as WebSocket };
export default WS;
