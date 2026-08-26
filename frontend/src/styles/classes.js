export default new Proxy({}, { get: (_, className) => className });
